import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

const indexPath = join(dist, 'index.html');
const healthPath = join(dist, 'health.json');

assert(existsSync(dist), 'dist/ is missing; run npm run build first');
assert(existsSync(indexPath), 'dist/index.html is missing');
assert(existsSync(healthPath), 'dist/health.json is missing');

if (existsSync(indexPath)) {
  const html = read(indexPath);
  assert(html.includes('<div id="root"></div>'), 'index.html does not contain the React root');
  assert(/assets\/index-.*\.js/.test(html), 'index.html does not reference a built JS asset');
  assert(/assets\/index-.*\.css/.test(html), 'index.html does not reference a built CSS asset');
}

if (existsSync(healthPath)) {
  const health = JSON.parse(read(healthPath));
  assert(health.status === 'ok', 'health.json status is not ok');
  assert(health.app === 'abel', 'health.json app is not abel');
}

const assetDir = join(dist, 'assets');
assert(existsSync(assetDir), 'dist/assets is missing');
if (existsSync(assetDir)) {
  assert(statSync(assetDir).isDirectory(), 'dist/assets is not a directory');
}

if (failures.length) {
  console.error('Smoke test failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Smoke test passed: build assets and health check are present.');
