import React from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../types';
import { Calendar, MapPin, Tag, ExternalLink, Building2 } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Politics:    'bg-red-500/15 text-red-400 border-red-500/20',
  Economy:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Technology:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Sports:      'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Environment: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  Health:      'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Science:     'bg-violet-500/15 text-violet-400 border-violet-500/20',
  Diplomacy:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  default:     'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

interface Props {
  event: Event;
  showScore?: boolean;
}

export default function EventCard({ event, showScore }: Props) {
  const catClass = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.default;
  const date = event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <Link
      to={`/events/${event._id}`}
      className="group flex flex-col p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70 card-hover"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catClass}`}>
          <Tag size={9} />
          {event.category || 'Uncategorized'}
        </span>
        {showScore && event.score !== undefined && (
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
            {(event.score * 100).toFixed(1)}% match
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-100 leading-snug mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
        {event.title}
      </h3>

      {/* Description */}
      {event.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {event.description}
        </p>
      )}

      {/* Footer meta */}
      <div className="mt-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {date}
        </span>
        {(event.country || event.continent) && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {event.country || event.continent}
          </span>
        )}
        {event.source && (
          <span className="flex items-center gap-1 ml-auto text-slate-600">
            <Building2 size={11} />
            {event.source}
          </span>
        )}
      </div>

      {/* Keywords */}
      {event.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {event.keywords.slice(0, 4).map((kw) => (
            <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/50">
              {kw}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
