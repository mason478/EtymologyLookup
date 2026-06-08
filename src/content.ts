import { MessageType } from './types';
import './content.css';

const ROOT_TAG = 'etymology-lookup-panel';
let lastSelection = '';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getPanel = () => {
  const existing = document.querySelector<HTMLElement>(ROOT_TAG);
  if (existing) return existing;

  const panel = document.createElement(ROOT_TAG);
  panel.innerHTML = '<div class="etymology-card"><div class="etymology-top"><div class="etymology-word"></div><button class="etymology-close" type="button" aria-label="Close">×</button></div><div class="etymology-body">Open Etymonline for this word.</div><div class="etymology-actions"><button class="etymology-open" type="button">Open</button></div></div>';

  panel.querySelector('.etymology-close')?.addEventListener('click', () => panel.remove());
  panel.querySelector('.etymology-open')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MessageType.OpenEtymonline, word: lastSelection });
  });

  document.documentElement.appendChild(panel);
  return panel;
};

const showPanel = (word: string, rect: DOMRect) => {
  lastSelection = word;
  const panel = getPanel();
  const wordNode = panel.querySelector('.etymology-word');
  if (wordNode) wordNode.innerHTML = escapeHtml(word);

  const top = window.scrollY + rect.bottom + 8;
  const left = Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 380);
  panel.style.top = Math.max(top, 8) + 'px';
  panel.style.left = Math.max(left, 8) + 'px';
};

document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const text = selection?.toString().trim() || '';
  if (!selection || !text || text.length > 80 || /\s/.test(text)) return;

  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  const rect = range?.getBoundingClientRect();
  if (!rect) return;

  showPanel(text, rect);
});

document.addEventListener('click', (event) => {
  const panel = document.querySelector(ROOT_TAG);
  if (!panel || event.composedPath().includes(panel)) return;
  panel.remove();
});
