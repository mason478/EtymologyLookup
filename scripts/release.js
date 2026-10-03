#!/usr/bin/env node
'use strict';

// Build the extension and pack a signed CRX3 into release/.
//
// Usage: npm run release
//
// The signing key lives at keys/etymology-lookup.pem (PKCS#8, gitignored). Keep
// it stable so every release uses the same extension ID. Chrome is required to
// pack, since the CRX3 signature format is produced by Chrome itself.

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'release');
const KEY_DIR = path.join(ROOT, 'keys');
const KEY_FILE = path.join(KEY_DIR, 'etymology-lookup.pem');
const ID_ALPHABET = 'abcdefghijklmnop';

const log = (msg) => console.log(`[release] ${msg}`);
const fail = (msg) => {
  console.error(`[release] error: ${msg}`);
  process.exit(1);
};

function findChrome() {
  const macCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ];
  const winCandidates = [
    path.join(
      process.env['PROGRAMFILES'] || 'C:\\Program Files',
      'Google/Chrome/Application/chrome.exe',
    ),
    path.join(
      process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
      'Google/Chrome/Application/chrome.exe',
    ),
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(
      process.env['PROGRAMFILES'] || 'C:\\Program Files',
      'Microsoft/Edge/Application/msedge.exe',
    ),
  ];
  const pathCandidates = [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
  ];

  const candidates =
    process.platform === 'darwin'
      ? macCandidates
      : process.platform === 'win32'
        ? winCandidates
        : pathCandidates;

  for (const candidate of candidates) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
}

function ensureKey() {
  fs.mkdirSync(KEY_DIR, { recursive: true });

  if (!fs.existsSync(KEY_FILE)) {
    log('no signing key found, generating keys/etymology-lookup.pem');
    execFileSync(
      'openssl',
      ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', KEY_FILE],
      { stdio: 'inherit' },
    );
    return;
  }

  // Chrome only accepts PKCS#8 keys; convert older PKCS#1 keys in place.
  const firstLine = fs.readFileSync(KEY_FILE, 'utf8').split('\n', 1)[0];
  if (!firstLine.includes('BEGIN PRIVATE KEY')) {
    log('converting signing key to PKCS#8 for Chrome');
    const converted = `${KEY_FILE}.pkcs8`;
    execFileSync('openssl', ['pkcs8', '-topk8', '-nocrypt', '-in', KEY_FILE, '-out', converted]);
    fs.renameSync(converted, KEY_FILE);
  }
}

function extensionId() {
  const der = execFileSync('openssl', ['rsa', '-in', KEY_FILE, '-pubout', '-outform', 'DER'], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const digest = require('crypto').createHash('sha256').update(der).digest().subarray(0, 16);
  return Array.from(digest, (byte) => ID_ALPHABET[byte >> 4] + ID_ALPHABET[byte & 15]).join('');
}

function readVersion() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'manifest.json'), 'utf8'));
  return manifest.version;
}

function build() {
  log('building extension (npm run build)');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) fail('build failed');
}

function pack(chrome) {
  log('packing signed CRX with Chrome');
  spawnSync(
    chrome,
    [
      `--pack-extension=${DIST}`,
      `--pack-extension-key=${KEY_FILE}`,
      '--no-message-box',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    { stdio: 'inherit' },
  );

  const packed = `${DIST}.crx`;
  if (!fs.existsSync(packed)) fail('Chrome did not produce a .crx file');
  return packed;
}

function publish(packed, version) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const target = path.join(RELEASE_DIR, `etymology-lookup-${version}.crx`);

  // release/ should hold only the current artifact.
  for (const entry of fs.readdirSync(RELEASE_DIR)) {
    const full = path.join(RELEASE_DIR, entry);
    if (full !== target) fs.rmSync(full, { recursive: true, force: true });
  }

  fs.renameSync(packed, target);
  return target;
}

function main() {
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    fail('dependencies are missing, run `npm ci` first');
  }

  const chrome = findChrome();
  if (!chrome) fail('Google Chrome (or a Chromium-based browser) was not found');

  build();
  ensureKey();
  const packed = pack(chrome);
  const version = readVersion();
  const artifact = publish(packed, version);
  const size = (fs.statSync(artifact).size / 1024).toFixed(1);

  log(`extension id: ${extensionId()}`);
  log(`wrote ${path.relative(ROOT, artifact)} (${size} KB)`);
}

main();
