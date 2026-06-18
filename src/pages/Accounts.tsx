import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, IndianRupee, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { format, isSameMonth, isSameYear } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#F4E3C5', '#D4AF37', '#996515', '#C5B358', '#E6C200', '#FFDF00'];

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
      title: exp.title || exp.category,
      amount: Number(exp.amount) || 0,
      type: 'expense',
      date: new Date(exp.date)
    }));

    return [...incomes, ...outgoings]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [filteredVisits, filteredExpenses]);

  // CSV Exports
  const exportCustomerCSV = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('No customers found.');
        return;
      }
      
      const headers = ['ID', 'Name', 'Phone', 'Date of Birth', 'Services Taken', 'Staff Served', 'Amount Paid', 'Created At'];
      const rows = data.map(c => [
        c.id,
        `"${c.name}"`,
        `"${c.phone || ''}"`,
        c.dob || '',
        `"${(c.services_taken || []).join(', ')}"`,
        `"${(c.staff_served || []).join(', ')}"`,
        c.amount_paid || 0,
        c.created_at
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `customers_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Customer CSV exported!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export customers');
    }
  };

  const exportFinanceCSV = () => {
    if (visits.length === 0 && expenses.length === 0) {
      toast.error('No financial data found.');
      return;
    }
    const headers = ['Date', 'Type', 'Description', 'Category/Customer', 'Amount'];
    
    const incomes = visits.map(v => [
      format(new Date(v.visit_date), 'yyyy-MM-dd HH:mm'),
      'Income',
      `"Visit - ${v.customer?.name || 'Walk-in'}"`,
      `"Services & Products"`,
      v.grand_total || 0
    ]);
    
    const outgoings = expenses.map(e => [
      format(new Date(e.date), 'yyyy-MM-dd'),
      'Expense',
      `"${e.title || e.category}"`,
      `"${e.category}"`,
      e.amount || 0
    ]);
    
    const allTx = [...incomes, ...outgoings].sort((a, b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());
    
    const csvContent = [headers.join(','), ...allTx.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `finance_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Finance CSV exported!');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white">Accounts Overview</h2>
          <p className="text-white/50 font-light mt-1 tracking-wide">Financial summary, P&L, and expense tracking.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)} 
            className="glass-input text-sm font-medium px-4 py-2.5 appearance-none text-white cursor-pointer"
          >
            <option value="This Month" className="bg-black">This Month</option>
            <option value="This Year" className="bg-black">This Year</option>
            <option value="All Time" className="bg-black">All Time</option>
          </select>
          <button onClick={exportCustomerCSV} className="btn-secondary flex items-center bg-white/5 hover:bg-white/10 text-white border-white/20">
            <Download className="w-4 h-4 mr-2" /> Customers CSV
          </button>
          <button onClick={exportFinanceCSV} className="btn-primary flex items-center">
            <Download className="w-4 h-4 mr-2" /> Finance CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-6 flex flex-col justify-center border border-white/10">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Total Revenue</h3>
            <div className="bg-success/10 p-2 rounded-lg border border-success/20"><ArrowUpRight className="h-5 w-5 text-success" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-4xl font-light text-white flex items-center tracking-tight"><IndianRupee className="w-6 h-6 mr-1 text-white/40" />{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="glass-card p-6 flex flex-col justify-center border border-danger/20">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Total Expenses</h3>
            <div className="bg-danger/10 p-2 rounded-lg border border-danger/20"><ArrowDownRight className="h-5 w-5 text-danger" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-4xl font-light text-white flex items-center tracking-tight"><IndianRupee className="w-6 h-6 mr-1 text-danger" />{totalExpenses.toLocaleString()}</span>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden flex flex-col justify-center group border border-white/10">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
             <IndianRupee className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Net Profit</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-4xl font-light tracking-tight flex items-center ${netProfit >= 0 ? 'text-white' : 'text-danger'}`}>
                <IndianRupee className="w-6 h-6 mr-1 text-white/40" />{netProfit.toLocaleString()}
              </span>
            </div>
            <p className="text-xs font-light mt-2 text-white/50 italic">After all recorded expenses</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <div className="glass-card p-6 border border-white/10">
          <h3 className="text-xl font-light text-white mb-6 tracking-tight">Expense Breakdown</h3>
          {expenseData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-white/30 text-sm italic font-light">
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
                    contentStyle={{ backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="glass-card p-6 flex flex-col h-full max-h-[420px] border border-white/10">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xl font-light text-white tracking-tight">Recent Transactions</h3>
            <span className="text-xs font-bold px-3 py-1.5 bg-white/10 text-white border border-white/10 rounded-lg">{filter}</span>
          </div>
          
          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-center text-white/30 italic font-light mt-10">No transactions found.</p>
            ) : (
              recentTransactions.map(tx => (
                <div key={`${tx.type}-${tx.id}`} className="flex justify-between items-center pb-4 border-b border-white/10 last:border-0 last:pb-0 group">
                  <div>
                    <p className="font-light text-base text-white">{tx.title}</p>
                    <p className="text-xs font-light tracking-wide text-white/50 mt-1 uppercase">{format(tx.date, 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                  <span className={`font-light text-sm px-3 py-1 rounded-lg border ${tx.type === 'income' ? 'text-success bg-success/10 border-success/20' : 'text-danger bg-danger/10 border-danger/20'}`}>
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

