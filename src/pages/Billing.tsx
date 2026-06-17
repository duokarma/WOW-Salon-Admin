import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Search, Plus, Filter, IndianRupee, QrCode, FileText, Download, Wallet, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

export default function Billing() {
  const services = useStore((state) => state.services);
  const products = useStore((state) => state.products);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cash'>('upi');
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setRecentInvoices(data);
    }
  };

  useEffect(() => {
    fetchInvoices();
    
    const channel = supabase
      .channel('billing-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchInvoices)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Billing & Payments</h2>
        <p className="text-gray-500 mt-1">Manage invoices, GST, UPI payments, and memberships.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Bill POS Form */}
        <div className="glass-card p-6 border-t-4 border-t-gray-900 bg-white lg:order-2 shadow-sm border-gray-200">
          <h3 className="text-lg font-bold mb-6 flex items-center text-gray-900"><Wallet className="w-5 h-5 mr-2 text-gray-600" /> New Invoice</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Customer Search</label>
              <div className="flex">
                <input type="text" placeholder="Phone number or name..." className="flex-1 rounded-l-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all shadow-sm" />
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2.5 rounded-r-xl border border-gray-300 border-l-0 transition-colors"><Search className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Services / Products</label>
              <select className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all shadow-sm">
                <option value="">Select item to add...</option>
                {Object.entries(groupedServices).map(([category, items]) => (
                  <optgroup key={category} label={category} className="text-gray-500 bg-gray-50 font-semibold">
                    {items.map(s => <option key={`srv_${s.id}`} value={`srv_${s.id}`} className="text-gray-900">{s.name} - ₹{s.price}</option>)}
                  </optgroup>
                ))}
                <optgroup label="Retail Products" className="text-gray-500 bg-gray-50 font-semibold">
                  {products.map(p => <option key={`prod_${p.id}`} value={`prod_${p.id}`} className="text-gray-900">{p.name} - ₹{p.sellingPrice}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between text-sm mb-2 text-gray-600">
                <span>Subtotal</span>
                <span className="text-gray-900 font-medium">₹0.00</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-gray-600">
                <span>CGST (9%)</span>
                <span className="text-gray-900 font-medium">₹0.00</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-gray-600">
                <span>SGST (9%)</span>
                <span className="text-gray-900 font-medium">₹0.00</span>
              </div>
              <div className="flex justify-between text-sm mb-4 text-success font-medium">
                <span>Membership Discount</span>
                <span>-₹0.00</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-200 text-gray-900">
                <span>Total</span>
                <span className="text-success">₹0.00</span>
              </div>
            </div>

            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Method</label>
               <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => setPaymentMethod('upi')} className={`py-2 flex flex-col items-center justify-center rounded-xl border ${paymentMethod === 'upi' ? 'bg-gray-100 border-gray-900 text-gray-900 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'} transition-all`}>
                   <QrCode className="w-4 h-4 mb-1" /> UPI
                 </button>
                 <button onClick={() => setPaymentMethod('card')} className={`py-2 flex flex-col items-center justify-center rounded-xl border ${paymentMethod === 'card' ? 'bg-gray-100 border-gray-900 text-gray-900 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'} transition-all`}>
                   <CreditCard className="w-4 h-4 mb-1" /> Card
                 </button>
                 <button onClick={() => setPaymentMethod('cash')} className={`py-2 flex flex-col items-center justify-center rounded-xl border ${paymentMethod === 'cash' ? 'bg-gray-100 border-gray-900 text-gray-900 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'} transition-all`}>
                   <IndianRupee className="w-4 h-4 mb-1" /> Cash
                 </button>
               </div>
            </div>

            <button className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-black shadow-sm transition-all">
              {paymentMethod === 'upi' ? 'Generate QR & Bill' : 'Generate Invoice'}
            </button>
          </div>
        </div>

        {/* Recent Invoices List */}
        <div className="lg:col-span-2 glass-card p-6 lg:order-1 bg-white border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Invoices</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No recent invoices found.</p>
              </div>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer group shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{inv.customer_name || 'Walk-in'}</p>
                      <p className="text-xs text-gray-500">{inv.id.substring(0, 8)} • {inv.date ? format(new Date(inv.date), 'dd MMM, hh:mm a') : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{(Number(inv.grand_total) || 0).toLocaleString()}</p>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border bg-success/10 text-success border-success/20">
                        {inv.status || 'PAID'}
                      </span>
                    </div>
                    <button className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Download className="w-4 h-4" />
                    </button>
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
