// Browser-native pipeline executor. All work happens locally in the browser using Blob, Canvas, and pixel data.

const PIPELINE_DEFAULT_TILE = 128;

function makeObjectUrl(blob) {
  return URL.createObjectURL(blob);
}

function makeTextArtifact(name, kind, mime, text, meta = {}) {
  const blob = new Blob([text], { type: mime });
  return { name, kind, mime, text, blob, url: makeObjectUrl(blob), size: blob.size, meta };
}

function makeJsonArtifact(name, data) {
  return makeTextArtifact(name, 'json', 'application/json', JSON.stringify(data, null, 2), data);
}

function makeMarkdownArtifact(name, text, meta = {}) {
  return makeTextArtifact(name, 'md', 'text/markdown', text, meta);
}

function makeCsvArtifact(name, rows, meta = {}) {
  const text = rows.map(row => row.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  }).join(',')).join('\n');
  return makeTextArtifact(name, 'csv', 'text/csv', text, meta);
}

function makeYamlArtifact(name, text, meta = {}) {
  return makeTextArtifact(name, 'yaml', 'text/yaml', text, meta);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')), 'image/png');
  });
}

async function makeCanvasArtifact(name, canvas, meta = {}) {
  const blob = await canvasToBlob(canvas);
  return {
    name,
    kind: 'image',
    mime: 'image/png',
    blob,
    url: makeObjectUrl(blob),
    size: blob.size,
    width: canvas.width,
    height: canvas.height,
    meta,
  };
}

