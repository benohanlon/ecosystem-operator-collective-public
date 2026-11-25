/*
 * SPDX-FileCopyrightText: 2026 Ben O’Hanlon
 * SPDX-License-Identifier: MIT
 */
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

const [name, role, ...blocks] = read('benohanlon.md').trim().split('\n\n');
const reviewIndex = blocks.findIndex(block => block.startsWith('Last reviewed:'));
const introCopy = blocks.slice(0, reviewIndex);
const [metadata, ...sections] = blocks.slice(reviewIndex);
const workHeading = sections.indexOf('## Work with me');
const casesHeading = sections.indexOf('## Cases');
const playbookHeading = sections.indexOf('## Ecosystem Operating System Playbook');
const writingHeading = sections.indexOf('## Writing and projects');
const contactStart = sections.indexOf('<!-- contact-links -->');
if (!name?.startsWith('# ') || !role || reviewIndex < 2 ||
    workHeading < 0 || contactStart <= workHeading || casesHeading <= contactStart || playbookHeading <= casesHeading || writingHeading <= playbookHeading) {
  throw new Error('The Markdown profile must start with name, role, positioning, proof and review date. The contact-links marker belongs under Work with me, before Cases. The Ecosystem Operating System Playbook must sit between Cases and Writing and projects.');
}
const introduction = markdown.parse(name) + '<div class="hero-positioning">\n' +
  markdown.parse(introCopy.join('\n\n')) + '</div>\n';
const adventureHeading = sections.indexOf('## Choose your own adventure');
const adventure = sections[adventureHeading + 2]?.match(/^> (.+)$/);
const instructionsHeading = sections.indexOf('## Agent instructions');
const oodaHeading = sections.indexOf('### Run the full OODA loop');
if (adventureHeading < 0 || !adventure) {
  throw new Error('The adventure prompt must be a single quoted paragraph after the copy instructions.');
}
if (instructionsHeading !== adventureHeading + 3 || instructionsHeading >= workHeading) {
  throw new Error('Agent instructions must sit between the adventure prompt and Work with me.');
}
if (oodaHeading <= instructionsHeading || oodaHeading + 1 >= workHeading) {
  throw new Error('Full OODA loop guidance must sit inside Agent instructions.');
}
const profileUrl = profileOrigin + '/benohanlon.md';
const opening = sections[oodaHeading + 1];
if (!adventure[1].includes(profileUrl) || !opening.includes(profileUrl)) {
  throw new Error('Both the short prompt and the full prompt opening must reference the public Markdown profile.');
}
// Each entry point must be able to present the published menu on its own.
const startHeading = sections.indexOf('### Start the choose-your-own-adventure');
const routes = [...(sections[startHeading + 2] || '').matchAll(/^\d+\. \*\*(.+?)\*\*/gm)];
const longPrompt = sections.slice(oodaHeading + 1, workHeading).join('\n\n');
const discovery = read('llms.txt');
if (routes.length !== 4 || routes.some(([, label], i) =>
  ![longPrompt, discovery].every(text => text.includes((i + 1) + '. ' + label)))) {
  throw new Error('Keep the four starting choices in sync across the profile, full prompt and llms.txt.');
}
const prompt = markdown.parse(adventure[1]);
const oodaPrompt = markdown.parse(longPrompt);
const contact = markdown.parse(sections.slice(contactStart + 1, casesHeading).join('\n\n'));
const work = markdown.parse(sections.slice(workHeading, contactStart).join('\n\n')) +
  '<div id="contact-me" class="profile-contact">\n<span id="contact"></span>\n' + contact + '</div>\n' +
  markdown.parse(sections[casesHeading]) +
  '<div class="profile-cases">\n' + markdown.parse(sections.slice(casesHeading + 1, playbookHeading).join('\n\n')) + '</div>\n' +
  markdown.parse(sections.slice(playbookHeading).join('\n\n'));
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
const adventurePage = replaceGenerated(adventureSource, 'prompt', oodaPrompt);

if (process.argv.includes('--check')) {
  if (updated !== source || adventurePage !== adventureSource) {
    console.error('Run node scripts/build-profile.cjs before publishing the profile or adventure.');
    process.exitCode = 1;
  }
} else {
  if (updated !== source) fs.writeFileSync(path.join(root, 'index.html'), updated, 'utf8');
  if (adventurePage !== adventureSource) fs.writeFileSync(path.join(root, 'adventure.html'), adventurePage, 'utf8');
}
