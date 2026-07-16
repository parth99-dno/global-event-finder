import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Globe size={12} className="text-white" />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Global Event Finder · IR/ML Course Project · {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>React · Node · FastAPI · MongoDB</span>
        </div>
      </div>
    </footer>
  );
}
