import { useRef } from 'react';
import { Factory, Download, FileSpreadsheet, Upload } from 'lucide-react';

const KIND_LABELS = {
  plc_ab: 'PLC - Allen-Bradley',
  plc_siemens: 'PLC - Siemens',
  hmi: 'HMI / InTouch Client',
  historian: 'Wonderware Historian',
  switch: 'Network Switch',
  database: 'Database Server',
};

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Header({ nodes, edges, requirements, onImport }) {
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
    download('scada-architecture.json', JSON.stringify(payload, null, 2), 'application/json');
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
    download('scada-bom.csv', lines.join('\n'), 'text/csv');
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
    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-scada-line bg-scada-panel hover:border-scada-accent hover:text-scada-accent transition-colors disabled:opacity-40 disabled:pointer-events-none';

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-scada-panel border-b border-scada-line">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-md bg-scada-accent/15">
          <Factory className="w-5 h-5 text-scada-accent" />
        </div>
        <div className="leading-tight min-w-0">
          <h1 className="text-sm font-bold tracking-wide truncate">SCADA Architect Pro</h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">Wonderware Topology &amp; Requirement Studio</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} className="hidden" />
        <button className={btn} onClick={() => fileRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Open</span>
        </button>
        <button className={btn} onClick={saveJson} disabled={!nodes.length && !requirements.length}>
          <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save JSON</span>
        </button>
        <button className={btn} onClick={exportBom} disabled={!nodes.length}>
          <FileSpreadsheet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export BOM</span>
        </button>
      </div>
    </header>
  );
}
