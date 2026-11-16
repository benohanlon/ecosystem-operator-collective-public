const fs = require('node:fs');
const path = require('node:path');
const { Marked } = require('./vendor/marked.umd.js');

const root = path.join(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8').replace(/\r\n/g, '\n');

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
    if (token.type === 'heading') {
      token.depth = Math.min(6, token.depth + 1);
    }
    if (token.type === 'link' && !token.href.startsWith('#')) {
      const repository = 'https://github.com/benohanlon/ecosystem-operator-collective-public/blob/main/';
      const target = new URL(token.href, repository);
      token.href = ['https:', 'http:', 'mailto:'].includes(target.protocol) ? target.href : '#';
    }
  }
});

const start = '    <!-- Begin generated profile -->';
const end = '    <!-- End generated profile -->';
const source = read('index.html');
const contentStart = source.indexOf(start) + start.length;
const contentEnd = source.indexOf(end);

if (contentStart < start.length || contentEnd <= contentStart) {
  throw new Error('The profile markers in index.html are missing or out of order.');
}

const profile = markdown.parse(read('benohanlon.md')).trimEnd();
const updated = source.slice(0, contentStart) + '\n' + profile + '\n' + source.slice(contentEnd);

if (process.argv.includes('--check')) {
  if (updated !== source) {
    console.error('Run node scripts/build-profile.cjs before publishing the profile.');
    process.exitCode = 1;
  }
} else if (updated !== source) {
  fs.writeFileSync(path.join(root, 'index.html'), updated, 'utf8');
}
