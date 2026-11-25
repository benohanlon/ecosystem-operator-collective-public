/*
 * SPDX-FileCopyrightText: 2026 Ben O’Hanlon
 * SPDX-License-Identifier: MIT
 */
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
    window.captureSiteEvent?.('prompt_copy');
    output.textContent = message;
  } catch {
    output.textContent = fallback;
  }
}

const copy = document.getElementById('copy');
const copyFallback = 'Select the prompt to copy it.';
copy.addEventListener('click', () =>
  copyWithStatus(promptText, status, 'Copied. Paste it into your chat.', copyFallback));
document.getElementById('gemini').addEventListener('click', () =>
  copyWithStatus(promptText, status, 'Copied. Paste it into Gemini.', copyFallback));
copy.hidden = false;
document.getElementById('prompt-openers').hidden = false;

document.querySelector('.agent-instructions-jump')?.addEventListener('click', () => {
  document.getElementById('agent-instructions').open = true;
});

function openLinkedInterests() {
  const section = document.querySelector('.work-interests');
  const target = document.getElementById(location.hash.slice(1));
  if (section && target && section.contains(target)) section.open = true;
}
openLinkedInterests();
window.addEventListener('hashchange', openLinkedInterests);
