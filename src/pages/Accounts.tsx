import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { format, isSameMonth, isSameYear } from 'date-fns';

const COLORS = ['#111827', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB'];

export default function Accounts() {
  const [filter, setFilter] = useState<'This Month' | 'This Year' | 'All Time'>('This Month');
  const [visits, setVisits] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const fetchData = async () => {
    const [vRes, eRes] = await Promise.all([
      supabase.from('customer_visits').select('*, customer:customer_id(name)'),
      supabase.from('expenses').select('*')
    ]);
    if (vRes.data) setVisits(vRes.data);
    if (eRes.data) setExpenses(eRes.data);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('accounts-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_visits' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const now = new Date();

  // Filter Data
  const filterByDate = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (filter === 'This Month') return isSameMonth(d, now);
    if (filter === 'This Year') return isSameYear(d, now);
    return true; // All Time
  };

  const filteredVisits = visits.filter(v => filterByDate(v.visit_date));
  const filteredExpenses = expenses.filter(exp => filterByDate(exp.date));

  // Calculations
  const totalRevenue = filteredVisits.reduce((sum, v) => sum + (Number(v.grand_total) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Pie Chart Data (Category breakdown)
  const expenseData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      if (!breakdown[exp.category]) breakdown[exp.category] = 0;
      breakdown[exp.category] += Number(exp.amount) || 0;
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredExpenses]);

  // Recent Transactions (Mix of Visits and Expenses)
  const recentTransactions = useMemo(() => {
    const incomes = filteredVisits.map(v => ({
      id: v.id,
      title: `Visit: ${v.customer?.name || 'Walk-in'}`,
      amount: Number(v.grand_total) || 0,
      type: 'income',
      date: new Date(v.visit_date)
    }));
    
    const outgoings = filteredExpenses.map(exp => ({
      id: exp.id,
      title: exp.title,
      amount: Number(exp.amount) || 0,
      type: 'expense',
      date: new Date(exp.date)
    }));

    return [...incomes, ...outgoings]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [filteredVisits, filteredExpenses]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Accounts Overview</h2>
          <p className="text-gray-500 text-sm mt-1">Financial summary, P&L, and expense tracking.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)} 
            className="text-sm font-medium border border-gray-300 rounded-xl px-4 py-2.5 bg-white shadow-sm outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-all text-gray-900"
          >
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
            <option value="All Time">All Time</option>
          </select>
          <button className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all">
            Export Report
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-6 flex flex-col justify-center bg-white border border-gray-200">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Revenue</h3>
            <div className="bg-success/10 p-2 rounded-lg border border-success/20"><ArrowUpRight className="h-5 w-5 text-success" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-6 h-6 mr-1 text-gray-400" />{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="glass-card p-6 flex flex-col justify-center border-danger/20 bg-white">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Expenses</h3>
            <div className="bg-danger/10 p-2 rounded-lg border border-danger/20"><ArrowDownRight className="h-5 w-5 text-danger" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-6 h-6 mr-1 text-danger" />{totalExpenses.toLocaleString()}</span>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden flex flex-col justify-center group border-gray-200 bg-white">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
             <IndianRupee className="w-24 h-24 text-gray-900" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Net Profit</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-3xl font-bold flex items-center ${netProfit >= 0 ? 'text-gray-900' : 'text-danger'}`}>
                <IndianRupee className="w-6 h-6 mr-1 text-gray-400" />{netProfit.toLocaleString()}
              </span>
            </div>
            <p className="text-xs font-medium mt-2 text-gray-500">After all recorded expenses</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <div className="glass-card p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Breakdown</h3>
          {expenseData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
              No expenses recorded for {filter.toLowerCase()}.
            </div>
          ) : (
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => `₹${value}`} 
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#111827', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="glass-card p-6 flex flex-col h-full max-h-[420px] bg-white border border-gray-200">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-md">{filter}</span>
          </div>
          
          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-center text-gray-500 mt-10">No transactions found.</p>
            ) : (
              recentTransactions.map(tx => (
                <div key={`${tx.type}-${tx.id}`} className="flex justify-between items-center pb-4 border-b border-gray-100 last:border-0 last:pb-0 group">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{tx.title}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{format(tx.date, 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                  <span className={`font-bold text-sm px-3 py-1 rounded-lg border ${tx.type === 'income' ? 'text-success bg-success/10 border-success/20' : 'text-danger bg-danger/10 border-danger/20'}`}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
