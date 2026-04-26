// Right-side inspector: tabs for Params / Logs / Artifacts / Command, plus warnings + run button.

const TRANSITION_PRESETS = {
  A_sharp:        { variants: 3, noise: 14, feather: 0, blend_width: 0,  dither: 0,  blend_mode: 'alpha',      grain_size: 1, band_darken: 0,    band_desaturate: 0,    highlight_clamp: 255, detail_overlay: false, seed: 42 },
  B_soft_alpha:   { variants: 3, noise: 14, feather: 0, blend_width: 12, dither: 56, blend_mode: 'alpha',      grain_size: 1, band_darken: 0,    band_desaturate: 0,    highlight_clamp: 255, detail_overlay: false, seed: 42 },
  C_stochastic:   { variants: 3, noise: 14, feather: 0, blend_width: 18, dither: 36, blend_mode: 'stochastic', grain_size: 1, band_darken: 0,    band_desaturate: 0,    highlight_clamp: 255, detail_overlay: false, seed: 42 },
  D_clustered:    { variants: 3, noise: 14, feather: 0, blend_width: 14, dither: 24, blend_mode: 'stochastic', grain_size: 7, band_darken: 0,    band_desaturate: 0,    highlight_clamp: 255, detail_overlay: false, seed: 42 },
  E_dark_band:    { variants: 3, noise: 14, feather: 0, blend_width: 14, dither: 24, blend_mode: 'stochastic', grain_size: 7, band_darken: 0.18, band_desaturate: 0.08, highlight_clamp: 95,  detail_overlay: false, seed: 42 },
  F_no_highlight: { variants: 3, noise: 14, feather: 0, blend_width: 16, dither: 18, blend_mode: 'stochastic', grain_size: 8, band_darken: 0.28, band_desaturate: 0.18, highlight_clamp: 72,  detail_overlay: false, seed: 42 },
  G_soft_detail:  { variants: 3, noise: 14, feather: 0, blend_width: 10, dither: 48, blend_mode: 'stochastic', grain_size: 6, band_darken: 0.03, band_desaturate: 0.02, highlight_clamp: 170, detail_overlay: true,  detail_count: 90,  detail_min_size: 1, detail_max_size: 5, detail_opacity: 0.7,  detail_mode: 'cross',     palette_snap: 'band', palette_colors: 128, palette_max_luma: 175, seed: 49 },
  H_one_way_dirt: { variants: 3, noise: 14, feather: 0, blend_width: 10, dither: 48, blend_mode: 'stochastic', grain_size: 6, band_darken: 0.02, band_desaturate: 0.01, highlight_clamp: 175, detail_overlay: true,  detail_count: 120, detail_min_size: 1, detail_max_size: 5, detail_opacity: 0.75, detail_mode: 'b-into-a',  palette_snap: 'band', palette_colors: 128, palette_max_luma: 180, seed: 50 },
};

// --- Form controls ---
const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</label>
      {hint && <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, suffix }) => (
  <div style={{ position: 'relative' }}>
    <input
      type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', height: 30, padding: suffix ? '0 30px 0 9px' : '0 9px',
        background: '#fff', border: '1px solid var(--border-strong)',
        borderRadius: 6, fontSize: 12, color: 'var(--ink)',
        fontFamily: 'inherit', outline: 'none',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
    />
    {suffix && <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>{suffix}</span>}
  </div>
);

const NumInput = ({ value, onChange, min, max, step, suffix }) => (
  <TextInput
    value={value}
    onChange={(v) => onChange(v === '' ? '' : Number(v))}
    suffix={suffix}
  />
);

const TextArea = ({ value, onChange }) => (
  <textarea
    value={value ?? ''} onChange={e => onChange(e.target.value)}
    style={{
      width: '100%', minHeight: 56, padding: 9,
      background: '#fff', border: '1px solid var(--border-strong)',
      borderRadius: 6, fontSize: 11.5, color: 'var(--ink)',
      fontFamily: 'Geist Mono, monospace', resize: 'vertical', outline: 'none',
    }}
  />
);

