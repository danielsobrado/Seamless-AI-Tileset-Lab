// Main app shell: header, left rail (palette + history), graph, right inspector, dashboard.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable"
}/*EDITMODE-END*/;

const App = () => {
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];
  const tweaksData = Array.isArray(tweaks) ? tweaks[0] : tweaks;
  const setTweakFn = Array.isArray(tweaks) ? tweaks[1] : (() => {});

  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [selectedId, setSelectedId] = useState('n_repair');
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [running, setRunning] = useState(null); // { id, pct }
  const [logs, setLogs] = useState({});
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardPair, setDashboardPair] = useState({ a: 'n_transitions_C', b: 'n_transitions_G' });
  const [leftTab, setLeftTab] = useState('nodes'); // 'nodes' | 'history' | 'artifacts'
  const [search, setSearch] = useState('');
  const [edgeStyle] = useState('bezier');
  const [showGrid] = useState(true);

  const selected = nodes.find(n => n.id === selectedId);
  const selectedDef = selected ? NODE_TYPES[selected.type] : null;

  const onNodeMove = useCallback((id, x, y) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const onAddEdge = useCallback((edge) => {
    setEdges(es => {
      // Prevent duplicate
      if (es.some(e => e.from === edge.from && e.to === edge.to && e.fromPort === edge.fromPort && e.toPort === edge.toPort)) return es;
      // Replace existing edge into same input
      const filtered = es.filter(e => !(e.to === edge.to && e.toPort === edge.toPort));
      return [...filtered, { ...edge, id: 'e' + Math.random().toString(36).slice(2, 7) }];
    });
  }, []);

  const onParamChange = useCallback((id, params) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, params } : n));
  }, []);

  const onRun = useCallback((id) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setRunning({ id, pct: 0 });
    setNodes(ns => ns.map(n => n.id === id ? { ...n, status: 'running' } : n));
    // Stream logs
    const sample = SAMPLE_LOGS[node.type] || ['$ run', '[run] working...', '[run] done'];
    let i = 0;
    setLogs(L => ({ ...L, [id]: [] }));
    const logTimer = setInterval(() => {
      if (i >= sample.length) { clearInterval(logTimer); return; }
      setLogs(L => ({ ...L, [id]: [...(L[id] || []), sample[i]] }));
      i++;
    }, 220);
    // Progress
    let pct = 0;
    const pctTimer = setInterval(() => {
      pct += 6 + Math.random() * 10;
      if (pct >= 100) {
        pct = 100;
        clearInterval(pctTimer);
        setRunning(null);
        setNodes(ns => ns.map(n => n.id === id ? { ...n, status: 'success', runs: (n.runs || 0) + 1 } : n));
        setHistory(h => [{
          id: 'r' + Math.random().toString(36).slice(2, 7),
          node: id,
          label: `${NODE_TYPES[node.type].title.toLowerCase()} (manual run)`,
          when: 'just now',
          duration: ((sample.length * 0.22) + 0.3).toFixed(1) + 's',
          status: 'ok',
          score: null,
        }, ...h]);
      } else {
        setRunning({ id, pct });
      }
    }, 220);
  }, [nodes]);

  const onDuplicate = useCallback((id) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newId = id + '_copy_' + Math.random().toString(36).slice(2, 5);
    setNodes(ns => [...ns, { ...node, id: newId, x: node.x + 40, y: node.y + 40, runs: 0, status: 'idle' }]);
    setSelectedId(newId);
  }, [nodes]);

  const onBranch = useCallback((id) => {
    // Create a copy beside it AND wire incoming edges
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newId = id + '_branch_' + Math.random().toString(36).slice(2, 5);
    setNodes(ns => [...ns, { ...node, id: newId, x: node.x, y: node.y + 220, runs: 0, status: 'idle', label: (node.label || NODE_TYPES[node.type].title) + ' · branch' }]);
    setEdges(es => {
      const incoming = es.filter(e => e.to === id);
      return [...es, ...incoming.map(e => ({ ...e, id: 'e' + Math.random().toString(36).slice(2, 7), to: newId }))];
    });
    setSelectedId(newId);
  }, [nodes]);

  const onDelete = useCallback((id) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.from !== id && e.to !== id));
    setSelectedId(null);
  }, []);

  // Add node from palette
  const onAddNode = useCallback((type) => {
    const def = NODE_TYPES[type];
    const newId = type + '_' + Math.random().toString(36).slice(2, 5);
    setNodes(ns => [...ns, {
      id: newId, type, x: 300 + Math.random() * 100, y: 300 + Math.random() * 100,
      status: 'idle', params: {}, runs: 0,
    }]);
    setSelectedId(newId);
  }, []);

  // If clicked dashboard node, open it
  useEffect(() => {
    if (selected && selected.type === 'dashboard') {
      // Don't auto-open, but make it clear via inspector that "Open Dashboard" exists
    }
  }, [selectedId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        onOpenDashboard={() => setShowDashboard(true)}
        runs={history.length}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <LeftRail
          tab={leftTab} onTab={setLeftTab}
          search={search} onSearch={setSearch}
          history={history}
          onSelectHistory={(node) => setSelectedId(node)}
          onAddNode={onAddNode}
          nodes={nodes}
        />
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <GraphCanvas
            nodes={nodes} edges={edges}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              const node = nodes.find(n => n.id === id);
              if (node && node.type === 'dashboard') setShowDashboard(true);
            }}
            onNodeMove={onNodeMove}
            onAddEdge={onAddEdge}
            density={tweaksData.density}
            edgeStyle={edgeStyle}
            showGrid={showGrid}
            runningId={running?.id}
            runningPct={running?.pct || 0}
            onCanvasClick={() => setSelectedId(null)}
          />
          {/* Floating help / dashboard quick-open */}
          <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setShowDashboard(true)} style={{
              background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 8,
              padding: '8px 12px', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-1)',
            }}>
              <I.Compare size={13} /> Compare branches A/B
            </button>
          </div>
        </div>
        <div style={{
          width: 360, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--surface-2)',
          display: 'flex', flexDirection: 'column',
          minHeight: 0,
        }}>
          <Inspector
            node={selected} def={selectedDef}
            edges={edges} nodes={nodes}
            onParamChange={onParamChange}
            onClose={() => setSelectedId(null)}
            onRun={onRun}
            onDuplicate={onDuplicate}
            onBranch={onBranch}
            onDelete={onDelete}
            onOpenDashboard={() => setShowDashboard(true)}
            runningId={running?.id}
            runningPct={running?.pct || 0}
            logs={logs[selectedId]}
          />
        </div>
      </div>
      {showDashboard && (
        <Dashboard
          nodes={nodes}
          branchA={dashboardPair.a}
          branchB={dashboardPair.b}
          onClose={() => setShowDashboard(false)}
          onSetBranch={(side, id) => setDashboardPair(p => ({ ...p, [side]: id }))}
        />
      )}
      {/* Tweaks panel */}
      <TweaksHook tweaks={tweaksData} setTweak={setTweakFn} />
    </div>
  );
};

