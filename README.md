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
