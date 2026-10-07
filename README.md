# SCADA Architect Pro

Topology and requirement mapping studio for Wonderware SCADA engineers (React + Vite + Tailwind + React Flow, installable offline PWA).

## Run
```bash
npm install
npm run dev                         # development (service worker disabled)
npm run build && npm run preview    # test installability / offline mode
```

## Mobile features
- Bottom tab bar (Studio / Requirements) on phones; split-pane layout on desktop
- Floating "+" button opens an equipment bottom sheet (tap to add)
- Auto-save to localStorage (restored on reopen); "New" clears the project
- Native share sheet for BOM (CSV) and project (JSON) via `navigator.share`, with download fallback

## Before launch
- Replace `https://your-domain.example/` in `index.html`
- Replace placeholder icons `public/icon-192.png` and `public/icon-512.png`

## SCADA features
- Tap/click a node: Name, IP address (validated, duplicate warning), Hostname, Estimated Tag Count
- Tap/click a connection: Protocol (OPC UA, Modbus TCP, Ethernet/IP, SuiteLink, DNP3, SQL, S7Comm, OPC DA) and Network Type (Control / Business LAN / DMZ / Field Bus). Edge colour = network, edge label = protocol
- Live tag total + indicative licence tier on the canvas
- BOM CSV: licensing estimate at the top, equipment summary, node detail (IP/hostname/tags), connections (protocol/network)
- Licence tiers are **indicative** - edit `LICENSE_TIERS` in `src/lib/scada.js` to match the current AVEVA price list