async function loadBitmap(artifact) {
  if (!artifact) throw new Error('Missing image artifact');
  if (artifact.blob && window.createImageBitmap) return await createImageBitmap(artifact.blob);
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${artifact.name || 'image artifact'}`));
    img.src = artifact.url;
  });
}

function imageToCanvas(image, width = image.width, height = image.height, smoothing = false) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = !!smoothing;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function getResultArtifact(result, portId) {
  if (!result) return null;
  if (result.artifacts?.[portId]) return result.artifacts[portId];
  return result.list?.find(a => a.kind === 'image') || result.list?.[0] || null;
}

function requireInput(ctx, portId) {
  const edge = ctx.edges.find(e => e.to === ctx.node.id && e.toPort === portId);
  if (!edge) throw new Error(`Input "${portId}" is not connected`);
  const artifact = getResultArtifact(ctx.artifacts?.[edge.from], edge.fromPort);
  if (!artifact) throw new Error(`Input "${portId}" has no artifact. Run upstream node ${edge.from} first.`);
  return artifact;
}

function optionalInput(ctx, portId) {
  const edge = ctx.edges.find(e => e.to === ctx.node.id && e.toPort === portId);
  if (!edge) return null;
  const artifact = getResultArtifact(ctx.artifacts?.[edge.from], edge.fromPort);
  if (!artifact) throw new Error(`Input "${portId}" has no artifact. Run upstream node ${edge.from} first.`);
  return artifact;
}

function classStringFromArtifact(artifact) {
  if (!artifact) return '';
  try {
    const parsed = JSON.parse(artifact.text || '{}');
    return parsed.class_string || parsed.custom_class_string || '';
  } catch (_) {
    return '';
  }
}

function parseClassString(text) {
  const map = {};
  (text || '').split(';').forEach(part => {
    const [clsRaw, rangesRaw] = part.split(':');
    const cls = clsRaw?.trim();
    if (!cls || !rangesRaw) return;
    rangesRaw.split(',').forEach(piece => {
      const r = piece.trim();
      if (!r) return;
      if (r.includes('-')) {
        const [a, b] = r.split('-').map(Number);
        for (let i = a; Number.isFinite(i) && i <= b; i++) map[i] = cls;
      } else {
        const n = Number(r);
        if (Number.isFinite(n)) map[n] = cls;
      }
    });
  });
  return map;
}

function parseIdList(text, max) {
  const ids = new Set();
  (text || '').split(',').forEach(piece => {
    const r = piece.trim();
    if (!r) return;
    if (r.includes('-')) {
      const [a, b] = r.split('-').map(Number);
      for (let i = a; Number.isFinite(i) && i <= b; i++) ids.add(i);
    } else {
      const n = Number(r);
      if (Number.isFinite(n)) ids.add(n);
    }
  });
  if (!ids.size && max) for (let i = 1; i <= max; i++) ids.add(i);
  return ids;
}

function inferGrid(canvas, params = {}) {
  const tile = Number(params.tile_size) || PIPELINE_DEFAULT_TILE;
  const cols = Number(params.cols || params.assumed_cols) || Math.max(1, Math.floor(canvas.width / tile));
  const rows = Number(params.rows || params.assumed_rows) || Math.max(1, Math.floor(canvas.height / tile));
  return { tile, cols, rows };
}

function edgeMeanDiff(data, width, x1, y1, x2, y2, length, horizontal) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < length; i++) {
    const ax = x1 + (horizontal ? i : 0);
    const ay = y1 + (horizontal ? 0 : i);
    const bx = x2 + (horizontal ? i : 0);
    const by = y2 + (horizontal ? 0 : i);
    const ai = (ay * width + ax) * 4;
    const bi = (by * width + bx) * 4;
    sum += Math.abs(data[ai] - data[bi]) + Math.abs(data[ai + 1] - data[bi + 1]) + Math.abs(data[ai + 2] - data[bi + 2]);
    count += 3;
  }
  return count ? sum / count : 0;
}

function computeSeamRows(canvas, params = {}) {
  const { tile, cols, rows } = inferGrid(canvas, params);
  const classMap = parseClassString(params.custom_class_string || params.class_string || '');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c + 1;
      const cls = classMap[id] || 'unclassified';
      const only = String(params.only_classes || '').trim();
      if (only && !only.split(',').map(s => s.trim()).includes(cls)) continue;
      const x = c * tile;
      const y = r * tile;
      if (x + tile > canvas.width || y + tile > canvas.height) continue;
      const lr = edgeMeanDiff(img.data, canvas.width, x, y, x + tile - 1, y, tile, false);
      const tb = edgeMeanDiff(img.data, canvas.width, x, y, x, y + tile - 1, tile, true);
      const worst = Math.max(lr, tb);
      const verdict = worst < 5 ? 'yes' : worst < 15 ? 'maybe' : 'no';
      out.push({ tile: id, cls, l_r: Number(lr.toFixed(2)), t_b: Number(tb.toFixed(2)), worst: Number(worst.toFixed(2)), verdict });
    }
  }
  return out;
}

function drawClassOverlay(params, cols = 8, rows = 8, tile = 64) {
  const classMap = parseClassString(params.custom_class_string);
  const colors = { grass_base: '#56a050', transition: '#d99a45', dirt_base: '#8d5d33', props: '#7c3aed', unclassified: '#2a2e35' };
  const canvas = document.createElement('canvas');
  canvas.width = cols * tile;
  canvas.height = rows * tile;
  const ctx = canvas.getContext('2d');
  ctx.font = `${Math.max(10, tile / 4)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c + 1;
      const cls = classMap[id] || 'unclassified';
      ctx.fillStyle = colors[cls] || colors.unclassified;
      ctx.fillRect(c * tile, r * tile, tile, tile);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText(String(id), c * tile + tile / 2, r * tile + tile / 2);
    }
  }
  return canvas;
}

function drawHeatmap(rows, cols, tile = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = cols * tile;
  canvas.height = Math.max(1, Math.ceil(rows.length / cols)) * tile;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, i) => {
    const x = (i % cols) * tile;
    const y = Math.floor(i / cols) * tile;
    const t = Math.min(1, row.worst / 30);
    ctx.fillStyle = `rgb(${Math.round(70 + 170 * t)},${Math.round(170 - 110 * t)},${Math.round(80 - 20 * t)})`;
    ctx.fillRect(x, y, tile, tile);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, tile / 5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(row.tile), x + tile / 2, y + tile / 2 - 6);
    ctx.fillText(row.worst.toFixed(1), x + tile / 2, y + tile / 2 + 10);
  });
  return canvas;
}