const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      width: 34, height: 20, borderRadius: 999, border: 'none',
      background: value ? 'var(--accent)' : '#d2d6dd', position: 'relative',
      cursor: 'pointer', transition: 'background 100ms', padding: 0,
    }}
  >
    <span style={{
      position: 'absolute', top: 2, left: value ? 16 : 2, width: 16, height: 16,
      background: '#fff', borderRadius: '50%', transition: 'left 120ms',
      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    }} />
  </button>
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value ?? ''} onChange={e => onChange(e.target.value)}
    style={{
      width: '100%', height: 30, padding: '0 9px',
      background: '#fff', border: '1px solid var(--border-strong)',
      borderRadius: 6, fontSize: 12, color: 'var(--ink)',
      fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
    }}
  >
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Slider = ({ value, onChange, min = 0, max = 100, step = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <input
      type="range" min={min} max={max} step={step} value={value ?? 0}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex: 1, accentColor: 'var(--accent)' }}
    />
    <span style={{ width: 48, textAlign: 'right', fontSize: 11, color: 'var(--ink-2)', fontFamily: 'Geist Mono, monospace' }}>
      {typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(2)) : '—'}
    </span>
  </div>
);

const ParamControl = ({ schema, value, onChange }) => {
  if (schema.kind === 'text') return <TextInput value={value} onChange={onChange} />;
  if (schema.kind === 'textarea') return <TextArea value={value} onChange={onChange} />;
  if (schema.kind === 'number') return <NumInput value={value} onChange={onChange} min={schema.min} max={schema.max} step={schema.step} suffix={schema.suffix} />;
  if (schema.kind === 'toggle') return <Toggle value={value} onChange={onChange} />;
  if (schema.kind === 'select') return <Select value={value} onChange={onChange} options={schema.options} />;
  if (schema.kind === 'slider') return <Slider value={value} onChange={onChange} min={schema.min} max={schema.max} step={schema.step} />;
  return null;
};

// --- Tab strip ---
const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 14px', background: '#fff' }}>
    {tabs.map(t => {
      const isActive = active === t.id;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: 'transparent', border: 'none', padding: '10px 12px',
            fontSize: 12, fontWeight: 500,
            color: isActive ? 'var(--ink)' : 'var(--ink-3)',
            borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: 6,
          }}
        >
          {t.icon} {t.label}
          {t.badge != null && (
            <span style={{
              fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 99,
              background: isActive ? 'var(--accent-soft)' : '#eef0f3',
              color: isActive ? 'var(--accent-ink)' : 'var(--ink-3)',
              fontFamily: 'Geist Mono, monospace',
            }}>{t.badge}</span>
          )}
        </button>
      );
    })}
  </div>
);

// --- Build command preview ---
function buildCommand(node, def) {
  if (!def.script) return null;
  const params = { ...def.defaults, ...(node.params || {}) };
  const args = Object.entries(params)
    .filter(([k, v]) => v !== undefined && v !== '' && v !== null && k !== 'preset')
    .map(([k, v]) => {
      if (typeof v === 'boolean') return v ? `--${k}` : null;
      const s = String(v);
      const needsQuotes = /[\s,]/.test(s);
      return `--${k} ${needsQuotes ? `"${s}"` : s}`;
    })
    .filter(Boolean);
  return `python ${def.script} \\\n  ${args.join(' \\\n  ')}`;
}

