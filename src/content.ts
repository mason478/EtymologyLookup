import { parseEtymonlineWordHtml } from './model/etymonlineParser';
import { escapeHtml, renderEtymologyEntries } from './renderEtymologyEntries';
import { DEFAULT_SETTINGS, SELECTION_LOOKUP_ENABLED_KEY } from './settings';
import { FetchEtymologyHtmlResponse, MessageType } from './types';
import './content.css';

const ROOT_TAG = 'etymology-lookup-panel';
const TRIGGER_TAG = 'etymology-lookup-trigger';
let lastSelection = '';
let requestId = 0;
let isSelectionLookupEnabled = DEFAULT_SETTINGS[SELECTION_LOOKUP_ENABLED_KEY];

interface SelectionTarget {
  word: string;
  rect: DOMRect;
}

let pendingSelection: SelectionTarget | null = null;

chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
  isSelectionLookupEnabled = Boolean(settings[SELECTION_LOOKUP_ENABLED_KEY]);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[SELECTION_LOOKUP_ENABLED_KEY]) return;

  isSelectionLookupEnabled = Boolean(changes[SELECTION_LOOKUP_ENABLED_KEY].newValue);
  if (!isSelectionLookupEnabled) {
    pendingSelection = null;
    removeTrigger();
    document.querySelector(ROOT_TAG)?.remove();
  }
});

const getPanel = () => {
  const existing = document.querySelector<HTMLElement>(ROOT_TAG);
  if (existing) return existing;

  const panel = document.createElement(ROOT_TAG);
  panel.innerHTML = '<div class="etymology-card"><div class="etymology-top"><div class="etymology-word"></div><button class="etymology-close" type="button" aria-label="Close">×</button></div><div class="etymology-body"></div><div class="etymology-actions"><a class="etymology-open" href="#" role="button">Source</a></div></div>';

  panel.querySelector('.etymology-close')?.addEventListener('click', () => panel.remove());
  panel.querySelector('.etymology-open')?.addEventListener('click', (event) => {
    event.preventDefault();
    chrome.runtime.sendMessage({ type: MessageType.OpenEtymonline, word: lastSelection });
  });

  document.documentElement.appendChild(panel);
  return panel;
};

const removeTrigger = () => {
  document.querySelector(TRIGGER_TAG)?.remove();
};

const getTrigger = () => {
  const existing = document.querySelector<HTMLElement>(TRIGGER_TAG);
  if (existing) return existing;

  const trigger = document.createElement(TRIGGER_TAG);
  const iconUrl = chrome.runtime.getURL('icons/logo.png');
  trigger.innerHTML =
    '<button class="etymology-trigger-button" type="button" aria-label="Look up etymology">' +
    '<img src="' +
    iconUrl +
    '" alt="" />' +
    '</button>';

  trigger.querySelector('.etymology-trigger-button')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!pendingSelection) return;

    const { word, rect } = pendingSelection;
    removeTrigger();
    showPanel(word, rect);
  });

  document.documentElement.appendChild(trigger);
  return trigger;
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

      setBody(panel, renderEtymologyEntries(result.data.entries), 'ready');
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

const showTrigger = (word: string, rect: DOMRect) => {
  pendingSelection = { word, rect };
  const trigger = getTrigger();
  const top = window.scrollY + rect.bottom + 8;
  const left = window.scrollX + rect.right + 8;
  const maxLeft = window.scrollX + window.innerWidth - 40;

  trigger.style.top = Math.max(top, 8) + 'px';
  trigger.style.left = Math.max(Math.min(left, maxLeft), 8) + 'px';
};

document.addEventListener('mouseup', (event) => {
  if (!isSelectionLookupEnabled) return;

  const panel = document.querySelector(ROOT_TAG);
  const trigger = document.querySelector(TRIGGER_TAG);
  const path = event.composedPath();
  if ((panel && path.includes(panel)) || (trigger && path.includes(trigger))) return;

  window.setTimeout(() => {
    if (!isSelectionLookupEnabled) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    if (!selection || !text || text.length > 80 || /\s/.test(text)) {
      removeTrigger();
      pendingSelection = null;
      return;
    }

    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;

    showTrigger(text, rect);
  }, 0);
});

document.addEventListener('click', (event) => {
  const panel = document.querySelector(ROOT_TAG);
  const trigger = document.querySelector(TRIGGER_TAG);
  const path = event.composedPath();
  if ((panel && path.includes(panel)) || (trigger && path.includes(trigger))) return;

  removeTrigger();
  pendingSelection = null;
  panel?.remove();
});
