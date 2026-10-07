import { Cpu, Monitor, Database, Network, HardDrive, Server, Cable, Zap, ShieldAlert } from 'lucide-react';

export const CATEGORIES = [
  { id: 'controllers', name: 'Controllers' },
  { id: 'hmi', name: 'HMI / Servers' },
  { id: 'network', name: 'Network & Data' },
  { id: 'field', name: 'Field & Control' },
];

/*
  Master registry of every node kind. Roles drive behaviour:
    plc      - controller; receives aggregated I/O from field panels
    hmi/server/data - SCADA layer
    network  - switches (I/O aggregation traverses these)
    field    - RIO / MCC / ESD panels (carry an I/O Count)
  Old kinds (plc_ab, plc_siemens, hmi, historian, switch, database) are kept for backward compatibility.
*/
export const NODE_KINDS = {
  plc_ab: { label: 'Allen-Bradley PLC', icon: Cpu, color: '#f97316', role: 'plc', category: 'controllers' },
  plc_siemens: { label: 'Siemens PLC', icon: Cpu, color: '#14b8a6', role: 'plc', category: 'controllers' },
  s7_400h: { label: 'S7-400H PLC', icon: Cpu, color: '#2dd4bf', role: 'plc', category: 'controllers' },
  s7_1500: { label: 'S7-1500 PLC', icon: Cpu, color: '#5eead4', role: 'plc', category: 'controllers' },
  plc_ge: { label: 'GE PACSystems PLC', icon: Cpu, color: '#60a5fa', role: 'plc', category: 'controllers' },

  hmi: { label: 'HMI / InTouch', icon: Monitor, color: '#22d3ee', role: 'hmi', category: 'hmi' },
  aveva_gr: { label: 'System Platform GR Node', icon: Server, color: '#38bdf8', role: 'server', category: 'hmi' },
  wincc_server: { label: 'WinCC Server', icon: Server, color: '#06b6d4', role: 'server', category: 'hmi' },
  pcs7_os: { label: 'PCS 7 OS Server', icon: Server, color: '#0891b2', role: 'server', category: 'hmi' },
  wincc_client: { label: 'WinCC Client / Panel', icon: Monitor, color: '#67e8f9', role: 'hmi', category: 'hmi' },
  ft_se_server: { label: 'FactoryTalk View SE Server', icon: Server, color: '#ef4444', role: 'server', category: 'hmi' },
  ft_client: { label: 'FactoryTalk Client / PanelView', icon: Monitor, color: '#fb7185', role: 'hmi', category: 'hmi' },
  ifix_server: { label: 'iFIX SCADA Server', icon: Server, color: '#818cf8', role: 'server', category: 'hmi' },
  ifix_client: { label: 'iFIX Client / WorkSpace', icon: Monitor, color: '#a5b4fc', role: 'hmi', category: 'hmi' },

  historian: { label: 'Historian', icon: HardDrive, color: '#a78bfa', role: 'server', category: 'network' },
  sie_historian: { label: 'Process Historian', icon: HardDrive, color: '#a78bfa', role: 'server', category: 'network' },
  ft_historian: { label: 'FactoryTalk Historian', icon: HardDrive, color: '#c4b5fd', role: 'server', category: 'network' },
  proficy_historian: { label: 'Proficy Historian', icon: HardDrive, color: '#c4b5fd', role: 'server', category: 'network' },
  switch: { label: 'Network Switch', icon: Network, color: '#facc15', role: 'network', category: 'network' },
  database: { label: 'Database (SQL)', icon: Database, color: '#f472b6', role: 'data', category: 'network' },

  rio: { label: 'Remote I/O (RIO) Panel', icon: Cable, color: '#fb923c', role: 'field', category: 'field' },
  mcc: { label: 'MCC / VFD Panel', icon: Zap, color: '#fbbf24', role: 'field', category: 'field' },
  esd: { label: 'Emergency Shutdown (ESD)', icon: ShieldAlert, color: '#f43f5e', role: 'field', category: 'field' },
};

const COMMON = ['switch', 'database', 'rio', 'mcc', 'esd'];

const tiers = (unit, list) => [
  ...list.map((max) => ({ max, name: `${max.toLocaleString('en-US')} ${unit}` })),
  { max: Infinity, name: `Above ${list[list.length - 1].toLocaleString('en-US')} ${unit} (custom quote)` },
];

/*
  Licensing tiers are INDICATIVE. `tiers: null` means no table is configured for that vendor yet -
  add one here to enable the tier estimate. Always confirm against the current vendor price list.
*/
export const ECOSYSTEMS = {
  aveva: {
    name: 'AVEVA (Wonderware)',
    short: 'AVEVA',
    kinds: ['plc_ab', 'plc_siemens', 'hmi', 'aveva_gr', 'historian'],
    licensing: { product: 'AVEVA System Platform', tiers: tiers('I/O', [500, 1000, 5000, 25000, 50000, 100000]) },
  },
  siemens: {
    name: 'Siemens (WinCC / PCS 7)',
    short: 'Siemens',
    kinds: ['s7_400h', 's7_1500', 'wincc_server', 'pcs7_os', 'wincc_client', 'sie_historian'],
    licensing: { product: 'WinCC Runtime', tiers: tiers('PowerTags', [128, 512, 2048, 8192, 65536, 102400]) },
  },
  rockwell: {
    name: 'Rockwell (FactoryTalk)',
    short: 'Rockwell',
    kinds: ['plc_ab', 'ft_se_server', 'ft_client', 'ft_historian'],
    licensing: { product: 'FactoryTalk', tiers: null },
  },
  ge: {
    name: 'GE iFIX',
    short: 'GE iFIX',
    kinds: ['plc_ge', 'plc_ab', 'plc_siemens', 'ifix_server', 'ifix_client', 'proficy_historian'],
    licensing: { product: 'GE iFIX', tiers: null },
  },
};

export const DEFAULT_ECOSYSTEM = 'aveva';

export const paletteKinds = (ecosystem) => [...(ECOSYSTEMS[ecosystem]?.kinds || ECOSYSTEMS.aveva.kinds), ...COMMON];

export const roleOf = (kind) => NODE_KINDS[kind]?.role;
