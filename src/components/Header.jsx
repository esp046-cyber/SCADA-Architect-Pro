import { useRef } from 'react';
import { Factory, Download, FileSpreadsheet, Upload, FilePlus, Share2 } from 'lucide-react';

const KIND_LABELS = {
  plc_ab: 'PLC - Allen-Bradley',
  plc_siemens: 'PLC - Siemens',
  hmi: 'HMI / InTouch Client',
  historian: 'Wonderware Historian',
  switch: 'Network Switch',
  database: 'Database Server',
};

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens the native share sheet when supported (phones), otherwise downloads.
async function shareOrDownload(filename, content, type, title) {
  const file = new File([content], filename, { type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return; // user closed the share sheet
  }
  downloadFile(file);
}

const canNativeShare =
  typeof navigator !== 'undefined' &&
  typeof navigator.canShare === 'function' &&
  (() => {
    try {
      return navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] });
    } catch {
      return false;
    }
  })();

export default function Header({ nodes, edges, requirements, onImport, onNew }) {
  const fileRef = useRef(null);

  const saveJson = () => {
    const payload = {
      app: 'SCADA Architect Pro',
      version: 1,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
      requirements,
    };
    shareOrDownload(
      'scada-architecture.json',
      JSON.stringify(payload, null, 2),
      'application/json',
      'SCADA Architecture'
    );
  };

  const exportBom = () => {
    const counts = {};
    nodes.forEach((n) => {
      const kind = n.data?.kind;
      counts[kind] = (counts[kind] || 0) + 1;
    });
    const lines = [
      'SCADA Architect Pro - Bill of Materials',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Item,Qty',
      ...Object.entries(counts).map(([k, q]) => `"${KIND_LABELS[k] || k}",${q}`),
      '',
      'Node Detail',
      'Name,Type,Linked Requirements',
      ...nodes.map((n) => {
        const linked = requirements
          .filter((r) => r.linkedNodes.includes(n.id))
          .map((r) => r.text.replace(/"/g, "'"))
          .join(' | ');
        return `"${n.data.label}","${KIND_LABELS[n.data.kind] || n.data.kind}","${linked}"`;
      }),
      '',
      `Total nodes,${nodes.length}`,
      `Total connections,${edges.length}`,
      `Requirements,${requirements.length}`,
    ];
    shareOrDownload('scada-bom.csv', lines.join('\n'), 'text/csv', 'SCADA Bill of Materials');
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(JSON.parse(reader.result));
      } catch {
        alert('Invalid project file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const btn =
    'flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] md:min-h-0 px-2.5 md:px-3 py-1.5 rounded-md text-xs font-medium border border-scada-line bg-scada-panel hover:border-scada-accent hover:text-scada-accent active:bg-scada-line transition-colors disabled:opacity-40 disabled:pointer-events-none';

  return (
    <header className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 bg-scada-panel border-b border-scada-line">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-md bg-scada-accent/15">
          <Factory className="w-5 h-5 text-scada-accent" />
        </div>
        <div className="leading-tight min-w-0">
          <h1 className="text-sm font-bold tracking-wide truncate">SCADA Architect Pro</h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">Wonderware Topology &amp; Requirement Studio</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} className="hidden" />
        <button className={btn} onClick={onNew} aria-label="New project" disabled={!nodes.length && !requirements.length}>
          <FilePlus className="w-4 h-4" /> <span className="hidden lg:inline">New</span>
        </button>
        <button className={btn} onClick={() => fileRef.current?.click()} aria-label="Open project">
          <Upload className="w-4 h-4" /> <span className="hidden lg:inline">Open</span>
        </button>
        <button
          className={btn}
          onClick={saveJson}
          disabled={!nodes.length && !requirements.length}
          aria-label="Save JSON"
        >
          <Download className="w-4 h-4" /> <span className="hidden lg:inline">Save JSON</span>
        </button>
        <button className={btn} onClick={exportBom} disabled={!nodes.length} aria-label="Export BOM">
          {canNativeShare ? <Share2 className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
          <span className="hidden lg:inline">{canNativeShare ? 'Share BOM' : 'Export BOM'}</span>
        </button>
      </div>
    </header>
  );
}
