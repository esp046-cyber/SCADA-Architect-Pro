// SCADA domain constants and helpers shared by the canvas, properties panel and exports.
import { ECOSYSTEMS, NODE_KINDS, roleOf } from './ecosystems.js';

export const PROTOCOLS = [
  'Default',
  'OPC UA',
  'Modbus TCP',
  'Ethernet/IP',
  'SuiteLink',
  'DNP3',
  'SQL',
  'S7Comm',
  'OPC DA',
  'PROFINET',
  'PROFIBUS DP',
];

export const NETWORK_TYPES = [
  { id: 'unspecified', name: 'Unspecified', short: '', color: '#94a3b8' },
  { id: 'control', name: 'Control Network', short: 'Control', color: '#f97316' },
  { id: 'business', name: 'Business LAN', short: 'Business', color: '#22d3ee' },
  { id: 'dmz', name: 'DMZ', short: 'DMZ', color: '#f43f5e', dash: '6 4' },
  { id: 'fieldbus', name: 'Field Bus', short: 'Fieldbus', color: '#a3e635' },
];

export const networkOf = (id) => NETWORK_TYPES.find((n) => n.id === id) || NETWORK_TYPES[0];

export const KIND_LABELS = Object.fromEntries(Object.entries(NODE_KINDS).map(([k, v]) => [k, v.label]));

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

export const fmt = (n) => Number(n).toLocaleString('en-US');

export const isValidIPv4 = (s) =>
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);

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
  else tierName = lic.tiers.find((t) => total <= t.max).name;
  return { total, tierName, byKind, product: lic?.product || 'SCADA' };
}

/* ---------- I/O aggregation ----------
   Each field panel (RIO / MCC / ESD) reports its I/O Count to the nearest PLC(s), walking through
   switches and other field panels. If a redundant PLC pair is equidistant, each PLC carries the I/O,
   but the system total counts the panel once. */
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
      const io = toNum(f.data.ioCount);
      totalIO += io;
      const seen = new Set([f.id]);
      let frontier = [f.id];
      let found = [];
      while (frontier.length && !found.length) {
        const next = [];
        for (const id of frontier) {
          for (const nb of adj.get(id)) {
            if (seen.has(nb)) continue;
            seen.add(nb);
            const role = roleOf(byId.get(nb).data?.kind);
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
          perPlc[pid].io += io;
          perPlc[pid].panels.push(f.id);
        });
      } else {
        unassigned.push(f.id);
      }
    });

  return { perPlc, assignment, unassigned, totalIO, assignedIO };
}

/* ---------- CSV ---------- */
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const row = (...cols) => cols.map(cell).join(',');

export function buildBomCsv({ nodes, edges, requirements, ecosystem = 'aveva' }) {
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
    row('Basis', 'Sum of Estimated Tag Count across all nodes. Indicative only - confirm against the current vendor price list.'),
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
    row('Name', 'Type', 'IP Address', 'Hostname', 'Estimated Tags', 'I/O Count', 'Reports To', 'Linked Requirements'),
    ...nodes.map((n) =>
      row(
        n.data.label,
        KIND_LABELS[n.data.kind] || n.data.kind,
        n.data.ip || '',
        n.data.hostname || '',
        toNum(n.data.tagCount),
        roleOf(n.data.kind) === 'field' ? toNum(n.data.ioCount) : '',
        (io.assignment[n.id] || []).map(nameOf).join(' | '),
        requirements
          .filter((r) => r.linkedNodes.includes(n.id))
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
