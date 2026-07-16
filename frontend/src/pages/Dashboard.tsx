import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import SearchBar from '../components/SearchBar';
import EventCard from '../components/EventCard';
import TrendingCard from '../components/TrendingCard';
import WorldMap from '../components/WorldMap';
import { EventGridSkeleton } from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import type { Event, TrendingTopic } from '../types';
import { Globe2, Activity, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [mapEvents, setMapEvents] = useState<Event[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [error, setError] = useState('');
  
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any;
    if (refreshing) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/admin/refresh-status');
          if (res.data.status === 'idle') {
            setRefreshing(false);
            setRefreshMsg('Refresh complete! Reloading data...');
            fetchDashboardData();
            setTimeout(() => setRefreshMsg(''), 3000);
          } else if (res.data.status === 'error') {
            setRefreshing(false);
            setRefreshMsg('Refresh failed. Check logs.');
            setTimeout(() => setRefreshMsg(''), 5000);
          }
        } catch (err) {
          console.error(err);
        }
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [refreshing]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMsg('Refresh started — this may take a few minutes.');
      await api.post('/admin/refresh-news');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setRefreshMsg('A refresh is already in progress...');
        setRefreshing(true);
      } else {
        setRefreshing(false);
        setRefreshMsg('Failed to start refresh.');
        setTimeout(() => setRefreshMsg(''), 3000);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoadingEvents(true);
      setLoadingTrending(true);
      setLoadingRecs(true);
      
      const [eventsRes, mapEventsRes, trendingRes, recsRes] = await Promise.all([
        api.get('/events?limit=6'),
        api.get('/events?limit=200'),
        api.get('/trending?top_n=6'),
        api.get('/recommendations?top_n=4').catch(() => ({ data: { results: [] } }))
      ]);

      setEvents(eventsRes.data.events || []);
      setMapEvents(mapEventsRes.data.events || []);
      setTrending(trendingRes.data.results || []);
      setRecommendations(recsRes.data.results || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoadingEvents(false);
      setLoadingTrending(false);
      setLoadingRecs(false);
    }
  };

  if (error) return <ErrorScreen message={error} onRetry={fetchDashboardData} />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Section */}
      <section className="text-center py-10 relative">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
          Discover Global <span className="gradient-text">Connections</span>
        </h1>
        <p className="text-slate-400 mb-8 max-w-xl mx-auto text-sm md:text-base">
          AI-powered global event tracker. Search millions of events, analyze trends, and visualize geopolitical connections.
        </p>
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <div className="w-full">
            <SearchBar large />
          </div>
          
          {/* Refresh Button */}
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                refreshing 
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
              }`}
            >
              <Activity size={16} className={refreshing ? 'animate-pulse' : ''} />
              {refreshing ? 'Refreshing News...' : 'Fetch Real-Time News'}
            </button>
            {refreshMsg && (
              <span className="text-xs text-indigo-400 font-medium animate-pulse">{refreshMsg}</span>
            )}
          </div>
        </div>
      </section>

      {/* Map Section - Full Width */}
      <section className="relative w-full z-0">
        {!loadingEvents ? (
          <WorldMap events={mapEvents} />
        ) : (
          <div className="h-[600px] w-full rounded-2xl animate-pulse bg-slate-900 border border-slate-800" />
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Recommendations */}
          {(recommendations.length > 0 || loadingRecs) && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="text-amber-400" /> Recommended for You
                </h2>
              </div>
              {loadingRecs ? (
                <EventGridSkeleton rows={1} cols={2} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {recommendations.slice(0, 4).map((evt) => (
                    <EventCard key={evt._id} event={evt} showScore={true} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Latest Events */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Globe2 className="text-indigo-400" /> Latest Global Events
              </h2>
            </div>
            {loadingEvents ? (
              <EventGridSkeleton rows={2} cols={2} />
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {events.map((evt) => (
                  <EventCard key={evt._id} event={evt} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Trending Topics */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-pink-400" /> Trending Now
              </h2>
            </div>
            {loadingTrending ? (
              <div className="space-y-3">
                {Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="skeleton h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {trending.map((topic, idx) => (
                  <TrendingCard 
                    key={topic.topic} 
                    topic={topic} 
                    rank={idx} 
                    onClick={() => navigate(`/search?q=${encodeURIComponent(topic.topic)}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
