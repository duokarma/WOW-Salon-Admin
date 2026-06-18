import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, IndianRupee, X, Edit2, Trash2, PieChart, Package, TrendingUp } from 'lucide-react';
import { format, isSameMonth, isSameYear, isToday } from 'date-fns';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
  'Electricity', 'Water', 'Rent', 'Internet', 'Inventory Purchases', 'Other Expenses'
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card'];
const STATUSES = ['Paid', 'Pending', 'Partially Paid'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    day: format(new Date(), 'dd'),
    month: format(new Date(), 'MM'),
    year: format(new Date(), 'yyyy'),
    notes: '',
    paymentMethod: 'UPI',
    status: 'Paid'
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expRes, prodRes] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('products').select('*')
      ]);
      if (expRes.data) setExpenses(expRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: '',
      day: format(new Date(), 'dd'),
      month: format(new Date(), 'MM'),
      year: format(new Date(), 'yyyy'),
      notes: '',
      paymentMethod: 'UPI',
      status: 'Paid'
    });
    setEditingExpenseId(null);
  };

  const handleOpenEdit = (expense: any) => {
    const d = new Date(expense.date);
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      day: format(d, 'dd'),
      month: format(d, 'MM'),
      year: format(d, 'yyyy'),
      notes: expense.notes || '',
      paymentMethod: expense.payment_method || expense.paymentMethod || 'UPI',
      status: expense.status
    });
    setEditingExpenseId(expense.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category || !formData.day || !formData.month || !formData.year) {
      toast.error("Please fill all required fields.");
      return;
    }

    const dateStr = `${formData.year}-${formData.month}-${formData.day}`;

    const payload = {
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: new Date(dateStr).toISOString(),
      notes: formData.notes,
      payment_method: formData.paymentMethod,
      status: formData.status
    };

    try {
      if (editingExpenseId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingExpenseId);
        if (error) throw error;
        toast.success("Expense updated");
      } else {
        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) throw error;
        toast.success("Expense added");
      }
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
        toast.success("Expense deleted");
        loadData();
      } catch (err) {
        toast.error('Failed to delete expense');
      }
    }
  };

  // Calculations
  const now = new Date();
  
  const todayExpenses = expenses.filter(e => isToday(new Date(e.date))).reduce((sum, e) => sum + Number(e.amount), 0);
  const monthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), now)).reduce((sum, e) => sum + Number(e.amount), 0);
  const yearExpenses = expenses.filter(e => isSameYear(new Date(e.date), now)).reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingPayments = expenses.filter(e => e.status !== 'Paid').reduce((sum, e) => sum + Number(e.amount), 0);

  // Inventory Calculations
  let totalSpentInventory = 0;
  let currentStockValue = 0;
  let costOfConsumed = 0;
  let retailRevenue = 0;
  let retailCost = 0;

  products.forEach(p => {
    const cost = Number(p.purchase_price) || 0;
    const price = Number(p.selling_price) || 0;
    
    totalSpentInventory += (Number(p.purchased_quantity) || 0) * cost;
    currentStockValue += (Number(p.current_stock) || 0) * cost;
    costOfConsumed += (Number(p.salon_consumption) || 0) * cost;
    retailRevenue += (Number(p.sold_quantity) || 0) * price;
    retailCost += (Number(p.sold_quantity) || 0) * cost;
  });

  const retailProfit = retailRevenue - retailCost;

  // Filtering
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? e.category === filterCategory : true;
    const matchesStatus = filterStatus ? e.status === filterStatus : true;
    const matchesMonth = filterMonth ? format(new Date(e.date), 'yyyy-MM') === filterMonth : true;
    return matchesSearch && matchesCategory && matchesStatus && matchesMonth;
  });

  // Analytics (Category-wise for current month)
  const categoryAnalytics = useMemo(() => {
    const currentMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), now));
    const breakdown: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      if (!breakdown[e.category]) breakdown[e.category] = 0;
      breakdown[e.category] += Number(e.amount);
    });
    return Object.entries(breakdown).sort((a,b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <div className="space-y-8 pb-10 relative max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white">Expense & Analytics</h2>
          <p className="text-white/50 mt-2 font-light tracking-wide">Track expenses and monitor inventory profitability.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Inventory Analytics Cards */}
      <div className="glass-card p-6 border-warning/20">
        <h4 className="text-xl font-light tracking-wide text-white mb-6 flex items-center"><Package className="w-5 h-5 mr-3 text-warning"/> Inventory Accounting</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Total Capital Invested</p>
            <p className="text-2xl font-light text-white">₹{totalSpentInventory.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Current Stock Value</p>
            <p className="text-2xl font-light text-white">₹{currentStockValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-danger mb-1">Salon Consumption (Cost)</p>
            <p className="text-2xl font-light text-danger">₹{costOfConsumed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-success mb-1">Retail Revenue</p>
            <p className="text-2xl font-light text-success">₹{retailRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-success mb-1">Net Retail Profit</p>
            <p className="text-2xl font-light text-success font-bold">₹{retailProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Today's Expenses</p>
          <p className="text-3xl font-light text-white tracking-tight flex items-center"><IndianRupee className="w-5 h-5 mr-1 text-white/50"/>{todayExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">This Month</p>
          <p className="text-3xl font-light text-white tracking-tight flex items-center"><IndianRupee className="w-5 h-5 mr-1 text-white/50"/>{monthExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">This Year</p>
          <p className="text-3xl font-light text-white tracking-tight flex items-center"><IndianRupee className="w-5 h-5 mr-1 text-white/50"/>{yearExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center border-danger/30 bg-danger/5">
          <p className="text-xs font-bold uppercase tracking-widest text-danger mb-2">Pending Payments</p>
          <p className="text-3xl font-light text-danger tracking-tight flex items-center"><IndianRupee className="w-5 h-5 mr-1 opacity-70"/>{pendingPayments.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Main Content (Table) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center flex-1 min-w-[200px] glass-panel px-4 py-3 focus-within:border-white/30 transition-all">
              <Search className="h-4 w-4 text-white/40 mr-3" />
              <input
                type="text"
                placeholder="Search description..."
                className="bg-transparent outline-none w-full text-sm text-white placeholder-white/30 font-light tracking-wide"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="glass-input px-4 py-3 appearance-none">
              <option value="" className="bg-black">All Months</option>
              <option value={format(now, 'yyyy-MM')} className="bg-black">This Month</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="glass-input px-4 py-3 appearance-none">
              <option value="" className="bg-black">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input px-4 py-3 appearance-none">
              <option value="" className="bg-black">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left text-white">
                <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-16 text-white/50">Loading expenses...</td></tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-white/50 font-light text-lg">No expenses found.</td></tr>
                  ) : (
                    filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-white/5 transition-colors group font-light">
                        <td className="px-6 py-4 whitespace-nowrap text-white/70">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4 font-medium text-white">{e.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-white/5 text-white border border-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{e.category}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white whitespace-nowrap">₹{Number(e.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-white/50 whitespace-nowrap">{e.payment_method || e.paymentMethod}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${
                            e.status === 'Paid' ? 'bg-success/10 text-success border-success/20' :
                            e.status === 'Pending' ? 'bg-danger/10 text-danger border-danger/20' :
                            'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEdit(e)} className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(e.id)} className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 sticky top-6">
            <h4 className="text-xl font-light tracking-wide text-white mb-6 flex items-center"><PieChart className="w-5 h-5 mr-3 text-white/50"/> Monthly Analytics</h4>
            {categoryAnalytics.length === 0 ? (
              <p className="text-sm text-white/50 font-light">No expenses this month.</p>
            ) : (
              <div className="space-y-6">
                {categoryAnalytics.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-2 font-light">
                      <span className="text-white/70">{cat}</span>
                      <span className="text-white">₹{amount}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-white h-full rounded-full" style={{ width: `${Math.min((amount / monthExpenses) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-black/20">
              <h3 className="text-xl font-light tracking-tight text-white">{editingExpenseId ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Description / Title *</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="glass-input w-full px-4 py-3" placeholder="E.g., June Water Bill" />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Amount *</label>
                  <div className="relative flex items-center">
                    <IndianRupee className="w-4 h-4 text-white/40 absolute left-4" />
                    <input type="number" required min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="glass-input w-full pl-10 pr-4 py-3" placeholder="0.00" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Date *</label>
                  <div className="grid grid-cols-3 gap-3">
                    <select required value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="glass-input w-full px-4 py-3 appearance-none cursor-pointer">
                      <option value="" className="bg-black text-white/50">Day</option>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                        <option key={d} value={d.toString().padStart(2, '0')} className="bg-black text-white">{d.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select required value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} className="glass-input w-full px-4 py-3 appearance-none cursor-pointer">
                      <option value="" className="bg-black text-white/50">Month</option>
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m.toString().padStart(2, '0')} className="bg-black text-white">
                          {format(new Date(2000, m - 1, 1), 'MMM')}
                        </option>
                      ))}
                    </select>
                    <select required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="glass-input w-full px-4 py-3 appearance-none cursor-pointer">
                      <option value="" className="bg-black text-white/50">Year</option>
                      {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y.toString()} className="bg-black text-white">{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Category *</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="glass-input w-full px-4 py-3 appearance-none">
                    <option value="" className="bg-black">-- Select Category --</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Payment Method</label>
                    <select required value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="glass-input w-full px-4 py-3 appearance-none">
                      {PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-black">{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Status</label>
                    <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="glass-input w-full px-4 py-3 appearance-none">
                      {STATUSES.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Notes (Optional)</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="glass-input w-full px-4 py-3 resize-none" placeholder="Any additional details..."></textarea>
                </div>

              </div>
              <div className="p-6 border-t border-white/10 bg-black/20 rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingExpenseId ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
