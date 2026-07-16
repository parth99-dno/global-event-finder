import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800/50 border border-slate-700 mb-6">
        <AlertCircle size={40} className="text-slate-500" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight mb-2">404</h1>
      <p className="text-xl font-medium text-slate-300 mb-6">Page not found</p>
      <p className="text-slate-500 max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 font-semibold transition-colors shadow-lg shadow-indigo-500/20"
      >
        Go back home
      </Link>
    </div>
  );
}
