import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Link2 } from 'lucide-react';

const CATEGORIES = ['Capacity', 'Redundancy', 'Network', 'Security', 'Integration', 'Other'];
const PRIORITIES = ['Must', 'Should', 'Could'];
const PRIORITY_STYLE = {
  Must: 'bg-red-500/20 text-red-300',
  Should: 'bg-amber-500/20 text-amber-300',
  Could: 'bg-slate-500/20 text-slate-300',
};

export default function RequirementPanel({ nodes, requirements, setRequirements }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [linked, setLinked] = useState([]);

  const getNode = (id) => nodes.find((n) => n.id === id);

  const toggleLink = (id) =>
    setLinked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setRequirements((rs) => [
      ...rs,
      { id: `req_${Date.now()}`, text: text.trim(), category, priority, linkedNodes: linked, met: false },
    ]);
    setText('');
    setLinked([]);
  };

  const toggleMet = (id) =>
    setRequirements((rs) => rs.map((r) => (r.id === id ? { ...r, met: !r.met } : r)));

  const remove = (id) => setRequirements((rs) => rs.filter((r) => r.id !== id));

  const toggleNodeOnReq = (reqId, nodeId) =>
    setRequirements((rs) =>
      rs.map((r) => {
        if (r.id !== reqId) return r;
        const currentLinks = r.linkedNodes || [];
        return {
          ...r,
          linkedNodes: currentLinks.includes(nodeId)
            ? currentLinks.filter((x) => x !== nodeId)
            : [...currentLinks, nodeId],
        };
      })
    );

  const metCount = requirements.filter((r) => r.met).length;
  const field =
    'w-full px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-xs rounded bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent';

  return (
    <aside className="w-full md:w-96 h-full min-h-0 shrink-0 bg-scada-panel md:border-l border-scada-line flex flex-col">
      <div className="px-4 pt-3 pb-2 border-b border-scada-line">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Requirement Matrix</h2>
          <span className="text-[11px] text-slate-400">
            {metCount}/{requirements.length} met
          </span>
        </div>

        <form onSubmit={add} className="mt-2 space-y-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Must support 5000 tags"'
            className={field}
          />
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={field}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          {nodes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Link to nodes
              </p>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {nodes.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => toggleLink(n.id)}
                    className={`px-2.5 py-1 md:px-2 md:py-0.5 rounded-full text-xs md:text-[10px] border ${
                      linked.includes(n.id)
                        ? 'bg-scada-accent text-slate-900 border-scada-accent font-semibold'
                        : 'border-scada-line text-slate-300 hover:border-scada-accent'
                    }`}
                  >
                    {n.data.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1 px-3 py-2.5 md:py-1.5 rounded bg-scada-accent text-slate-900 text-sm md:text-xs font-semibold hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> Add requirement
          </button>
        </form>
      </div>

      <ul className="flex-1 overflow-y-auto p-3 space-y-2">
        {requirements.length === 0 && (
          <li className="text-xs text-slate-500 text-center py-6">
            No requirements yet. Add one above, then link it to topology nodes.
          </li>
        )}
        {requirements.map((r) => {
          const reqLinks = r.linkedNodes || [];
          const validLinkedIds = reqLinks.filter((id) => getNode(id));

          return (
            <li key={r.id} className="rounded-lg border border-scada-line bg-scada-bg p-2.5">
              <div className="flex items-start gap-2">
                <button onClick={() => toggleMet(r.id)} aria-label="Toggle met" className="mt-0.5 shrink-0 p-1 -m-1">
                  {r.met ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${r.met ? 'line-through text-slate-500' : ''}`}>{r.text}</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60">{r.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_STYLE[r.priority]}`}>
                      {r.priority}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {validLinkedIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => toggleNodeOnReq(r.id, id)}
                        title="Click to unlink"
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-scada-accent/20 text-scada-accent hover:bg-red-500/20 hover:text-red-300"
                      >
                        {getNode(id)?.data?.label || id}
                      </button>
                    ))}
                    {validLinkedIds.length === 0 && (
                      <span className="text-[10px] text-amber-400">Unmapped</span>
                    )}
                  </div>

                  {nodes.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => e.target.value && toggleNodeOnReq(r.id, e.target.value)}
                      className="mt-1.5 w-full px-1.5 py-2 md:py-1 text-sm md:text-[10px] rounded bg-scada-panel border border-scada-line"
                    >
                      <option value="">+ Link / unlink node…</option>
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {reqLinks.includes(n.id) ? '✓ ' : ''}{n.data.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button onClick={() => remove(r.id)} aria-label="Delete" className="text-slate-500 hover:text-red-400 p-1 -m-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
