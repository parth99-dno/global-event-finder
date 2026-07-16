import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';

interface Props {
  initialQuery?: string;
  large?: boolean;
  placeholder?: string;
}

export default function SearchBar({ initialQuery = '', large = false, placeholder }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [lang, setLang] = useState('en');
  const navigate = useNavigate();

  // Try to parse lang from URL on mount if it's there
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang) setLang(urlLang);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}&lang=${lang}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`relative flex items-center ${large ? 'max-w-3xl mx-auto' : ''}`}>
        <Search
          size={large ? 18 : 15}
          className="absolute left-4 text-slate-500 pointer-events-none z-10"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || 'Search events, countries, topics, keywords…'}
          className={`w-full bg-slate-900/80 border border-slate-700/60 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-slate-900 transition-all ${
            large
              ? 'pl-12 pr-64 py-4 text-base'
              : 'pl-10 pr-52 py-2.5 text-sm'
          }`}
        />
        <div className={`absolute flex items-center gap-2 right-2 ${large ? '' : ''}`}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className={`bg-slate-800 border border-slate-700 text-slate-300 rounded-xl focus:outline-none focus:border-indigo-500/60 ${
              large ? 'px-3 py-2.5 text-sm' : 'px-2 py-1.5 text-xs'
            }`}
          >
            <option value="en">English (en)</option>
            <option value="es">Spanish (es)</option>
            <option value="fr">French (fr)</option>
            <option value="de">German (de)</option>
            <option value="hi">Hindi (hi)</option>
          </select>
          <button
            type="submit"
            className={`flex items-center gap-1.5 font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20 ${
              large ? 'px-5 py-2.5 text-sm' : 'px-4 py-1.5 text-xs'
            }`}
          >
            <Sparkles size={large ? 14 : 12} />
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
