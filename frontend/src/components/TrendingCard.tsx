import React from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import type { TrendingTopic } from '../types';

const PALETTE = [
  'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-300',
  'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-300',
  'from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-300',
  'from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-300',
  'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-300',
  'from-sky-500/20 to-sky-500/5 border-sky-500/20 text-sky-300',
];

interface Props {
  topic: TrendingTopic;
  rank: number;
  onClick?: () => void;
}

export default function TrendingCard({ topic, rank, onClick }: Props) {
  const palette = PALETTE[rank % PALETTE.length];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${palette} border card-hover`}
    >
      <span className="text-xs font-bold opacity-50 w-4 shrink-0">#{rank + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{topic.topic}</p>
        <p className="text-xs opacity-60 mt-0.5">{topic.count} events</p>
      </div>
      <TrendingUp size={15} className="shrink-0 opacity-50" />
    </button>
  );
}
