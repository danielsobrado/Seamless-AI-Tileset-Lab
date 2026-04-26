// Procedural pixel-art tile renderer. Generates fake-but-believable atlases.
// Used purely as visual filler — users can upload real PNGs to replace.

const TILE_PALETTES = {
  grass: ['#3f7a3a', '#4a8a45', '#56a050', '#67b85e', '#78c96a', '#5a9054', '#3d6e38'],
  grass_dark: ['#284e25', '#365f30', '#406e3a', '#4d7e44', '#558b4a', '#3a6534', '#2c5028'],
  dirt: ['#7a4f2a', '#8d5d33', '#a26d3d', '#b07c48', '#c08c54', '#6e4724', '#5b3a1d'],
  sand: ['#c8a66e', '#d4b27a', '#dfbf88', '#e6c994', '#bf9c63', '#a98856', '#92744a'],
  stone: ['#7a7d84', '#8b8e95', '#9aa0a8', '#aab0b8', '#6c6f75', '#5b5e64', '#a7adb5'],
  water: ['#2e6cb6', '#3a7dc6', '#4a8ed5', '#5fa1e0', '#6fb0e8', '#2a5fa3', '#1e4d88'],
  snow: ['#dfe6ec', '#ebf0f5', '#f5f8fb', '#cfd6dd', '#bdc4cb', '#a9b0b7', '#e8edf2'],
};

// Deterministic PRNG so tiles look the same across renders
function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw one terrain tile (16x16 logical pixels) into ctx at (ox,oy) of size px
function drawTerrainTile(ctx, ox, oy, px, palette, seed, opts = {}) {
  const N = 16; // logical pixels per tile
  const cell = px / N;
  const rng = mulberry32(seed);
  // Soft noise field to pick palette index
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const r = rng();
      let idx;
      if (r < 0.04) idx = 0;
      else if (r < 0.32) idx = 1;
      else if (r < 0.68) idx = 2;
      else if (r < 0.88) idx = 3;
      else if (r < 0.96) idx = 4;
      else idx = 5;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
  // Sprinkle of detail (darker dots)
  const detail = Math.floor((opts.detail ?? 6));
  for (let i = 0; i < detail; i++) {
    const x = Math.floor(rng() * N), y = Math.floor(rng() * N);
    ctx.fillStyle = palette[6];
    ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
  }
}

// Transition tile: terrain A on bottom-right, B on top-left, with mask edge
function drawTransitionTile(ctx, ox, oy, px, palA, palB, seed, mode = 'edge_top') {
  const N = 16;
  const cell = px / N;
  const rng = mulberry32(seed);
  // Build mask: 1 where palB shows, 0 where palA
  const mask = new Array(N * N).fill(0);
  if (mode === 'edge_top') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cutoff = 6 + Math.floor(rng() * 3) - 1; // jagged
      mask[y * N + x] = y < cutoff ? 1 : 0;
    }
  } else if (mode === 'edge_bottom') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cutoff = 10 + Math.floor(rng() * 3) - 1;
      mask[y * N + x] = y > cutoff ? 1 : 0;
    }
  } else if (mode === 'corner_tl') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      mask[y * N + x] = (x < 8 && y < 8) || (rng() < 0.05 && x < 11 && y < 11) ? 1 : 0;
    }
  } else if (mode === 'corner_tr') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      mask[y * N + x] = (x > 7 && y < 8) || (rng() < 0.05 && x > 4 && y < 11) ? 1 : 0;
    }
  } else if (mode === 'edge_left') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cutoff = 5 + Math.floor(rng() * 3);
      mask[y * N + x] = x < cutoff ? 1 : 0;
    }
  } else if (mode === 'edge_right') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cutoff = 10 + Math.floor(rng() * 3);
      mask[y * N + x] = x > cutoff ? 1 : 0;
    }
  } else if (mode === 'island') {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - 8, dy = y - 8;
      mask[y * N + x] = dx * dx + dy * dy < 25 + rng() * 8 ? 1 : 0;
    }
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const palette = mask[y * N + x] ? palB : palA;
      const r = rng();
      let idx = r < 0.3 ? 1 : r < 0.7 ? 2 : r < 0.9 ? 3 : 4;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function drawPropTile(ctx, ox, oy, px, kind, seed) {
  const N = 16, cell = px / N;
  const rng = mulberry32(seed);
  // Background grass
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    ctx.fillStyle = TILE_PALETTES.grass[rng() < 0.5 ? 1 : 2];
    ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
  }
  if (kind === 'rock') {
    const stone = TILE_PALETTES.stone;
    [[6,8],[7,7],[8,7],[9,8],[10,9],[10,10],[9,11],[8,11],[7,11],[6,10],[6,9]].forEach(([x,y]) => {
      ctx.fillStyle = stone[2]; ctx.fillRect(ox + x*cell, oy + y*cell, Math.ceil(cell), Math.ceil(cell));
    });
    [[7,8],[8,8],[9,9]].forEach(([x,y]) => {
      ctx.fillStyle = stone[3]; ctx.fillRect(ox + x*cell, oy + y*cell, Math.ceil(cell), Math.ceil(cell));
    });
  } else if (kind === 'flower') {
    ctx.fillStyle = '#d94c75'; ctx.fillRect(ox + 8*cell, oy + 7*cell, Math.ceil(cell), Math.ceil(cell));
    ctx.fillStyle = '#f0a8b8'; [[7,7],[9,7],[8,6],[8,8]].forEach(([x,y]) => ctx.fillRect(ox+x*cell, oy+y*cell, Math.ceil(cell), Math.ceil(cell)));
    ctx.fillStyle = '#3a6e34'; ctx.fillRect(ox + 8*cell, oy + 9*cell, Math.ceil(cell), Math.ceil(cell));
  } else if (kind === 'bush') {
    const g = TILE_PALETTES.grass_dark;
    [[6,8],[7,7],[8,6],[9,7],[10,8],[10,9],[9,10],[8,11],[7,10],[6,9],[7,9],[8,8],[9,8],[8,9]].forEach(([x,y]) => {
      ctx.fillStyle = g[Math.floor(rng()*4)]; ctx.fillRect(ox+x*cell, oy+y*cell, Math.ceil(cell), Math.ceil(cell));
    });
  } else if (kind === 'mushroom') {
    ctx.fillStyle = '#c43c3c'; [[7,6],[8,5],[9,6],[6,7],[10,7],[7,8],[8,8],[9,8]].forEach(([x,y]) => ctx.fillRect(ox+x*cell, oy+y*cell, Math.ceil(cell), Math.ceil(cell)));
    ctx.fillStyle = '#fff0c4'; [[8,6],[7,7],[9,7]].forEach(([x,y]) => ctx.fillRect(ox+x*cell, oy+y*cell, Math.ceil(cell), Math.ceil(cell)));
    ctx.fillStyle = '#e6dac0'; [[8,9],[8,10]].forEach(([x,y]) => ctx.fillRect(ox+x*cell, oy+y*cell, Math.ceil(cell), Math.ceil(cell)));
  }
}

