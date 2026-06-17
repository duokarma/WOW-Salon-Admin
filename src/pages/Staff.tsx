import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, IndianRupee, Phone, Calendar as CalendarIcon, User, X, Briefcase, FileText, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Staff() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add Staff State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, commissionsRes, visitsRes] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('staff_commissions').select('*, customer_visits(*)'),
        supabase.from('customer_visits').select('*, customer:customer_id(name), visit_services(service_name, price)')
      ]);

      if (staffRes.data) setStaffList(staffRes.data);
      if (commissionsRes.data) setCommissions(commissionsRes.data);
      if (visitsRes.data) setVisits(visitsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('staff-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_commissions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_visits' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffData = {
        name: editingStaff.name || editingStaff.staff_name,
        phone: editingStaff.phone,
        gender: editingStaff.gender,
        joining_date: editingStaff.joining_date || editingStaff.joiningDate || new Date().toISOString().split('T')[0],
        salary: editingStaff.salary || 15000,
        status: editingStaff.status || 'Active'
      };

      if (editingStaff.id) {
        await supabase.from('staff').update(staffData).eq('id', editingStaff.id);
      } else {
        await supabase.from('staff').insert([staffData]);
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving staff:', err);
      alert('Failed to save staff details.');
    }
  };

  const handleSalaryChange = async (id: string, newSalary: string) => {
    const val = parseInt(newSalary, 10);
    if (!isNaN(val)) {
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, salary: val } : s));
      await supabase.from('staff').update({ salary: val }).eq('id', id);
    }
  };

  const handlePaySalary = async (e: React.MouseEvent, staffId: string, amount: number, name: string) => {
    e.stopPropagation();
    if (confirm(`Pay ₹${amount} to ${name}?`)) {
      try {
        await supabase.from('expenses').insert([{
          title: `Salary & Commission - ${name}`,
          amount,
          category: 'Staff Salary',
          date: new Date().toISOString(),
          notes: `Auto-generated payment for ${format(new Date(), 'MMMM yyyy')}`,
          payment_method: 'Bank Transfer',
          status: 'Paid'
        }]);
        alert('Salary Paid and Expense Recorded!');
      } catch (err) {
        console.error('Error recording expense:', err);
        alert('Failed to record salary payment.');
      }
    }
  };

  const calculateStaffMetrics = (staffId: string) => {
    const now = new Date();
    
    // Find all commissions for this staff this month
    const currentMonthCommissions = commissions.filter(c => {
      if (c.staff_id !== staffId) return false;
      if (!c.customer_visits || !c.customer_visits.visit_date) return false;
      const vDate = new Date(c.customer_visits.visit_date);
      return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
    });

    const totalServiceRevenue = currentMonthCommissions.reduce((sum, c) => sum + (Number(c.service_amount) || 0), 0);
    const totalCommission = currentMonthCommissions.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);

    const staffVisits = visits.filter(v => {
      if (v.staff_id !== staffId) return false;
      const vDate = new Date(v.visit_date);
      return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
    });

    return {
      totalServiceRevenue,
      commission: totalCommission,
      customersServed: staffVisits.length,
      staffVisits
    };
  };

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);
  const selectedStaffMetrics = selectedStaff ? calculateStaffMetrics(selectedStaff.id) : null;

  return (
    <div className="space-y-8 pb-10 relative">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Staff Management</h2>
          <p className="text-gray-500 mt-1">Manage team payroll, commissions, and performance.</p>
        </div>
        <button 
          onClick={() => {
            setEditingStaff({ salary: 15000, status: 'Active', gender: 'Female' });
            setIsEditModalOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => {
            const staffName = staff.name || staff.staff_name || 'Unnamed';
            const metrics = calculateStaffMetrics(staff.id);
            const baseSalary = Number(staff.salary) || 15000;
            const totalPayable = baseSalary + metrics.commission;
            
            const initials = staffName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div 
                key={staff.id} 
                className="glass-card hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group flex flex-col overflow-hidden relative"
                onClick={() => setSelectedStaffId(staff.id)}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingStaff({ ...staff, name: staffName, salary: baseSalary });
                    setIsEditModalOpen(true);
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-gray-400 hover:text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <div className="p-6 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-4 mb-4 pr-8">
                    <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm shrink-0 group-hover:bg-gray-900 group-hover:border-gray-900 transition-colors">
                      <span className="text-gray-600 font-bold text-lg group-hover:text-white transition-colors">{initials}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{staffName}</h3>
                      <p className="text-sm font-medium text-gray-500">{staff.gender}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${staff.status === 'Active' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                      {staff.status || 'Active'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-2" /> {staff.phone || 'N/A'}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-3.5 h-3.5 mr-2" /> 
                      {staff.joining_date || staff.joiningDate ? format(new Date(staff.joining_date || staff.joiningDate), 'dd MMM yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 flex-1 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
                  <div className="space-y-4 mb-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-500 mb-1">Monthly Salary</label>
                      <div className="relative flex items-center focus-within:ring-1 focus-within:ring-gray-400 focus-within:border-gray-400 rounded-xl transition-all shadow-sm bg-white border border-gray-200">
                        <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3" />
                        <input 
                          type="number" 
                          className="w-full bg-transparent border-none rounded-xl pl-9 pr-3 py-2 text-sm font-semibold text-gray-900 outline-none"
                          value={baseSalary}
                          onChange={(e) => handleSalaryChange(staff.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500">Commission (10%)</span>
                      <span className="font-bold text-success text-sm">+ ₹{metrics.commission.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gray-900">Total Payable</span>
                      <span className="text-lg font-bold text-gray-900">₹{totalPayable.toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={(e) => handlePaySalary(e, staff.id, totalPayable, staffName)}
                      className="w-full py-2.5 bg-gray-900 border border-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-black transition-all flex items-center justify-center shadow-sm"
                    >
                      Pay Salary
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Staff Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{editingStaff?.id ? 'Edit Staff Details' : 'Add New Staff'}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingStaff?.name || ''} 
                  onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={editingStaff?.phone || ''} 
                  onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select 
                  value={editingStaff?.gender || 'Female'} 
                  onChange={e => setEditingStaff({...editingStaff, gender: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingStaff?.joining_date || editingStaff?.joiningDate || ''} 
                  onChange={e => setEditingStaff({...editingStaff, joining_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                <input 
                  type="number" 
                  required 
                  value={editingStaff?.salary || 15000} 
                  onChange={e => setEditingStaff({...editingStaff, salary: Number(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={editingStaff?.status || 'Active'} 
                  onChange={e => setEditingStaff({...editingStaff, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              
              <div className="pt-4">
                <button type="submit" className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-black transition-colors">
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Profile Modal */}
      {selectedStaffId && selectedStaff && selectedStaffMetrics && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm">
                  <User className="w-7 h-7 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedStaff.name || selectedStaff.staff_name} <span className="text-sm font-semibold text-gray-500 ml-2 px-2 py-1 bg-gray-100 rounded-lg border border-gray-200">{selectedStaff.gender}</span></h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">{selectedStaff.phone || 'N/A'} • Joined {selectedStaff.joining_date || selectedStaff.joiningDate ? format(new Date(selectedStaff.joining_date || selectedStaff.joiningDate), 'dd MMM yyyy') : 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaffId(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"><X className="w-6 h-6"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Left Column: Summary */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Monthly Summary */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Briefcase className="w-5 h-5 mr-2 text-gray-500"/> Monthly Summary</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span className="font-medium text-gray-500">Customers Served</span>
                        <span className="font-bold text-gray-900">{selectedStaffMetrics.customersServed}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span className="font-medium text-gray-500">Service Revenue</span>
                        <span className="font-bold text-gray-900">₹{selectedStaffMetrics.totalServiceRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span className="font-medium text-gray-500">Commission Earned (10%)</span>
                        <span className="font-bold text-success">₹{selectedStaffMetrics.commission.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span className="font-medium text-gray-500">Base Salary</span>
                        <span className="font-bold text-gray-900">₹{(selectedStaff.salary || 15000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-gray-900 text-lg">Total Payout</span>
                        <span className="font-bold text-gray-900 text-xl">₹{((selectedStaff.salary || 15000) + selectedStaffMetrics.commission).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Service History */}
                <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-500"/> Service History (Current Month)</h4>
                    
                    {selectedStaffMetrics.staffVisits.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                        No customers served this month.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 rounded-tl-lg">Date</th>
                              <th className="px-4 py-3">Customer</th>
                              <th className="px-4 py-3">Services</th>
                              <th className="px-4 py-3">Service Total</th>
                              <th className="px-4 py-3 text-right rounded-tr-lg">Commission</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedStaffMetrics.staffVisits.sort((a,b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()).map(v => {
                              const srvNames = v.visit_services?.map((s: any) => s.service_name).join(', ') || 'No Services';
                              const srvTotal = v.service_total || 0;
                              
                              return (
                                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{v.visit_date ? format(new Date(v.visit_date), 'dd MMM yyyy') : ''}</td>
                                  <td className="px-4 py-3 font-semibold text-gray-900">{v.customer?.name || 'Walk-in'}</td>
                                  <td className="px-4 py-3 text-gray-900">{srvNames}</td>
                                  <td className="px-4 py-3 text-gray-900">₹{srvTotal.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right font-bold text-success">₹{(srvTotal * 0.10).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
