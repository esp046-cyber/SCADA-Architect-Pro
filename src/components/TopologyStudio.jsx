import { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from 'reactflow';
import { Cpu, Monitor, Database, Network, HardDrive, Server, ListChecks, Plus, X, Tags } from 'lucide-react';
import PropertiesPanel from './PropertiesPanel.jsx';
import { networkOf, estimateLicense, toNum, fmt } from '../lib/scada.js';

export const NODE_KINDS = {
  plc_ab: { label: 'Allen-Bradley PLC', icon: Cpu, color: '#f97316' },
  plc_siemens: { label: 'Siemens PLC', icon: Cpu, color: '#14b8a6' },
  hmi: { label: 'HMI / InTouch', icon: Monitor, color: '#22d3ee' },
  historian: { label: 'Historian', icon: HardDrive, color: '#a78bfa' },
  switch: { label: 'Network Switch', icon: Network, color: '#facc15' },
  database: { label: 'Database (SQL)', icon: Database, color: '#f472b6' },
};

/* ---------- Custom node ---------- */
function ScadaNode({ data, selected }) {
  const kind = NODE_KINDS[data.kind] || { icon: Server, color: '#94a3b8', label: 'Node' };
  const Icon = kind.icon;
  const tags = toNum(data.tagCount);
  return (
    <div
      className="rounded-lg bg-scada-panel px-3 py-2 min-w-[150px] shadow-lg"
      style={{ border: `2px solid ${selected ? '#fff' : kind.color}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0" style={{ color: kind.color }} />
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{data.label}</div>
          <div className="text-[10px] text-slate-400 truncate">{kind.label}</div>
          {data.ip && <div className="text-[10px] font-mono text-slate-300 truncate">{data.ip}</div>}
        </div>
        {data.reqCount > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-[10px] bg-scada-accent text-slate-900 font-bold rounded-full px-1.5 py-0.5">
            <ListChecks className="w-3 h-3" />
            {data.reqCount}
          </span>
        )}
      </div>
      {tags > 0 && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
          <Tags className="w-3 h-3" /> {fmt(tags)} tags
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-3 !h-3" />
    </div>
  );
}

/* ---------- Custom edge (protocol + network aware) ---------- */
function ScadaEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const net = networkOf(data?.network);
  const proto = data?.protocol && data.protocol !== 'Default' ? data.protocol : '';
  const label = [proto, net.short].filter(Boolean).join(' · ');
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={36}
        style={{ stroke: net.color, strokeWidth: selected ? 4 : 2, strokeDasharray: net.dash }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              borderColor: net.color,
            }}
            className="px-1.5 py-0.5 rounded bg-scada-bg border text-[10px] font-semibold text-slate-100 whitespace-nowrap"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { scada: ScadaNode };
const edgeTypes = { scada: ScadaEdge };
let idCounter = Date.now();
const nextId = () => `node_${idCounter++}`;

function Studio({ nodes, setNodes, edges, setEdges, requirements }) {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [sel, setSel] = useState(null); // { type: 'node' | 'edge', id }
  const [sheetOpen, setSheetOpen] = useState(false);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, reqCount: requirements.filter((r) => r.linkedNodes.includes(n.id)).length },
      })),
    [nodes, requirements]
  );

  // Force the custom edge type so projects saved before this version still render
  const displayEdges = useMemo(() => edges.map((e) => ({ ...e, type: 'scada', animated: false })), [edges]);

  const selectedNode = sel?.type === 'node' ? nodes.find((n) => n.id === sel.id) : null;
  const selectedEdge = sel?.type === 'edge' ? edges.find((e) => e.id === sel.id) : null;
  const panelOpen = !!(selectedNode || selectedEdge);
  const lic = useMemo(() => estimateLicense(nodes), [nodes]);

  const onNodesChange = useCallback((c) => setNodes((ns) => applyNodeChanges(c, ns)), [setNodes]);
  const onEdgesChange = useCallback((c) => setEdges((es) => applyEdgeChanges(c, es)), [setEdges]);
  const onConnect = useCallback(
    (p) =>
      setEdges((es) =>
        addEdge({ ...p, type: 'scada', data: { protocol: 'Default', network: 'unspecified' } }, es)
      ),
    [setEdges]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const addNode = (kind, position) => {
    const count = nodes.filter((n) => n.data.kind === kind).length + 1;
    setNodes((ns) => [
      ...ns,
      {
        id: nextId(),
        type: 'scada',
        position,
        data: { kind, label: `${NODE_KINDS[kind].label} ${count}`, ip: '', hostname: '', tagCount: 0 },
      },
    ]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/scada-kind');
    if (!kind) return;
    addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  const addByTap = (kind) => {
    const r = wrapperRef.current.getBoundingClientRect();
    const off = (nodes.length % 5) * 28;
    addNode(kind, screenToFlowPosition({ x: r.left + r.width / 2 - 75 + off, y: r.top + r.height / 3 + off }));
    setSheetOpen(false);
  };

  const updateNode = (id, patch) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));

  const updateEdge = (id, patch) =>
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...patch } } : e)));

  const deleteSelection = () => {
    if (selectedNode) {
      setNodes((ns) => ns.filter((n) => n.id !== selectedNode.id));
      setEdges((es) => es.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    } else if (selectedEdge) {
      setEdges((es) => es.filter((e) => e.id !== selectedEdge.id));
    }
    setSel(null);
  };

  return (
    <div className="h-full flex relative">
      {/* Desktop palette */}
      <aside className="hidden md:block w-40 shrink-0 bg-scada-panel border-r border-scada-line p-2 overflow-y-auto">
        <h2 className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Equipment</h2>
        <div className="space-y-1.5">
          {Object.entries(NODE_KINDS).map(([kind, { label, icon: Icon, color }]) => (
            <div
              key={kind}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/scada-kind', kind);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addByTap(kind)}
              title="Drag onto canvas, or click to add"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-scada-line bg-scada-bg cursor-grab hover:border-scada-accent text-xs"
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color }} />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1 min-w-0 relative" ref={wrapperRef}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, n) => setSel({ type: 'node', id: n.id })}
          onEdgeClick={(_, e) => setSel({ type: 'edge', id: e.id })}
          onPaneClick={() => {
            setSel(null);
            setSheetOpen(false);
          }}
          deleteKeyCode={['Backspace', 'Delete']}
          panOnDrag={true}
          zoomOnPinch={true}
          zoomOnScroll={true}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          minZoom={0.2}
          maxZoom={2}
          connectionRadius={30}
          fitView
        >
          <Background color="#22304d" gap={20} />
          <Controls showInteractive={false} className="!hidden md:!flex" />
          <MiniMap
            pannable
            zoomable
            className="!hidden md:!block"
            maskColor="rgba(11,18,32,0.7)"
            style={{ background: '#111a2e' }}
            nodeColor={(n) => NODE_KINDS[n.data?.kind]?.color || '#94a3b8'}
          />
        </ReactFlow>

        {/* Live licensing pill */}
        {nodes.length > 0 && (
          <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full bg-scada-panel/95 border border-scada-line text-[11px] shadow">
            <span className="font-semibold text-scada-accent">{fmt(lic.total)}</span> tags ·{' '}
            <span className="text-slate-300">{lic.tierName}</span>
          </div>
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add equipment"
          className={`md:hidden absolute bottom-4 right-4 z-10 w-14 h-14 rounded-full bg-scada-accent text-slate-900 shadow-xl items-center justify-center active:scale-95 transition-transform ${
            panelOpen ? 'hidden' : 'flex'
          }`}
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Mobile equipment bottom sheet */}
        <div
          onClick={() => setSheetOpen(false)}
          className={`md:hidden absolute inset-0 z-20 bg-black/50 transition-opacity ${
            sheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
        <div
          role="dialog"
          aria-label="Equipment"
          className={`md:hidden absolute bottom-0 inset-x-0 z-30 bg-scada-panel border-t border-scada-line rounded-t-2xl shadow-2xl p-4 transition-transform duration-200 ${
            sheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Add equipment</h2>
            <button onClick={() => setSheetOpen(false)} aria-label="Close" className="p-1 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(NODE_KINDS).map(([kind, { label, icon: Icon, color }]) => (
              <button
                key={kind}
                onClick={() => addByTap(kind)}
                className="flex items-center gap-2.5 px-3 py-3.5 rounded-lg border border-scada-line bg-scada-bg active:border-scada-accent text-sm text-left"
              >
                <Icon className="w-6 h-6 shrink-0" style={{ color }} />
                <span className="leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Properties: right side panel on desktop, slide-up drawer on mobile */}
      <PropertiesPanel
        node={selectedNode}
        edge={selectedEdge}
        nodes={nodes}
        onUpdateNode={updateNode}
        onUpdateEdge={updateEdge}
        onDelete={deleteSelection}
        onClose={() => setSel(null)}
      />
    </div>
  );
}

export default function TopologyStudio(props) {
  return (
    <ReactFlowProvider>
      <Studio {...props} />
    </ReactFlowProvider>
  );
}
