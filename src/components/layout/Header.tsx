import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon, Search, Calendar as CalendarIcon } from 'lucide-react';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="flex h-20 shrink-0 items-center justify-between px-4 md:px-8 mt-2 sticky top-0 z-20">
      
      {/* Global Search */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search customers, inventory, or staff..."
            className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card px-3 py-2 rounded-xl border border-border shadow-sm">
          <CalendarIcon className="h-4 w-4 text-primary" />
          {today}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-2 px-1.5 py-1.5 bg-card border border-border rounded-full shadow-sm hover:shadow-md transition-all duration-300"
          aria-label="Toggle Theme"
        >
          <div className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-text'}`}>
            <Sun className="w-4 h-4" />
          </div>
          <div className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-text'}`}>
            <Moon className="w-4 h-4" />
          </div>
        </button>





      </div>
    </header>
  );
}
