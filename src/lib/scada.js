// SCADA domain constants and helpers shared by the canvas, properties panel, and exports.
import { ECOSYSTEMS, NODE_KINDS, roleOf } from './ecosystems.js';

export const PROTOCOLS = {
  default: { label: 'Default', defaultPort: null, zone: 'control' },
  opcua: { label: 'OPC UA', defaultPort: 4840, zone: 'control' },
  ethernetip: { label: 'EtherNet/IP', defaultPort: 44818, zone: 'control' },
  modbus: { label: 'Modbus TCP', defaultPort: 502, zone: 'field' },
  profinet: { label: 'PROFINET', defaultPort: 34964, zone: 'field' },
  s7: { label: 'S7 Comm', defaultPort: 102, zone: 'control' },
  suitelink: { label: 'SuiteLink / Wonderware', defaultPort: 5413, zone: 'control' },
  mqtt: { label: 'MQTT / Sparkplug B', defaultPort: 8883, zone: 'dmz' },
  dnp3: { label: 'DNP3', defaultPort: 20000, zone: 'control' },
  sql: { label: 'SQL Connection', defaultPort: 1433, zone: 'enterprise' },
};

export const PROTOCOL_LIST = Object.values(PROTOCOLS).map((p) => p.label);

export const NETWORK_ZONES = {
  enterprise: { label: 'Enterprise / IT', color: '#3b82f6', borderStyle: 'solid' },
  dmz: { label: 'Industrial DMZ', color: '#a855f7', borderStyle: 'dashed' },
  control: { label: 'Control / OT Zone', color: '#10b981', borderStyle: 'solid' },
  field: { label: 'Fieldbus / Process', color: '#f59e0b', borderStyle: 'dotted' },
};

export const SIL_LEVELS = ['None', 'SIL 1', 'SIL 2', 'SIL 3', 'SIL 4'];
export const REDUNDANCY_TYPES = ['None', 'Hot Standby (Active/Passive)', 'Dual-Ring MRP', 'Clustered'];

export const NETWORK_TYPES = [
  { id: 'unspecified', name: 'Unspecified', short: '', color: '#94a3b8' },
  { id: 'control', name: 'Control Network', short: 'Control', color: '#f97316' },
  { id: 'business', name: 'Business LAN', short: 'Business', color: '#22d3ee' },
  { id: 'dmz', name: 'DMZ', short: 'DMZ', color: '#f43f5e', dash: '6 4' },
  { id: 'fieldbus', name: 'Field Bus', short: 'Fieldbus', color: '#a3e635' },
];

export const networkOf = (id) => NETWORK_TYPES.find((n) => n.id === id) || NETWORK_TYPES[0];

export const KIND_LABELS = Object.fromEntries(
  Object.entries(NODE_KINDS).map(([k, v]) => [k, v.label])
);

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

export const fmt = (n) => Number(n).toLocaleString('en-US');

export const isValidIPv4 = (s) =>
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);

/**
 * Validates topology integrity for OT compliance
 */
export function validateTopology({ nodes = [], edges = [] }) {
  const warnings = [];

  nodes.forEach((node) => {
    const data = node.data || {};
    const label = data.label || node.id;

    // IP Validation
    if (data.ip && !isValidIPv4(data.ip)) {
      warnings.push({
        nodeId: node.id,
        type: 'error',
        message: `${label}: Invalid IPv4 format (${data.ip})`,
      });
    }

    // Safety & Redundancy Warnings
    if (data.kind === 'esd' && (!data.sil || data.sil === 'None')) {
      warnings.push({
        nodeId: node.id,
        type: 'warning',
        message: `${label}: ESD node requires a defined Safety Integrity Level (SIL).`,
      });
    }

    if ((roleOf(data.kind) === 'plc') && (!data.redundancy || data.redundancy === 'None')) {
      warnings.push({
        nodeId: node.id,
        type: 'info',
        message: `${label}: Critical controller has no redundancy configured.`,
      });
    }
  });

  // Edge Protocol Check
  edges.forEach((edge) => {
    if (!edge.data?.protocol) {
      warnings.push({
        edgeId: edge.id,
        type: 'warning',
        message: `Unspecified protocol on connection between nodes.`,
      });
    }
  });

  return warnings;
}

/* ---------- Licensing ---------- */
export function estimateLicense(nodes, ecosystem = 'aveva') {
  const lic = ECOSYSTEMS[ecosystem]?.licensing;
  const byKind = {};
  let total = 0;
  nodes.forEach((n) => {
    const t = toNum(n.data?.tagCount);
    total += t;
    const k = n.data?.kind;
    byKind[k] = (byKind[k] || 0) + t;
  });
  let tierName;
  if (total === 0) tierName = 'No tags entered';
  else if (!lic?.tiers) tierName = 'Tier table not configured';
  else tierName = lic.tiers.find((t) => total <= t.max)?.name || 'Custom / Enterprise';

  return { total, tierName, byKind, product: lic?.product || 'SCADA' };
}

