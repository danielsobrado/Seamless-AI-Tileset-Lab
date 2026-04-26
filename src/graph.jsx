// Node graph: pan/zoom canvas, nodes, edges, ports.

const NODE_W = 240;
const NODE_H_COMFY = 188;
const NODE_H_COMPACT = 148;

const STATUS_DOT = {
  idle: { color: '#9aa1ab', label: 'Idle' },
  queued: { color: '#5d5cf6', label: 'Queued' },
  running: { color: '#2b7fff', label: 'Running' },
  success: { color: '#1faa6b', label: 'Ready' },
  error: { color: '#d04545', label: 'Error' },
};

// Compute port absolute position (anchor for edge endpoints)
function portPos(node, side, idx, total, height) {
  const x = side === 'in' ? node.x : node.x + NODE_W;
  const stride = height / (total + 1);
  const y = node.y + stride * (idx + 1);
  return { x, y };
}

// Smooth bezier between two points
function edgePath(a, b, kind = 'bezier') {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  if (kind === 'straight') return `M ${a.x},${a.y} L ${b.x},${b.y}`;
  if (kind === 'step') {
    const mx = (a.x + b.x) / 2;
    return `M ${a.x},${a.y} L ${mx},${a.y} L ${mx},${b.y} L ${b.x},${b.y}`;
  }
  return `M ${a.x},${a.y} C ${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
}

// --- Node card ---
const NodeCard = ({ node, def, selected, density, onMouseDown, onClick, onPortDown, onPortUp, hoveredPort, runningPct }) => {
  const color = COLOR_TOKENS[def.color] || COLOR_TOKENS.accent;
  const status = STATUS_DOT[node.status] || STATUS_DOT.idle;
  const warnings = (def.warnings ? def.warnings({ ...def.defaults, ...(node.params || {}) }) : []);
  const height = density === 'compact' ? NODE_H_COMPACT : NODE_H_COMFY;
  const inputs = def.inputs || [];
  const outputs = def.outputs || [];
  const IconComp = I[def.icon] || I.Box;

  // Thumbnail by node type
  const thumb = renderNodeThumb(node, def);

  return (
    <div
      data-screen-label={def.title}
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: node.x, top: node.y,
        width: NODE_W,
        background: '#fff',
        border: `1px solid ${selected ? color.ink : 'var(--border)'}`,
        borderRadius: 12,
        boxShadow: selected ? `0 0 0 3px ${color.soft}, var(--shadow-2)` : 'var(--shadow-1)',
        userSelect: 'none',
        cursor: 'grab',
        transition: 'box-shadow 120ms',
        overflow: 'visible',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 10px',
        borderBottom: '1px solid var(--border)',
        borderRadius: '12px 12px 0 0',
        background: color.soft,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color.ink,
          border: `1px solid ${color.ink}22`,
        }}>
          <IconComp size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {def.title}
          </div>
          {node.label && (
            <div style={{ fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.label}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, boxShadow: node.status === 'running' ? `0 0 0 3px ${status.color}33` : 'none' }} />
          <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500 }}>{status.label}</span>
        </div>
      </div>

      {/* Thumbnail */}
      <div style={{ position: 'relative', height: density === 'compact' ? 64 : 92, background: '#0f1115', overflow: 'hidden' }}>
        {thumb}
        {node.status === 'running' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,21,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, gap: 8 }}>
            <Spinner /> {Math.floor(runningPct || 0)}%
          </div>
        )}
        {/* run badge */}
        {node.runs > 0 && (
          <div style={{
            position: 'absolute', right: 6, bottom: 6,
            background: 'rgba(255,255,255,0.92)', color: 'var(--ink-2)',
            fontSize: 9.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
            fontFamily: 'Geist Mono, monospace',
          }}>
            {node.runs} run{node.runs > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Footer / warnings */}
      {density !== 'compact' && warnings.length > 0 && (
        <div style={{
          padding: '6px 10px',
          background: 'var(--amber-soft)',
          borderTop: '1px solid var(--amber-border)',
          fontSize: 10.5, color: 'var(--amber)',
          display: 'flex', gap: 6, alignItems: 'flex-start',
          lineHeight: 1.35,
        }}>
          <I.Warn size={12} stroke={1.8} style={{ marginTop: 1 }} />
          <span style={{ flex: 1 }}>{warnings[0].message}</span>
        </div>
      )}

      {/* Bottom meta strip */}
      {density !== 'compact' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px',
          fontSize: 10, color: 'var(--ink-4)',
          fontFamily: 'Geist Mono, monospace',
        }}>
          <span>{def.script ? def.script.split('/').pop() : def.category.toLowerCase()}</span>
          <span>{def.short}</span>
        </div>
      )}

      {/* Input ports */}
      {inputs.map((p, i) => {
        const pos = portPos({ x: 0, y: 0 }, 'in', i, inputs.length, height);
        return (
          <Port
            key={p.id}
            side="in"
            top={pos.y}
            label={p.label}
            required={p.required}
            color={color.ink}
            onMouseUp={(e) => onPortUp(e, node.id, p.id, 'in')}
            hovered={hoveredPort && hoveredPort.nodeId === node.id && hoveredPort.portId === p.id}
          />
        );
      })}
      {/* Output ports */}
      {outputs.map((p, i) => {
        const pos = portPos({ x: 0, y: 0 }, 'out', i, outputs.length, height);
        return (
          <Port
            key={p.id}
            side="out"
            top={pos.y}
            label={p.label}
            color={color.ink}
            onMouseDown={(e) => onPortDown(e, node.id, p.id, 'out')}
            hovered={hoveredPort && hoveredPort.nodeId === node.id && hoveredPort.portId === p.id}
          />
        );
      })}
    </div>
  );
};

const Port = ({ side, top, label, required, color, onMouseDown, onMouseUp, hovered }) => {
  const isOut = side === 'out';
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        position: 'absolute',
        top, [isOut ? 'right' : 'left']: -7,
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', gap: 6,
        flexDirection: isOut ? 'row-reverse' : 'row',
        cursor: 'crosshair',
        zIndex: 2,
      }}
    >
      <span style={{
        width: 13, height: 13, borderRadius: '50%',
        background: hovered ? color : '#fff',
        border: `2px solid ${color}`,
        boxShadow: hovered ? `0 0 0 4px ${color}33` : 'none',
        transition: 'all 100ms',
      }} />
      <span style={{
        fontSize: 9.5,
        color: 'var(--ink-3)',
        background: 'rgba(255,255,255,0.9)',
        padding: '1px 4px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
        opacity: hovered ? 1 : 0.85,
        pointerEvents: 'none',
      }}>
        {required && <span style={{ color: 'var(--red)' }}>* </span>}
        {label}
      </span>
    </div>
  );
};

const Spinner = () => (
  <span style={{
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  }} />
);

// Insert keyframes
if (!document.getElementById('graph-styles')) {
  const s = document.createElement('style');
  s.id = 'graph-styles';
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse-edge { 0%, 100% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -16; } }
    .graph-edge { transition: stroke 120ms; }
    .graph-edge.active { animation: pulse-edge 0.6s linear infinite; }
  `;
  document.head.appendChild(s);
}

