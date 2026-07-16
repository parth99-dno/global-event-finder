import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import SearchBar from '../components/SearchBar';
import EventCard from '../components/EventCard';
import SearchFilters from '../components/SearchFilters';
import { EventGridSkeleton } from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import type { SearchResult } from '../types';
import { Sparkles } from 'lucide-react';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const lang = searchParams.get('lang') || 'en';
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [translatedQuery, setTranslatedQuery] = useState('');
  const [translationFailed, setTranslationFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Client-side filtering state
  const [filters, setFilters] = useState({ category: '', source: '' });

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, lang]);

  const performSearch = async () => {
    try {
      setLoading(true);
      setError('');
      setResults([]);
      setTranslatedQuery('');
      setTranslationFailed(false);
      setFilters({ category: '', source: '' }); // reset filters on new search
      
      const res = await api.post('/translate', { query, sourceLang: lang, top_n: 20 });
      setResults(res.data.results || []);
      
      if (res.data.translated_query && res.data.translated_query !== query) {
        setTranslatedQuery(res.data.translated_query);
      }
      if (res.data.translation_failed) {
        setTranslationFailed(true);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch search results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const availableCategories = Array.from(new Set(results.map(r => r.category).filter(Boolean)));
  const availableSources = Array.from(new Set(results.map(r => r.source).filter(Boolean)));

  const filteredResults = results.filter(r => {
    if (filters.category && r.category !== filters.category) return false;
    if (filters.source && r.source !== filters.source) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <SearchBar initialQuery={query} />
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 shrink-0">
          <SearchFilters 
            filters={filters} 
            setFilters={setFilters} 
            availableCategories={availableCategories} 
            availableSources={availableSources}
          />
        </div>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="text-indigo-400" />
              {query ? `Results for "${query}"` : 'All Events'}
            </h1>
            {!loading && !error && (
              <span className="text-sm text-slate-400 font-medium">
                {filteredResults.length} events
              </span>
            )}
          </div>
          
          {translatedQuery && !loading && !error && (
            <div className="mb-6 text-sm text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg inline-block">
              Showing results for: <span className="font-semibold italic">{translatedQuery}</span>
            </div>
          )}
          
          {translationFailed && !loading && !error && (
            <div className="mb-6 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg inline-block">
              Translation service unavailable. Searched original query instead.
            </div>
          )}

          {error ? (
            <ErrorScreen message={error} onRetry={performSearch} />
          ) : loading ? (
            <EventGridSkeleton rows={3} cols={2} />
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              No results found. Try adjusting your filters or search query.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {filteredResults.map((evt) => (
                <EventCard key={evt._id} event={evt} showScore={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
