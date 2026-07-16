import React from 'react';

interface Props {
  rows?: number;
  cols?: number;
}

function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/70 space-y-3">
      <div className="skeleton h-5 w-20" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="skeleton h-3 w-3/4" />
      <div className="flex gap-2 mt-2">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ rows = 2, cols = 3 }: Props) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-5`}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size={36} />
      <p className="text-sm text-slate-500 animate-pulse">Loading…</p>
    </div>
  );
}
