# Etymology Lookup

A minimal Chrome Manifest V3 extension scaffolded with React and Webpack.

## Development

```bash
npm install
npm run build
```

Load the generated `dist` directory in Chrome with `chrome://extensions` -> Developer mode -> Load unpacked.

Current behavior:

- React popup opens Etymonline for a word.
- Content script shows a small selection panel for single-word selections.
- Context menu opens Etymonline for selected text.
