import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EtymonlineEntry, parseEtymonlineWordHtml } from '../model/etymonlineParser';
import { renderEtymologyEntries } from '../renderEtymologyEntries';
import { DEFAULT_SETTINGS, SELECTION_LOOKUP_ENABLED_KEY } from '../settings';
import { FetchEtymologyHtmlResponse, MessageType, PingResponse } from '../types';
import './popup.css';

const App = () => {
  const [word, setWord] = useState('');
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'default' | 'loaded'>('default');
  const [entries, setEntries] = useState<EtymonlineEntry[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectionLookupEnabled, setIsSelectionLookupEnabled] = useState(
    DEFAULT_SETTINGS[SELECTION_LOOKUP_ENABLED_KEY],
  );

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MessageType.Ping }, (response: PingResponse) => {
      setStatus(response?.ok ? '' : 'Extension is not responding');
      setStatusKind('default');
    });

    chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      setIsSelectionLookupEnabled(Boolean(settings[SELECTION_LOOKUP_ENABLED_KEY]));
    });
  }, []);

  const setSelectionLookupEnabled = (enabled: boolean) => {
    setIsSelectionLookupEnabled(enabled);
    chrome.storage.local.set({ [SELECTION_LOOKUP_ENABLED_KEY]: enabled });
  };

  const lookupWord = () => {
    const normalizedWord = word.trim();
    if (!normalizedWord) {
      setStatus('Enter a word first.');
      setStatusKind('default');
      return;
    }

    setIsLoading(true);
    setEntries([]);
    setSourceUrl('');
    setStatus('Loading etymology...');
    setStatusKind('default');

    chrome.runtime.sendMessage(
      { type: MessageType.FetchEtymologyHtml, word: normalizedWord },
      (response: FetchEtymologyHtmlResponse) => {
        setIsLoading(false);

        if (chrome.runtime.lastError) {
          setStatus(chrome.runtime.lastError.message || 'Extension request failed.');
          setStatusKind('default');
          return;
        }

        if (!response?.ok) {
          setStatus(response?.error || 'Failed to load etymology.');
          setStatusKind('default');
          return;
        }

        const result = parseEtymonlineWordHtml(response.html);
        if (!result.ok) {
          setStatus(result.error.message);
          setStatusKind('default');
          return;
        }

        setEntries(result.data.entries);
        setSourceUrl(result.data.canonicalUrl || response.url);
        setStatus('Loaded from ');
        setStatusKind('loaded');
      },
    );
  };

  return (
    <main className="popup">
      <section className="masthead">
        <p className="eyebrow">Etymology Lookup</p>
        <p className="tagline">
          Search word origin and histories via{' '}
          <a href="https://www.etymonline.com/" target="_blank" rel="noreferrer">
            Etymonline.
          </a>
        </p>
        <label className="selection-toggle">
          <input
            type="checkbox"
            checked={isSelectionLookupEnabled}
            onChange={(event) => setSelectionLookupEnabled(event.target.checked)}
          />
          <span>Look up selected words</span>
        </label>
      </section>
      <label className="search-control">
        <input
          placeholder="Enter a word (e.g., flower)..."
          value={word}
          onChange={(event) => setWord(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') lookupWord();
          }}
        />
        <button className="search-button" type="button" onClick={lookupWord} disabled={isLoading} aria-label="Lookup">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>
        </button>
      </label>
      {(status || statusKind === 'loaded') && (
        <p className="status">
          {status}
          {statusKind === 'loaded' && (
            <a href="https://www.etymonline.com/" target="_blank" rel="noreferrer">
              Etymonline
            </a>
          )}
          {statusKind === 'loaded' ? '.' : ''}
        </p>
      )}
      {entries.length > 0 && (
        <article className="result">
          <h2 className="result-heading">
            Origin and history of <span>{entries[0].word}</span>
          </h2>
          <div className="result-card">
            <div
              // Parser sanitizes Etymonline body HTML before it reaches this render point.
              dangerouslySetInnerHTML={{ __html: renderEtymologyEntries(entries) }}
            />
            {sourceUrl && (
              <a className="source" href={sourceUrl} target="_blank" rel="noreferrer">
                Source
              </a>
            )}
          </div>
        </article>
      )}
    </main>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
