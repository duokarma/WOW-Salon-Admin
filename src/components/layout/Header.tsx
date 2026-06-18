import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function Header() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="flex h-24 shrink-0 items-center justify-end px-4 md:px-8 sticky top-0 z-20 backdrop-blur-md bg-white/40 border-b border-black/5">
      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-text glass-panel px-4 py-2.5">
          <CalendarIcon className="h-4 w-4 text-secondary-foreground" />
          {today}
        </div>
      </div>
    </header>
  );
}