// --- Inspector main component ---
const Inspector = ({
  node, def, edges, nodes,
  onParamChange, onClose, onRun, onDuplicate, onBranch, onDelete, onOpenDashboard,
  runningId, runningPct, logs,
}) => {
  const [tab, setTab] = React.useState('params');

  if (!node || !def) {
    return <EmptyInspector />;
  }

  const params = { ...def.defaults, ...(node.params || {}) };
  const warnings = (def.warnings ? def.warnings(params) : []);
  const cmd = buildCommand(node, def);
  const incoming = edges.filter(e => e.to === node.id);
  const outgoing = edges.filter(e => e.from === node.id);
  const isRunning = runningId === node.id;
  const color = COLOR_TOKENS[def.color] || COLOR_TOKENS.accent;
  const IconComp = I[def.icon] || I.Box;

  const tabs = [
    { id: 'params', label: 'Params', icon: <I.Settings size={12} /> },
    { id: 'preview', label: 'Preview', icon: <I.Eye size={12} /> },
    { id: 'artifacts', label: 'Artifacts', icon: <I.Folder size={12} />, badge: outgoing.length },
    { id: 'logs', label: 'Logs', icon: <I.Code size={12} />, badge: node.runs },
    { id: 'cmd', label: 'Command', icon: <I.Code size={12} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: color.soft, color: color.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconComp size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2 }}>{def.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', marginTop: 1 }}>{node.id}{node.label ? ` · ${node.label}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ ...iconBtnBase }} title="Close"><I.X size={14} /></button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{def.description}</p>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button
            onClick={() => onRun(node.id)}
            disabled={isRunning}
            style={{
              flex: 1, height: 32, padding: '0 12px', border: 'none', borderRadius: 6,
              background: isRunning ? '#9aa1ab' : 'var(--ink)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isRunning ? <><Spinner /> Running… {Math.floor(runningPct)}%</> : <><I.Play size={11} /> Run node</>}
          </button>
          <IconBtn onClick={() => onBranch(node.id)} title="Branch from this node"><I.Branch size={14} /></IconBtn>
          <IconBtn onClick={() => onDuplicate(node.id)} title="Duplicate"><I.Duplicate size={14} /></IconBtn>
          <IconBtn onClick={() => onDelete(node.id)} title="Delete" danger><I.Trash size={14} /></IconBtn>
        </div>

        {/* Inline warnings */}
        {warnings.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {warnings.map((w, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '8px 10px',
                background: 'var(--amber-soft)', border: '1px solid var(--amber-border)',
                borderRadius: 6, fontSize: 11, color: 'var(--amber)', marginBottom: 4,
                lineHeight: 1.5,
              }}>
                <I.Warn size={13} stroke={1.8} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {tab === 'params' && <ParamsTab def={def} node={node} params={params} onParamChange={onParamChange} />}
        {tab === 'preview' && <PreviewTab def={def} node={node} params={params} />}
        {tab === 'artifacts' && <ArtifactsTab def={def} node={node} />}
        {tab === 'logs' && <LogsTab def={def} node={node} logs={logs} isRunning={isRunning} />}
        {tab === 'cmd' && <CommandTab def={def} cmd={cmd} node={node} params={params} />}
      </div>

      {/* Footer: connections summary */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: '#fff', fontSize: 10.5, color: 'var(--ink-3)', display: 'flex', gap: 12, fontFamily: 'Geist Mono, monospace' }}>
        <span>← {incoming.length} in</span>
        <span>{outgoing.length} out →</span>
        <span style={{ marginLeft: 'auto' }}>runs: {node.runs}</span>
      </div>
    </div>
  );
};

const ParamsTab = ({ def, node, params, onParamChange }) => {
  // For the transitions node, show preset cards
  return (
    <div>
      {def.script && (
        <div style={{
          padding: '7px 9px', background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
          fontSize: 10.5, fontFamily: 'Geist Mono, monospace', color: 'var(--ink-3)', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <I.Code size={12} /> {def.script}
        </div>
      )}

      {def.paramSchema.map((s, i) => {
        if (s.kind === 'section') {
          return (
            <div key={i} style={{
              fontSize: 10, fontWeight: 600, color: 'var(--ink-4)',
              textTransform: 'uppercase', letterSpacing: 0.5,
              margin: '14px 0 8px', paddingBottom: 6,
              borderBottom: '1px solid var(--border)',
            }}>{s.label}</div>
          );
        }
        const handlePresetChange = (k, v) => {
          if (def.title === 'Transition Generator' && k === 'preset' && TRANSITION_PRESETS[v]) {
            // Apply preset values
            onParamChange(node.id, { ...node.params, preset: v, ...TRANSITION_PRESETS[v] });
          } else {
            onParamChange(node.id, { ...node.params, [k]: v });
          }
        };
        return (
          <Field key={s.key} label={s.label}>
            <ParamControl schema={s} value={params[s.key]} onChange={(v) => handlePresetChange(s.key, v)} />
          </Field>
        );
      })}

      {/* Tile grid editor for classify node */}
      {def.title === 'Tile Classification' && <ClassMapEditor params={params} />}
      {/* Seam table for seam_report */}
      {def.title === 'Seam Report' && <SeamTablePreview />}
    </div>
  );
};

const ClassMapEditor = ({ params }) => {
  const colors = { grass_base: '#56a050', transition: '#d99a45', dirt_base: '#8d5d33', props: '#7c3aed' };
  // Parse class string
  const map = {};
  (params.custom_class_string || '').split(';').forEach(part => {
    const [cls, ranges] = part.split(':');
    if (!cls || !ranges) return;
    ranges.split(',').forEach(r => {
      if (r.includes('-')) {
        const [a, b] = r.split('-').map(Number);
        for (let i = a; i <= b; i++) map[i] = cls.trim();
      } else map[Number(r)] = cls.trim();
    });
  });
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Tile grid (click to assign)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, padding: 6, background: '#0f1115', borderRadius: 6 }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const id = i + 1;
          const cls = map[id];
          return (
            <div key={i} style={{
              aspectRatio: '1', background: cls ? colors[cls] : '#2a2e35',
              borderRadius: 2, position: 'relative',
              fontSize: 8.5, color: '#fff', fontFamily: 'Geist Mono, monospace',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', userSelect: 'none',
            }}>{id}</div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {Object.entries(colors).map(([cls, c]) => (
          <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--ink-3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c }} /> {cls}
          </div>
        ))}
      </div>
    </div>
  );
};

const SeamTablePreview = () => {
  const verdictStyle = (v) => {
    if (v.startsWith('yes')) return { bg: 'var(--green-soft)', fg: 'var(--green)', label: 'Yes' };
    if (v.startsWith('maybe')) return { bg: 'var(--amber-soft)', fg: 'var(--amber)', label: 'Maybe' };
    return { bg: 'var(--red-soft)', fg: 'var(--red)', label: v.includes('expected') ? 'No (ok)' : 'No' };
  };
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Self-repeat scores
      </div>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '36px 1fr 50px 50px 60px',
          fontSize: 10, color: 'var(--ink-4)', padding: '6px 9px',
          background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
          fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase',
        }}>
          <span>tile</span><span>class</span><span>L/R</span><span>T/B</span><span>worst</span>
        </div>
        {SEAM_ROWS.map(r => {
          const v = verdictStyle(r.verdict);
          return (
            <div key={r.tile} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 50px 50px 60px',
              fontSize: 10.5, padding: '6px 9px',
              fontFamily: 'Geist Mono, monospace',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center',
            }}>
              <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{r.tile}</span>
              <span style={{ color: 'var(--ink-3)' }}>{r.cls}</span>
              <span style={{ color: 'var(--ink-2)' }}>{r.l_r.toFixed(1)}</span>
              <span style={{ color: 'var(--ink-2)' }}>{r.t_b.toFixed(1)}</span>
              <span style={{
                color: v.fg, background: v.bg, padding: '1px 5px', borderRadius: 3,
                textAlign: 'center', fontSize: 9.5, fontWeight: 600,
              }}>{r.worst.toFixed(1)} {v.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>
        Thresholds: 0–5 excellent · 5–15 acceptable · 15–30 visible seam possible · 30+ likely bad
      </div>
    </div>
  );
};

const PreviewTab = ({ def, node, params }) => {
  if (def.title === 'Clean Tileset') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Raw vs cleaned</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <PreviewBox label="Raw input">
            <AtlasCanvas scheme="grass_dirty" cols={8} rows={8} tilePx={22} style={{ width: '100%', display: 'block' }} />
          </PreviewBox>
          <PreviewBox label="Cleaned 128px">
            <AtlasCanvas scheme="grass_clean" cols={8} rows={8} tilePx={22} style={{ width: '100%', display: 'block' }} />
          </PreviewBox>
        </div>
        <ZoomBar value={params.tile_size} />
      </div>
    );
  }
  if (def.title === 'Base Repair') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Before / after — tile #8</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          <PreviewBox label="Before">
            <RepeatCanvas palette="grass" seed={42} tilePx={36} reps={4} showSeam style={{ width: '100%', display: 'block' }} />
          </PreviewBox>
          <PreviewBox label="After">
            <RepeatCanvas palette="grass" seed={71} tilePx={36} reps={4} showSeam={false} style={{ width: '100%', display: 'block' }} />
          </PreviewBox>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Worst-diff metrics</div>
        <MetricBars before={9.8} after={4.2} />
      </div>
    );
  }
  if (def.title === 'Preview Map') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>20×20 random preview, seed {params.seed}</div>
        <div style={{ background: '#0f1115', borderRadius: 6, padding: 4, overflow: 'hidden' }}>
          <AtlasCanvas scheme="preview_grass" cols={20} rows={20} tilePx={14} seedBase={params.seed} style={{ width: '100%', display: 'block' }} />
        </div>
      </div>
    );
  }
  if (def.title === 'Transition Generator') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Generated transition tiles · {params.preset || 'custom'}</div>
        <div style={{ background: '#0f1115', borderRadius: 6, padding: 6, marginBottom: 10 }}>
          <AtlasCanvas scheme="transitions" cols={9} rows={3} tilePx={28} seedBase={params.seed || 42} padding={1} style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Semantic side labels</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
          {['edge_b_top', 'edge_b_bottom', 'edge_b_left', 'edge_b_right', 'corner_b_top_left', 'corner_b_top_right', 'corner_b_bottom_left', 'corner_b_bottom_right', 'island_b'].map(s => (
            <div key={s} style={{ padding: '4px 6px', background: '#fff', border: '1px solid var(--border)', borderRadius: 4 }}>{s}</div>
          ))}
        </div>
      </div>
    );
  }
  if (def.title === 'Extrude / Padding') {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Original vs padded</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          <PreviewBox label="Original">
            <AtlasCanvas scheme="grass_clean" cols={8} rows={8} tilePx={20} style={{ width: '100%', display: 'block' }} />
          </PreviewBox>
          <PreviewBox label={`Padded ${params.padding}px`}>
            <AtlasCanvas scheme="grass_clean" cols={8} rows={8} tilePx={20} padding={params.padding || 2} style={{ width: '100%', display: 'block' }} />
          </PreviewBox>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
          <div style={{ color: 'var(--ink-4)', marginBottom: 4 }}>Tiled / Godot import settings:</div>
          <div>tile_size: {params.tile_size}</div>
          <div>margin: {params.padding}</div>
          <div>spacing: {params.padding * 2}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-4)', fontSize: 12 }}>
      <I.Eye size={28} style={{ opacity: 0.4 }} />
      <div style={{ marginTop: 8 }}>No preview for this node type</div>
    </div>
  );
};