// Node thumbnail dispatcher
function renderNodeThumb(node, def) {
  switch (node.type) {
    case 'raw_input':
      return <AtlasCanvas scheme="grass_dirty" cols={8} rows={8} tilePx={11} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'clean':
      return <AtlasCanvas scheme="grass_clean" cols={8} rows={8} tilePx={11} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'classify':
      return <AtlasCanvas scheme="classmap" cols={8} rows={8} tilePx={11} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'seam_report':
      return <AtlasCanvas scheme="heatmap" cols={8} rows={8} tilePx={11} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'repair':
      return <AtlasCanvas scheme="grass_clean" cols={8} rows={8} tilePx={11} seedBase={71} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'preview':
      return <AtlasCanvas scheme="preview_grass" cols={20} rows={8} tilePx={11} seedBase={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'transitions':
      return <AtlasCanvas scheme="transitions" cols={9} rows={3} tilePx={22} seedBase={node.params?.seed || 42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'contact_sheet':
      return <AtlasCanvas scheme="transitions" cols={9} rows={3} tilePx={22} seedBase={42} padding={1} bg="#1a1d22" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'extrude':
      return <AtlasCanvas scheme="grass_clean" cols={8} rows={8} tilePx={10} padding={2} bg="#1a1d22" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    case 'dashboard':
      return (
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flex: 1, borderRight: '1px solid #000' }}>
            <AtlasCanvas scheme="transitions" cols={5} rows={3} tilePx={18} seedBase={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <AtlasCanvas scheme="transitions" cols={5} rows={3} tilePx={18} seedBase={91} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      );
    default:
      return <div style={{ background: '#1a1d22', width: '100%', height: '100%' }} />;
  }
}

// --- Graph canvas ---
const GraphCanvas = ({
  nodes, edges,
  selectedId, onSelect,
  onNodeMove, onAddEdge, onDeleteEdge,
  density, edgeStyle = 'bezier', showGrid = true,
  runningId, runningPct,
  onCanvasClick,
}) => {
  const wrapRef = React.useRef(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 0.85 });
  const [drag, setDrag] = React.useState(null);
  const [pan, setPan] = React.useState(null);
  const [pendingEdge, setPendingEdge] = React.useState(null); // { fromNode, fromPort, x, y }
  const [hoveredPort, setHoveredPort] = React.useState(null);

  const nodeHeight = density === 'compact' ? NODE_H_COMPACT : NODE_H_COMFY;

  // Wheel zoom + trackpad pan
  React.useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        setView(v => {
          const rect = el.getBoundingClientRect();
          const mx = e.clientX - rect.left, my = e.clientY - rect.top;
          const k = Math.min(2, Math.max(0.3, v.k * factor));
          const nx = mx - (mx - v.x) * (k / v.k);
          const ny = my - (my - v.y) * (k / v.k);
          return { x: nx, y: ny, k };
        });
      } else {
        setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Convert client coords to canvas coords
  const toCanvas = (clientX, clientY) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.k,
      y: (clientY - rect.top - view.y) / view.k,
    };
  };

  // Node drag
  const onNodeMouseDown = (e, node) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(node.id);
    const start = toCanvas(e.clientX, e.clientY);
    setDrag({ id: node.id, dx: start.x - node.x, dy: start.y - node.y });
  };

  // Pan
  const onCanvasMouseDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.target.closest('[data-node-card]')) return;
    if (e.target.closest('[data-port]')) return;
    setPan({ sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y });
    onCanvasClick?.();
  };

  React.useEffect(() => {
    const onMove = (e) => {
      if (drag) {
        const p = toCanvas(e.clientX, e.clientY);
        onNodeMove(drag.id, p.x - drag.dx, p.y - drag.dy);
      } else if (pan) {
        setView(v => ({ ...v, x: pan.vx + (e.clientX - pan.sx), y: pan.vy + (e.clientY - pan.sy) }));
      } else if (pendingEdge) {
        const p = toCanvas(e.clientX, e.clientY);
        setPendingEdge(pe => ({ ...pe, x: p.x, y: p.y }));
      }
    };
    const onUp = (e) => {
      setDrag(null); setPan(null);
      if (pendingEdge) {
        // Did we land on a port? Check via DOM
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const portEl = el?.closest('[data-port]');
        if (portEl) {
          const targetNode = portEl.dataset.nodeId;
          const targetPort = portEl.dataset.portId;
          const targetSide = portEl.dataset.side;
          if (targetSide === 'in' && targetNode !== pendingEdge.fromNode) {
            onAddEdge({
              from: pendingEdge.fromNode, fromPort: pendingEdge.fromPort,
              to: targetNode, toPort: targetPort,
            });
          }
        }
        setPendingEdge(null);
      }
      setHoveredPort(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, pan, pendingEdge, view]);

  const onPortDown = (e, nodeId, portId, side) => {
    if (side !== 'out') return;
    e.stopPropagation(); e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    const def = NODE_TYPES[node.type];
    const idx = def.outputs.findIndex(p => p.id === portId);
    const pos = portPos(node, 'out', idx, def.outputs.length, nodeHeight);
    setPendingEdge({ fromNode: nodeId, fromPort: portId, sx: pos.x, sy: pos.y, x: pos.x, y: pos.y });
  };

  const zoomTo = (k) => setView(v => ({ ...v, k }));
  const fit = () => setView({ x: 40, y: 40, k: 0.7 });

  return (
    <div
      ref={wrapRef}
      onMouseDown={onCanvasMouseDown}
      style={{
        position: 'relative',
        width: '100%', height: '100%',
        overflow: 'hidden',
        background: showGrid ? `
          radial-gradient(circle, #d8dbe1 1px, transparent 1.5px),
          var(--bg)` : 'var(--bg)',
        backgroundSize: showGrid ? `${24 * view.k}px ${24 * view.k}px, 100% 100%` : 'auto',
        backgroundPosition: showGrid ? `${view.x}px ${view.y}px, 0 0` : 'auto',
        cursor: pan ? 'grabbing' : 'default',
      }}
    >
      {/* Inner transformed plane */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
        transformOrigin: '0 0',
      }}>
        {/* Edges */}
        <svg
          width={4000} height={2000}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
        >
          <defs>
            <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#9aa1ab" />
            </marker>
          </defs>
          {edges.map(e => {
            const fromNode = nodes.find(n => n.id === e.from);
            const toNode = nodes.find(n => n.id === e.to);
            if (!fromNode || !toNode) return null;
            const fromDef = NODE_TYPES[fromNode.type];
            const toDef = NODE_TYPES[toNode.type];
            const fi = fromDef.outputs.findIndex(p => p.id === e.fromPort);
            const ti = toDef.inputs.findIndex(p => p.id === e.toPort);
            const a = portPos(fromNode, 'out', fi, fromDef.outputs.length, nodeHeight);
            const b = portPos(toNode, 'in', ti, toDef.inputs.length, nodeHeight);
            const isActive = runningId && (runningId === e.from || runningId === e.to);
            return (
              <path
                key={e.id}
                className={`graph-edge ${isActive ? 'active' : ''}`}
                d={edgePath(a, b, edgeStyle)}
                fill="none"
                stroke={isActive ? 'var(--accent)' : '#b0b6bf'}
                strokeWidth={1.6}
                strokeDasharray={isActive ? '6 4' : '0'}
                markerEnd="url(#arrow-end)"
              />
            );
          })}
          {pendingEdge && (
            <path
              d={edgePath({ x: pendingEdge.sx, y: pendingEdge.sy }, { x: pendingEdge.x, y: pendingEdge.y }, edgeStyle)}
              fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeDasharray="5 4"
            />
          )}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const def = NODE_TYPES[node.type];
          if (!def) return null;
          return (
            <NodeWrapper key={node.id} node={node} def={def} nodeHeight={nodeHeight}>
              <NodeCard
                node={node}
                def={def}
                density={density}
                selected={selectedId === node.id}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                onPortDown={onPortDown}
                onPortUp={() => {}}
                hoveredPort={hoveredPort}
                runningPct={runningId === node.id ? runningPct : 0}
              />
            </NodeWrapper>
          );
        })}
      </div>

      {/* Zoom controls (overlay, outside transform) */}
      <div style={{
        position: 'absolute', right: 16, bottom: 16,
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
        padding: 3, boxShadow: 'var(--shadow-1)',
      }}>
        <IconBtn onClick={() => zoomTo(Math.max(0.3, view.k - 0.1))} title="Zoom out"><I.Minus size={14} /></IconBtn>
        <button onClick={fit} style={{ ...iconBtnBase, width: 'auto', padding: '0 8px', fontSize: 11, fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>
          {Math.round(view.k * 100)}%
        </button>
        <IconBtn onClick={() => zoomTo(Math.min(2, view.k + 0.1))} title="Zoom in"><I.Plus size={14} /></IconBtn>
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
        <IconBtn onClick={fit} title="Fit"><I.Resize size={14} /></IconBtn>
      </div>
    </div>
  );
};

