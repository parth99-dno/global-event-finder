import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Globe2, Search, Zap, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/LoadingScreen';

export default function Landing() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="py-20 md:py-32 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-8 animate-pulse">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            AI-Powered Search Engine
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Map the World's <br />
            <span className="gradient-text">Geopolitical Events</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover, track, and analyze millions of global events. Powered by state-of-the-art NLP to find deep connections across borders.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800/80 text-slate-300 font-semibold text-lg hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="py-20 border-t border-slate-800/60 grid sm:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl glass-bright card-hover">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-200">Semantic Search</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Find related events using TF-IDF and cosine similarity, going far beyond simple keyword matching.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl glass-bright card-hover">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-purple-400">
              <Globe2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-200">Interactive Maps</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Visualize geopolitical hotspots globally. See where events are happening in real-time.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl glass-bright card-hover">
            <div className="h-12 w-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-6 text-pink-400">
              <Activity size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-200">Trend Analysis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Track rising topics and keyword bursts dynamically calculated from the latest news cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
