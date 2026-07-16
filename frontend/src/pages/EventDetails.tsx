import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import EventCard from '../components/EventCard';
import { PageLoader, EventGridSkeleton } from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import type { Event, SearchResult } from '../types';
import { Calendar, MapPin, Tag, Building2, Bookmark, ExternalLink, Activity } from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [similar, setSimilar] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEvent();
    checkSavedStatus();
  }, [id]);

  const checkSavedStatus = async () => {
    try {
      // Just fetching all saved events and checking if this one is in it.
      // A more optimized API would have a specific check, but this works for now.
      const res = await api.get('/save');
      const savedEvents = res.data.events || [];
      setIsSaved(savedEvents.some((e: any) => e._id === id));
    } catch (err) {
      console.error('Failed to check saved status', err);
    }
  };

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
      
      // Fetch similar events in background
      fetchSimilar();
    } catch (err) {
      console.error(err);
      setError('Failed to fetch event details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilar = async () => {
    try {
      setLoadingSimilar(true);
      const res = await api.get(`/similar/${id}?top_n=3`);
      setSimilar(res.data.results || []);
    } catch (err) {
      console.error('Failed to fetch similar events', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!id || saving) return;
    try {
      setSaving(true);
      if (isSaved) {
        await api.delete(`/save/${id}`);
        setIsSaved(false);
      } else {
        await api.post('/save', { eventId: id });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to toggle save', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !event) return <ErrorScreen message={error || 'Event not found'} onRetry={fetchEvent} />;

  const date = event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Main Event Card */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/70 relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <span className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <Tag size={12} /> {event.category || 'Uncategorized'}
          </span>
          <button 
            onClick={handleSaveToggle}
            disabled={saving}
            className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl transition-colors border shadow-sm ${
              isSaved 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30' 
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
            }`}
          >
            <Bookmark size={14} className={isSaved ? "fill-current" : ""} /> 
            {saving ? 'Saving...' : (isSaved ? 'Saved' : 'Save Event')}
          </button>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mb-6 leading-tight relative z-10">
          {event.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-500" /> {date}
          </div>
          {(event.country || event.continent) && (
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-500" /> {event.country || event.continent}
            </div>
          )}
          {event.source && (
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-slate-500" /> {event.source}
            </div>
          )}
        </div>

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 relative z-10">
          {event.description}
        </p>

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors relative z-10 shadow-lg shadow-indigo-500/20"
          >
            Read Full Article <ExternalLink size={16} />
          </a>
        )}

        {event.keywords?.length > 0 && (
          <div className="mt-10 pt-6 border-t border-slate-800/60 relative z-10">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Extracted Entities & Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {event.keywords.map(kw => (
                <span key={kw} className="px-3 py-1 rounded-lg bg-slate-950/50 text-slate-300 border border-slate-800/80 text-xs">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Similar Events */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Activity className="text-teal-400" /> Similar Events
        </h2>
        
        {loadingSimilar ? (
          <EventGridSkeleton rows={1} cols={3} />
        ) : similar.length === 0 ? (
          <p className="text-slate-500 italic">No similar events found in the database.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {similar.map(evt => (
              <EventCard key={evt._id} event={evt} showScore={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
