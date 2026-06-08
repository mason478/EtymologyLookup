import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageType, PingResponse } from '../types';
import './popup.css';

const App = () => {
  const [word, setWord] = useState('flower');
  const [status, setStatus] = useState('Checking extension...');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MessageType.Ping }, (response: PingResponse) => {
      setStatus(response?.ok ? 'Manifest v' + response.manifestVersion + ' is running' : 'Extension is not responding');
    });
  }, []);

  const openWord = () => {
    chrome.runtime.sendMessage({ type: MessageType.OpenEtymonline, word });
  };

  return (
    <main className="popup">
      <section className="masthead">
        <p className="eyebrow">Etymology Lookup</p>
        <h1>Word origins, one click away.</h1>
      </section>
      <label className="field">
        <span>Word</span>
        <input value={word} onChange={(event) => setWord(event.target.value)} />
      </label>
      <button className="primary" type="button" onClick={openWord}>Open Etymonline</button>
      <p className="status">{status}</p>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
