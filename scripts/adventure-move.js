const prompt = document.getElementById('prompt');
const promptText = Array.from(prompt.children, block => block.textContent.trim()).join('\n\n');
const copy = document.getElementById('copy-move');
const preview = document.getElementById('prompt-preview');
const status = document.getElementById('move-status');
const chart = document.getElementById('chart-foldout');
const openChart = document.getElementById('open-chart');

if (typeof chart.showModal === 'function') {
  openChart.setAttribute('aria-haspopup', 'dialog');
  openChart.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    chart.showModal();
    event.preventDefault();
  });
}

if (document.querySelector('.adventure-spread').clientWidth >= 1080) {
  preview.open = true;
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
    status.textContent = successMessage;
  } catch {
    preview.open = true;
    status.textContent = 'Copy the selected prompt, then paste it into your AI chat.';
    status.scrollIntoView({ block: 'start' });
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
