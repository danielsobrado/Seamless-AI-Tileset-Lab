// Lucide-ish line icons. 16px stroke 1.6 default.
const Icon = ({ d, size = 16, stroke = 1.6, fill = "none", style, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
    {...rest}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  Logo: (p) => (
    <Icon {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h7v7h-7z" />
      <path d="M14 17.5h7M17.5 14v7" />
    </Icon>
  ),
  Play: (p) => <Icon {...p} d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />,
  Pause: (p) => <Icon {...p}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></Icon>,
  Stop: (p) => <Icon {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" /></Icon>,
  Plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Minus: (p) => <Icon {...p} d="M5 12h14" />,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>,
  Layers: (p) => <Icon {...p} d="M12 3 2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5" />,
  Box: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /></Icon>,
  Grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
  Tag: (p) => <Icon {...p}><path d="M20.6 13.4 13.4 20.6a1.4 1.4 0 0 1-2 0L3 12.2V3h9.2l8.4 8.4a1.4 1.4 0 0 1 0 2z" /><circle cx="7.5" cy="7.5" r="1.2" /></Icon>,
  Chart: (p) => <Icon {...p} d="M3 3v18h18M7 14l4-4 4 4 5-7" />,
  Wrench: (p) => <Icon {...p} d="M14.7 6.3a4 4 0 0 0 5 5l-7 7a2.8 2.8 0 0 1-4-4l-3-3 3-3 3 3 5-5z" />,
  Eye: (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Icon>,
  Shuffle: (p) => <Icon {...p} d="M16 3h5v5M4 20l17-17M21 16v5h-5M4 4l5 5m6 6 6 6" />,
  Sheet: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></Icon>,
  Frame: (p) => <Icon {...p} d="M5 3v18M19 3v18M3 5h18M3 19h18" />,
  Compare: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18" /></Icon>,
  History: (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></Icon>,
  Folder: (p) => <Icon {...p} d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>,
  Bell: (p) => <Icon {...p} d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />,
  Help: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></Icon>,
  Share: (p) => <Icon {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></Icon>,
  Branch: (p) => <Icon {...p}><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 8v8M6 14a8 8 0 0 0 8-8h2" /></Icon>,
  Duplicate: (p) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></Icon>,
  Trash: (p) => <Icon {...p} d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />,
  Warn: (p) => <Icon {...p}><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" /></Icon>,
  Check: (p) => <Icon {...p} d="m4 12 5 5L20 6" />,
  X: (p) => <Icon {...p} d="M6 6l12 12M18 6 6 18" />,
  ChevronDown: (p) => <Icon {...p} d="m6 9 6 6 6-6" />,
  ChevronRight: (p) => <Icon {...p} d="m9 6 6 6-6 6" />,
  ChevronLeft: (p) => <Icon {...p} d="m15 6-6 6 6 6" />,
  More: (p) => <Icon {...p}><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></Icon>,
  Upload: (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  Download: (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  Zap: (p) => <Icon {...p} d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  Lock: (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></Icon>,
  Star: (p) => <Icon {...p} d="m12 2 3.1 6.5 7 1-5.1 5 1.2 7L12 18l-6.2 3.5 1.2-7-5.1-5 7-1z" />,
  StarFill: (p) => <Icon {...p} d="m12 2 3.1 6.5 7 1-5.1 5 1.2 7L12 18l-6.2 3.5 1.2-7-5.1-5 7-1z" fill="currentColor" />,
  Pan: (p) => <Icon {...p} d="M5 9V5a2 2 0 0 1 4 0v6m0-2v8a4 4 0 0 1-4-4v-3a2 2 0 1 1 4 0M9 9V4a2 2 0 1 1 4 0v7m0-2V5a2 2 0 1 1 4 0v9m0-2V8a2 2 0 1 1 4 0v8a6 6 0 0 1-6 6H9" />,
  Resize: (p) => <Icon {...p} d="M21 3 14 10M3 21l7-7M21 8V3h-5M3 16v5h5" />,
  ZoomIn: (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M20 20l-3.5-3.5" /></Icon>,
  ZoomOut: (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M8 11h6M20 20l-3.5-3.5" /></Icon>,
  Map: (p) => <Icon {...p} d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15" />,
  Code: (p) => <Icon {...p} d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />,
  Image: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Icon>,
  File: (p) => <Icon {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6" />,
  CSV: (p) => (
    <Icon {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6" />
    </Icon>
  ),
  Dots: (p) => <Icon {...p}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></Icon>,
};

window.I = I;
window.Icon = Icon;
