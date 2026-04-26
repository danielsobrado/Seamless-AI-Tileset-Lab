// Comparison Dashboard: full-screen branch comparison with diff slider.

const Dashboard = ({ nodes, branchA, branchB, onClose, onSetBranch }) => {
  const [split, setSplit] = React.useState(0.5);
  const [zoom, setZoom] = React.useState(2);
  const [favorite, setFavorite] = React.useState('B');
  const [tab, setTab] = React.useState('image');

  const nodeA = nodes.find(n => n.id === branchA);
  const nodeB = nodes.find(n => n.id === branchB);
  if (!nodeA || !nodeB) return null;

  const defA = NODE_TYPES[nodeA.type], defB = NODE_TYPES[nodeB.type];
  const paramsA = { ...defA.defaults, ...(nodeA.params || {}) };
  const paramsB = { ...defB.defaults, ...(nodeB.params || {}) };

  // Param diff
  const allKeys = Array.from(new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]));
  const diffs = allKeys.filter(k => JSON.stringify(paramsA[k]) !== JSON.stringify(paramsB[k]));

  const containerRef = React.useRef(null);
  const onSplitDrag = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const onMove = (ev) => {
      const x = ev.clientX - rect.left;
      setSplit(Math.max(0.05, Math.min(0.95, x / rect.width)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,17,21,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 1400, height: '100%', maxHeight: 900,
        background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <I.Compare size={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Comparison Dashboard</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
              {nodeA.id} ({nodeA.label || defA.title}) vs {nodeB.id} ({nodeB.label || defB.title})
            </div>
          </div>
          <button style={btnSecondary}><I.Download size={12} /> Export Markdown</button>
          <IconBtn onClick={onClose} title="Close"><I.X size={15} /></IconBtn>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 18px', background: '#fff' }}>
          {[
            { id: 'image', label: 'Image diff', icon: <I.Image size={12} /> },
            { id: 'scores', label: 'Score table', icon: <I.Chart size={12} /> },
            { id: 'params', label: `Param diff (${diffs.length})`, icon: <I.Settings size={12} /> },
          ].map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'transparent', border: 'none', padding: '12px 14px',
                fontSize: 12.5, fontWeight: 500,
                color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>{t.icon} {t.label}</button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {tab === 'image' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
              {/* Branch labels */}
              <div style={{ display: 'flex', padding: '10px 18px', gap: 12, borderBottom: '1px solid var(--border)', background: '#fff' }}>
                <BranchLabel side="A" node={nodeA} def={defA} fav={favorite === 'A'} onFav={() => setFavorite('A')} />
                <BranchLabel side="B" node={nodeB} def={defB} fav={favorite === 'B'} onFav={() => setFavorite('B')} />
              </div>
              {/* Diff slider */}
              <div ref={containerRef} style={{
                flex: 1, position: 'relative', overflow: 'hidden',
                background: '#0f1115',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AtlasCanvas scheme="transitions" cols={9} rows={3} tilePx={48 * zoom} seedBase={42} padding={1} style={{ imageRendering: 'pixelated' }} />
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  clipPath: `inset(0 ${(1 - split) * 100}% 0 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AtlasCanvas scheme="transitions" cols={9} rows={3} tilePx={48 * zoom} seedBase={91} padding={1} style={{ imageRendering: 'pixelated' }} />
                </div>
                {/* Split handle */}
                <div
                  onMouseDown={onSplitDrag}
                  style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `calc(${split * 100}% - 2px)`,
                    width: 4, background: '#fff', cursor: 'ew-resize', zIndex: 2,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 28, height: 28, borderRadius: '50%', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)', color: 'var(--ink-2)',
                  }}>
                    <I.Pan size={14} />
                  </div>
                </div>
                {/* Side labels */}
                <div style={{ position: 'absolute', left: 12, top: 12, padding: '4px 10px', background: 'rgba(15,17,21,0.7)', color: '#fff', fontSize: 11, borderRadius: 4, fontWeight: 600 }}>A · {nodeA.label || defA.title}</div>
                <div style={{ position: 'absolute', right: 12, top: 12, padding: '4px 10px', background: 'rgba(15,17,21,0.7)', color: '#fff', fontSize: 11, borderRadius: 4, fontWeight: 600 }}>B · {nodeB.label || defB.title}</div>
              </div>
              {/* Footer controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 18px', borderTop: '1px solid var(--border)', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Zoom</span>
                  <input type="range" min={1} max={6} step={0.5} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: 160, accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>{Math.round(zoom * 100)}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                  <I.Lock size={12} /> Seed locked at 42
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                  Filter: nearest
                </div>
              </div>
            </div>
          )}
          {tab === 'scores' && <ScoreTable nodeA={nodeA} nodeB={nodeB} />}
          {tab === 'params' && <ParamDiffTable paramsA={paramsA} paramsB={paramsB} diffs={diffs} />}
        </div>
      </div>
    </div>
  );
};

const BranchLabel = ({ side, node, def, fav, onFav }) => {
  const color = COLOR_TOKENS[def.color] || COLOR_TOKENS.accent;
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 10,
      padding: 10, background: 'var(--surface-2)', borderRadius: 6,
      border: '1px solid var(--border)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: color.soft, color: color.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{side}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{node.label || def.title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>{node.id} · {node.runs} run(s)</div>
      </div>
      <button onClick={onFav} style={{ ...iconBtnBase, color: fav ? '#eab308' : 'var(--ink-4)' }} title="Save as favorite">
        {fav ? <I.StarFill size={15} /> : <I.Star size={15} />}
      </button>
    </div>
  );
};

const ScoreTable = ({ nodeA, nodeB }) => {
  const rows = [
    { metric: 'mean worst-diff', a: 9.8, b: 4.2, lower: true },
    { metric: 'median worst-diff', a: 8.4, b: 3.6, lower: true },
    { metric: 'tiles passing (<5)', a: 3, b: 8, lower: false, unit: '/ 9' },
    { metric: 'visible seams (≥15)', a: 2, b: 0, lower: true },
    { metric: 'palette colors', a: 256, b: 128, lower: false },
    { metric: 'gen time', a: 3.4, b: 4.1, lower: true, unit: 's' },
  ];
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <th style={thStyle}>Metric</th>
            <th style={{ ...thStyle, width: 140 }}>A · {nodeA.label || NODE_TYPES[nodeA.type].title}</th>
            <th style={{ ...thStyle, width: 140 }}>B · {nodeB.label || NODE_TYPES[nodeB.type].title}</th>
            <th style={{ ...thStyle, width: 100 }}>Winner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const winner = r.lower ? (r.a < r.b ? 'A' : 'B') : (r.a > r.b ? 'A' : 'B');
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>{r.metric}</td>
                <td style={{ ...tdStyle, fontFamily: 'Geist Mono, monospace', color: winner === 'A' ? 'var(--green)' : 'var(--ink-2)', fontWeight: winner === 'A' ? 600 : 400 }}>{r.a}{r.unit ? ' ' + r.unit : ''}</td>
                <td style={{ ...tdStyle, fontFamily: 'Geist Mono, monospace', color: winner === 'B' ? 'var(--green)' : 'var(--ink-2)', fontWeight: winner === 'B' ? 600 : 400 }}>{r.b}{r.unit ? ' ' + r.unit : ''}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{winner}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ParamDiffTable = ({ paramsA, paramsB, diffs }) => (
  <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 10 }}>
      {diffs.length} parameter{diffs.length === 1 ? '' : 's'} differ
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Geist Mono, monospace' }}>
      <thead>
        <tr style={{ background: 'var(--surface-2)' }}>
          <th style={thStyle}>Param</th>
          <th style={thStyle}>A</th>
          <th style={thStyle}>B</th>
        </tr>
      </thead>
      <tbody>
        {diffs.map(k => (
          <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={tdStyle}>{k}</td>
            <td style={{ ...tdStyle, color: 'var(--red)' }}>{String(paramsA[k] ?? '—')}</td>
            <td style={{ ...tdStyle, color: 'var(--green)' }}>{String(paramsB[k] ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const thStyle = { textAlign: 'left', padding: '8px 12px', fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '10px 12px', fontSize: 12, color: 'var(--ink-2)' };
const btnSecondary = {
  background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 6,
  padding: '6px 12px', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
};

Object.assign(window, { Dashboard, btnSecondary });
