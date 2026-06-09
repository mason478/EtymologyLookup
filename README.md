# Etymology Lookup

[![CI](https://github.com/mason478/Etymology/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/mason478/Etymology/actions/workflows/ci.yml)

A Chrome extension for quickly looking up word origins from Etymonline.

Built with React, TypeScript, and Webpack, and inspired by [Etymonline Extension](https://chromewebstore.google.com/detail/etymonline/giehjnnlopapngdjbjjgddpaagoimmgl).

## Features

- Popup search for etymology of a word.
- Optional selected-word lookup on webpages, disabled by default.
- Show etymology results directly inside the extension UI instead of redirecting to a new tab.
- All search results are from [Etymonline](https://www.etymonline.com).

## How It Works

This project is a Manifest V3 Chrome extension built with React, TypeScript, and Webpack.

- The popup UI sends lookup requests to the background service worker.
- The content script can show a small floating logo when a single word is selected on a webpage.
- The background service worker fetches the Etymonline word page HTML.
- `src/model/etymonlineParser.ts` extracts the word entries and sanitizes the result body.
- Popup and content-script panels share `src/renderEtymologyEntries.ts` for result markup.

This extension does not use an official authenticated Etymonline API. It parses public
Etymonline word pages.

## Development

```bash
npm install
npm run build
```

Load the generated `dist` directory in Chrome with `chrome://extensions` -> Developer mode -> Load unpacked.
Do not load `src` directly.

Useful commands:

```bash
npm run dev           # Watch and rebuild during development
npm run build         # Build the extension into dist/
```

After reloading the extension in Chrome, refresh any already-open webpages so the latest
content script is injected.

## Limitations

- The parser depends on Etymonline's current page structure. If their HTML changes, parsing
  may need updates.
- The selected-word lookup feature is opt-in because content scripts run on webpages.
- Results are for reference only and should be attributed to Etymonline.
