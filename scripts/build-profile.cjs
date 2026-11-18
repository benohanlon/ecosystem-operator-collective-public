const fs = require('node:fs');
const path = require('node:path');
const { Marked } = require('./vendor/marked.umd.js');

const root = path.join(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8').replace(/\r\n/g, '\n');
const repository = 'https://github.com/benohanlon/ecosystem-operator-collective-public/blob/main/';
const profileOrigin = 'https://benohanlon.md';

const markdown = new Marked({
  renderer: {
    html() {
      return '';
    },
    heading({ depth, text, tokens }) {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return '<h' + depth + ' id="' + id + '">' + this.parser.parseInline(tokens) + '</h' + depth + '>\n';
    }
  },
  walkTokens(token) {
    if (token.type === 'link' && !token.href.startsWith('#')) {
      let target = new URL(token.href, repository);
      // GitHub renders the evidence pages and their section anchors for web readers.
      if (target.origin === profileOrigin && target.pathname.endsWith('.md') && target.pathname !== '/benohanlon.md') {
        target = new URL(target.pathname.slice(1) + target.search + target.hash, repository);
      }
      token.href = ['https:', 'http:', 'mailto:'].includes(target.protocol) ? target.href : '#';
    }
  }
});

function replaceGenerated(source, region, content) {
  const begin = '    <!-- Begin generated ' + region + ' -->';
  const end = '    <!-- End generated ' + region + ' -->';
  const start = source.indexOf(begin);
  const stop = source.indexOf(end);
  if (start < 0 || stop <= start + begin.length) {
    throw new Error('The generated ' + region + ' markers are missing or out of order.');
  }
  return source.slice(0, start + begin.length) + '\n' + content.trimEnd() + '\n' + source.slice(stop);
}

const [name, role, positioning, proof, metadata, ...sections] = read('benohanlon.md').trim().split('\n\n');
const workHeading = sections.indexOf('## Work with me');
const casesHeading = sections.indexOf('## Cases');
const writingHeading = sections.indexOf('## Writing and projects');
const contactStart = sections.indexOf('<!-- contact-links -->');
if (!name?.startsWith('# ') || !role || !positioning || !proof || !metadata?.startsWith('Last reviewed:') ||
    workHeading < 0 || contactStart <= workHeading || casesHeading <= contactStart || writingHeading <= casesHeading) {
  throw new Error('The Markdown profile must start with name, role, positioning, proof and review date. The contact-links marker belongs under Work with me, before Cases.');
}
const introduction = markdown.parse(name) + '<div class="hero-positioning">\n' +
  markdown.parse(positioning + '\n\n' + proof) + '</div>\n';
const adventureHeading = sections.indexOf('## Choose your own adventure');
const adventure = sections[adventureHeading + 2]?.match(/^> (.+)$/);
const instructionsHeading = sections.indexOf('## Agent instructions');
if (adventureHeading < 0 || !adventure) {
  throw new Error('The adventure prompt must be a single quoted paragraph after the copy instructions.');
}
if (instructionsHeading !== adventureHeading + 3 || instructionsHeading >= workHeading) {
  throw new Error('Agent instructions must sit between the adventure prompt and Work with me.');
}
const prompt = markdown.parse(adventure[1]);
const contact = markdown.parse(sections.slice(contactStart + 1, casesHeading).join('\n\n'));
const work = markdown.parse(sections.slice(workHeading, contactStart).join('\n\n')) +
  '<div id="contact-me" class="profile-contact">\n<span id="contact"></span>\n' + contact + '</div>\n' +
  markdown.parse(sections[casesHeading]) +
  '<div class="profile-cases">\n' + markdown.parse(sections.slice(casesHeading + 1, writingHeading).join('\n\n')) + '</div>\n' +
  markdown.parse(sections.slice(writingHeading).join('\n\n'));
const instructions = markdown.parse(sections.slice(instructionsHeading + 1, workHeading).join('\n\n'));
const guidance = '<details id="agent-instructions">\n<summary><h2>Agent instructions</h2></summary>\n' +
  instructions + '</details>\n' + markdown.parse(metadata.split(' · ')[0]);
const source = read('index.html');
let updated = replaceGenerated(source, 'introduction', introduction);
updated = replaceGenerated(updated, 'role', markdown.parse(role).replace('<p>', '<p class="hero-role">'));
updated = replaceGenerated(updated, 'prompt', prompt);
updated = replaceGenerated(updated, 'profile', work);
updated = replaceGenerated(updated, 'guidance', guidance);

const adventureSource = read('adventure.html');
const adventurePage = replaceGenerated(adventureSource, 'prompt', prompt);

if (process.argv.includes('--check')) {
  if (updated !== source || adventurePage !== adventureSource) {
    console.error('Run node scripts/build-profile.cjs before publishing the profile or adventure.');
    process.exitCode = 1;
  }
} else {
  if (updated !== source) fs.writeFileSync(path.join(root, 'index.html'), updated, 'utf8');
  if (adventurePage !== adventureSource) fs.writeFileSync(path.join(root, 'adventure.html'), adventurePage, 'utf8');
}