function blendTileEdges(canvas, params) {
  const { tile, cols, rows } = inferGrid(canvas, params);
  const edge = Math.max(1, Number(params.edge_width) || 8);
  const strength = Math.max(0, Math.min(1, Number(params.strength) || 0.65));
  const ids = parseIdList(params.tile_ids, cols * rows);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const mix = (ai, bi, t) => {
    d[ai] = Math.round(d[ai] * (1 - t) + d[bi] * t);
    d[ai + 1] = Math.round(d[ai + 1] * (1 - t) + d[bi + 1] * t);
    d[ai + 2] = Math.round(d[ai + 2] * (1 - t) + d[bi + 2] * t);
  };
  ids.forEach(id => {
    const zero = id - 1;
    const c = zero % cols;
    const r = Math.floor(zero / cols);
    const ox = c * tile;
    const oy = r * tile;
    if (ox + tile > canvas.width || oy + tile > canvas.height) return;
    for (let y = 0; y < tile; y++) {
      for (let n = 0; n < edge; n++) {
        const t = strength * (1 - n / edge);
        const li = ((oy + y) * canvas.width + ox + n) * 4;
        const ri = ((oy + y) * canvas.width + ox + tile - 1 - n) * 4;
        mix(li, ri, t * 0.5);
        mix(ri, li, t * 0.5);
      }
    }
    for (let x = 0; x < tile; x++) {
      for (let n = 0; n < edge; n++) {
        const t = strength * (1 - n / edge);
        const ti = ((oy + n) * canvas.width + ox + x) * 4;
        const bi = ((oy + tile - 1 - n) * canvas.width + ox + x) * 4;
        mix(ti, bi, t * 0.5);
        mix(bi, ti, t * 0.5);
      }
    }
  });
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function makePreview(canvas, params) {
  const { tile, cols, rows } = inferGrid(canvas, params);
  const width = Number(params.width) || 20;
  const height = Number(params.height) || 20;
  const outTile = Math.min(64, tile);
  const out = document.createElement('canvas');
  out.width = width * outTile;
  out.height = height * outTile;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = mulberry32(Number(params.seed) || 42);
  const fixed = Math.max(1, Math.min(cols * rows, Number(params.tile_number) || 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = params.mode === 'single' ? fixed : Math.floor(rng() * cols * rows) + 1;
      const src = id - 1;
      const sx = (src % cols) * tile;
      const sy = Math.floor(src / cols) * tile;
      ctx.drawImage(canvas, sx, sy, tile, tile, x * outTile, y * outTile, outTile, outTile);
    }
  }
  return out;
}

function extractTile(canvas, tileId, tileSize) {
  const cols = Math.max(1, Math.floor(canvas.width / tileSize));
  const idx = Math.max(0, tileId - 1);
  const sx = (idx % cols) * tileSize;
  const sy = Math.floor(idx / cols) * tileSize;
  const out = document.createElement('canvas');
  out.width = tileSize;
  out.height = tileSize;
  out.getContext('2d').drawImage(canvas, sx, sy, tileSize, tileSize, 0, 0, tileSize, tileSize);
  return out;
}

function generateTransitions(atlasA, atlasB, params) {
  const tile = Number(params.tile_size) || PIPELINE_DEFAULT_TILE;
  const a = extractTile(atlasA, Number(params.tile_a) || 1, tile);
  const b = extractTile(atlasB, Number(params.tile_b) || 1, tile);
  const variants = Number(params.variants) || 3;
  const cols = 9;
  const out = document.createElement('canvas');
  out.width = cols * tile;
  out.height = variants * tile;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  const modes = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br', 'island'];
  for (let v = 0; v < variants; v++) {
    modes.forEach((mode, m) => {
      const x = m * tile;
      const y = v * tile;
      ctx.drawImage(a, x, y);
      ctx.save();
      ctx.beginPath();
      const jitter = ((Number(params.seed) || 0) + v * 13 + m * 7) % 9;
      if (mode === 'top') ctx.rect(x, y, tile, tile * 0.45 + jitter);
      else if (mode === 'bottom') ctx.rect(x, y + tile * 0.55 - jitter, tile, tile);
      else if (mode === 'left') ctx.rect(x, y, tile * 0.45 + jitter, tile);
      else if (mode === 'right') ctx.rect(x + tile * 0.55 - jitter, y, tile, tile);
      else if (mode === 'tl') ctx.rect(x, y, tile * 0.58, tile * 0.58);
      else if (mode === 'tr') ctx.rect(x + tile * 0.42, y, tile * 0.58, tile * 0.58);
      else if (mode === 'bl') ctx.rect(x, y + tile * 0.42, tile * 0.58, tile * 0.58);
      else if (mode === 'br') ctx.rect(x + tile * 0.42, y + tile * 0.42, tile * 0.58, tile * 0.58);
      else ctx.arc(x + tile / 2, y + tile / 2, tile * 0.28 + jitter, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = params.blend_mode === 'alpha' ? 0.85 : 1;
      ctx.drawImage(b, x, y);
      ctx.restore();
    });
  }
  return out;
}

function extrudeAtlas(canvas, params) {
  const { tile, cols, rows } = inferGrid(canvas, params);
  const pad = Math.max(0, Number(params.padding) || 0);
  const out = document.createElement('canvas');
  out.width = cols * (tile + pad * 2);
  out.height = rows * (tile + pad * 2);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * tile;
      const sy = r * tile;
      const dx = c * (tile + pad * 2) + pad;
      const dy = r * (tile + pad * 2) + pad;
      ctx.drawImage(canvas, sx, sy, tile, tile, dx, dy, tile, tile);
      if (pad) {
        ctx.drawImage(canvas, sx, sy, tile, 1, dx, dy - pad, tile, pad);
        ctx.drawImage(canvas, sx, sy + tile - 1, tile, 1, dx, dy + tile, tile, pad);
        ctx.drawImage(canvas, sx, sy, 1, tile, dx - pad, dy, pad, tile);
        ctx.drawImage(canvas, sx + tile - 1, sy, 1, tile, dx + tile, dy, pad, tile);
      }
    }
  }
  return out;
}

