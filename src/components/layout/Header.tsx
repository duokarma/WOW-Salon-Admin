import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Bell, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export default function Header() {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  useEffect(() => {
    fetchBirthdays();

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBirthdays = async () => {
    try {
      // Find today's MM-DD to search in dob string
      const todayDate = new Date();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      const searchStr = `%-expr`; // We actually need %-MM-DD
      const mmdd = `-${month}-${day}`;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_deleted', false)
        .like('dob', `%${mmdd}`);

      if (error) throw error;
      setBirthdays(data || []);
    } catch (err) {
      console.error('Failed to fetch birthdays:', err);
    }
  };

  const sendWhatsAppGreeting = (customer: any) => {
    if (!customer.phone) return;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const message = `Happy Birthday ${customer.name}! 🎈 Wishing you a wonderful day from WOW Salon! As a gift, enjoy 10% off your next visit. We hope to see you soon!`;
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <header className="flex h-24 shrink-0 items-center justify-end px-4 md:px-8 sticky top-0 z-20 backdrop-blur-md bg-black/40 border-b border-white/5">
      <div className="flex items-center gap-6">
        
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-3 bg-black/40 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-colors relative shadow-sm"
          >
            <Bell className="w-5 h-5" />
            {birthdays.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
            )}
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-medium text-sm">Notifications</h3>
                <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded-full">{birthdays.length} New</span>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {birthdays.length === 0 ? (
                  <div className="p-6 text-center text-white/40 text-sm">
                    No new notifications
                  </div>
                ) : (
                  birthdays.map((customer) => (
                    <div key={customer.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <div className="flex gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-[#F4E3C5]/10 text-[#F4E3C5] flex items-center justify-center">
                          <Gift className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white mb-1">
                            It's <span className="font-bold text-[#F4E3C5]">{customer.name}'s</span> Birthday today! 🎂
                          </p>
                          <button 
                            onClick={() => sendWhatsAppGreeting(customer)}
                            className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors mt-2"
                          >
                            Send WhatsApp Greeting
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
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-white glass-panel px-4 py-2.5">
          <CalendarIcon className="h-4 w-4 text-white/60" />
          {todayStr}
        </div>
      </div>
    </header>
  );
}
