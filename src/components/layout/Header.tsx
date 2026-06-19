import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar as CalendarIcon, Bell, Menu, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface HeaderProps {
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Header({ toggleSidebar, isSidebarOpen = true }: HeaderProps) {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Track if we've attempted to play audio this session
  const [hasPlayedAudio, setHasPlayedAudio] = useState(() => {
    return sessionStorage.getItem('birthday_audio_played') === 'true';
  });

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const playPremiumChime = useCallback(() => {
    if (hasPlayedAudio) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // If the browser suspends audio (autoplay blocked), don't play or mark as played.
      // Wait for the click interaction listener to trigger it.
      if (ctx.state === 'suspended') {
         console.warn('Audio autoplay suspended. Waiting for user interaction.');
         // Try to resume it just in case we are in a valid gesture context
         ctx.resume().catch(() => {});
         if (ctx.state === 'suspended') return;
      }
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Soft glass tone parameters
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Slide up to A6
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);

      setHasPlayedAudio(true);
      sessionStorage.setItem('birthday_audio_played', 'true');
    } catch (e) {
      console.warn('Audio playback failed (likely autoplay restriction)', e);
    }
  }, [hasPlayedAudio]);

  const fetchBirthdays = useCallback(async (isRealtimeUpdate = false) => {
    try {
      const todayDate = new Date();
      const currentMonth = todayDate.getMonth() + 1;
      const currentDay = todayDate.getDate();

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, dob')
        .eq('is_deleted', false)
        .not('dob', 'is', null);

      if (error) throw error;

      if (data) {
        const birthdaysToday = data.filter(c => {
          if (!c.dob) return false;
          const [year, month, day] = c.dob.split('-');
          return parseInt(month, 10) === currentMonth && parseInt(day, 10) === currentDay;
        });

        setBirthdays((prev) => {
          // If this is a realtime update and we have new birthdays, reset unread state
          if (isRealtimeUpdate && birthdaysToday.length > prev.length) {
            setUnreadCount(birthdaysToday.length);
            // Re-allow audio if a NEW birthday was added during the session
            if (hasPlayedAudio) {
               setHasPlayedAudio(false);
               sessionStorage.removeItem('birthday_audio_played');
            }
          } else if (!isRealtimeUpdate) {
             // Initial load
             const lastReadCount = parseInt(sessionStorage.getItem('birthday_read_count') || '0', 10);
             if (birthdaysToday.length > lastReadCount) {
                setUnreadCount(birthdaysToday.length);
             }
          }
          return birthdaysToday;
        });
      }
    } catch (err) {
      console.error('Failed to fetch birthdays:', err);
    }
  }, [hasPlayedAudio]);

  useEffect(() => {
    fetchBirthdays();

    // Supabase Realtime Subscription
    const channel = supabase.channel('customers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        fetchBirthdays(true);
      })
      .subscribe();

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Play chime on first interaction if we have unread and haven't played
    const handleFirstInteraction = () => {
      if (unreadCount > 0 && !hasPlayedAudio) {
        playPremiumChime();
      }
    };
    document.addEventListener('click', handleFirstInteraction);

    // Midnight Refresh
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => {
       fetchBirthdays();
    }, msUntilMidnight);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleFirstInteraction);
      supabase.removeChannel(channel);
      clearTimeout(timer);
    };
  }, [fetchBirthdays, playPremiumChime, unreadCount, hasPlayedAudio]);

  // Attempt to play on mount if there's unread
  useEffect(() => {
     if (unreadCount > 0 && !hasPlayedAudio) {
        playPremiumChime();
     }
  }, [unreadCount, hasPlayedAudio, playPremiumChime]);

  const handleDropdownToggle = () => {
    const newState = !isDropdownOpen;
    setIsDropdownOpen(newState);
    if (newState) {
       setUnreadCount(0);
       sessionStorage.setItem('birthday_read_count', birthdays.length.toString());
    }
  };

  const sendWhatsAppGreeting = (customer: any) => {
    if (!customer.phone) return;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const message = `Happy Birthday ${customer.name}.\n\nWishing you happiness, good health and success throughout the year.\n\nThank you for being a valued customer of WOW Salon.\n\nRegards,\nWOW Salon`;
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <header className="flex h-24 shrink-0 items-center justify-between px-4 md:px-8 sticky top-0 z-20 backdrop-blur-md bg-black/40 border-b border-white/5">
      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUpFade {
          animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      {/* Left Side: Sidebar Toggle */}
      <div className="flex items-center">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar} 
            className="p-2.5 mr-4 bg-black/40 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors shadow-sm"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="flex items-center gap-6">
        
        {/* Header Compact Summary */}
        <div className="flex flex-col text-right mr-2 hidden sm:flex">
          <span className="text-white font-medium text-sm tracking-wide">Today's Birthdays</span>
          <span className="text-white/50 text-xs font-medium">{birthdays.length} Customers</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleDropdownToggle}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 relative shadow-[0_0_15px_rgba(255,255,255,0.05)] group"
          >
            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                {unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <div 
              className="absolute right-0 mt-4 w-80 bg-[rgba(20,20,20,0.6)] border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden z-50 animate-slideUpFade"
              style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-white font-medium tracking-wide">Birthdays Today</h3>
                <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2.5 py-1 rounded-full font-medium">
                  {birthdays.length} Total
                </span>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {birthdays.length === 0 ? (
                  <div className="p-8 text-center text-white/40 text-sm">
                    No birthdays today
                  </div>
                ) : (
                  birthdays.map((customer) => (
                    <div key={customer.id} className="p-5 border-b border-white/5 hover:bg-white/5 transition-all duration-300 group">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[15px] text-white/90 font-medium tracking-wide group-hover:text-[#D4AF37] transition-colors duration-300">
                            {customer.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => {}}
                             className="flex-1 text-xs bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 px-3 py-2.5 rounded-lg font-medium transition-all duration-300"
                           >
                             View Profile
                           </button>
                           <button 
                             onClick={() => sendWhatsAppGreeting(customer)}
                             className="flex-1 text-xs bg-[#D4AF37]/5 text-[#D4AF37] hover:bg-[#D4AF37]/15 px-3 py-2.5 rounded-lg font-medium transition-all duration-300 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40"
                           >
                             Send Wishes
                           </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-white/80 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
          <CalendarIcon className="h-4 w-4 text-[#D4AF37]" />
          {todayStr}
        </div>
      </div>
    </header>
  );
}
