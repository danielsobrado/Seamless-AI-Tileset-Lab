// Comparison Dashboard: compares actual generated image artifacts and node parameters.

const Dashboard = ({ nodes, artifacts, branchA, branchB, onClose, onSetBranch }) => {
  const [split, setSplit] = React.useState(0.5);
  const [tab, setTab] = React.useState('image');
  const containerRef = React.useRef(null);

  const nodeA = nodes.find(n => n.id === branchA);
  const nodeB = nodes.find(n => n.id === branchB);
  if (!nodeA || !nodeB) return null;

  const defA = NODE_TYPES[nodeA.type], defB = NODE_TYPES[nodeB.type];
  const paramsA = { ...defA.defaults, ...(nodeA.params || {}) };
  const paramsB = { ...defB.defaults, ...(nodeB.params || {}) };
  const allKeys = Array.from(new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]));
  const diffs = allKeys.filter(k => JSON.stringify(paramsA[k]) !== JSON.stringify(paramsB[k]));
  const imageA = firstImageArtifact(artifacts?.[branchA]);
  const imageB = firstImageArtifact(artifacts?.[branchB]);

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,17,21,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 1400, height: '100%', maxHeight: 900, background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <I.Compare size={16} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Comparison Dashboard</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>{nodeA.id} vs {nodeB.id}</div>
          </div>
          <IconBtn onClick={onClose} title="Close"><I.X size={15} /></IconBtn>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 18px', background: '#fff' }}>
          {[
            { id: 'image', label: 'Image diff', icon: <I.Image size={12} /> },
            { id: 'artifacts', label: 'Artifacts', icon: <I.Folder size={12} /> },
            { id: 'params', label: `Param diff (${diffs.length})`, icon: <I.Settings size={12} /> },
          ].map(t => {
            const isActive = tab === t.id;
            return <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'transparent', border: 'none', padding: '12px 14px', fontSize: 12.5, fontWeight: 500, color: isActive ? 'var(--ink)' : 'var(--ink-3)', borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t.icon} {t.label}</button>;
          })}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {tab === 'image' && (
            <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0f1115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {imageA && imageB ? (
                <>
                  <img src={imageB.url} style={{ position: 'absolute', maxWidth: '90%', maxHeight: '90%', imageRendering: 'pixelated' }} />
                  <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - split) * 100}% 0 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={imageA.url} style={{ maxWidth: '90%', maxHeight: '90%', imageRendering: 'pixelated' }} />
                  </div>
                  <div onMouseDown={onSplitDrag} style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${split * 100}% - 2px)`, width: 4, background: '#fff', cursor: 'ew-resize', zIndex: 2 }} />
                  <div style={labelStyle('left')}>A - {imageA.name}</div>
                  <div style={labelStyle('right')}>B - {imageB.name}</div>
                </>
              ) : (
                <div style={{ color: '#fff', textAlign: 'center', fontSize: 13, lineHeight: 1.6 }}>
                  <I.Image size={28} style={{ opacity: 0.5 }} />
                  <div style={{ marginTop: 10 }}>Run both selected branch nodes to generate image artifacts.</div>
                </div>
              )}
            </div>
          )}
          {tab === 'artifacts' && <ArtifactCompare artifacts={artifacts} nodeA={nodeA} nodeB={nodeB} />}
          {tab === 'params' && <ParamDiffTable paramsA={paramsA} paramsB={paramsB} diffs={diffs} />}
        </div>
      </div>
    </div>
  );
};

function firstImageArtifact(result) {
  return result?.list?.find(a => a.kind === 'image') || Object.values(result?.artifacts || {}).find(a => a?.kind === 'image') || null;
}

function labelStyle(side) {
  return { position: 'absolute', [side]: 12, top: 12, padding: '4px 10px', background: 'rgba(15,17,21,0.7)', color: '#fff', fontSize: 11, borderRadius: 4, fontWeight: 600 };
}

const ArtifactCompare = ({ artifacts, nodeA, nodeB }) => {
  const rows = [nodeA, nodeB].map(node => ({ node, result: artifacts?.[node.id] }));
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
      {rows.map(({ node, result }) => (
        <div key={node.id} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{node.id}</div>
          {(result?.list || []).length ? result.list.map(a => <div key={a.name} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6, fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>{a.name} - {a.kind} - {Math.max(1, Math.round((a.size || 0) / 1024))} KB</div>) : <div style={{ color: 'var(--ink-4)', fontSize: 12 }}>No generated artifacts.</div>}
        </div>
      ))}
    </div>
  );
};

const ParamDiffTable = ({ paramsA, paramsB, diffs }) => (
  <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 10 }}>{diffs.length} parameter{diffs.length === 1 ? '' : 's'} differ</div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Geist Mono, monospace' }}>
      <thead><tr style={{ background: 'var(--surface-2)' }}><th style={thStyle}>Param</th><th style={thStyle}>A</th><th style={thStyle}>B</th></tr></thead>
      <tbody>{diffs.map(k => <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}><td style={tdStyle}>{k}</td><td style={{ ...tdStyle, color: 'var(--red)' }}>{String(paramsA[k] ?? '-')}</td><td style={{ ...tdStyle, color: 'var(--green)' }}>{String(paramsB[k] ?? '-')}</td></tr>)}</tbody>
    </table>
  </div>
);

const thStyle = { textAlign: 'left', padding: '8px 12px', fontSize: 10.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '10px 12px', fontSize: 12, color: 'var(--ink-2)' };
const btnSecondary = { background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' };

Object.assign(window, { Dashboard, btnSecondary });