import React, { useEffect, useState } from 'react';
import { Bookmark, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import EventCard from '../components/EventCard';
import type { Event } from '../types';

export default function SavedEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedEvents();
  }, []);

  const fetchSavedEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/save');
      setEvents(res.data.events || []);
    } catch (err: any) {
      setError('Failed to load saved events.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (eventId: string) => {
    try {
      // Optimistic update
      setEvents(prev => prev.filter(e => e._id !== eventId));
      await api.delete(`/save/${eventId}`);
    } catch (err) {
      console.error('Failed to unsave event', err);
      // Revert if failed (simple reload for now)
      fetchSavedEvents();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <Bookmark size={24} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Saved Events</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Keep track of important geopolitical shifts, market updates, and global news.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="p-4 mb-8 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map(event => (
            <div key={event._id} className="relative group/saved">
              <EventCard event={event} />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleUnsave(event._id);
                }}
                className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/saved:opacity-100 transition-all border border-slate-700 hover:border-red-500 shadow-xl z-10"
                title="Remove from saved"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl border border-dashed border-slate-700 bg-slate-900/30 text-center">
          <Bookmark size={24} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No saved events yet</h3>
          <p className="text-sm text-slate-500 mb-6">
            When you find an event you want to read later, click the save button.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold transition-colors border border-slate-700"
          >
            Explore Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
