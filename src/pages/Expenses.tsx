import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Filter, IndianRupee, X, Calendar, Edit2, Trash2, PieChart } from 'lucide-react';
import { format, isSameMonth, isSameYear, isToday } from 'date-fns';
import type { Expense } from '../types';

const EXPENSE_CATEGORIES = [
  'Water Bill', 'Electricity Bill', 'Internet / WiFi', 'Rent', 
  'Staff Salary', 'Staff Bonus', 'Salon Products Purchase', 
  'Hair Color Stock', 'Shampoo Stock', 'Treatment Products', 
  'Cleaning Supplies', 'Equipment Purchase', 'Equipment Repair', 
  'Furniture', 'Marketing', 'Instagram Ads', 'Google Ads', 
  'Festival Decoration', 'Tea / Coffee', 'Snacks', 
  'Stationery', 'Transportation', 'Miscellaneous'
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card'];
const STATUSES = ['Paid', 'Pending', 'Partially Paid'];

export default function Expenses() {
  const store = useStore();
  const expenses = store.expenses;

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
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    paymentMethod: 'UPI',
    status: 'Paid'
  });

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      paymentMethod: 'UPI',
      status: 'Paid'
    });
    setEditingExpenseId(null);
  };

  const handleOpenEdit = (expense: Expense) => {
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      notes: expense.notes || '',
      paymentMethod: expense.paymentMethod,
      status: expense.status
    });
    setEditingExpenseId(expense.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category || !formData.date) {
      alert("Please fill all required fields.");
      return;
    }

    if (editingExpenseId) {
      store.updateExpense(editingExpenseId, {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date).toISOString(),
        notes: formData.notes,
        paymentMethod: formData.paymentMethod as any,
        status: formData.status as any
      });
    } else {
      store.addExpense({
        id: `exp_${Date.now()}`,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date).toISOString(),
        notes: formData.notes,
        paymentMethod: formData.paymentMethod as any,
        status: formData.status as any
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      store.deleteExpense(id);
    }
  };

  // Calculations
  const now = new Date();
  
  const todayExpenses = expenses.filter(e => isToday(new Date(e.date))).reduce((sum, e) => sum + e.amount, 0);
  const monthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), now)).reduce((sum, e) => sum + e.amount, 0);
  const yearExpenses = expenses.filter(e => isSameYear(new Date(e.date), now)).reduce((sum, e) => sum + e.amount, 0);
  const pendingPayments = expenses.filter(e => e.status !== 'Paid').reduce((sum, e) => sum + e.amount, 0);

  // Filtering
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? e.category === filterCategory : true;
    const matchesStatus = filterStatus ? e.status === filterStatus : true;
    const matchesMonth = filterMonth ? format(new Date(e.date), 'yyyy-MM') === filterMonth : true;
    return matchesSearch && matchesCategory && matchesStatus && matchesMonth;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Analytics (Category-wise for current month)
  const categoryAnalytics = useMemo(() => {
    const currentMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), now));
    const breakdown: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      if (!breakdown[e.category]) breakdown[e.category] = 0;
      breakdown[e.category] += e.amount;
    });
    return Object.entries(breakdown).sort((a,b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <div className="space-y-8 pb-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Expense Management</h2>
          <p className="text-gray-500 mt-1">Track and analyze all salon expenditures.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 flex flex-col justify-center bg-white border border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Today's Expenses</p>
          <p className="text-2xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-5 h-5 mr-0.5 text-gray-400"/>{todayExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 flex flex-col justify-center bg-white border border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">This Month</p>
          <p className="text-2xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-5 h-5 mr-0.5 text-gray-400"/>{monthExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 flex flex-col justify-center bg-white border border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">This Year</p>
          <p className="text-2xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-5 h-5 mr-0.5 text-gray-400"/>{yearExpenses.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 flex flex-col justify-center border-danger/30 bg-danger/5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-danger mb-1">Pending Payments</p>
          <p className="text-2xl font-bold text-danger flex items-center"><IndianRupee className="w-5 h-5 mr-0.5 opacity-70"/>{pendingPayments.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Main Content (Table) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center flex-1 min-w-[200px] bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200 focus-within:ring-1 focus-within:ring-gray-500 focus-within:border-gray-500 transition-all">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search description..."
                className="bg-transparent outline-none w-full text-sm text-gray-900 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200 text-sm font-medium text-gray-700 outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500">
              <option value="">All Months</option>
              <option value={format(now, 'yyyy-MM')}>This Month</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200 text-sm font-medium text-gray-700 outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500">
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200 text-sm font-medium text-gray-700 outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="glass-card overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
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
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-500">No expenses found.</td></tr>
                  ) : (
                    filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{e.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-md text-xs font-semibold">{e.category}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">₹{e.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{e.paymentMethod}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            e.status === 'Paid' ? 'bg-success/10 text-success border-success/20' :
                            e.status === 'Pending' ? 'bg-danger/10 text-danger border-danger/20' :
                            'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEdit(e)} className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
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
          <div className="glass-card p-6 sticky top-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><PieChart className="w-5 h-5 mr-2 text-gray-500"/> Monthly Analytics</h4>
            {categoryAnalytics.length === 0 ? (
              <p className="text-sm text-gray-500">No expenses this month.</p>
            ) : (
              <div className="space-y-4">
                {categoryAnalytics.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-600">{cat}</span>
                      <span className="font-bold text-gray-900">₹{amount}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-gray-900 h-1.5 rounded-full" style={{ width: `${Math.min((amount / monthExpenses) * 100, 100)}%` }}></div>
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
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{editingExpenseId ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-900 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[70vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Title *</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 shadow-sm" placeholder="E.g., June Water Bill" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Amount *</label>
                    <div className="relative flex items-center">
                      <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3" />
                      <input type="number" required min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 shadow-sm" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 shadow-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 shadow-sm">
                    <option value="">-- Select Category --</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                    <select required value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 shadow-sm">
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 shadow-sm">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none shadow-sm" placeholder="Any additional details..."></textarea>
                </div>

              </div>
              <div className="p-6 border-t border-gray-200 shrink-0 bg-white">
                <button type="submit" className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-sm">
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
