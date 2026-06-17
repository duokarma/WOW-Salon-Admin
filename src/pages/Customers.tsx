import React, { useState, useEffect } from 'react';
import { customerService } from '../lib/customerService';
import { useStore } from '../store/useStore';
import type { Customer } from '../types';
import { 
  Search, Plus, User, Scissors, Receipt, Download, Package,
  Trash2, Edit2, X, Users, UserPlus, IndianRupee, TrendingUp 
} from 'lucide-react';
import { format, isThisMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  dob: z.string().optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional()
});
type CustomerFormData = z.infer<typeof customerSchema>;

export default function Customers() {
  const store = useStore();
  const invoices = store.invoices;
  const services = store.services;
  const staff = store.staff;

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema)
  });

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openAddModal = () => {
    setCustomerToEdit(null);
    reset({ name: '', phone: '', dob: '', serviceId: '', staffId: '' });
    setIsCustomerModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setCustomerToEdit(customer);
    reset({
      name: customer.name,
      phone: customer.phone,
      dob: customer.dob || '',
      serviceId: '',
      staffId: ''
    });
    setIsCustomerModalOpen(true);
  };

  const onSubmitCustomer = async (data: CustomerFormData) => {
    try {
      let custId: number;
      let currentSpend = 0;
      let currentVisits = 0;

      if (customerToEdit) {
        const updated = await customerService.updateCustomer(customerToEdit.id, data);
        store.updateCustomer(updated.id, updated);
        toast.success('Customer updated successfully');
        custId = updated.id;
        currentSpend = updated.totalSpend || 0;
        currentVisits = updated.visitCount || 0;
      } else {
        const newCust = await customerService.addCustomer(data);
        store.addCustomer(newCust);
        toast.success('Customer added successfully');
        custId = newCust.id;
        currentSpend = newCust.totalSpend || 0;
        currentVisits = newCust.visitCount || 0;
      }

      if (data.serviceId && data.staffId) {
        const selectedService = services.find(s => s.id === data.serviceId)!;
        const selectedStaff = staff.find(s => s.id === data.staffId)!;
        
        // Update stats in Supabase
        await customerService.updateCustomer(custId, {
          totalSpend: currentSpend + selectedService.price,
          visitCount: currentVisits + 1,
          lastServiceDate: new Date().toISOString()
        });

        const newInvoice = {
          id: `inv_${Date.now()}`,
          customerId: custId,
          customerName: data.name,
          customerPhone: data.phone,
          customerDob: data.dob,
          date: new Date().toISOString(),
          services: [{
            id: selectedService.id,
            name: selectedService.name,
            price: selectedService.price,
            quantity: 1
          }],
          soldProducts: [],
          consumedProducts: [],
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          grandTotal: selectedService.price
        };
        store.addInvoice(newInvoice);
        toast.success('Bill generated automatically');
      }

      setIsCustomerModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    try {
      await customerService.deleteCustomer(id);
      store.deleteCustomer(id);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (err: any) {
      toast.error('Failed to delete customer');
    }
  };

  // Derived Data
  const filteredCustomers = customers.filter(
    (c) => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const totalCustomers = customers.length;
  const newThisMonth = customers.filter(c => isThisMonth(new Date(c.createdAt))).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const getCustomerHistory = (customerId: number) => {
    return invoices.filter(inv => inv.customerId === customerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerForHistory);
  const selectedHistory = selectedCustomerForHistory ? getCustomerHistory(selectedCustomerForHistory) : [];

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Customers</h2>
          <p className="text-gray-500 mt-1">Manage your client relationships and view their history.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-50 p-3 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-gray-900">{totalCustomers}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-emerald-50 p-3 rounded-xl">
              <UserPlus className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">New This Month</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-gray-900">{newThisMonth}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-50 p-3 rounded-xl">
              <IndianRupee className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Lifetime Revenue</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-50 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Average Spend</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-gray-900">₹{Math.round(avgSpend).toLocaleString()}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center w-full max-w-md bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent transition-all">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="bg-transparent outline-none w-full text-sm text-gray-900 placeholder-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            Loading customers...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">
            <p>{error}</p>
            <button onClick={loadCustomers} className="mt-4 text-sm font-semibold underline">Try Again</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Lifetime Spend</th>
                  <th className="px-6 py-4">Visits</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <User className="h-10 w-10 mb-4 text-gray-300" />
                        <p className="text-base font-medium text-gray-900">No customers found</p>
                        <p className="text-sm mt-1">Get started by adding a new customer.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredCustomers.map((customer) => {
                  const initials = customer.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors group bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                            {customer.dob && <div className="text-xs text-gray-500 mt-0.5">DOB: {format(new Date(customer.dob), 'dd MMM yyyy')}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        {customer.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          ₹{(customer.totalSpend || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {customer.visitCount || 0} visits
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedCustomerForHistory(customer.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                            title="View Profile"
                          >
                            <User className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditModal(customer)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors tooltip-trigger"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(customer.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900">{customerToEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmitCustomer)} className="flex flex-col flex-1">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input 
                    type="text" 
                    {...register("name")} 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-gray-900 placeholder-gray-400 text-sm transition-all" 
                    placeholder="e.g. Jane Doe" 
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                  <input 
                    type="tel" 
                    {...register("phone")} 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-gray-900 placeholder-gray-400 text-sm transition-all" 
                    placeholder="e.g. 9876543210" 
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Birth</label>
                  <input 
                    type="date" 
                    {...register("dob")} 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-gray-900 text-sm transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2 pt-5 border-t border-gray-100">
                  <div className="col-span-2 mb-1 text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center">
                    <Scissors className="w-4 h-4 mr-2"/> Quick Service Billing (Optional)
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Service</label>
                    <select 
                      {...register("serviceId")} 
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-gray-900 text-sm transition-all"
                    >
                      <option value="">-- No Service --</option>
                      {Object.entries(groupedServices).map(([category, items]) => (
                        <optgroup key={category} label={category} className="text-gray-500 font-semibold bg-gray-50">
                          {items.map(s => <option key={s.id} value={s.id} className="text-gray-900">{s.name} - ₹{s.price}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Staff</label>
                    <select 
                      {...register("staffId")} 
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-gray-900 text-sm transition-all"
                    >
                      <option value="">-- No Staff --</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : null}
                  {customerToEdit ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile History Modal */}
      {selectedCustomerForHistory && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            
            <div className="flex items-start justify-between p-8 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-xl shrink-0 shadow-sm">
                  {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5 text-sm text-gray-500">
                    <span className="flex items-center"><User className="w-4 h-4 mr-1.5"/> {selectedCustomer.phone}</span>
                    {selectedCustomer.dob && <span className="flex items-center"><User className="w-4 h-4 mr-1.5 opacity-0 w-0 overflow-hidden"/> DOB: {format(new Date(selectedCustomer.dob), 'dd MMM yyyy')}</span>}
                    <span>Joined {format(new Date(selectedCustomer.createdAt), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomerForHistory(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6"/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 custom-scrollbar">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">Total Visits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedHistory.length}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">Lifetime Spend</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{selectedCustomer.totalSpend?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm font-medium text-gray-500">Average Bill</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{selectedHistory.length > 0 ? Math.round(selectedCustomer.totalSpend / selectedHistory.length).toLocaleString() : '0'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-gray-400"/> Visit History
                </h4>
                {selectedHistory.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                    No visits recorded yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedHistory.map(inv => (
                      <div key={inv.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-gray-900">Visit on {format(new Date(inv.date), 'dd MMM yyyy, hh:mm a')}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Served by {inv.staffName}</p>
                          </div>
                          <span className="font-bold text-gray-900 text-lg bg-gray-100 px-3 py-1 rounded-lg">₹{inv.grandTotal.toLocaleString()}</span>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 border border-gray-100">
                          {inv.services?.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium flex items-center"><Scissors className="w-4 h-4 mr-2 text-gray-400"/> Services:</span> 
                              <span className="text-gray-900">{inv.services.map(s => s.name).join(', ')}</span>
                            </div>
                          )}
                          {inv.soldProducts?.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium flex items-center"><Package className="w-4 h-4 mr-2 text-gray-400"/> Retail:</span> 
                              <span className="text-gray-900">{inv.soldProducts.map(p => `${p.name} (x${p.quantity})`).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
