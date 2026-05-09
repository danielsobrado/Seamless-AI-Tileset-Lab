// Main app shell: header, left rail (palette + history), graph, right inspector, dashboard.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable"
}/*EDITMODE-END*/;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--bg)',
          color: 'var(--ink)',
          fontFamily: 'Geist, system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 560,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-2)',
            padding: 20,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>The pipeline UI hit an error.</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 12 }}>
              Refresh the page to continue. Any downloaded artifacts remain on disk; in-memory browser artifacts will need to be regenerated.
            </div>
            <pre style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 11,
              color: 'var(--red)',
              background: 'var(--red-soft)',
              borderRadius: 8,
              padding: 12,
            }}>{String(this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function revokeArtifactResult(result) {
  const seen = new Set();
  const items = [
    ...(result?.list || []),
    ...Object.values(result?.artifacts || {}),
  ];
  items.forEach((artifact) => {
    if (artifact?.url && !seen.has(artifact.url)) {
      seen.add(artifact.url);
      URL.revokeObjectURL(artifact.url);
    }
  });
}

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
  const [artifacts, setArtifacts] = useState({});
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

  const onUploadInput = useCallback(async (nodeId, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    let width = 0, height = 0;
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close?.();
    } catch (_) {}
    const atlas = {
      name: file.name,
      kind: 'image',
      mime: file.type || 'image/png',
      blob: file,
      url,
      size: file.size,
      width,
      height,
      meta: { uploaded: true },
    };
    const meta = window.BrowserPipeline?.makeJsonArtifact
      ? window.BrowserPipeline.makeJsonArtifact('source-metadata.json', { source_label: file.name, width, height, uploaded_at: new Date().toISOString() })
      : null;
    setArtifacts(A => {
      revokeArtifactResult(A[nodeId]);
      return {
        ...A,
        [nodeId]: {
        nodeId,
        generatedAt: new Date().toISOString(),
        artifacts: { atlas, ...(meta ? { meta } : {}) },
        list: meta ? [atlas, meta] : [atlas],
      },
      };
    });
    setLogs(L => ({ ...L, [nodeId]: [`[upload] ${file.name}`, `[upload] ${width || '?'}x${height || '?'} px`, '[upload] ready as raw atlas artifact'] }));
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, status: 'success', runs: Math.max(1, n.runs || 0), params: { ...n.params, source_label: file.name } } : n));
  }, []);

  const onRun = useCallback(async (id) => {
    if (running) return;
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const def = NODE_TYPES[node.type];
    if (!def || !window.runBrowserNode) return;

    setRunning({ id, pct: 0 });
    setLogs(L => ({ ...L, [id]: [] }));
    setNodes(ns => ns.map(n => n.id === id ? { ...n, status: 'running' } : n));

    try {
      const result = await window.runBrowserNode({
        node,
        def,
        nodes,
        edges,
        artifacts,
        onLog: (line) => setLogs(L => ({ ...L, [id]: [...(L[id] || []), line] })),
        onProgress: (pct) => setRunning({ id, pct }),
      });
      setArtifacts(A => {
        revokeArtifactResult(A[id]);
        return { ...A, [id]: result };
      });
      setNodes(ns => ns.map(n => n.id === id ? { ...n, status: 'success', runs: (n.runs || 0) + 1 } : n));
      setHistory(h => [{
        id: 'r' + Math.random().toString(36).slice(2, 7),
        node: id,
        label: `${NODE_TYPES[node.type].title.toLowerCase()} (browser run)`,
        when: 'just now',
        duration: 'browser',
        status: 'ok',
        score: null,
      }, ...h]);
    } catch (err) {
      setLogs(L => ({ ...L, [id]: [...(L[id] || []), `[error] ${err?.message || err}`] }));
      setNodes(ns => ns.map(n => n.id === id ? { ...n, status: 'error' } : n));
    } finally {
      setRunning(null);
    }
  }, [nodes, edges, artifacts, running]);

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
    setArtifacts(A => {
      revokeArtifactResult(A[id]);
      const next = { ...A };
      delete next[id];
      return next;
    });
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
          artifacts={artifacts}
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
            artifacts={artifacts}
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
            onUploadInput={onUploadInput}
            onClose={() => setSelectedId(null)}
            onRun={onRun}
            onDuplicate={onDuplicate}
            onBranch={onBranch}
            onDelete={onDelete}
            onOpenDashboard={() => setShowDashboard(true)}
            runningId={running?.id}
            runningPct={running?.pct || 0}
            logs={logs[selectedId]}
            artifacts={selectedId ? artifacts[selectedId] : null}
            uploadArtifact={selectedId ? artifacts[selectedId] : null}
          />
        </div>
      </div>
      {showDashboard && (
        <Dashboard
          nodes={nodes}
          artifacts={artifacts}
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

    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
      browser-only pipeline
    </div>

    <div style={{ flex: 1 }} />

    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>{runs} run(s)</span>
      <button onClick={onOpenDashboard} style={btnSecondary}><I.Compare size={12} /> Dashboard</button>
    </div></div>
);

// --- Left rail ---
const LeftRail = ({ tab, onTab, search, onSearch, history, onSelectHistory, onAddNode, nodes, artifacts }) => {
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
        {tab === 'artifacts' && <ArtifactsBrowser artifacts={artifacts} onSelectHistory={onSelectHistory} />}
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

const ArtifactsBrowser = ({ artifacts, onSelectHistory }) => {
  const items = Object.entries(artifacts || {}).flatMap(([nodeId, result]) => (result.list || []).map(a => ({ nodeId, artifact: a })));
  const download = (artifact) => {
    if (!artifact?.url) return;
    const a = document.createElement('a');
    a.href = artifact.url;
    a.download = artifact.name || 'artifact';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <div style={{ padding: 8 }}>
      {items.length === 0 && <div style={{ padding: 12, fontSize: 11.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>No artifacts yet. Upload a raw atlas, then run nodes to generate browser artifacts.</div>}
      {items.map((it) => {
        const kindIcon = it.artifact.kind === 'image' ? <I.Image size={12} /> : it.artifact.kind === 'csv' ? <I.CSV size={12} /> : it.artifact.kind === 'folder' ? <I.Folder size={12} /> : <I.File size={12} />;
        return (
          <button
            key={`${it.nodeId}-${it.artifact.name}`}
            onClick={() => { onSelectHistory(it.nodeId); download(it.artifact); }}
            style={{
              width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
              padding: '7px 6px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{kindIcon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.artifact.name}</div>
              <div style={{ fontSize: 9.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>{it.nodeId} - {Math.max(1, Math.round((it.artifact.size || 0) / 1024))} KB</div>
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
      <TweakSection label="Canvas">
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

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
