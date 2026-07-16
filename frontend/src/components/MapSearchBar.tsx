import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

interface Props {
  onSearch: (query: string) => void;
}

export default function MapSearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4"
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full group-hover:bg-indigo-500/30 transition-all opacity-50" />
        <div className="relative flex items-center bg-slate-900/90 border border-slate-700/50 backdrop-blur-md rounded-full shadow-lg overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
          <div className="pl-4 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries, topics, or events..."
            className="w-full bg-transparent border-none py-3 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button 
            type="submit"
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors flex items-center gap-2"
          >
            <MapPin size={16} />
            <span className="hidden sm:inline">Go</span>
          </button>
        </div>
      </div>
    </form>
  );
}
