import React from 'react';
import { createRoot } from 'react-dom/client';
import './options.css';

const App = () => (
  <main className="options">
    <h1>Etymology Lookup</h1>
    <p>The minimum extension is running. Parser and settings can be added next.</p>
  </main>
);

createRoot(document.getElementById('root')!).render(<App />);
