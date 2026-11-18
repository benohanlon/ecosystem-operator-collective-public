const prompt = document.getElementById('prompt');
const promptText = prompt.textContent.trim();
const status = document.getElementById('copy-status');
const launchers = [
  ['chatgpt', 'https://chatgpt.com/'],
  ['claude', 'https://claude.ai/new']
];

for (const [id, destination] of launchers) {
  const url = new URL(destination);
  url.searchParams.set('q', promptText);
  document.getElementById(id).href = url.href;
}

async function copyWithStatus(text, output, message, fallback) {
  try {
    await navigator.clipboard.writeText(text);
    output.textContent = message;
  } catch {
    output.textContent = fallback;
  }
}

const copyFallback = 'Select the prompt to copy it.';
document.getElementById('copy').addEventListener('click', () =>
  copyWithStatus(promptText, status, 'Copied. Paste it into your chat.', copyFallback));
document.getElementById('gemini').addEventListener('click', () =>
  copyWithStatus(promptText, status, 'Copied. Paste it into Gemini.', copyFallback));
document.getElementById('prompt-actions').hidden = false;

document.querySelector('.agent-instructions-jump')?.addEventListener('click', () => {
  document.getElementById('agent-instructions').open = true;
});
