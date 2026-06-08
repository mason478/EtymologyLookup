import { parseEtymonlineWordHtml } from './model/etymonlineParser';
import { FetchEtymologyHtmlResponse, MessageType } from './types';
import './content.css';

const ROOT_TAG = 'etymology-lookup-panel';
let lastSelection = '';
let requestId = 0;

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
  panel.innerHTML = '<div class="etymology-card"><div class="etymology-top"><div class="etymology-word"></div><button class="etymology-close" type="button" aria-label="Close">×</button></div><div class="etymology-body"></div><div class="etymology-actions"><button class="etymology-open" type="button">Source</button></div></div>';

  panel.querySelector('.etymology-close')?.addEventListener('click', () => panel.remove());
  panel.querySelector('.etymology-open')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MessageType.OpenEtymonline, word: lastSelection });
  });

  document.documentElement.appendChild(panel);
  return panel;
};

const setBody = (panel: HTMLElement, html: string, state: 'loading' | 'error' | 'ready') => {
  const body = panel.querySelector<HTMLElement>('.etymology-body');
  if (!body) return;
  body.dataset.state = state;
  body.innerHTML = html;
};

const fetchEtymology = (word: string, activeRequestId: number) => {
  chrome.runtime.sendMessage(
    { type: MessageType.FetchEtymologyHtml, word },
    (response: FetchEtymologyHtmlResponse) => {
      if (activeRequestId !== requestId) return;

      const panel = document.querySelector<HTMLElement>(ROOT_TAG);
      if (!panel) return;

      if (chrome.runtime.lastError) {
        setBody(panel, escapeHtml(chrome.runtime.lastError.message || 'Extension request failed.'), 'error');
        return;
      }

      if (!response?.ok) {
        setBody(panel, escapeHtml(response?.error || 'Failed to load etymology.'), 'error');
        return;
      }

      const result = parseEtymonlineWordHtml(response.html);
      if (!result.ok) {
        setBody(panel, escapeHtml(result.error.message), 'error');
        return;
      }

      setBody(
        panel,
        result.data.entries
          .map((entry) => {
            const property = entry.property ? ' ' + entry.property : '';
            return (
              '<section class="etymology-entry"><div class="etymology-entry-title">' +
              escapeHtml(entry.word + property) +
              '</div><div class="etymology-entry-content">' +
              entry.html +
              '</div></section>'
            );
          })
          .join(''),
        'ready',
      );
    },
  );
};

const showPanel = (word: string, rect: DOMRect) => {
  lastSelection = word;
  requestId += 1;
  const panel = getPanel();
  const wordNode = panel.querySelector('.etymology-word');
  if (wordNode) wordNode.innerHTML = escapeHtml(word);
  setBody(panel, 'Loading etymology...', 'loading');

  const top = window.scrollY + rect.bottom + 8;
  const left = Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 380);
  panel.style.top = Math.max(top, 8) + 'px';
  panel.style.left = Math.max(left, 8) + 'px';

  fetchEtymology(word, requestId);
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
