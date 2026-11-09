import { CATEGORIES, NODE_KINDS, ECOSYSTEMS, paletteKinds } from '../../lib/ecosystems.js';

// Ecosystem-aware equipment list.
// variant="sidebar": draggable list (desktop). variant="sheet": tap grid (mobile bottom sheet).
export default function EquipmentPanel({ ecosystem, onAdd, variant = 'sidebar' }) {
  const kinds = paletteKinds(ecosystem);
  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: kinds.filter((k) => NODE_KINDS[k]?.category === c.id),
  })).filter((g) => g.items.length);

  const eco = ECOSYSTEMS[ecosystem] || ECOSYSTEMS.aveva;

  if (variant === 'sheet') {
    return (
      <div className="max-h-[60vh] overflow-y-auto space-y-3 pb-1">
        {groups.map((g) => (
          <div key={g.id}>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">{g.name}</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {g.items.map((kind) => {
                const { label = 'Unknown', icon: Icon, color = '#fff' } = NODE_KINDS[kind] || {};
                
                // Prevent React crashes if an icon is missing from the configuration
                if (!Icon) return null; 

                return (
                  <button
                    key={kind}
                    onClick={() => onAdd(kind)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-scada-line bg-scada-bg active:border-scada-accent text-sm text-left"
                  >
                    <Icon className="w-6 h-6 shrink-0" style={{ color }} />
                    <span className="leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    // Added flex and min-h-0 to allow the child to scroll properly
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-[10px] uppercase tracking-wider text-scada-accent mb-2 shrink-0">{eco.short} equipment</h2>
      
      {/* Added overflow-y-auto so the sidebar list can scroll if it gets too long */}
      <div className="space-y-3 overflow-y-auto flex-1 pb-4 pr-1">
        {groups.map((g) => (
          <div key={g.id}>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{g.name}</h3>
            <div className="space-y-1.5">
              {g.items.map((kind) => {
                const { label = 'Unknown', icon: Icon, color = '#fff' } = NODE_KINDS[kind] || {};
                
                // Prevent React crashes if an icon is missing from the configuration
                if (!Icon) return null; 

                return (
                  <div
                    key={kind}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/scada-kind', kind);
                      // Fallback required by Firefox to allow dragging to trigger
                      e.dataTransfer.setData('text/plain', kind); 
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onAdd(kind)}
                    title="Drag onto canvas, or click to add"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-scada-line bg-scada-bg cursor-grab hover:border-scada-accent text-xs"
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                    <span className="leading-tight">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
