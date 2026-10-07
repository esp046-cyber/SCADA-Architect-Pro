import { X, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import { PROTOCOLS, NETWORK_TYPES, isValidIPv4, fmt } from '../lib/scada.js';
import { NODE_KINDS } from '../lib/ecosystems.js';

const input =
  'w-full px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-xs rounded bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent';

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      {children}
      {error ? (
        <span className="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
        </span>
      ) : (
        hint && <span className="block mt-1 text-[10px] text-slate-500">{hint}</span>
      )}
    </label>
  );
}

const numberInput = (value, onChange) => (
  <input
    className={input}
    type="number"
    inputMode="numeric"
    min="0"
    step="1"
    placeholder="0"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
  />
);

export default function PropertiesPanel({ node, edge, nodes = [], io, onUpdateNode, onUpdateEdge, onDelete, onClose }) {
  if (!node && !edge) return null;
  const nameOf = (id) => nodes.find((n) => n.id === id)?.data?.label || id;

  let body;
  let title;

  if (node) {
    title = 'Node Properties';
    const d = node.data || {};
    const kind = NODE_KINDS[d.kind];
    const role = kind?.role;
    const ip = d.ip || '';
    const ipError = ip && !isValidIPv4(ip) ? 'Not a valid IPv4 address' : null;
    const dupe =
      !ipError && ip && nodes.some((o) => o.id !== node.id && (o.data?.ip || '') === ip)
        ? 'Another node already uses this IP'
        : null;

    const reportsTo = role === 'field' ? io?.assignment?.[node.id] || [] : [];
    const plcInfo = role === 'plc' ? io?.perPlc?.[node.id] : null;

    body = (
      <>
        <p className="text-[11px] text-slate-400">{kind?.label || d.kind}</p>
        <Field label="Name">
          <input className={input} value={d.label || ''} onChange={(e) => onUpdateNode(node.id, { label: e.target.value })} />
        </Field>
        <Field label="IP Address" error={ipError || dupe}>
          <input
            className={`${input} font-mono`}
            inputMode="decimal"
            placeholder="192.168.1.10"
            value={ip}
            onChange={(e) => onUpdateNode(node.id, { ip: e.target.value.trim() })}
          />
        </Field>
        <Field label="Hostname">
          <input
            className={input}
            placeholder="e.g. WW-HIST01"
            value={d.hostname || ''}
            onChange={(e) => onUpdateNode(node.id, { hostname: e.target.value.trim() })}
          />
        </Field>

        {role === 'field' ? (
          <Field
            label="I/O Count"
            hint="Rolls up to the connected PLC (directly or through switches)"
            error={reportsTo.length === 0 ? 'Not connected to any PLC - this I/O is unassigned' : null}
          >
            {numberInput(d.ioCount, (v) => onUpdateNode(node.id, { ioCount: v }))}
          </Field>
        ) : (
          <Field label="Estimated Tag Count" hint="Drives the licensing estimate">
            {numberInput(d.tagCount, (v) => onUpdateNode(node.id, { tagCount: v }))}
          </Field>
        )}

        {role === 'field' && reportsTo.length > 0 && (
          <p className="text-[11px] text-slate-300">
            Reports to: <span className="text-scada-accent">{reportsTo.map(nameOf).join(', ')}</span>
          </p>
        )}

        {plcInfo && (
          <div className="rounded border border-scada-line bg-scada-bg p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Aggregated I/O</div>
            <div className="text-lg font-bold text-scada-accent leading-tight">{fmt(plcInfo.io)}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {!plcInfo.panels || plcInfo.panels.length === 0
                ? 'No RIO / MCC / ESD panels connected'
                : `${plcInfo.panels.length} panel${plcInfo.panels.length > 1 ? 's' : ''}: ${plcInfo.panels
                    .map(nameOf)
                    .join(', ')}`}
            </div>
          </div>
        )}
      </>
    );
  } else {
    title = 'Connection Properties';
    const d = edge.data || {};
    const redundant = !!d.redundant;
    body = (
      <>
        <p className="flex items-center gap-1.5 text-xs text-slate-300 min-w-0">
          <span className="truncate">{nameOf(edge.source)}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{nameOf(edge.target)}</span>
        </p>
        <Field label="Protocol">
          <select
            className={input}
            value={d.protocol || 'Default'}
            onChange={(e) => onUpdateEdge(edge.id, { protocol: e.target.value })}
          >
            {PROTOCOLS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Network Type">
          <select
            className={input}
            value={d.network || 'unspecified'}
            onChange={(e) => onUpdateEdge(edge.id, { network: e.target.value })}
          >
            {NETWORK_TYPES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center justify-between gap-3 rounded border border-scada-line bg-scada-bg p-2.5">
          <div className="min-w-0">
            <div className="text-xs font-semibold">Dual Redundant Ring</div>
            <div className="text-[10px] text-slate-400">Fibre-optic or redundant PROFIBUS / PROFINET ring</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={redundant}
            aria-label="Dual Redundant Ring"
            onClick={() => onUpdateEdge(edge.id, { redundant: !redundant })}
            className={`relative shrink-0 w-12 h-7 md:w-10 md:h-6 rounded-full transition-colors ${
              redundant ? 'bg-scada-accent' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 md:w-5 md:h-5 rounded-full bg-white transition-transform ${
                redundant ? 'translate-x-5 md:translate-x-4' : ''
              }`}
            />
          </button>
        </div>
      </>
    );
  }

  return (
    <section
      aria-label={title}
      className="absolute bottom-0 inset-x-0 z-30 max-h-[70%] rounded-t-2xl border-t shadow-2xl md:static md:z-auto md:max-h-none md:w-72 md:shrink-0 md:rounded-none md:border-t-0 md:border-l md:shadow-none bg-scada-panel border-scada-line flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-scada-line">
        <h2 className="text-sm font-bold">{title}</h2>
        <button onClick={onClose} aria-label="Close properties" className="p-1 -mr-1 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">{body}</div>
      <div className="p-3 border-t border-scada-line">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-1.5 text-sm md:text-xs rounded border border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" /> Delete {node ? 'node' : 'connection'}
        </button>
      </div>
    </section>
  );
}
