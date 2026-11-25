/*
 * SPDX-FileCopyrightText: 2026 Ben O’Hanlon
 * SPDX-License-Identifier: MIT
 */
const shareButton = document.querySelector('[data-share-page]');
const shareStatus = shareButton.parentElement.querySelector('[role="status"]');
const shareUrl = document.querySelector('link[rel="canonical"]').href;

shareButton.hidden = false;
shareButton.addEventListener('click', async () => {
  shareStatus.textContent = '';
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url: shareUrl });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareStatus.textContent = 'Link copied.';
  } catch {
    window.prompt('Copy the page link', shareUrl);
  }
});
