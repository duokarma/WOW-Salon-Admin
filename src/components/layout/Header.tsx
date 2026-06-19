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
      
      if (ctx.state === 'suspended') {
         ctx.resume().catch(() => {});
         if (ctx.state === 'suspended') return;
      }
      
      // Creating a richer, premium hotel chime
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880; // A5
      osc1.connect(gain1);
      gain1.connect(masterGain);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1760; // A6
      osc2.connect(gain2);
      gain2.connect(masterGain);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.value = 3520; // A7
      osc3.connect(gain3);
      gain3.connect(masterGain);

      const now = ctx.currentTime;
      
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(1, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 2.5);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.5, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      gain3.gain.setValueAtTime(0, now);
      gain3.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      
      osc1.stop(now + 2.5);
      osc2.stop(now + 1.5);
      osc3.stop(now + 0.3);

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
          if (isRealtimeUpdate && birthdaysToday.length > prev.length) {
            setUnreadCount(birthdaysToday.length);
            if (hasPlayedAudio) {
               setHasPlayedAudio(false);
               sessionStorage.removeItem('birthday_audio_played');
            }
          } else if (!isRealtimeUpdate) {
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

  // 1. Initial Fetch, Realtime & Midnight Timer
  useEffect(() => {
    fetchBirthdays();

    const channel = supabase.channel('customers-changes-header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        fetchBirthdays(true);
      })
      .subscribe();

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => {
       fetchBirthdays();
    }, msUntilMidnight);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timer);
    };
  }, [fetchBirthdays]);

  // 2. Dropdown Outside Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Audio interaction listeners
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (birthdays.length > 0 && !hasPlayedAudio) {
        playPremiumChime();
      }
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, [birthdays.length, hasPlayedAudio, playPremiumChime]);

  // Attempt to play on mount if there's birthdays
  useEffect(() => {
     if (birthdays.length > 0 && !hasPlayedAudio) {
        playPremiumChime();
     }
  }, [birthdays.length, hasPlayedAudio, playPremiumChime]);

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
                             onClick={() => {
                               setIsDropdownOpen(false);
                               window.location.href = '/customers';
                             }}
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
