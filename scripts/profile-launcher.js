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

const questionForm = document.getElementById('question-form');
if (questionForm) {
  const question = document.getElementById('question');
  const questionStatus = document.getElementById('question-status');
  const profileUrl = document.querySelector('link[rel="alternate"][type="text/markdown"]').href;

  questionForm.addEventListener('submit', event => {
    event.preventDefault();
    const questionText = question.value.trim();
    if (!questionText) {
      questionStatus.textContent = 'Enter a question to add to the prompt.';
      question.focus();
      return;
    }
    const text = 'Read the Markdown at ' + profileUrl + '. Follow its agent instructions.\n\n' + questionText;
    return copyWithStatus(text, questionStatus, 'Copied. Paste it into your chat.',
      'Use the downloaded Markdown and ask your question in your chat.');
  });
  questionForm.hidden = false;
}