// Wrapper that adds data-port attributes onto the rendered ports for hit-testing.
// We do this via a portal-like cloning ref pattern — simpler: re-render port hitboxes here.
const NodeWrapper = ({ node, def, nodeHeight, children }) => {
  // We add invisible hit zones for each port to support edge-drop hit-testing.
  const inputs = def.inputs || [];
  const outputs = def.outputs || [];
  return (
    <div data-node-card="1">
      {children}
      {/* Hit zones on top */}
      <div style={{ position: 'absolute', left: node.x, top: node.y, width: NODE_W, height: nodeHeight, pointerEvents: 'none' }}>
        {inputs.map((p, i) => {
          const pos = portPos({ x: 0, y: 0 }, 'in', i, inputs.length, nodeHeight);
          return (
            <div
              key={p.id}
              data-port="1" data-node-id={node.id} data-port-id={p.id} data-side="in"
              style={{
                position: 'absolute', left: -12, top: pos.y - 10, width: 24, height: 20,
                pointerEvents: 'auto', cursor: 'crosshair',
              }}
            />
          );
        })}
        {outputs.map((p, i) => {
          const pos = portPos({ x: 0, y: 0 }, 'out', i, outputs.length, nodeHeight);
          return (
            <div
              key={p.id}
              data-port="1" data-node-id={node.id} data-port-id={p.id} data-side="out"
              style={{
                position: 'absolute', left: NODE_W - 12, top: pos.y - 10, width: 24, height: 20,
                pointerEvents: 'auto', cursor: 'crosshair',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const iconBtnBase = {
  width: 26, height: 26,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: 5,
  color: 'var(--ink-2)', cursor: 'pointer',
};
const IconBtn = ({ onClick, title, children, active, danger, style }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      ...iconBtnBase,
      background: active ? 'var(--accent-soft)' : 'transparent',
      color: danger ? 'var(--red)' : active ? 'var(--accent-ink)' : 'var(--ink-2)',
      ...style,
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f2f5'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

Object.assign(window, { GraphCanvas, IconBtn, iconBtnBase, NODE_W });