/* ---------- I/O Aggregation ---------- */
export function computeIoAggregation(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source).push(e.target);
      adj.get(e.target).push(e.source);
    }
  });

  const perPlc = {};
  nodes.filter((n) => roleOf(n.data?.kind) === 'plc').forEach((p) => (perPlc[p.id] = { io: 0, panels: [] }));

  const assignment = {};
  const unassigned = [];
  let totalIO = 0;
  let assignedIO = 0;

  nodes
    .filter((n) => roleOf(n.data?.kind) === 'field')
    .forEach((f) => {
      const io = toNum(f.data?.ioCount);
      totalIO += io;
      const seen = new Set([f.id]);
      let frontier = [f.id];
      let found = [];
      while (frontier.length && !found.length) {
        const next = [];
        for (const id of frontier) {
          for (const nb of adj.get(id) || []) {
            if (seen.has(nb)) continue;
            seen.add(nb);
            const role = roleOf(byId.get(nb)?.data?.kind);
            if (role === 'plc') found.push(nb);
            else if (role === 'network' || role === 'field') next.push(nb);
          }
        }
        frontier = next;
      }
      assignment[f.id] = found;
      if (found.length) {
        assignedIO += io;
        found.forEach((pid) => {
          if (perPlc[pid]) {
            perPlc[pid].io += io;
            perPlc[pid].panels.push(f.id);
          }
        });
      } else {
        unassigned.push(f.id);
      }
    });

  return { perPlc, assignment, unassigned, totalIO, assignedIO };
}

/* ---------- CSV Export ---------- */
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const row = (...cols) => cols.map(cell).join(',');

export function buildBomCsv({ nodes = [], edges = [], requirements = [], ecosystem = 'aveva' }) {
  const lic = estimateLicense(nodes, ecosystem);
  const io = computeIoAggregation(nodes, edges);
  const nameOf = (id) => nodes.find((n) => n.id === id)?.data?.label || id;

  const kindCounts = {};
  nodes.forEach((n) => {
    const k = n.data?.kind;
    kindCounts[k] = kindCounts[k] || { qty: 0 };
    kindCounts[k].qty += 1;
  });

  const lines = [
    row('SCADA Architect Pro - Bill of Materials'),
    row('Generated', new Date().toLocaleString()),
    row('Ecosystem', ECOSYSTEMS[ecosystem]?.name || ecosystem),
    '',
    row(`${lic.product.toUpperCase()} LICENSING ESTIMATE`),
    row('Total Estimated Tag Count', lic.total),
    row('Indicative License Tier', lic.tierName),
    row('Basis', 'Sum of Estimated Tag Count across all nodes. Indicative only - confirm against current vendor price list.'),
    ...Object.entries(lic.byKind).map(([k, t]) => row(`  Tags - ${KIND_LABELS[k] || k}`, t)),
    '',
    row('I/O SUMMARY (FIELD & CONTROL PANELS)'),
    row('Total I/O', io.totalIO),
    row('Assigned to a PLC', io.assignedIO),
    row('Unassigned (no PLC reachable)', io.totalIO - io.assignedIO),
    row('PLC', 'Aggregated I/O', 'Connected Panels'),
    ...Object.entries(io.perPlc).map(([pid, v]) => row(nameOf(pid), v.io, v.panels.map(nameOf).join(' | '))),
    '',
    row('EQUIPMENT SUMMARY'),
    row('Item', 'Qty'),
    ...Object.entries(kindCounts).map(([k, v]) => row(KIND_LABELS[k] || k, v.qty)),
    '',
    row('NODE DETAIL'),
    row('Name', 'Type', 'IP Address', 'Redundancy', 'SIL Level', 'Estimated Tags', 'I/O Count', 'Reports To', 'Linked Requirements'),
    ...nodes.map((n) =>
      row(
        n.data?.label || n.id,
        KIND_LABELS[n.data?.kind] || n.data?.kind,
        n.data?.ip || '',
        n.data?.redundancy || 'None',
        n.data?.sil || 'N/A',
        toNum(n.data?.tagCount),
        roleOf(n.data?.kind) === 'field' ? toNum(n.data?.ioCount) : '',
        (io.assignment[n.id] || []).map(nameOf).join(' | '),
        requirements
          .filter((r) => r.linkedNodes?.includes(n.id))
          .map((r) => r.text)
          .join(' | ')
      )
    ),
    '',
    row('CONNECTIONS'),
    row('From', 'To', 'Protocol', 'Network Type', 'Dual Redundant Ring'),
    ...edges.map((e) =>
      row(
        nameOf(e.source),
        nameOf(e.target),
        e.data?.protocol || 'Default',
        networkOf(e.data?.network).name,
        e.data?.redundant ? 'Yes' : 'No'
      )
    ),
    '',
    row('TOTALS'),
    row('Total nodes', nodes.length),
    row('Total connections', edges.length),
    row('Requirements', requirements.length),
  ];

  return { csv: lines.join('\n'), licensing: lic, io };
}
