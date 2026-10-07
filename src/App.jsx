import { useState, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X, Network, ListChecks, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import Header from './components/Header.jsx';
import TopologyStudio from './components/TopologyStudio.jsx';
import RequirementPanel from './components/RequirementPanel.jsx';
import useLocalStorage from './hooks/useLocalStorage.js';
import { ECOSYSTEMS, DEFAULT_ECOSYSTEM } from './lib/ecosystems.js';

const TOAST_STYLE = {
  success: { Icon: CheckCircle2, cls: 'border-emerald-500/60 text-emerald-300' },
  error: { Icon: AlertTriangle, cls: 'border-red-500/60 text-red-300' },
  info: { Icon: Info, cls: 'border-scada-accent/60 text-scada-accent' },
};

export default function App() {
  const [nodes, setNodes] = useLocalStorage('sap:nodes', []);
  const [edges, setEdges] = useLocalStorage('sap:edges', []);
  const [requirements, setRequirements] = useLocalStorage('sap:requirements', []);
  const [storedEco, setEcosystem] = useLocalStorage('sap:ecosystem', DEFAULT_ECOSYSTEM);
  const [webhookUrl, setWebhookUrl] = useLocalStorage('sap:webhook', '');
  const [tab, setTab] = useState('studio'); // mobile only
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const ecosystem = ECOSYSTEMS[storedEco] ? storedEco : DEFAULT_ECOSYSTEM;

  const notify = useCallback((type, msg) => {
    clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), type === 'error' ? 6000 : 3500);
  }, []);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleImport = useCallback(
    (data) => {
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setRequirements(data.requirements || []);
      if (data.ecosystem && ECOSYSTEMS[data.ecosystem]) setEcosystem(data.ecosystem);
    },
    [setNodes, setEdges, setRequirements, setEcosystem]
  );

  const handleNew = useCallback(() => {
    if (!nodes.length && !requirements.length) return;
    if (window.confirm('Start a new project? Unsaved work will be cleared.')) {
      setNodes([]);
      setEdges([]);
      setRequirements([]);
    }
  }, [nodes.length, requirements.length, setNodes, setEdges, setRequirements]);

  const unmapped = (requirements || []).filter(
    (r) => !(r.linkedNodes || []).some((id) => (nodes || []).some((n) => n.id === id))
  ).length;

  const tabBtn = (id, Icon, label, badge) => (
    <button
      onClick={() => setTab(id)}
      aria-current={tab === id ? 'page' : undefined}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium ${
        tab === id ? 'text-scada-accent' : 'text-slate-400'
      }`}
    >
      <Icon className="w-6 h-6" />
      {label}
      {badge > 0 && (
        <span className="absolute top-1.5 left-1/2 ml-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );

  const T = toast ? TOAST_STYLE[toast.type] || TOAST_STYLE.info : null;

  return (
    <div className="h-full flex flex-col bg-scada-bg">
      <div className="safe-top bg-scada-panel">
        <Header
          nodes={nodes}
          edges={edges}
          requirements={requirements}
          ecosystem={ecosystem}
          onEcosystemChange={setEcosystem}
          onImport={handleImport}
          onNew={handleNew}
          webhookUrl={webhookUrl}
          onWebhookUrlChange={setWebhookUrl}
          notify={notify}
        />
      </div>

      <main className="flex-1 flex min-h-0 flex-col md:flex-row">
        {/* Both views stay mounted so state and canvas survive tab switches */}
        <div className={`${tab === 'studio' ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 min-w-0 flex-col`}>
          <div className="flex-1 min-h-0">
            <TopologyStudio
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              requirements={requirements}
              ecosystem={ecosystem}
            />
          </div>
        </div>

        <div className={`${tab === 'requirements' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-none min-h-0`}>
          <RequirementPanel
            nodes={nodes}
            requirements={requirements}
            setRequirements={setRequirements}
          />
        </div>
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden flex bg-scada-panel border-t border-scada-line safe-bottom">
        {tabBtn('studio', Network, 'Studio', 0)}
        {tabBtn('requirements', ListChecks, 'Requirements', unmapped)}
      </nav>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed z-[60] top-[calc(env(safe-area-inset-top,0px)+4rem)] inset-x-4 md:inset-x-auto md:right-4 md:w-80 flex items-start gap-2.5 bg-scada-panel border rounded-lg shadow-xl px-3 py-2.5 text-sm ${T.cls}`}
        >
          <T.Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="flex-1 text-slate-100">{toast.msg}</p>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {(offlineReady || needRefresh) && (
        <div
          role="alert"
          className="fixed bottom-20 md:bottom-4 right-4 left-4 md:left-auto z-50 md:max-w-sm bg-scada-panel border border-scada-line rounded-lg shadow-xl p-4 flex gap-3 items-start"
        >
          {needRefresh ? (
            <RefreshCw className="w-5 h-5 text-scada-accent shrink-0 mt-0.5" />
          ) : (
            <WifiOff className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-medium">
              {needRefresh ? 'A new version is available.' : 'Ready to work offline.'}
            </p>
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="mt-2 px-3 py-1.5 rounded bg-scada-accent text-slate-900 font-semibold text-xs hover:opacity-90"
              >
                Reload to update
              </button>
            )}
          </div>
          <button onClick={closePrompt} aria-label="Dismiss" className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
