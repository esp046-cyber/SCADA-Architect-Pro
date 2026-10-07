import { useEffect, useRef, useState } from 'react';
import {
  Factory,
  Download,
  FileSpreadsheet,
  Upload,
  FilePlus,
  Share2,
  CloudUpload,
  Loader2,
  Settings,
  MoreVertical,
  X,
} from 'lucide-react';
import { buildBomCsv } from '../lib/scada.js';
import { ECOSYSTEMS } from '../lib/ecosystems.js';

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens native share sheet when supported (mobile), otherwise triggers download
async function shareOrDownload(filename, content, type, title) {
  const file = new File([content], filename, { type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
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

const validWebhook = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch {
    return false;
  }
};

export default function Header({
  nodes = [],
  edges = [],
  requirements = [],
  ecosystem,
  onEcosystemChange,
  onImport,
  onNew,
  webhookUrl,
  onWebhookUrlChange,
  notify,
}) {
  const fileRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  const buildPayload = () => {
    const { licensing, io } = buildBomCsv({ nodes, edges, requirements, ecosystem });
    return {
      app: 'SCADA Architect Pro',
      version: 3,
      savedAt: new Date().toISOString(),
      ecosystem,
      licensing: { product: licensing.product, totalTags: licensing.total, indicativeTier: licensing.tierName },
      io: { total: io.totalIO, assigned: io.assignedIO, unassigned: io.totalIO - io.assignedIO },
      nodes,
      edges,
      requirements,
    };
  };

  const saveJson = () => {
    shareOrDownload('scada-architecture.json', JSON.stringify(buildPayload(), null, 2), 'application/json', 'SCADA Architecture');
  };

  const exportBom = () => {
    const { csv } = buildBomCsv({ nodes, edges, requirements, ecosystem });
    shareOrDownload('scada-bom.csv', csv, 'text/csv', 'SCADA Bill of Materials');
  };

  const openSettings = () => {
    setUrlDraft(webhookUrl || '');
    setUrlError('');
    setSettingsOpen(true);
    setMenuOpen(false);
  };

  const saveSettings = () => {
    const v = urlDraft.trim();
    if (v && !validWebhook(v)) {
      setUrlError('Enter a valid http(s) URL.');
      return;
    }
    onWebhookUrlChange(v);
    setSettingsOpen(false);
    notify('success', v ? 'Webhook URL saved.' : 'Webhook URL cleared.');
  };

  const syncWorkspace = async () => {
    if (!validWebhook(webhookUrl)) {
      openSettings();
      notify('info', 'Add your webhook URL to sync.');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      notify('error', 'You are offline. Sync needs a connection.');
      return;
    }
    setSyncing(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'scada_architect.sync', ...buildPayload() }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      notify('success', 'Synced to workspace.');
    } catch (err) {
      notify(
        'error',
        err.name === 'AbortError'
          ? 'Sync timed out after 15 s.'
          : `Sync failed (${err.message}). Check the URL and the webhook's CORS setting.`
      );
    } finally {
      clearTimeout(timer);
      setSyncing(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== 'object') throw new Error();
        onImport(parsed);
        notify('success', 'Project loaded successfully.');
      } catch {
        notify('error', 'Invalid or corrupted JSON project file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasContent = nodes.length > 0 || requirements.length > 0;

  const secondary = [
    { key: 'new', icon: FilePlus, label: 'New', onClick: onNew, disabled: !hasContent },
    { key: 'open', icon: Upload, label: 'Open', onClick: () => fileRef.current?.click() },
    { key: 'save', icon: Download, label: 'Save JSON', onClick: saveJson, disabled: !hasContent },
    { key: 'hook', icon: Settings, label: 'Webhook', onClick: openSettings },
  ];

  const btn =
    'flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] md:min-h-0 px-2.5 md:px-3 py-1.5 rounded-md text-xs font-medium border border-scada-line bg-scada-panel hover:border-scada-accent hover:text-scada-accent active:bg-scada-line transition-colors disabled:opacity-40 disabled:pointer-events-none';

  return (
    <header className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 bg-scada-panel border-b border-scada-line">
      <div className="flex items-center gap-2.5 min-w-0 flex-1 md:flex-none">
        <div className="p-1.5 rounded-md bg-scada-accent/15 shrink-0">
          <Factory className="w-5 h-5 text-scada-accent" />
        </div>
        <div className="leading-tight min-w-0 hidden sm:block">
          <h1 className="text-sm font-bold tracking-wide truncate">SCADA Architect Pro</h1>
          <p className="text-[10px] text-slate-400 hidden lg:block">Topology &amp; Requirement Studio</p>
        </div>
        <label className="min-w-0 flex-1 md:flex-none md:ml-2">
          <span className="sr-only">SCADA Ecosystem</span>
          <select
            value={ecosystem}
            onChange={(e) => onEcosystemChange(e.target.value)}
            className="w-full md:w-52 min-h-[40px] md:min-h-0 px-2 py-1.5 text-sm md:text-xs rounded-md bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent"
          >
            {Object.entries(ECOSYSTEMS).map(([id, e]) => (
              <option key={id} value={id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} className="hidden" />

        {/* Desktop: inline secondary actions */}
        {secondary.map(({ key, icon: Icon, label, onClick, disabled }) => (
          <button key={key} className={`${btn} hidden md:flex`} onClick={onClick} disabled={disabled} aria-label={label}>
            <Icon className="w-4 h-4" /> <span className="hidden xl:inline">{label}</span>
          </button>
        ))}

        <button className={btn} onClick={exportBom} disabled={!nodes.length} aria-label="Export BOM">
          {canNativeShare ? <Share2 className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
          <span className="hidden xl:inline">{canNativeShare ? 'Share BOM' : 'Export BOM'}</span>
        </button>

        <button
          className={`${btn} !border-scada-accent/60 text-scada-accent`}
          onClick={syncWorkspace}
          disabled={syncing || !hasContent}
          aria-label="Sync to Workspace"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
          <span className="hidden xl:inline">Sync to Workspace</span>
        </button>

        {/* Mobile: overflow menu */}
        <div className="relative md:hidden" ref={menuRef}>
          <button className={btn} onClick={() => setMenuOpen((o) => !o)} aria-label="More actions" aria-expanded={menuOpen}>
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-scada-line bg-scada-panel shadow-2xl py-1">
              {secondary.map(({ key, icon: Icon, label, onClick, disabled }) => (
                <button
                  key={key}
                  disabled={disabled}
                  onClick={() => {
                    setMenuOpen(false);
                    onClick();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-3 text-sm text-left disabled:opacity-40 active:bg-scada-line"
                >
                  <Icon className="w-4 h-4 text-slate-400" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Webhook settings dialog */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Webhook settings"
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-md bg-scada-panel border border-scada-line rounded-t-2xl md:rounded-xl p-4 shadow-2xl safe-bottom"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Sync to Workspace - Webhook</h2>
              <button onClick={() => setSettingsOpen(false)} aria-label="Close" className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Webhook URL</span>
              <input
                type="url"
                autoFocus
                value={urlDraft}
                onChange={(e) => {
                  setUrlDraft(e.target.value);
                  setUrlError('');
                }}
                placeholder="https://your-n8n.example/webhook/scada-sync"
                className="w-full px-2.5 py-2 text-base md:text-sm rounded bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent"
              />
            </label>
            {urlError && <p className="mt-1 text-xs text-amber-400">{urlError}</p>}
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Sends a JSON POST with <code>nodes</code>, <code>edges</code>, <code>requirements</code>, ecosystem and
              licensing summary. For n8n use the Webhook node (POST) and add this app's origin under
              "Allowed Origins (CORS)". Use the Production URL for an active workflow.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button className={btn} onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button className={`${btn} !bg-scada-accent !text-slate-900 !border-scada-accent font-semibold`} onClick={saveSettings}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
