const prompt = document.getElementById('prompt');
const promptText = Array.from(prompt.children, block => block.textContent.trim()).join('\n\n');
const copy = document.getElementById('copy-move');
const preview = document.getElementById('prompt-preview');
const status = document.getElementById('move-status');
const manualCopyNote = document.getElementById('manual-copy-note');
const chart = document.getElementById('chart-foldout');
const openChart = document.getElementById('open-chart');

if (window.location.hash === '#prompt-preview') preview.open = true;

if (typeof chart.showModal === 'function') {
  openChart.setAttribute('aria-haspopup', 'dialog');
  openChart.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    chart.showModal();
    event.preventDefault();
  });
}

for (const id of ['chatgpt', 'claude']) {
  const launcher = document.getElementById(id);
  const url = new URL(launcher.href);
  url.searchParams.set('q', promptText);
  launcher.href = url.href;
}

async function copyPrompt(successMessage) {
  try {
    await navigator.clipboard.writeText(promptText);
    window.captureSiteEvent?.('prompt_copy');
    manualCopyNote.hidden = true;
    status.textContent = successMessage;
  } catch {
    preview.open = true;
    manualCopyNote.hidden = false;
    status.textContent = 'The full prompt is open for manual copying.';
    preview.scrollIntoView({ block: 'start' });
    const range = document.createRange();
    range.selectNodeContents(prompt);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

copy.hidden = false;
copy.addEventListener('click', () => copyPrompt('Copied. Paste it into your own AI chat.'));
document.getElementById('gemini').addEventListener('click', () => copyPrompt('Copied. Paste it into Gemini.'));
