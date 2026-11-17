const fs = require('node:fs');
const path = require('node:path');
const { Marked } = require('./vendor/marked.umd.js');

const root = path.join(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8').replace(/\r\n/g, '\n');
const repository = 'https://github.com/benohanlon/ecosystem-operator-collective-public/blob/main/';

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
      const target = new URL(token.href, repository);
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
if (!name?.startsWith('# ') || !positioning || !metadata?.startsWith('Last reviewed:') || !sections.includes('## Selected work')) {
  throw new Error('The Markdown profile must start with name, positioning, and review date, and include a Selected work section.');
}
const introduction = markdown.parse(name + '\n\n' + positioning).replace('<p>', '<p class="hero-positioning">');
const profile = markdown.parse([...sections, metadata].join('\n\n'));
const source = read('index.html');
const updated = replaceGenerated(replaceGenerated(source, 'introduction', introduction), 'profile', profile);

if (process.argv.includes('--check')) {
  if (updated !== source) {
    console.error('Run node scripts/build-profile.cjs before publishing the profile.');
    process.exitCode = 1;
  }
} else if (updated !== source) {
  fs.writeFileSync(path.join(root, 'index.html'), updated, 'utf8');
}
