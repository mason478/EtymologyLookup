import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseEtymonlineWordHtml } from '../model/etymonlineParser';
import { FetchEtymologyHtmlResponse, MessageType, PingResponse } from '../types';
import './popup.css';

const App = () => {
  const [word, setWord] = useState('flower');
  const [status, setStatus] = useState('Checking extension...');
  const [entryHtml, setEntryHtml] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MessageType.Ping }, (response: PingResponse) => {
      setStatus(response?.ok ? 'Manifest v' + response.manifestVersion + ' is running' : 'Extension is not responding');
    });
  }, []);

  const lookupWord = () => {
    const normalizedWord = word.trim();
    if (!normalizedWord) {
      setStatus('Enter a word first.');
      return;
    }

    setIsLoading(true);
    setEntryHtml('');
    setEntryTitle('');
    setSourceUrl('');
    setStatus('Loading etymology...');

    chrome.runtime.sendMessage(
      { type: MessageType.FetchEtymologyHtml, word: normalizedWord },
      (response: FetchEtymologyHtmlResponse) => {
        setIsLoading(false);

        if (chrome.runtime.lastError) {
          setStatus(chrome.runtime.lastError.message || 'Extension request failed.');
          return;
        }

        if (!response?.ok) {
          setStatus(response?.error || 'Failed to load etymology.');
          return;
        }

        const result = parseEtymonlineWordHtml(response.html);
        if (!result.ok) {
          setStatus(result.error.message);
          return;
        }

        const entry = result.data.entries[0];
        setEntryTitle(entry.word + (entry.property ? ' ' + entry.property : ''));
        setEntryHtml(entry.html);
        setSourceUrl(result.data.canonicalUrl || response.url);
        setStatus('Loaded from Etymonline.');
      },
    );
  };

  return (
    <main className="popup">
      <section className="masthead">
        <p className="eyebrow">Etymology Lookup</p>
        <h1>Word origins, one click away.</h1>
      </section>
      <label className="field">
        <span>Word</span>
        <input
          value={word}
          onChange={(event) => setWord(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') lookupWord();
          }}
        />
      </label>
      <button className="primary" type="button" onClick={lookupWord} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Lookup'}
      </button>
      <p className="status">{status}</p>
      {entryHtml && (
        <article className="result">
          <header className="result-title">{entryTitle}</header>
          <section
            className="result-body"
            // Parser sanitizes Etymonline body HTML before it reaches this render point.
            dangerouslySetInnerHTML={{ __html: entryHtml }}
          />
          {sourceUrl && (
            <a className="source" href={sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          )}
        </article>
      )}
    </main>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
