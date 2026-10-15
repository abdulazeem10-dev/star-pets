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
// Keep old hashed bundles available during Vercel's output tracing. The new
// index points to the current hashes; stale files are harmless and can be
// removed by a separate cleanup once deployment tracing has completed.
fs.mkdirSync(publicAssets, { recursive: true });
fs.cpSync(builtAssets, publicAssets, { recursive: true });

const html = fs.readFileSync(builtIndex);
fs.writeFileSync(path.join(publicDir, 'index.html'), html);

// Keep the existing public .html links working while they now load the React app.
for (const page of ['cat', 'dog', 'cart', 'checkout', 'about', 'grooming', 'login']) {
  fs.writeFileSync(path.join(publicDir, `${page}.html`), html);
}

console.log('React storefront deployed into /public. The existing Express API and MongoDB models are unchanged.');
