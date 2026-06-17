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
        supabase.from('staff_commissions').select('*'),
        supabase.from('customer_visits').select('*, customers(name), visit_services(service_name, price)')
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
      const v = visits.find(visit => visit.id === c.visit_id);
      if (!v || !v.visit_date) return false;
      const vDate = new Date(v.visit_date);
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
    <div className="space-y-8 pb-10 relative max-w-7xl mx-auto">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white">Staff Management</h2>
          <p className="text-white/50 mt-2 font-light tracking-wide">Manage team payroll, commissions, and performance.</p>
        </div>
        <button 
          onClick={() => {
            setEditingStaff({ salary: 15000, status: 'Active', gender: 'Female' });
            setIsEditModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
                className="glass-card hover:bg-white/5 transition-all cursor-pointer group flex flex-col overflow-hidden relative"
                onClick={() => setSelectedStaffId(staff.id)}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingStaff({ ...staff, name: staffName, salary: baseSalary });
                    setIsEditModalOpen(true);
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/50 hover:text-white shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-4 mb-4 pr-8">
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 transition-colors">
                      <span className="text-white font-bold text-lg transition-colors">{initials}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-light text-white tracking-wide">{staffName}</h3>
                      <p className="text-sm font-light text-white/50">{staff.gender}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${staff.status === 'Active' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                      {staff.status || 'Active'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-white/50 font-light" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-2" /> {staff.phone || 'N/A'}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-3.5 h-3.5 mr-2" /> 
                      {staff.joining_date || staff.joiningDate ? format(new Date(staff.joining_date || staff.joiningDate), 'dd MMM yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between bg-black/20" onClick={e => e.stopPropagation()}>
                  <div className="space-y-4 mb-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Monthly Salary</label>
                      <div className="relative flex items-center">
                        <IndianRupee className="w-4 h-4 text-white/40 absolute left-4" />
                        <input 
                          type="number" 
                          className="glass-input w-full pl-10 pr-4 py-3"
                          value={baseSalary}
                          onChange={(e) => handleSalaryChange(staff.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                      <span className="text-xs font-bold tracking-widest text-white/50 uppercase">Commission (10%)</span>
                      <span className="font-light text-success text-lg">+ ₹{metrics.commission.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold tracking-widest text-white/70 uppercase">Total Payable</span>
                      <span className="text-2xl font-light text-white tracking-tight">₹{totalPayable.toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={(e) => handlePaySalary(e, staff.id, totalPayable, staffName)}
                      className="w-full py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]"
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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-light tracking-tight text-white">{editingStaff?.id ? 'Edit Staff Details' : 'Add New Staff'}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveStaff} className="flex flex-col flex-1">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={editingStaff?.name || ''} 
                    onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                    className="glass-input w-full px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    value={editingStaff?.phone || ''} 
                    onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})}
                    className="glass-input w-full px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Gender</label>
                  <select 
                    value={editingStaff?.gender || 'Female'} 
                    onChange={e => setEditingStaff({...editingStaff, gender: e.target.value})}
                    className="glass-input w-full px-4 py-3 appearance-none"
                  >
                    <option value="Male" className="bg-black">Male</option>
                    <option value="Female" className="bg-black">Female</option>
                    <option value="Other" className="bg-black">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Joining Date</label>
                  <input 
                    type="date" 
                    required 
                    value={editingStaff?.joining_date || editingStaff?.joiningDate || ''} 
                    onChange={e => setEditingStaff({...editingStaff, joining_date: e.target.value})}
                    className="glass-input w-full px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Base Salary</label>
                  <input 
                    type="number" 
                    required 
                    value={editingStaff?.salary || 15000} 
                    onChange={e => setEditingStaff({...editingStaff, salary: Number(e.target.value)})}
                    className="glass-input w-full px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Status</label>
                  <select 
                    value={editingStaff?.status || 'Active'} 
                    onChange={e => setEditingStaff({...editingStaff, status: e.target.value})}
                    className="glass-input w-full px-4 py-3 appearance-none"
                  >
                    <option value="Active" className="bg-black">Active</option>
                    <option value="Inactive" className="bg-black">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 bg-black/20 rounded-b-2xl">
                <button type="submit" className="btn-primary w-full justify-center">
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Profile Modal */}
      {selectedStaffId && selectedStaff && selectedStaffMetrics && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="glass-panel w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-white/10 bg-black/20 shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-light tracking-tight text-white flex items-center">
                    {selectedStaff.name || selectedStaff.staff_name} 
                    <span className="text-xs font-bold tracking-widest text-white/50 uppercase ml-4 px-3 py-1 bg-white/5 rounded-full border border-white/10">{selectedStaff.gender}</span>
                  </h3>
                  <p className="text-sm font-light text-white/50 mt-2 tracking-wide uppercase">{selectedStaff.phone || 'N/A'} • Joined {selectedStaff.joining_date || selectedStaff.joiningDate ? format(new Date(selectedStaff.joining_date || selectedStaff.joiningDate), 'dd MMM yyyy') : 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaffId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X className="w-6 h-6"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-transparent custom-scrollbar">
              <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Left Column: Summary */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Monthly Summary */}
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    <h4 className="text-lg font-light text-white mb-6 flex items-center tracking-wide"><Briefcase className="w-5 h-5 mr-3 text-white/50"/> Monthly Summary</h4>
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                        <span className="font-light text-white/50">Customers Served</span>
                        <span className="font-medium text-white">{selectedStaffMetrics.customersServed}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                        <span className="font-light text-white/50">Service Revenue</span>
                        <span className="font-medium text-white">₹{selectedStaffMetrics.totalServiceRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                        <span className="font-light text-white/50">Commission (10%)</span>
                        <span className="font-medium text-success">₹{selectedStaffMetrics.commission.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                        <span className="font-light text-white/50">Base Salary</span>
                        <span className="font-medium text-white">₹{(selectedStaff.salary || 15000).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <span className="font-bold tracking-widest text-white/70 uppercase text-xs">Total Payout</span>
                        <span className="font-light text-white text-2xl tracking-tight">₹{((selectedStaff.salary || 15000) + selectedStaffMetrics.commission).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Service History */}
                <div className="lg:col-span-2">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md h-full">
                    <h4 className="text-lg font-light text-white mb-6 flex items-center tracking-wide"><FileText className="w-5 h-5 mr-3 text-white/50"/> Service History (Current Month)</h4>
                    
                    {selectedStaffMetrics.staffVisits.length === 0 ? (
                      <div className="text-center py-12 text-white/50 border border-dashed border-white/20 rounded-2xl font-light bg-black/20">
                        No customers served this month.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-white">
                          <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                            <tr>
                              <th className="px-4 py-4 rounded-tl-lg">Date</th>
                              <th className="px-4 py-4">Customer</th>
                              <th className="px-4 py-4">Services</th>
                              <th className="px-4 py-4">Service Total</th>
                              <th className="px-4 py-4 text-right rounded-tr-lg">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {selectedStaffMetrics.staffVisits.sort((a,b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()).map(v => {
                              const srvNames = v.visit_services?.map((s: any) => s.service_name).join(', ') || 'No Services';
                              const srvTotal = v.service_total || 0;
                              
                              return (
                                <tr key={v.id} className="hover:bg-white/5 transition-colors font-light">
                                  <td className="px-4 py-4 whitespace-nowrap text-white/70">{v.visit_date ? format(new Date(v.visit_date), 'dd MMM yyyy') : ''}</td>
                                  <td className="px-4 py-4 font-medium text-white">{v.customers?.name || 'Walk-in'}</td>
                                  <td className="px-4 py-4 text-white/70">{srvNames}</td>
                                  <td className="px-4 py-4 text-white">₹{srvTotal.toLocaleString()}</td>
                                  <td className="px-4 py-4 text-right font-medium text-success">₹{(srvTotal * 0.10).toFixed(2)}</td>
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
