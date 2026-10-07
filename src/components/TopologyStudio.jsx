import { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from 'reactflow';
import { Cpu, Monitor, Database, Network, HardDrive, Server, Trash2, ListChecks, Plus, X } from 'lucide-react';

export const NODE_KINDS = {
  plc_ab: { label: 'Allen-Bradley PLC', icon: Cpu, color: '#f97316' },
  plc_siemens: { label: 'Siemens PLC', icon: Cpu, color: '#14b8a6' },
  hmi: { label: 'HMI / InTouch', icon: Monitor, color: '#22d3ee' },
  historian: { label: 'Historian', icon: HardDrive, color: '#a78bfa' },
  switch: { label: 'Network Switch', icon: Network, color: '#facc15' },
  database: { label: 'Database (SQL)', icon: Database, color: '#f472b6' },
};

function ScadaNode({ data, selected }) {
  const kind = NODE_KINDS[data.kind] || { icon: Server, color: '#94a3b8', label: 'Node' };
  const Icon = kind.icon;
  return (
    <div
      className="rounded-lg bg-scada-panel px-3 py-2 min-w-[140px] shadow-lg"
      style={{ border: `2px solid ${selected ? '#fff' : kind.color}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0" style={{ color: kind.color }} />
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{data.label}</div>
          <div className="text-[10px] text-slate-400">{kind.label}</div>
        </div>
        {data.reqCount > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-[10px] bg-scada-accent text-slate-900 font-bold rounded-full px-1.5 py-0.5">
            <ListChecks className="w-3 h-3" />
            {data.reqCount}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = { scada: ScadaNode };
let idCounter = Date.now();
const nextId = () => `node_${idCounter++}`;

function Studio({ nodes, setNodes, edges, setEdges, requirements }) {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, reqCount: requirements.filter((r) => r.linkedNodes.includes(n.id)).length },
      })),
    [nodes, requirements]
  );

  const onNodesChange = useCallback((c) => setNodes((ns) => applyNodeChanges(c, ns)), [setNodes]);
  const onEdgesChange = useCallback((c) => setEdges((es) => applyEdgeChanges(c, es)), [setEdges]);
  const onConnect = useCallback(
    (p) => setEdges((es) => addEdge({ ...p, animated: true, style: { stroke: '#22d3ee' } }, es)),
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
        data: { kind, label: `${NODE_KINDS[kind].label} ${count}` },
      },
    ]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/scada-kind');
    if (!kind) return;
    addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  // Tap-to-add: drops the node near the centre of the visible canvas
  const addByTap = (kind) => {
    const r = wrapperRef.current.getBoundingClientRect();
    const off = (nodes.length % 5) * 28;
    addNode(
      kind,
      screenToFlowPosition({ x: r.left + r.width / 2 - 70 + off, y: r.top + r.height / 2 - 20 + off })
    );
    setSheetOpen(false);
  };

  const selected = nodes.find((n) => n.id === selectedId);

  const rename = (label) =>
    setNodes((ns) => ns.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, label } } : n)));

  const remove = () => {
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  const nodeEditor = selected && (
    <>
      <input
        value={selected.data.label}
        onChange={(e) => rename(e.target.value)}
        className="w-full px-2 py-1 text-base md:text-xs rounded bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent"
      />
      <button
        onClick={remove}
        aria-label="Delete node"
        className="flex items-center justify-center gap-1 px-3 md:px-2 py-1 text-xs rounded border border-red-500/50 text-red-400 hover:bg-red-500/10"
      >
        <Trash2 className="w-4 h-4 md:w-3 md:h-3" /> <span className="hidden md:inline">Delete</span>
      </button>
    </>
  );

  return (
    <div className="h-full flex">
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

        {selected && (
          <div className="mt-4 pt-3 border-t border-scada-line space-y-2">
            <h2 className="text-[10px] uppercase tracking-wider text-slate-400">Selected node</h2>
            {nodeEditor}
          </div>
        )}
      </aside>

      {/* Canvas */}
      <div className="flex-1 min-w-0 relative" ref={wrapperRef}>
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => {
            setSelectedId(null);
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

        {/* Mobile: selected node editor */}
        {selected && (
          <div className="md:hidden absolute top-2 left-2 right-2 z-10 flex gap-2 items-center bg-scada-panel/95 border border-scada-line rounded-lg p-2 shadow-xl">
            {nodeEditor}
          </div>
        )}

        {/* Mobile: FAB */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add equipment"
          className="md:hidden absolute bottom-4 right-4 z-10 w-14 h-14 rounded-full bg-scada-accent text-slate-900 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Mobile: bottom sheet */}
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