const PreviewBox = ({ label, children }) => (
  <div>
    <div style={{ background: '#0f1115', borderRadius: 6, padding: 4, overflow: 'hidden' }}>{children}</div>
    <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, fontFamily: 'Geist Mono, monospace' }}>{label}</div>
  </div>
);

const ZoomBar = ({ value }) => (
  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
    {[100, 200, 400].map(z => (
      <button key={z} style={{
        flex: 1, height: 24, padding: 0, fontSize: 10.5, fontFamily: 'Geist Mono, monospace',
        border: '1px solid var(--border-strong)', background: '#fff', borderRadius: 4,
        color: 'var(--ink-2)', cursor: 'pointer',
      }}>{z}%</button>
    ))}
  </div>
);

const MetricBars = ({ before, after }) => {
  const max = Math.max(before, after, 15);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
      {[
        { label: 'before', val: before, color: 'var(--red)' },
        { label: 'after',  val: after,  color: 'var(--green)' },
      ].map(b => (
        <div key={b.label} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontFamily: 'Geist Mono, monospace', marginBottom: 3 }}>
            <span style={{ color: 'var(--ink-3)' }}>{b.label}</span>
            <span style={{ color: 'var(--ink-2)' }}>{b.val.toFixed(1)}</span>
          </div>
          <div style={{ height: 6, background: '#eef0f3', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${(b.val / max) * 100}%`, height: '100%', background: b.color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'Geist Mono, monospace' }}>
        improvement: {(((before - after) / before) * 100).toFixed(0)}%
      </div>
    </div>
  );
};

const ArtifactsTab = ({ def, node }) => {
  const outputs = def.outputs || [];
  const kindIcon = (k) => {
    if (k === 'image') return <I.Image size={14} />;
    if (k === 'csv') return <I.CSV size={14} />;
    if (k === 'md') return <I.File size={14} />;
    if (k === 'folder') return <I.Folder size={14} />;
    return <I.File size={14} />;
  };
  const fakePath = (p) => {
    const base = `out/${node.id}/`;
    if (p.kind === 'image') return `${base}${p.id}.png`;
    if (p.kind === 'csv') return `${base}${p.id}.csv`;
    if (p.kind === 'md') return `${base}${p.id}.md`;
    if (p.kind === 'json') return `${base}${p.id}.json`;
    if (p.kind === 'yaml') return `${base}${p.id}.yaml`;
    if (p.kind === 'folder') return `${base}${p.id}/`;
    return `${base}${p.id}`;
  };
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Outputs from latest run · {node.runs > 0 ? 'today 14:24' : 'no runs yet'}
      </div>
      {outputs.map(p => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: 10, background: '#fff', border: '1px solid var(--border)',
          borderRadius: 6, marginBottom: 6,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 5, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
            {kindIcon(p.kind)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{p.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fakePath(p)}</div>
          </div>
          <IconBtn title="Download"><I.Download size={13} /></IconBtn>
        </div>
      ))}
    </div>
  );
};

const LogsTab = ({ def, node, logs, isRunning }) => {
  const lines = logs || SAMPLE_LOGS[node.type] || ['(no logs yet — run this node to see output)'];
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines.length]);
  return (
    <div ref={ref} style={{
      background: '#0f1115', color: '#cdd2da',
      fontFamily: 'Geist Mono, monospace', fontSize: 11,
      padding: 12, borderRadius: 6, lineHeight: 1.6,
      maxHeight: '100%', overflow: 'auto', minHeight: 200,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {lines.map((line, i) => {
        let color = '#cdd2da';
        if (line.startsWith('$')) color = '#7c3aed';
        else if (line.includes('done')) color = '#1faa6b';
        else if (line.includes('warn') || line.includes('WARN')) color = '#ea7b2c';
        else if (line.includes('error')) color = '#e94c8b';
        else if (line.startsWith('[')) color = '#6fb0e8';
        return <div key={i} style={{ color }}>{line}</div>;
      })}
      {isRunning && <span style={{ display: 'inline-block', width: 8, height: 13, background: '#7c3aed', verticalAlign: 'text-bottom', animation: 'spin 0.5s steps(2) infinite' }} />}
    </div>
  );
};

const CommandTab = ({ def, cmd, node, params }) => {
  if (!cmd) return (
    <div style={{ color: 'var(--ink-4)', fontSize: 12, padding: '24px 0', textAlign: 'center' }}>
      This node has no script (it’s an input or comparison node).
    </div>
  );
  const [copied, setCopied] = React.useState(false);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Command preview</span>
        <button
          onClick={() => { navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          style={{
            background: '#fff', border: '1px solid var(--border-strong)', borderRadius: 5,
            padding: '3px 8px', fontSize: 10.5, color: 'var(--ink-2)', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >{copied ? '✓ copied' : 'copy'}</button>
      </div>
      <pre style={{
        background: '#0f1115', color: '#cdd2da',
        padding: 12, borderRadius: 6, fontSize: 11.5,
        fontFamily: 'Geist Mono, monospace',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        margin: 0, lineHeight: 1.6,
      }}>{cmd}</pre>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 10, lineHeight: 1.6 }}>
        Run captures: command, parameters, input artifact hashes, output paths, timestamp, notes — all stored in the experiment history.
      </div>
    </div>
  );
};

const EmptyInspector = () => (
  <div style={{
    height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)',
    padding: 32, textAlign: 'center',
  }}>
    <I.Layers size={32} style={{ opacity: 0.4 }} />
    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>Select a node</div>
    <div style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.5, maxWidth: 240 }}>
      Click any node on the canvas to inspect its parameters, run it, view artifacts, and read logs.
    </div>
  </div>
);

Object.assign(window, { Inspector, TRANSITION_PRESETS, buildCommand });
