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

const [name, positioning, metadata, ...sections] = read('benohanlon.md').trim().split('\n\n');
const workHeading = sections.indexOf('## Work with me');
const casesHeading = sections.indexOf('## Cases');
if (!name?.startsWith('# ') || !positioning || !metadata?.startsWith('Last reviewed:') ||
    workHeading < 0 || casesHeading <= workHeading) {
  throw new Error('The Markdown profile must start with name, positioning and review date, with Work with me before Cases.');
}
const introduction = markdown.parse(name + '\n\n' + positioning).replace('<p>', '<p class="hero-positioning">');
const starterHeading = sections.indexOf('## Ask your AI about my work');
const starter = sections[starterHeading + 2]?.match(/^> (.+)$/);
const instructionsHeading = sections.indexOf('## Agent instructions');
if (starterHeading < 0 || !starter) {
  throw new Error('The starter prompt must be a single quoted paragraph.');
}
if (instructionsHeading !== starterHeading + 3 || instructionsHeading >= workHeading) {
  throw new Error('Agent instructions must sit between the starter prompt and Work with me.');
}
const prompt = markdown.parse(starter[1]);
const work = markdown.parse(sections.slice(workHeading).join('\n\n'));
const instructions = markdown.parse(sections.slice(instructionsHeading + 1, workHeading).join('\n\n'));
const guidance = '<details id="agent-instructions">\n<summary>Agent instructions</summary>\n' +
  instructions + '</details>\n' + markdown.parse(metadata.split(' · ')[0]);
const source = read('index.html');
let updated = replaceGenerated(source, 'introduction', introduction);
updated = replaceGenerated(updated, 'prompt', prompt);
updated = replaceGenerated(updated, 'profile', work);
updated = replaceGenerated(updated, 'guidance', guidance);

if (process.argv.includes('--check')) {
  if (updated !== source) {
    console.error('Run node scripts/build-profile.cjs before publishing the profile.');
    process.exitCode = 1;
  }
} else if (updated !== source) {
  fs.writeFileSync(path.join(root, 'index.html'), updated, 'utf8');
}
