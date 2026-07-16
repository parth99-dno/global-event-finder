import React from 'react';
import { Filter } from 'lucide-react';

interface Props {
  filters: { category: string; source: string };
  setFilters: (filters: { category: string; source: string }) => void;
  availableCategories: string[];
  availableSources: string[];
}

export default function SearchFilters({ filters, setFilters, availableCategories, availableSources }: Props) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70 h-fit sticky top-24">
      <div className="flex items-center gap-2 mb-4 text-slate-100 font-semibold border-b border-slate-800 pb-3">
        <Filter size={16} className="text-indigo-400" />
        Filters
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">All Categories</option>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Source</label>
          <select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">All Sources</option>
            {availableSources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
