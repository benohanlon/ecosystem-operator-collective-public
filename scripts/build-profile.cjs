/*
 * SPDX-FileCopyrightText: 2026 Ben O’Hanlon
 * SPDX-License-Identifier: MIT
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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
      if (target.origin === profileOrigin && target.pathname.endsWith('.md') && !['/benohanlon.md', '/agent-quickstart.md'].includes(target.pathname)) {
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

// The guide owns the opening and the navigable waypoint sections.
const quickstart = read('agent-quickstart.md');
function section(title) {
  const heading = '## ' + title + '\n\n';
  const body = quickstart.split('\n' + heading)[1]?.split('\n## ')[0].trim();
  if (!body) throw new Error('Missing quickstart section: ' + title);
  return body;
}
const opening = section('Opening');
const routes = section('Waypoints');
const waypoints = [...routes.matchAll(/^### (.+)$/gm)].map(match => match[1]);
if (!waypoints.length || new Set(waypoints).size !== waypoints.length) {
  throw new Error('Expected distinct, named waypoints.');
}
const choices = waypoints.map(label => '- ' + label).join('\n');

function mirror(source, region, content) {
  const start = '<!-- begin quickstart ' + region + ' -->';
  const end = '<!-- end quickstart ' + region + ' -->';
  const [before, rest] = source.split(start);
  if (rest === undefined || !rest.includes(end)) throw new Error('Missing quickstart region: ' + region);
  return before + start + '\n\n' + content + '\n\n' + rest.slice(rest.indexOf(end));
}

const assembled = mirror(mirror(read('benohanlon.md'), 'routes', routes), 'opening', opening);
const dateLine = /^Last (?:reviewed|updated): ([^·\n]+?)(?= · )/m;
function profileDate() {
  const saved = assembled.match(dateLine)?.[1];
  if (!saved) throw new Error('Missing profile update date.');
  // Downloaded source archives retain their published date without Git history.
  if (!fs.existsSync(path.join(root, '.git'))) return saved;
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const committed = git('show', 'HEAD:benohanlon.md');
  const changed = assembled.replace(dateLine, '') !== committed.replace(dateLine, '') ||
    quickstart !== git('show', 'HEAD:agent-quickstart.md');
  const when = changed ? new Date() : new Date(git('log', '-1', '--format=%cI', '--', 'benohanlon.md', 'agent-quickstart.md').trim());
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(when);
}
const profile = assembled.replace(dateLine, 'Last updated: ' + profileDate());
const discovery = mirror(read('llms.txt'), 'choices', choices);
const [name, role, ...blocks] = profile.trim().split('\n\n');
const reviewIndex = blocks.findIndex(block => block.startsWith('Last updated:'));
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
const quickstartUrl = profileOrigin + '/agent-quickstart.md';
if (![adventure[1], sections[oodaHeading + 1]].every(text => text.includes(quickstartUrl))) {
  throw new Error('Both prompts must direct the reader to the agent quickstart.');
}
const longPrompt = sections.slice(oodaHeading + 1, workHeading).join('\n\n')
  .replace(/<!-- (?:begin|end) quickstart opening -->/g, '').trim();
const prompt = markdown.parse(adventure[1]);
const oodaPrompt = markdown.parse(longPrompt);
const contact = markdown.parse(sections.slice(contactStart + 1, casesHeading).join('\n\n'));
const interests = sections.indexOf('### Where I’m a good fit');
if (interests <= workHeading || interests >= contactStart) throw new Error('Missing work interests under Work with me.');
const work = markdown.parse(sections.slice(workHeading, interests).join('\n\n')) +
  '<details class="work-interests" id="where-i-d-like-to-work"><summary><span id="ecosystems-i-d-like-to-work-in"></span>' + markdown.parse(sections[interests]).trim() + '</summary>\n' +
  markdown.parse(sections.slice(interests + 1, contactStart).join('\n\n')) + '</details>\n' +
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
// The opening also appears inside the expanded prompt. Give the printed page its own anchors.
const scene = markdown.parse(opening).replace(/(<h[1-6] id=")/g, '$1chapter-');
const spread = replaceGenerated(adventureSource, 'opening', scene);
const adventurePage = replaceGenerated(spread, 'prompt', oodaPrompt);

const outputs = { 'benohanlon.md': profile, 'llms.txt': discovery, 'index.html': updated, 'adventure.html': adventurePage };
for (const [file, contents] of Object.entries(outputs)) {
  if (contents === read(file)) continue;
  if (process.argv.includes('--check')) {
    console.error(file + ' is out of date. Run node scripts/build-profile.cjs.');
    process.exitCode = 1;
  } else {
    fs.writeFileSync(path.join(root, file), contents, 'utf8');
  }
}
