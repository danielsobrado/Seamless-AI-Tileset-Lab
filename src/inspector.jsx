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

const NumInput = ({ value, onChange, min, max, step = 1, suffix }) => {
  const coerce = (raw) => {
    if (raw === '') {
      onChange('');
      return;
    }
    let next = Number(raw);
    if (!Number.isFinite(next)) return;
    if (min != null && next < min) next = min;
    if (max != null && next > max) next = max;
    onChange(next);
  };
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="number" value={value ?? ''} min={min} max={max} step={step}
        onChange={e => coerce(e.target.value)}
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
};

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

const RawUploadControl = ({ node, artifact, onUpload }) => (
  <div style={{ marginTop: 10, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Source atlas</div>
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={(e) => onUpload?.(node.id, e.target.files?.[0])}
      style={{ width: '100%', fontSize: 11 }}
    />
    <div style={{ marginTop: 8, fontSize: 10.5, color: artifact ? 'var(--green)' : 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>
      {artifact ? `${artifact.name} - ${artifact.width || '?'}x${artifact.height || '?'} px` : 'Upload an image to create the raw atlas artifact.'}
    </div>
  </div>
);

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
  if (window.BrowserPipeline?.buildBrowserCommand) return window.BrowserPipeline.buildBrowserCommand(node, def);
  return `browser-pipeline.run(${node.type})`;
}

// --- Inspector main component ---
const Inspector = ({
  node, def, edges, nodes,
  onParamChange, onUploadInput, onClose, onRun, onDuplicate, onBranch, onDelete, onOpenDashboard,
  runningId, runningPct, logs, artifacts, uploadArtifact,
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
  const isBlockedByOtherRun = runningId && runningId !== node.id;
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
        {node.type === 'raw_input' && <RawUploadControl node={node} artifact={uploadArtifact?.artifacts?.atlas} onUpload={onUploadInput} />}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button
            onClick={() => onRun(node.id)}
            disabled={isRunning || isBlockedByOtherRun}
            style={{
              flex: 1, height: 32, padding: '0 12px', border: 'none', borderRadius: 6,
              background: (isRunning || isBlockedByOtherRun) ? '#9aa1ab' : 'var(--ink)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: (isRunning || isBlockedByOtherRun) ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isRunning ? <><Spinner /> Running... {Math.floor(runningPct)}%</> : isBlockedByOtherRun ? <>Run in progress</> : <><I.Play size={11} /> Run node</>}
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
        {tab === 'preview' && <PreviewTab def={def} node={node} params={params} artifacts={artifacts} />}
        {tab === 'artifacts' && <ArtifactsTab def={def} node={node} artifacts={artifacts} />}
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
      {def.title === 'Tile Classification' && <ClassMapEditor params={params} onChange={(next) => onParamChange(node.id, { ...node.params, custom_class_string: next })} />}
      {/* Seam table for seam_report */}
      {def.title === 'Seam Report' && <div style={{ marginTop: 14, color: 'var(--ink-4)', fontSize: 11 }}>Run this node to compute seam scores from the connected atlas.</div>}
    </div>
  );
};

const ClassMapEditor = ({ params, onChange }) => {
  const colors = { grass_base: '#56a050', transition: '#d99a45', dirt_base: '#8d5d33', props: '#7c3aed' };
  const classes = Object.keys(colors);
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
  const serialize = (nextMap) => classes
    .map(cls => {
      const ids = Object.keys(nextMap).map(Number).filter(id => nextMap[id] === cls).sort((a, b) => a - b);
      return ids.length ? `${cls}:${ids.join(',')}` : null;
    })
    .filter(Boolean)
    .join(';');
  const cycleTile = (id) => {
    const current = map[id];
    const next = classes[(classes.indexOf(current) + 1) % classes.length];
    onChange(serialize({ ...map, [id]: next }));
  };
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
            <button key={i} type="button" onClick={() => cycleTile(id)} style={{
              aspectRatio: '1', background: cls ? colors[cls] : '#2a2e35',
              border: 0, borderRadius: 2, position: 'relative',
              fontSize: 8.5, color: '#fff', fontFamily: 'Geist Mono, monospace',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, cursor: 'pointer', userSelect: 'none',
            }}>{id}</button>
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

const PreviewTab = ({ def, node, params, artifacts }) => {
  const image = artifacts?.list?.find(a => a.kind === 'image') || Object.values(artifacts?.artifacts || {}).find(a => a?.kind === 'image');
  if (!image) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-4)', fontSize: 12 }}>
        <I.Eye size={28} style={{ opacity: 0.4 }} />
        <div style={{ marginTop: 8 }}>No generated preview yet</div>
        <div style={{ marginTop: 4, fontSize: 10.5 }}>Upload/run the required upstream nodes, then run this node.</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Latest generated image</div>
      <div style={{ background: '#0f1115', borderRadius: 6, padding: 6, overflow: 'hidden' }}>
        <img src={image.url} alt={image.name} style={{ width: '100%', display: 'block', imageRendering: 'pixelated' }} />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace', marginTop: 8 }}>{image.name} - {image.width || '?'}x{image.height || '?'} px</div>
    </div>
  );
};

const ArtifactsTab = ({ def, node, artifacts }) => {
  const outputs = def.outputs || [];
  const generated = artifacts?.artifacts || {};
  const kindIcon = (k) => {
    if (k === 'image') return <I.Image size={14} />;
    if (k === 'csv') return <I.CSV size={14} />;
    if (k === 'md') return <I.File size={14} />;
    if (k === 'folder') return <I.Folder size={14} />;
    return <I.File size={14} />;
  };
  const download = (artifact, fallback) => {
    if (!artifact?.url) return;
    const a = document.createElement('a');
    a.href = artifact.url;
    a.download = artifact.name || fallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Outputs from latest run - {artifacts?.generatedAt ? new Date(artifacts.generatedAt).toLocaleString() : 'run this node to generate artifacts'}
      </div>
      {outputs.map(p => {
        const artifact = generated[p.id];
        const name = artifact?.name || `${node.id}-${p.id}`;
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: 10, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 6, marginBottom: 6,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
              {kindIcon(artifact?.kind || p.kind)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {artifact ? `${name} - ${Math.max(1, Math.round((artifact.size || 0) / 1024))} KB` : 'not generated yet'}
              </div>
            </div>
            <IconBtn onClick={() => download(artifact, name)} title="Download" style={{ opacity: artifact ? 1 : 0.35, pointerEvents: artifact ? 'auto' : 'none' }}><I.Download size={13} /></IconBtn>
          </div>
        );
      })}
    </div>
  );
};

const LogsTab = ({ def, node, logs, isRunning }) => {
  const lines = logs || ['(no logs yet - run this node to see browser output)'];
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
          onClick={() => { if (!navigator.clipboard?.writeText) return; navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }).catch(() => {}); }}
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