// --- Header ---
const Header = ({ onOpenDashboard, runs }) => (
  <div style={{
    height: 52, flexShrink: 0,
    display: 'flex', alignItems: 'center',
    padding: '0 16px', gap: 14,
    background: '#fff', borderBottom: '1px solid var(--border)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: 'linear-gradient(135deg, #5d5cf6, #7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      }}>
        <I.Logo size={15} stroke={2} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>Seamless</div>
        <div style={{ fontSize: 9.5, color: 'var(--ink-4)', marginTop: -1, fontFamily: 'Geist Mono, monospace' }}>AI Tileset Lab · grass_to_dirt</div>
      </div>
    </div>

    <span style={{ width: 1, height: 24, background: 'var(--border)' }} />

    <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--surface-2)', borderRadius: 7 }}>
      {['Pipeline', 'Artifacts', 'Runs'].map((t, i) => (
        <button key={t} style={{
          background: i === 0 ? '#fff' : 'transparent',
          border: 'none', borderRadius: 5, padding: '5px 10px',
          fontSize: 11.5, fontWeight: 500,
          color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
          boxShadow: i === 0 ? 'var(--shadow-1)' : 'none', cursor: 'pointer',
        }}>{t}</button>
      ))}
    </div>

    <div style={{ flex: 1 }} />

    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={btnSecondary}><I.Zap size={12} /> Run downstream</button>
      <button style={btnSecondary}><I.Lock size={12} /> Seed locked: 42</button>
      <button onClick={onOpenDashboard} style={btnSecondary}><I.Compare size={12} /> Dashboard</button>
      <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
      <IconBtn title="History"><I.History size={15} /></IconBtn>
      <IconBtn title="Notifications"><I.Bell size={15} /></IconBtn>
      <IconBtn title="Help"><I.Help size={15} /></IconBtn>
      <button style={{ ...btnSecondary, marginLeft: 6, background: 'var(--ink)', color: '#fff', border: 'none' }}>
        <I.Share size={12} /> Share experiment
      </button>
    </div>
  </div>
);

// --- Left rail ---
const LeftRail = ({ tab, onTab, search, onSearch, history, onSelectHistory, onAddNode, nodes }) => {
  return (
    <div style={{
      width: 240, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
        {[
          { id: 'nodes', label: 'Nodes', icon: <I.Box size={12} /> },
          { id: 'history', label: 'History', icon: <I.History size={12} /> },
          { id: 'artifacts', label: 'Artifacts', icon: <I.Folder size={12} /> },
        ].map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => onTab(t.id)} style={{
              flex: 1, background: 'transparent', border: 'none', padding: '10px 4px',
              fontSize: 11.5, fontWeight: 500,
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>{t.icon}{t.label}</button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          <I.Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
          <input
            type="text" placeholder={tab === 'nodes' ? 'Search nodes…' : 'Search…'}
            value={search} onChange={e => onSearch(e.target.value)}
            style={{
              width: '100%', height: 28, padding: '0 8px 0 26px',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5,
              fontSize: 11.5, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'nodes' && <NodesPalette search={search} onAddNode={onAddNode} />}
        {tab === 'history' && <HistoryList history={history} onSelectHistory={onSelectHistory} />}
        {tab === 'artifacts' && <ArtifactsBrowser nodes={nodes} onSelectHistory={onSelectHistory} />}
      </div>
    </div>
  );
};

const NodesPalette = ({ search, onAddNode }) => {
  const grouped = useMemo(() => {
    const g = {};
    Object.entries(NODE_TYPES).forEach(([key, def]) => {
      if (search && !def.title.toLowerCase().includes(search.toLowerCase()) && !def.category.toLowerCase().includes(search.toLowerCase())) return;
      (g[def.category] ||= []).push({ key, def });
    });
    return g;
  }, [search]);

  return (
    <div style={{ padding: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.5 }}>
        Click a node type to add it to the canvas. Drag from output ports to inputs to connect.
      </div>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 600, color: 'var(--ink-4)',
            textTransform: 'uppercase', letterSpacing: 0.5,
            margin: '6px 4px 6px',
          }}>{cat}</div>
          {items.map(({ key, def }) => {
            const c = COLOR_TOKENS[def.color];
            const IconComp = I[def.icon] || I.Box;
            return (
              <button
                key={key} onClick={() => onAddNode(key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 9px', background: '#fff',
                  border: '1px solid var(--border)', borderRadius: 7,
                  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                  marginBottom: 4, transition: 'all 100ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = c.ink; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.soft}`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: c.soft, color: c.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconComp size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink)' }}>{def.title}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--ink-4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def.short}</div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const HistoryList = ({ history, onSelectHistory }) => (
  <div style={{ padding: 8 }}>
    {history.map(r => {
      const node = INITIAL_NODES.find(n => n.id === r.node);
      const def = node ? NODE_TYPES[node.type] : null;
      const c = def ? COLOR_TOKENS[def.color] : COLOR_TOKENS.accent;
      return (
        <button
          key={r.id}
          onClick={() => onSelectHistory(r.node)}
          style={{
            width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
            padding: '8px 6px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', gap: 8, alignItems: 'flex-start',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: r.status === 'ok' ? 'var(--green)' : 'var(--red)',
            marginTop: 6, flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {r.favorite && <I.StarFill size={10} style={{ color: '#eab308' }} />}
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.label}</span>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace', marginTop: 2 }}>
              {r.when} · {r.duration}{r.score != null ? ` · score ${r.score}` : ''}
            </div>
          </div>
        </button>
      );
    })}
  </div>
);

const ArtifactsBrowser = ({ nodes, onSelectHistory }) => {
  const items = nodes.flatMap(n => {
    const def = NODE_TYPES[n.type];
    if (!def || n.runs === 0) return [];
    return def.outputs.map(o => ({ nodeId: n.id, def, output: o }));
  });
  return (
    <div style={{ padding: 8 }}>
      {items.map((it, i) => {
        const c = COLOR_TOKENS[it.def.color];
        const kindIcon = it.output.kind === 'image' ? <I.Image size={12} /> : it.output.kind === 'csv' ? <I.CSV size={12} /> : it.output.kind === 'folder' ? <I.Folder size={12} /> : <I.File size={12} />;
        return (
          <button
            key={i}
            onClick={() => onSelectHistory(it.nodeId)}
            style={{
              width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
              padding: '7px 6px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', gap: 8, alignItems: 'center',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 4, background: c.soft, color: c.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {kindIcon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.output.label}</div>
              <div style={{ fontSize: 9.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>{it.nodeId}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Tweaks hook bridge
const TweaksHook = ({ tweaks, setTweak }) => {
  if (!window.TweaksPanel || !window.TweakRadio) return null;
  const { TweaksPanel, TweakSection, TweakRadio } = window;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Canvas">
        <TweakRadio
          label="Node density"
          value={tweaks.density}
          options={[{ label: 'Compact', value: 'compact' }, { label: 'Comfortable', value: 'comfortable' }]}
          onChange={(v) => setTweak('density', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
