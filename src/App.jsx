import { useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import Header from './components/Header.jsx';
import TopologyStudio from './components/TopologyStudio.jsx';
import RequirementPanel from './components/RequirementPanel.jsx';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleImport = useCallback((data) => {
    setNodes(data.nodes || []);
    setEdges(data.edges || []);
    setRequirements(data.requirements || []);
  }, []);

  return (
    <div className="h-full flex flex-col bg-scada-bg">
      <Header nodes={nodes} edges={edges} requirements={requirements} onImport={handleImport} />

      <main className="flex-1 flex min-h-0 flex-col md:flex-row">
        <div className="flex-1 min-h-0 min-w-0">
          <TopologyStudio
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            requirements={requirements}
          />
        </div>
        <RequirementPanel
          nodes={nodes}
          requirements={requirements}
          setRequirements={setRequirements}
        />
      </main>

      {(offlineReady || needRefresh) && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 max-w-sm bg-scada-panel border border-scada-line rounded-lg shadow-xl p-4 flex gap-3 items-start"
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
                className="mt-2 px-3 py-1 rounded bg-scada-accent text-slate-900 font-semibold text-xs hover:opacity-90"
              >
                Reload to update
              </button>
            )}
          </div>
          <button onClick={closePrompt} aria-label="Dismiss" className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
