import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Link2,
  ShieldCheck,
  Zap,
  Layers,
} from 'lucide-react';

const CATEGORIES = ['Capacity', 'Redundancy', 'Network', 'Security', 'Integration', 'Other'];
const PRIORITIES = ['Must', 'Should', 'Could'];
const PRIORITY_STYLE = {
  Must: 'bg-red-500/20 text-red-300 border border-red-500/30',
  Should: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  Could: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

const inputClass =
  'w-full px-2.5 py-2 md:px-2 md:py-1.5 text-base md:text-xs rounded bg-scada-bg border border-scada-line focus:outline-none focus:border-scada-accent';

export default function RequirementPanel({ nodes = [], requirements = [], setRequirements }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [linked, setLinked] = useState([]);

  // Calculate Mapping Metric Coverage (% mapped to hardware)
  const mappedCount = requirements.filter(
    (req) => req.linkedNodes && req.linkedNodes.some((id) => nodes.some((n) => n.id === id))
  ).length;

  const coveragePct = requirements.length > 0 ? Math.round((mappedCount / requirements.length) * 100) : 0;
  const metCount = requirements.filter((r) => r.met).length;

  const getNode = (id) => nodes.find((n) => n.id === id);

  const toggleLink = (id) =>
    setLinked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const add = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    setRequirements((rs) => [
      ...rs,
      {
        id: `req_${Date.now()}`,
        text: text.trim(),
        category,
        priority,
        linkedNodes: linked,
        met: false,
      },
    ]);
    setText('');
    setLinked([]);
  };

  const addPresetRequirement = (presetText, presetCategory = 'Capacity', presetPriority = 'Must') => {
    const newReq = {
      id: `req_${Date.now()}`,
      text: presetText,
      category: presetCategory,
      priority: presetPriority,
      linkedNodes: [],
      met: false,
    };
    setRequirements((prev) => [...prev, newReq]);
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

  return (
    <aside className="w-full md:w-96 h-full min-h-0 shrink-0 bg-scada-panel md:border-l border-scada-line flex flex-col">
      {/* Header & Coverage Progress Bar */}
      <div className="p-3 border-b border-scada-line space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-scada-accent" /> Requirement Matrix
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {metCount}/{requirements.length} Met | {mappedCount}/{requirements.length} Mapped
          </span>
        </div>

        {/* Coverage Progress Bar */}
        <div className="w-full bg-scada-bg h-1.5 rounded-full overflow-hidden border border-scada-line/50">
          <div
            className={`h-full transition-all duration-300 ${
              coveragePct === 100 ? 'bg-emerald-400' : coveragePct > 50 ? 'bg-scada-accent' : 'bg-amber-400'
            }`}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span>Mapping Coverage</span>
          <span>{coveragePct}%</span>
        </div>

        {/* Add Requirement Form */}
        <form onSubmit={add} className="mt-2 space-y-2 pt-2 border-t border-scada-line/50">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Must support 5000 tags"'
            className={inputClass}
          />
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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
                    className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      linked.includes(n.id)
                        ? 'bg-scada-accent text-slate-900 border-scada-accent font-semibold'
                        : 'border-scada-line text-slate-300 hover:border-scada-accent'
                    }`}
                  >
                    {n.data?.label || n.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-scada-accent text-slate-900 text-xs font-semibold hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" /> Add requirement
          </button>
        </form>
      </div>

      {/* Requirement List or Guided Empty State */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {requirements.length === 0 ? (
          <div className="text-center py-6 px-2 space-y-3 border border-dashed border-scada-line/80 rounded-lg bg-scada-bg/30">
            <ShieldCheck className="w-8 h-8 text-scada-accent mx-auto opacity-80" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-300">No Requirements Defined</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add compliance, safety, and capacity rules to validate your SCADA architecture design.
              </p>
            </div>

            {/* Quick-Start Preset Injection */}
            <div className="pt-2 text-left space-y-1.5">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick-Add Industry Presets:
              </span>
              <button
                type="button"
                onClick={() =>
                  addPresetRequirement('System must support 10,000 active I/O tags at 250ms update rate.', 'Capacity', 'Must')
                }
                className="w-full text-left p-2 rounded bg-scada-panel border border-scada-line hover:border-scada-accent text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">10k Tag Capacity @ 250ms</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  addPresetRequirement('Controller redundancy (Hot Standby) required for main GR node.', 'Redundancy', 'Must')
                }
                className="w-full text-left p-2 rounded bg-scada-panel border border-scada-line hover:border-scada-accent text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Hot Standby PLC Redundancy</span>
              </button>
            </div>
          </div>
        ) : (
          requirements.map((r) => {
            const reqLinks = r.linkedNodes || [];
            const validLinkedIds = reqLinks.filter((id) => getNode(id));

            return (
              <div key={r.id} className="rounded-lg border border-scada-line bg-scada-bg p-2.5 space-y-1.5">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMet(r.id)}
                    aria-label="Toggle met"
                    className="mt-0.5 shrink-0 p-1 -m-1"
                  >
                    {r.met ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${r.met ? 'line-through text-slate-500' : 'text-slate-200'}`}>{r.text}</p>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                        {r.category}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_STYLE[r.priority] || 'text-slate-400'}`}>
                        {r.priority}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {validLinkedIds.map((id) => (
                        <button
                          type="button"
                          key={id}
                          onClick={() => toggleNodeOnReq(r.id, id)}
                          title="Click to unlink"
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-scada-accent/20 text-scada-accent hover:bg-red-500/20 hover:text-red-300 transition-colors"
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
                        className="mt-1.5 w-full px-1.5 py-1 text-[10px] rounded bg-scada-panel border border-scada-line text-slate-300"
                      >
                        <option value="">+ Link / unlink node…</option>
                        {nodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {reqLinks.includes(n.id) ? '✓ ' : ''}{n.data?.label || n.id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    aria-label="Delete"
                    className="text-slate-500 hover:text-red-400 p-1 -m-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
