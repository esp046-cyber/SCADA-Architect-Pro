import React from 'react';
import { X, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  PROTOCOLS,
  NETWORK_TYPES,
  NETWORK_ZONES,
  SIL_LEVELS,
  REDUNDANCY_TYPES,
  isValidIPv4,
  fmt,
} from '../lib/scada.js';
import { NODE_KINDS } from '../lib/ecosystems.js';

const inputClass =
  'w-full px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-xs rounded bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent font-sans';

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

const NumberInput = ({ value, onChange }) => (
  <input
    className={inputClass}
    type="number"
    inputMode="numeric"
    min="0"
    step="1"
    placeholder="0"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
  />
);

export default function PropertiesPanel({
  node,
  edge,
  nodes = [],
  io,
  onUpdateNode,
  onUpdateEdge,
  onDelete,
  onClose,
}) {
  if (!node && !edge) return null;

  const nameOf = (id) => nodes.find((n) => n.id === id)?.data?.label || id;

  let body;
  let title;

  const getProtocolOptions = () => {
    if (!PROTOCOLS) return [];
    if (Array.isArray(PROTOCOLS)) {
      return PROTOCOLS.map((p) =>
        typeof p === 'string' ? { id: p, label: p } : { id: p.id || p.key || p.label, label: p.label || p.id }
      );
    }
    return Object.entries(PROTOCOLS).map(([key, p]) => ({
      id: key,
      label: typeof p === 'object' ? `${p.label || key}${p.defaultPort ? ` (Port ${p.defaultPort})` : ''}` : String(p),
    }));
  };

  const getZoneOptions = () => {
    if (!NETWORK_ZONES) return [];
    if (Array.isArray(NETWORK_ZONES)) {
      return NETWORK_ZONES.map((z) =>
        typeof z === 'string' ? { id: z, label: z } : { id: z.id || z.key, label: z.label || z.name || z.id }
      );
    }
    return Object.entries(NETWORK_ZONES).map(([key, z]) => ({
      id: key,
      label: typeof z === 'object' ? z.label || z.name || key : String(z),
    }));
  };

  const getRedundancyOptions = () => {
    if (!REDUNDANCY_TYPES) return ['None', 'Warm Standby', 'Hot Standby', 'Dual Ring'];
    if (Array.isArray(REDUNDANCY_TYPES)) return REDUNDANCY_TYPES;
    return Object.keys(REDUNDANCY_TYPES);
  };

  const getSilOptions = () => {
    if (!SIL_LEVELS) return ['None', 'SIL 1', 'SIL 2', 'SIL 3', 'SIL 4'];
    if (Array.isArray(SIL_LEVELS)) return SIL_LEVELS;
    return Object.keys(SIL_LEVELS);
  };

  if (node) {
    title = 'Node Properties';
    const d = node.data || {};
    const kind = NODE_KINDS?.[d.kind];
    const role = kind?.role;
    const ip = d.ip || d.ipAddress || '';
    const ipError = ip && isValidIPv4 && !isValidIPv4(ip) ? 'Not a valid IPv4 address' : null;
    const dupe =
      !ipError && ip && nodes.some((o) => o.id !== node.id && (o.data?.ip || o.data?.ipAddress || '') === ip)
        ? 'Another node already uses this IP'
        : null;

    const reportsTo = role === 'field' ? io?.assignment?.[node.id] || [] : [];
    const plcInfo = role === 'plc' ? io?.perPlc?.[node.id] : null;

    body = (
      <>
        <p className="text-[11px] text-slate-400 font-medium">{kind?.label || d.kind || 'SCADA Node'}</p>

        <Field label="Node Name">
          <input
            className={inputClass}
            value={d.label || ''}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="IPv4 Address" error={ipError || dupe}>
            <input
              className={`${inputClass} font-mono`}
              inputMode="decimal"
              placeholder="192.168.1.10"
              value={ip}
              onChange={(e) => {
                const val = e.target.value.trim();
                onUpdateNode(node.id, { ip: val, ipAddress: val });
              }}
            />
          </Field>

          <Field label="VLAN ID">
            <input
              className={`${inputClass} font-mono`}
              placeholder="VLAN 10"
              value={d.vlan || ''}
              onChange={(e) => onUpdateNode(node.id, { vlan: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Hostname">
          <input
            className={inputClass}
            placeholder="e.g. WW-HIST01"
            value={d.hostname || ''}
            onChange={(e) => onUpdateNode(node.id, { hostname: e.target.value.trim() })}
          />
        </Field>

        {role === 'field' ? (
          <Field
            label="Physical I/O Count"
            hint="Rolls up to connected PLC (directly or through switches)"
            error={reportsTo.length === 0 ? 'Not connected to any PLC - this I/O is unassigned' : null}
          >
            <NumberInput value={d.ioCount} onChange={(v) => onUpdateNode(node.id, { ioCount: v })} />
          </Field>
        ) : (
          <Field label="Allocated Tag Count" hint="Drives software licensing estimate">
            <NumberInput value={d.tagCount} onChange={(v) => onUpdateNode(node.id, { tagCount: v })} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Redundancy Scheme">
            <select
              className={inputClass}
              value={d.redundancy || 'None'}
              onChange={(e) => onUpdateNode(node.id, { redundancy: e.target.value })}
            >
              {getRedundancyOptions().map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Safety (SIL)">
            <select
              className={inputClass}
              value={d.sil || 'None'}
              onChange={(e) => onUpdateNode(node.id, { sil: e.target.value })}
            >
              {getSilOptions().map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Firmware Revision">
          <input
            className={`${inputClass} font-mono`}
            placeholder="v32.011"
            value={d.firmware || ''}
            onChange={(e) => onUpdateNode(node.id, { firmware: e.target.value })}
          />
        </Field>

        {role === 'field' && reportsTo.length > 0 && (
          <p className="text-[11px] text-slate-300">
            Reports to: <span className="text-scada-accent font-semibold">{reportsTo.map(nameOf).join(', ')}</span>
          </p>
        )}

        {plcInfo && (
          <div className="rounded border border-scada-line bg-scada-bg p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Aggregated Physical I/O
            </div>
            <div className="text-lg font-bold text-scada-accent leading-tight">
              {fmt ? fmt(plcInfo.io) : plcInfo.io}
            </div>
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
        <p className="flex items-center gap-1.5 text-xs text-slate-300 min-w-0 font-mono bg-scada-bg p-2 rounded border border-scada-line">
          <span className="truncate font-semibold text-slate-200">{nameOf(edge.source)}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-scada-accent" />
          <span className="truncate font-semibold text-slate-200">{nameOf(edge.target)}</span>
        </p>

        <Field label="Industrial Protocol">
          <select
            className={inputClass}
            value={d.protocol || 'opcua'}
            onChange={(e) => onUpdateEdge(edge.id, { protocol: e.target.value })}
          >
            {getProtocolOptions().map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        {NETWORK_TYPES && Array.isArray(NETWORK_TYPES) && (
          <Field label="Network Type">
            <select
              className={inputClass}
              value={d.network || 'unspecified'}
              onChange={(e) => onUpdateEdge(edge.id, { network: e.target.value })}
            >
              {NETWORK_TYPES.map((n) => (
                <option key={n.id || n} value={n.id || n}>
                  {n.name || n.label || n}
                </option>
              ))}
            </select>
          </Field>
        )}

        {NETWORK_ZONES && (
          <Field label="Network Zone">
            <select
              className={inputClass}
              value={d.zone || 'control'}
              onChange={(e) => onUpdateEdge(edge.id, { zone: e.target.value })}
            >
              {getZoneOptions().map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex items-center justify-between gap-3 rounded border border-scada-line bg-scada-bg p-2.5 mt-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200">Dual Redundant Ring</div>
            <div className="text-[10px] text-slate-400 font-sans">Fibre-optic or redundant PROFIBUS / PROFINET ring</div>
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
        <h2 className="text-sm font-bold text-slate-100">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close properties"
          className="p-1 -mr-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">{body}</div>

      <div className="p-3 border-t border-scada-line bg-scada-panel">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-1.5 text-sm md:text-xs rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" /> Delete {node ? 'node' : 'connection'}
        </button>
      </div>
    </section>
  );
}
