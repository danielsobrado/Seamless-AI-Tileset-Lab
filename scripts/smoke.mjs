import { readFile, stat } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const js = await stat('dist/app.js');

if (html.includes('text/babel')) {
  throw new Error('Production HTML still references runtime Babel scripts.');
}

if (!html.includes('app.js')) {
  throw new Error('Production HTML does not load app.js.');
}

if (js.size < 1000) {
  throw new Error('Production bundle is unexpectedly small.');
}

console.log(`Smoke check passed: dist/app.js ${js.size} bytes`);
