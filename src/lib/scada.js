// SCADA domain constants and helpers shared by the canvas, properties panel and BOM export.

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
];

export const NETWORK_TYPES = [
  { id: 'unspecified', name: 'Unspecified', short: '', color: '#94a3b8' },
  { id: 'control', name: 'Control Network', short: 'Control', color: '#f97316' },
  { id: 'business', name: 'Business LAN', short: 'Business', color: '#22d3ee' },
  { id: 'dmz', name: 'DMZ', short: 'DMZ', color: '#f43f5e', dash: '6 4' },
  { id: 'fieldbus', name: 'Field Bus', short: 'Fieldbus', color: '#a3e635' },
];

export const networkOf = (id) => NETWORK_TYPES.find((n) => n.id === id) || NETWORK_TYPES[0];

export const KIND_LABELS = {
  plc_ab: 'PLC - Allen-Bradley',
  plc_siemens: 'PLC - Siemens',
  hmi: 'HMI / InTouch Client',
  historian: 'Wonderware Historian',
  switch: 'Network Switch',
  database: 'Database Server',
};

// INDICATIVE I/O tag tiers used for the estimate. Edit to match the current
// AVEVA / Wonderware price list before quoting a customer.
export const LICENSE_TIERS = [
  { max: 500, name: '500 I/O' },
  { max: 1000, name: '1,000 I/O' },
  { max: 5000, name: '5,000 I/O' },
  { max: 25000, name: '25,000 I/O' },
  { max: 50000, name: '50,000 I/O' },
  { max: 100000, name: '100,000 I/O' },
  { max: Infinity, name: 'Above 100,000 I/O (custom quote)' },
];

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

export const fmt = (n) => Number(n).toLocaleString('en-US');

export const isValidIPv4 = (s) =>
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);

export function estimateLicense(nodes) {
  const byKind = {};
  let total = 0;
  nodes.forEach((n) => {
    const t = toNum(n.data?.tagCount);
    total += t;
    const k = n.data?.kind;
    byKind[k] = (byKind[k] || 0) + t;
  });
  const tier = total === 0 ? null : LICENSE_TIERS.find((t) => total <= t.max);
  return { total, tierName: tier ? tier.name : 'No tags entered', byKind };
}

// ---- CSV helpers (quotes escaped; leading = + - @ neutralised against spreadsheet formula injection)
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
const row = (...cols) => cols.map(cell).join(',');

export function buildBomCsv({ nodes, edges, requirements }) {
  const lic = estimateLicense(nodes);
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
    '',
    row('SYSTEM PLATFORM LICENSING ESTIMATE'),
    row('Total Estimated Tag Count', lic.total),
    row('Indicative License Tier', lic.tierName),
    row('Basis', 'Sum of Estimated Tag Count across all nodes. Indicative only - confirm against the current AVEVA price list.'),
    ...Object.entries(lic.byKind).map(([k, t]) => row(`  Tags - ${KIND_LABELS[k] || k}`, t)),
    '',
    row('EQUIPMENT SUMMARY'),
    row('Item', 'Qty', 'Estimated Tags'),
    ...Object.entries(kindCounts).map(([k, v]) => row(KIND_LABELS[k] || k, v.qty, lic.byKind[k] || 0)),
    '',
    row('NODE DETAIL'),
    row('Name', 'Type', 'IP Address', 'Hostname', 'Estimated Tags', 'Linked Requirements'),
    ...nodes.map((n) =>
      row(
        n.data.label,
        KIND_LABELS[n.data.kind] || n.data.kind,
        n.data.ip || '',
        n.data.hostname || '',
        toNum(n.data.tagCount),
        requirements
          .filter((r) => r.linkedNodes.includes(n.id))
          .map((r) => r.text)
          .join(' | ')
      )
    ),
    '',
    row('CONNECTIONS'),
    row('From', 'To', 'Protocol', 'Network Type'),
    ...edges.map((e) =>
      row(nameOf(e.source), nameOf(e.target), e.data?.protocol || 'Default', networkOf(e.data?.network).name)
    ),
    '',
    row('TOTALS'),
    row('Total nodes', nodes.length),
    row('Total connections', edges.length),
    row('Requirements', requirements.length),
  ];
  return { csv: lines.join('\n'), licensing: lic };
}