// Render an atlas: rows x cols grid of tiles
// scheme: 'grass' | 'grass_clean' | 'grass_dirty' | 'transitions' | 'mixed'
function renderAtlas(canvas, opts = {}) {
  const rows = opts.rows ?? 8;
  const cols = opts.cols ?? 8;
  const tilePx = opts.tilePx ?? 24;
  const padding = opts.padding ?? 0;
  const scheme = opts.scheme ?? 'grass';
  const seedBase = opts.seedBase ?? 42;
  const W = cols * tilePx + (cols - 1) * padding + padding * 2;
  const H = rows * tilePx + (rows - 1) * padding + padding * 2;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = opts.bg ?? '#1a1d22';
  ctx.fillRect(0, 0, W, H);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = padding + c * (tilePx + padding);
      const oy = padding + r * (tilePx + padding);
      const idx = r * cols + c;
      const seed = seedBase + idx * 17;

      if (scheme === 'grass' || scheme === 'grass_clean') {
        // Top 2 rows: grass base, row 3: grass darker, row 4: dirt edge transitions
        if (r < 2) {
          drawTerrainTile(ctx, ox, oy, tilePx, TILE_PALETTES.grass, seed, { detail: 4 + (idx % 4) });
        } else if (r < 4) {
          // transition row
          const modes = ['edge_top','edge_bottom','edge_left','edge_right','corner_tl','corner_tr','island','edge_top'];
          drawTransitionTile(ctx, ox, oy, tilePx, TILE_PALETTES.grass, TILE_PALETTES.dirt, seed, modes[c % modes.length]);
        } else if (r < 6) {
          drawTerrainTile(ctx, ox, oy, tilePx, TILE_PALETTES.dirt, seed, { detail: 6 });
        } else {
          // props
          const kinds = ['rock','flower','bush','mushroom','rock','flower','bush','rock'];
          drawPropTile(ctx, ox, oy, tilePx, kinds[c % kinds.length], seed);
        }
      } else if (scheme === 'grass_dirty') {
        // Same as clean but with stripe artifacts and seam noise
        if (r < 2) {
          drawTerrainTile(ctx, ox, oy, tilePx, TILE_PALETTES.grass, seed, { detail: 8 });
          // Add seam stripe on right edge
          ctx.fillStyle = '#1d3a1c';
          ctx.fillRect(ox + tilePx - 2, oy, 2, tilePx);
        } else if (r < 4) {
          const modes = ['edge_top','edge_bottom','edge_left','edge_right','corner_tl','corner_tr','island','edge_top'];
          drawTransitionTile(ctx, ox, oy, tilePx, TILE_PALETTES.grass, TILE_PALETTES.dirt, seed, modes[c % modes.length]);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(ox, oy + tilePx - 2, tilePx, 2);
        } else if (r < 6) {
          drawTerrainTile(ctx, ox, oy, tilePx, TILE_PALETTES.dirt, seed, { detail: 9 });
        } else {
          const kinds = ['rock','flower','bush','mushroom','rock','flower','bush','rock'];
          drawPropTile(ctx, ox, oy, tilePx, kinds[c % kinds.length], seed);
        }
      } else if (scheme === 'transitions') {
        const modes = ['edge_top','edge_bottom','edge_left','edge_right','corner_tl','corner_tr','island','edge_top','edge_bottom','edge_left'];
        drawTransitionTile(ctx, ox, oy, tilePx, TILE_PALETTES.grass, TILE_PALETTES.dirt, seed, modes[(idx) % modes.length]);
      } else if (scheme === 'preview_grass') {
        // 20x20 random grass — lots of grass tiles
        drawTerrainTile(ctx, ox, oy, tilePx, TILE_PALETTES.grass, seed, { detail: 4 + (idx % 5) });
      } else if (scheme === 'classmap') {
        // Color-coded class overlay
        const cls = r < 2 ? 'grass_base' : r < 4 ? 'transition' : r < 6 ? 'dirt_base' : 'props';
        const colors = { grass_base: '#56a050', transition: '#d99a45', dirt_base: '#8d5d33', props: '#7c3aed' };
        ctx.fillStyle = colors[cls];
        ctx.fillRect(ox, oy, tilePx, tilePx);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `${Math.max(8, tilePx / 3)}px Geist Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(idx + 1, ox + tilePx / 2, oy + tilePx / 2 + 1);
      } else if (scheme === 'heatmap') {
        // Per-tile seam score: red intensity
        const score = Math.abs(Math.sin(idx * 1.7) * 40);
        const t = Math.min(1, score / 30);
        const baseR = r < 2 ? 86 : r < 4 ? 217 : r < 6 ? 141 : 124;
        const baseG = r < 2 ? 160 : r < 4 ? 154 : r < 6 ? 93 : 58;
        const baseB = r < 2 ? 80 : r < 4 ? 69 : r < 6 ? 51 : 237;
        ctx.fillStyle = `rgb(${Math.floor(baseR + (240-baseR)*t)},${Math.floor(baseG + (60-baseG)*t)},${Math.floor(baseB + (60-baseB)*t)})`;
        ctx.fillRect(ox, oy, tilePx, tilePx);
      }
    }
  }
}

// Single-tile preview — for inspector
function renderTile(canvas, opts = {}) {
  const px = opts.px ?? 96;
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const palette = TILE_PALETTES[opts.palette ?? 'grass'];
  drawTerrainTile(ctx, 0, 0, px, palette, opts.seed ?? 42, { detail: opts.detail ?? 6 });
}

// Repeated 4x4 preview of a single tile
function renderRepeatPreview(canvas, opts = {}) {
  const tilePx = opts.tilePx ?? 32;
  const reps = opts.reps ?? 4;
  const W = tilePx * reps, H = tilePx * reps;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const palette = TILE_PALETTES[opts.palette ?? 'grass'];
  // Pre-render one tile, then stamp it
  const tmp = document.createElement('canvas');
  tmp.width = tilePx; tmp.height = tilePx;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  drawTerrainTile(tctx, 0, 0, tilePx, palette, opts.seed ?? 42, { detail: 4 });
  // If "dirty" — draw with seam line
  for (let r = 0; r < reps; r++) for (let c = 0; c < reps; c++) {
    ctx.drawImage(tmp, c * tilePx, r * tilePx);
  }
  if (opts.showSeam) {
    for (let i = 1; i < reps; i++) {
      ctx.fillStyle = 'rgba(20,40,18,0.55)';
      ctx.fillRect(i * tilePx - 1, 0, 1, H);
      ctx.fillRect(0, i * tilePx - 1, W, 1);
    }
  }
}

// ReactComponent wrappers
const AtlasCanvas = ({ scheme, rows = 8, cols = 8, tilePx = 16, seedBase = 42, padding = 0, bg, style, className }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) renderAtlas(ref.current, { scheme, rows, cols, tilePx, seedBase, padding, bg });
  }, [scheme, rows, cols, tilePx, seedBase, padding, bg]);
  return <canvas ref={ref} className={className} style={{ imageRendering: 'pixelated', ...style }} />;
};

const TileCanvas = ({ palette = 'grass', seed = 42, detail = 6, px = 96, style, className }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) renderTile(ref.current, { palette, seed, detail, px });
  }, [palette, seed, detail, px]);
  return <canvas ref={ref} className={className} style={{ imageRendering: 'pixelated', ...style }} />;
};

const RepeatCanvas = ({ palette = 'grass', seed = 42, tilePx = 32, reps = 4, showSeam = false, style, className }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) renderRepeatPreview(ref.current, { palette, seed, tilePx, reps, showSeam });
  }, [palette, seed, tilePx, reps, showSeam]);
  return <canvas ref={ref} className={className} style={{ imageRendering: 'pixelated', ...style }} />;
};

Object.assign(window, { AtlasCanvas, TileCanvas, RepeatCanvas, TILE_PALETTES });
