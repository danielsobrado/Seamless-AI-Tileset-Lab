import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { transformSync } from '@babel/core';

const orderedSources = [
  'tweaks-panel.jsx',
  'src/icons.jsx',
  'src/tile-art.jsx',
  'src/data.jsx',
  'src/browser-pipeline.jsx',
  'src/graph.jsx',
  'src/inspector.jsx',
  'src/dashboard.jsx',
  'src/app.jsx',
];

const html = await readFile('index.html', 'utf8');
const bundle = [];

for (const file of orderedSources) {
  const source = await readFile(file, 'utf8');
  const transformed = transformSync(source, {
    filename: file,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    comments: false,
    compact: false,
  });
  bundle.push(`\n/* ${file} */\n${transformed.code}\n`);
}

const productionHtml = html
  .replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone[^>]*><\/script>\s*/g, '')
  .replace(/<script type="text\/babel" src="[^"]+"><\/script>\s*/g, '')
  .replace('</body>', '<script src="app.js"></script>\n</body>');

await mkdir('dist', { recursive: true });
await writeFile('dist/app.js', bundle.join('\n'), 'utf8');
await writeFile('dist/index.html', productionHtml, 'utf8');
