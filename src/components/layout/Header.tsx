import React from 'react';
import { Search, Calendar as CalendarIcon } from 'lucide-react';

export default function Header() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="flex h-24 shrink-0 items-center justify-between px-4 md:px-8 sticky top-0 z-20 backdrop-blur-md bg-black/20 border-b border-white/5">
      
      {/* Global Search */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-white/40 group-focus-within:text-white transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search customers, inventory, or staff..."
            className="block w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl leading-5 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 focus:bg-white/10 transition-all shadow-sm"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <span className="text-xs font-semibold text-white/40 bg-white/5 px-2 py-1 rounded-md border border-white/10">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-white/80 glass-panel px-4 py-2.5">
          <CalendarIcon className="h-4 w-4 text-white/60" />
          {today}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-white/10 cursor-pointer group">
          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden group-hover:border-white/40 transition-colors bg-white/5 flex items-center justify-center">
            <span className="text-white font-medium text-sm">A</span>
          </div>
        </div>

      </div>
    </header>
  );
}
