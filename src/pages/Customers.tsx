import React, { useState, useEffect } from 'react';
import { customerService } from '../lib/customerService';
import { useStore } from '../store/useStore';
import type { Customer } from '../types';
import { 
  Search, Plus, User, Scissors, Receipt, Package,
  Trash2, Edit2, X, Users, UserPlus, IndianRupee, TrendingUp, Calendar as CalendarIcon
} from 'lucide-react';
import { format, isThisMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { serviceService } from '../lib/serviceService';
import type { SalonService } from '../lib/serviceService';

const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  dob: z.string().optional()
});
type CustomerFormData = z.infer<typeof customerSchema>;

export default function Customers() {
  const store = useStore();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<number | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);

  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [customerForVisit, setCustomerForVisit] = useState<Customer | null>(null);

  // Visit Form State
  const [visitServices, setVisitServices] = useState<{serviceId: string}[]>([]);
  const [visitProducts, setVisitProducts] = useState<{productId: string, quantity: number}[]>([]);
  const [visitStaffId, setVisitStaffId] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema)
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [custData, srvData, stfRes, prodRes, visitRes] = await Promise.all([
        customerService.getCustomers(),
        serviceService.getServices(),
        supabase.from('staff').select('*'),
        supabase.from('products').select('*'),
        supabase.from('customer_visits').select(`
          *,
          visit_services(*),
          visit_products(*)
        `)
      ]);
      setCustomers(custData);
      setServices(srvData);
      if (stfRes.data) setStaff(stfRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (visitRes.data) setVisits(visitRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCustomerForHistory) {
      const history = visits.filter(v => v.customer_id === selectedCustomerForHistory).sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
      setSelectedHistory(history);
    }
  }, [selectedCustomerForHistory, visits]);

  const openAddModal = () => {
    setCustomerToEdit(null);
    reset({ name: '', phone: '', dob: '' });
    setIsCustomerModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setCustomerToEdit(customer);
    reset({
      name: customer.name,
      phone: customer.phone,
      dob: customer.dob || ''
    });
    setIsCustomerModalOpen(true);
  };

  const onSubmitCustomer = async (data: CustomerFormData) => {
    try {
      if (customerToEdit) {
        const updated = await customerService.updateCustomer(customerToEdit.id, data);
        store.updateCustomer(updated.id, updated);
        toast.success('Customer updated successfully');
      } else {
        const newCust = await customerService.addCustomer(data);
        store.addCustomer(newCust);
        toast.success('Customer added successfully');
      }
      setIsCustomerModalOpen(false);
      loadData();
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
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete customer');
    }
  };

  // --- Record Visit Logic ---
  const openVisitModal = (customer: Customer) => {
    setCustomerForVisit(customer);
    setVisitServices([]);
    setVisitProducts([]);
    setVisitStaffId('');
    setIsVisitModalOpen(true);
  };

  const submitVisit = async () => {
    if (!customerForVisit) return;
    if (visitServices.length === 0) {
      toast.error("Please select at least one service");
      return;
    }
    if (!visitStaffId) {
      toast.error("Please select a staff member");
      return;
    }

    try {
      // Calculate totals
      let serviceTotal = 0;
      const vServicesData = visitServices.map(vs => {
        const s = services.find(x => x.id === vs.serviceId)!;
        serviceTotal += Number(s.price);
        return { service_id: s.id, service_name: s.service_name, price: Number(s.price) };
      });

      let productTotal = 0;
      const vProductsData = visitProducts.map(vp => {
        const p = products.find(x => x.id === vp.productId)!;
        const linePrice = Number(p.selling_price || p.sellingPrice || 0) * vp.quantity;
        productTotal += linePrice;
        return { product_id: p.id, product_name: p.name, quantity: vp.quantity, price: linePrice };
      });

      const grandTotal = serviceTotal + productTotal;
      const commissionAmount = serviceTotal * 0.10; // 10% of services only

      // Insert Visit
      const { data: visitData, error: visitErr } = await supabase.from('customer_visits').insert([{
        customer_id: customerForVisit.id,
        service_total: serviceTotal,
        product_total: productTotal,
        grand_total: grandTotal,
        staff_id: visitStaffId
      }]).select().single();

      if (visitErr) throw visitErr;

      const visitId = visitData.id;

      // Insert Visit Services
      if (vServicesData.length > 0) {
        await supabase.from('visit_services').insert(
          vServicesData.map(vs => ({ visit_id: visitId, ...vs }))
        );
      }

      // Insert Visit Products and deduct inventory
      if (vProductsData.length > 0) {
        await supabase.from('visit_products').insert(
          vProductsData.map(vp => ({ visit_id: visitId, ...vp }))
        );
        for (const vp of vProductsData) {
          const p = products.find(x => x.id === vp.product_id)!;
          const newQty = (Number(p.stock_quantity || p.stockQuantity) || 0) - vp.quantity;
          await supabase.from('products').update({ stock_quantity: newQty }).eq('id', p.id);
        }
      }

      // Insert Commission
      await supabase.from('staff_commissions').insert([{
        staff_id: visitStaffId,
        visit_id: visitId,
        service_amount: serviceTotal,
        commission_amount: commissionAmount
      }]);

      // Update Customer lifetime stats
      await customerService.updateCustomer(customerForVisit.id, {
        totalSpend: (customerForVisit.totalSpend || 0) + grandTotal,
        visitCount: (customerForVisit.visitCount || 0) + 1,
        lastServiceDate: new Date().toISOString()
      });

      toast.success('Visit recorded successfully!');
      setIsVisitModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to record visit');
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
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);
  const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const selectedCustomer = customers.find(c => c.id === selectedCustomerForHistory);

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Customers</h2>
          <p className="text-gray-500 mt-1">Manage your client relationships and view their history.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
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
                <dd className="text-2xl font-bold text-gray-900">{totalCustomers}</dd>
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
                <dd className="text-2xl font-bold text-gray-900">{newThisMonth}</dd>
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
                <dd className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</dd>
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
                <dd className="text-2xl font-bold text-gray-900">₹{Math.round(avgSpend).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center w-full max-w-md bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-gray-900 transition-all">
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
            <button onClick={loadData} className="mt-4 text-sm font-semibold underline">Try Again</button>
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
                      <User className="h-10 w-10 mx-auto mb-4 text-gray-300" />
                      <p className="text-base font-medium text-gray-900">No customers found</p>
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
                            onClick={() => openVisitModal(customer)}
                            className="px-3 py-1.5 text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center shadow-sm"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Record Visit
                          </button>
                          <button onClick={() => setSelectedCustomerForHistory(customer.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <CalendarIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(customer)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(customer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Add/Edit Customer Modal (No Billing) */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{customerToEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitCustomer)} className="flex flex-col flex-1">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input type="text" {...register("name")} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" placeholder="e.g. Jane Doe" />
                  {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                  <input type="tel" {...register("phone")} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" placeholder="e.g. 9876543210" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" {...register("dob")} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl disabled:opacity-50 flex items-center">
                  {customerToEdit ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Visit Modal */}
      {isVisitModalOpen && customerForVisit && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Record Visit</h3>
                <p className="text-sm text-gray-500 mt-1">for {customerForVisit.name}</p>
              </div>
              <button onClick={() => setIsVisitModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Select Staff Member *</label>
                <select 
                  value={visitStaffId} 
                  onChange={(e) => setVisitStaffId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50"
                >
                  <option value="">-- Choose Staff --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name || s.staff_name}</option>)}
                </select>
              </div>

              {/* Services Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-900">Services Taken *</label>
                  <button onClick={() => setVisitServices([...visitServices, {serviceId: ''}])} className="text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md">
                    + Add Service
                  </button>
                </div>
                {visitServices.length === 0 ? (
                  <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">No services added. Click above to add.</div>
                ) : (
                  <div className="space-y-3">
                    {visitServices.map((vs, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <select 
                          value={vs.serviceId} 
                          onChange={(e) => {
                            const newSvcs = [...visitServices];
                            newSvcs[idx].serviceId = e.target.value;
                            setVisitServices(newSvcs);
                          }}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                        >
                          <option value="">-- Select Service --</option>
                          {Object.entries(groupedServices).map(([category, items]) => (
                            <optgroup key={category} label={category}>
                              {items.map(s => <option key={s.id} value={s.id}>{s.service_name} - ₹{s.price}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <button onClick={() => setVisitServices(visitServices.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Products Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-900">Products Purchased (Optional)</label>
                  <button onClick={() => setVisitProducts([...visitProducts, {productId: '', quantity: 1}])} className="text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md">
                    + Add Product
                  </button>
                </div>
                {visitProducts.length > 0 && (
                  <div className="space-y-3">
                    {visitProducts.map((vp, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <select 
                          value={vp.productId} 
                          onChange={(e) => {
                            const newProds = [...visitProducts];
                            newProds[idx].productId = e.target.value;
                            setVisitProducts(newProds);
                          }}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.selling_price || p.sellingPrice || 0}</option>)}
                        </select>
                        <input 
                          type="number" 
                          min="1" 
                          value={vp.quantity} 
                          onChange={(e) => {
                            const newProds = [...visitProducts];
                            newProds[idx].quantity = parseInt(e.target.value) || 1;
                            setVisitProducts(newProds);
                          }}
                          className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-center outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <button onClick={() => setVisitProducts(visitProducts.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>Grand Total (Auto-calculated)</span>
                  <span className="text-lg">
                    ₹{
                      visitServices.reduce((sum, vs) => sum + Number(services.find(s => s.id === vs.serviceId)?.price || 0), 0) +
                      visitProducts.reduce((sum, vp) => sum + (Number(products.find(p => p.id === vp.productId)?.selling_price || products.find(p => p.id === vp.productId)?.sellingPrice || 0) * vp.quantity), 0)
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsVisitModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={submitVisit} className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl">Save Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile History Modal */}
      {selectedCustomerForHistory && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="flex items-start justify-between p-8 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-xl shrink-0">
                  {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5 text-sm text-gray-500">
                    <span className="flex items-center"><User className="w-4 h-4 mr-1.5"/> {selectedCustomer.phone}</span>
                    {selectedCustomer.dob && <span>DOB: {format(new Date(selectedCustomer.dob), 'dd MMM yyyy')}</span>}
                    <span>Joined {format(new Date(selectedCustomer.createdAt), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomerForHistory(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
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
                  <p className="text-sm font-medium text-gray-500">Average Spend</p>
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
                    {selectedHistory.map(v => (
                      <div key={v.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-gray-900">Visit on {format(new Date(v.visit_date), 'dd MMM yyyy, hh:mm a')}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              Served by {staff.find(s => s.id === v.staff_id)?.name || staff.find(s => s.id === v.staff_id)?.staff_name || 'Unknown'}
                            </p>
                          </div>
                          <span className="font-bold text-gray-900 text-lg bg-gray-100 px-3 py-1 rounded-lg">₹{(v.grand_total || 0).toLocaleString()}</span>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 border border-gray-100">
                          {v.visit_services?.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium flex items-center"><Scissors className="w-4 h-4 mr-2 text-gray-400"/> Services:</span> 
                              <span className="text-gray-900">{v.visit_services.map((s: any) => s.service_name).join(', ')}</span>
                            </div>
                          )}
                          {v.visit_products?.length > 0 && (
                            <div className="flex justify-between mt-2">
                              <span className="text-gray-600 font-medium flex items-center"><Package className="w-4 h-4 mr-2 text-gray-400"/> Products:</span> 
                              <span className="text-gray-900">{v.visit_products.map((p: any) => `${p.product_name} (x${p.quantity})`).join(', ')}</span>
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
