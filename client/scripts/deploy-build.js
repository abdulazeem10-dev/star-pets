const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const buildDir = path.join(root, 'public-build');
const publicDir = path.join(root, 'public');
const builtIndex = path.join(buildDir, 'index.html');

if (!fs.existsSync(builtIndex)) {
  throw new Error('React build is missing. Run npm run build:client again.');
}

const builtAssets = path.join(buildDir, 'assets');
const publicAssets = path.join(publicDir, 'assets');
fs.rmSync(publicAssets, { recursive: true, force: true });
fs.cpSync(builtAssets, publicAssets, { recursive: true });

const html = fs.readFileSync(builtIndex);
fs.writeFileSync(path.join(publicDir, 'index.html'), html);

// Copy the PWA manifest, service worker, and icon into Express's public root.
for (const asset of ['manifest.webmanifest', 'service-worker.js', 'star-pets-icon.svg']) {
  const source = path.join(buildDir, asset);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(publicDir, asset));
}

// Keep the existing public .html links working while they now load the React app.
for (const page of ['cat', 'dog', 'cart', 'checkout', 'about', 'grooming', 'login']) {
  fs.writeFileSync(path.join(publicDir, `${page}.html`), html);
}

console.log('React storefront deployed into /public. The existing Express API and MongoDB models are unchanged.');
