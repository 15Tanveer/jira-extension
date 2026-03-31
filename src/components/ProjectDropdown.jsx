import { useMemo, useState } from 'react';

export default function ProjectDropdown({ projects, selectedKey, onChange, loading }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.key.toLowerCase().includes(lower)
    );
  }, [projects, query]);

  return (
    <div className="glass-card p-3">
      <label className="mb-2 block text-xs uppercase tracking-wider text-slate-400">Project</label>
      <input
        className="mb-2 w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none ring-neon-cyan/60 focus:ring"
        placeholder="Search by name or key..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
      />
      <select
        className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm"
        value={selectedKey || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || filtered.length === 0}
      >
        {!selectedKey && <option value="">Select a project…</option>}
        {filtered.map((p) => (
          <option key={p.id} value={p.key}>
            {p.name} ({p.key})
          </option>
        ))}
      </select>
    </div>
  );
}