function bindOutputs(outputs, artifacts) {
  const bound = {};
  outputs.forEach((output, i) => bound[output.id] = artifacts[i] || artifacts[0]);
  return bound;
}

function buildBrowserCommand(node, def) {
  const params = { ...def.defaults, ...(node.params || {}) };
  const lines = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`);
  return [`browser:${node.type}`, ...lines].join('\n');
}

async function runBrowserNode(ctx) {
  const { node, def } = ctx;
  const params = { ...def.defaults, ...(node.params || {}) };
  const stamp = new Date().toISOString();
  const outputs = def.outputs || [];
  const log = (line) => ctx.onLog?.(line);
  const progress = (pct) => ctx.onProgress?.(pct);
  const tick = async (pct, line) => {
    progress(pct);
    if (line) log(line);
    await new Promise(r => setTimeout(r, 40));
  };

  log(`$ ${buildBrowserCommand(node, def).split('\n')[0]}`);
  await tick(8, '[browser] resolving graph inputs');

  let list = [];

  if (node.type === 'raw_input') {
    const existing = ctx.artifacts?.[node.id];
    const atlas = existing?.artifacts?.atlas || existing?.list?.find(a => a.kind === 'image');
    if (!atlas) throw new Error('Upload a source atlas in the Raw Atlas Input node first.');
    list = [atlas, makeJsonArtifact('source-metadata.json', { source_label: atlas.name, width: atlas.width, height: atlas.height, generated_at: stamp })];
  } else if (node.type === 'clean') {
    const bitmap = await loadBitmap(requireInput(ctx, 'atlas'));
    await tick(25, '[clean] resizing/cropping atlas');
    const tile = Number(params.tile_size) || PIPELINE_DEFAULT_TILE;
    const cols = Number(params.cols) || 8;
    const rows = Number(params.rows) || 8;
    const canvas = imageToCanvas(bitmap, cols * tile, rows * tile, params.resample !== 'nearest');
    list = [await makeCanvasArtifact('cleaned-atlas.png', canvas, { rows, cols, tile_size: tile }), makeJsonArtifact('cleanup-metadata.json', { ...params, generated_at: stamp })];
  } else if (node.type === 'classify') {
    const bitmap = await loadBitmap(requireInput(ctx, 'atlas'));
    const canvas = imageToCanvas(bitmap);
    const grid = inferGrid(canvas, params);
    list = [makeJsonArtifact('tile-class-map.json', { preset: params.preset, class_string: params.custom_class_string, map: parseClassString(params.custom_class_string), generated_at: stamp }), await makeCanvasArtifact('class-overlay.png', drawClassOverlay(params, grid.cols, grid.rows), grid)];
  } else if (node.type === 'seam_report') {
    const bitmap = await loadBitmap(requireInput(ctx, 'atlas'));
    const classString = classStringFromArtifact(optionalInput(ctx, 'classmap'));
    const canvas = imageToCanvas(bitmap);
    await tick(35, '[seam] scoring tile edge continuity');
    const rows = computeSeamRows(canvas, { ...params, custom_class_string: classString });
    const mean = rows.reduce((s, r) => s + r.worst, 0) / Math.max(1, rows.length);
    const csvRows = [['tile', 'class', 'left_right', 'top_bottom', 'worst', 'verdict'], ...rows.map(r => [r.tile, r.cls, r.l_r, r.t_b, r.worst, r.verdict])];
    const md = ['# Seam Report', '', `Generated: ${stamp}`, '', `Mean worst diff: ${mean.toFixed(2)}`, '', '| tile | class | worst | verdict |', '| --- | --- | ---: | --- |', ...rows.map(r => `| ${r.tile} | ${r.cls} | ${r.worst.toFixed(2)} | ${r.verdict} |`)].join('\n');
    list = [makeMarkdownArtifact('seam-report.md', md, { mean_worst: mean }), makeCsvArtifact('seam-report.csv', csvRows), makeJsonArtifact('score-summary.json', { mean_worst: mean, rows, generated_at: stamp }), await makeCanvasArtifact('seam-heatmap.png', drawHeatmap(rows, inferGrid(canvas, params).cols), { rows: rows.length })];
  } else if (node.type === 'repair') {
    const bitmap = await loadBitmap(requireInput(ctx, 'atlas'));
    const classString = classStringFromArtifact(optionalInput(ctx, 'classmap'));
    const before = imageToCanvas(bitmap);
    const beforeRows = computeSeamRows(before, { ...params, custom_class_string: classString });
    const canvas = imageToCanvas(bitmap);
    await tick(35, '[repair] blending opposite tile edges');
    blendTileEdges(canvas, params);
    const afterRows = computeSeamRows(canvas, { ...params, custom_class_string: classString });
    const beforeMean = beforeRows.reduce((s, r) => s + r.worst, 0) / Math.max(1, beforeRows.length);
    const afterMean = afterRows.reduce((s, r) => s + r.worst, 0) / Math.max(1, afterRows.length);
    list = [await makeCanvasArtifact('repaired-atlas.png', canvas, inferGrid(canvas, params)), makeMarkdownArtifact('repair-report.md', `# Repair Report\n\nGenerated: ${stamp}\n\nBefore mean worst: ${beforeMean.toFixed(2)}\n\nAfter mean worst: ${afterMean.toFixed(2)}\n`), makeJsonArtifact('repair-metrics.json', { before_mean_worst: beforeMean, after_mean_worst: afterMean, generated_at: stamp })];
  } else if (node.type === 'preview') {
    const bitmap = await loadBitmap(requireInput(ctx, 'atlas'));
    const canvas = imageToCanvas(bitmap);
    list = [await makeCanvasArtifact('preview-map.png', makePreview(canvas, params), { width: params.width, height: params.height })];
  } else if (node.type === 'transitions') {
    const atlasA = imageToCanvas(await loadBitmap(requireInput(ctx, 'atlas_a')));
    const atlasB = imageToCanvas(await loadBitmap(requireInput(ctx, 'atlas_b')));
    await tick(35, '[transitions] generating transition atlas from selected source tiles');
    const generated = generateTransitions(atlasA, atlasB, params);
    const manifest = `preset: ${params.preset}\nseed: ${params.seed}\nvariants: ${params.variants}\ntile_a: ${params.tile_a}\ntile_b: ${params.tile_b}\n`;
    list = [await makeCanvasArtifact('transition-tiles.png', generated, { variants: params.variants }), makeYamlArtifact('transition-manifest.yaml', manifest)];
  } else if (node.type === 'contact_sheet') {
    const input = await loadBitmap(requireInput(ctx, 'tiles'));
    list = [await makeCanvasArtifact('contact-sheet.png', imageToCanvas(input), { source: 'transition tiles' })];
  } else if (node.type === 'extrude') {
    const bitmap = await loadBitmap(requireInput(ctx, 'atlas'));
    const canvas = imageToCanvas(bitmap);
    list = [await makeCanvasArtifact('padded-atlas.png', extrudeAtlas(canvas, params), { padding: params.padding }), makeJsonArtifact('engine-import-meta.json', { tile_size: params.tile_size, margin: params.padding, spacing: (params.padding || 0) * 2, generated_at: stamp })];
  } else if (node.type === 'dashboard') {
    list = [makeMarkdownArtifact('comparison-summary.md', `# Comparison Summary\n\nGenerated: ${stamp}\n\nThis file summarizes the current in-browser graph state.`, { generated_at: stamp })];
  }

  await tick(100, `[browser] generated ${list.length} artifact(s)`);
  return { nodeId: node.id, generatedAt: stamp, artifacts: bindOutputs(outputs, list), list };
}

window.BrowserPipeline = { runBrowserNode, buildBrowserCommand, makeJsonArtifact };
window.runBrowserNode = runBrowserNode;
