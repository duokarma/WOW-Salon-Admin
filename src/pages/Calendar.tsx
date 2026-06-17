import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, IndianRupee, Users, Package } from 'lucide-react';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visits, setVisits] = useState<any[]>([]);

  const fetchVisits = async () => {
    const { data, error } = await supabase.from('customer_visits').select(`
      *,
      customer:customer_id(name),
      staff:staff_id(name, staff_name),
      visit_services(*),
      visit_products(*)
    `);
    if (!error && data) {
      setVisits(data);
    }
  };

  useEffect(() => {
    fetchVisits();
    
    const channel = supabase
      .channel('calendar-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_visits' }, fetchVisits)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }).fill(null);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Get visits for selected date
  const selectedDateVisits = visits.filter(v => v.visit_date && isSameDay(new Date(v.visit_date), selectedDate));
  const totalRevenue = selectedDateVisits.reduce((sum, v) => sum + (Number(v.grand_total) || 0), 0);
  const totalCustomers = selectedDateVisits.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Customer Visit Calendar</h2>
        <p className="text-gray-500 mt-1">View past visits and daily revenue.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-transparent transition-colors"><ChevronLeft className="w-5 h-5"/></button>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-transparent transition-colors"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-bold text-gray-500 mb-4">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 flex-1">
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="rounded-xl bg-gray-50/50 border border-transparent"></div>
            ))}
            {daysInMonth.map((day, i) => {
              const dayVisits = visits.filter(v => v.visit_date && isSameDay(new Date(v.visit_date), day));
              const dayRevenue = dayVisits.reduce((sum, v) => sum + (Number(v.grand_total) || 0), 0);
              const isSelected = isSameDay(day, selectedDate);
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(day)}
                  className={`rounded-xl border p-2 flex flex-col cursor-pointer transition-all ${isSelected ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-[1.02]' : 'bg-white border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}
                >
                  <span className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>{format(day, 'd')}</span>
                  {dayVisits.length > 0 && (
                    <div className="text-xs space-y-1 mt-auto">
                      <div className={`font-semibold flex items-center ${isSelected ? 'text-white' : 'text-success'}`}>
                         ₹{dayRevenue.toLocaleString()}
                      </div>
                      <div className={`flex items-center ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        <Users className="w-3 h-3 mr-1"/> {dayVisits.length}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="glass-card p-6 flex flex-col h-full overflow-hidden">
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4 border-gray-200">
            {format(selectedDate, 'dd MMMM yyyy')}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Customers</p>
              <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Revenue</p>
              <p className="text-3xl font-bold text-success flex items-center"><IndianRupee className="w-5 h-5 mr-1"/>{totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {selectedDateVisits.length === 0 ? (
              <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-300" />
                </div>
                <p>No visits on this date.</p>
              </div>
            ) : (
              selectedDateVisits.map((v, i) => (
                <div key={v.id || i} className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-gray-300 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 text-base">{i + 1}. {v.customer?.name || 'Walk-in'}</h4>
                    <span className="font-bold text-success">₹{(v.grand_total || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1.5">
                    {v.visit_services?.map((svc: any, idx: number) => (
                      <div key={`svc-${idx}`} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100">
                        <span className="font-medium text-gray-900">{svc.service_name}</span>
                        <span>₹{svc.price}</span>
                      </div>
                    ))}
                    {v.visit_products?.map((prod: any, idx: number) => (
                      <div key={`prod-${idx}`} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100">
                        <span className="font-medium text-gray-900 flex items-center">
                          <Package className="w-3 h-3 mr-1 text-gray-400" /> 
                          {prod.product_name} (x{prod.quantity})
                        </span>
                        <span className="text-gray-900">₹{prod.price}</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-gray-100 text-xs">
                      Served by: <span className="font-semibold text-gray-900">{v.staff?.name || v.staff?.staff_name || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
