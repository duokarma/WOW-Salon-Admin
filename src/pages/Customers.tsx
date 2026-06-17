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
  dob: z.string().optional(),
  services_taken: z.string().optional(),
  amountPaid: z.string().optional()
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
    reset({ name: '', phone: '', dob: '', services_taken: '', amountPaid: '' });
    setIsCustomerModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setCustomerToEdit(customer);
    reset({
      name: customer.name,
      phone: customer.phone,
      dob: customer.dob || '',
      services_taken: customer.services_taken ? customer.services_taken.join(', ') : '',
      amountPaid: customer.amountPaid ? customer.amountPaid.toString() : ''
    });
    setIsCustomerModalOpen(true);
  };

  const onSubmitCustomer = async (data: CustomerFormData) => {
    try {
      const parsedData = {
        name: data.name,
        phone: data.phone,
        dob: data.dob,
        services_taken: data.services_taken ? data.services_taken.split(',').map(s => s.trim()).filter(Boolean) : [],
        amountPaid: data.amountPaid ? Number(data.amountPaid) : 0
      };

      if (customerToEdit) {
        const updated = await customerService.updateCustomer(customerToEdit.id, parsedData);
        store.updateCustomer(updated.id, updated);
        toast.success('Customer updated successfully');
      } else {
        const newCust = await customerService.addCustomer(parsedData);
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

      // Update Customer arrays (services_taken, staff_served)
      const currentServices = customerForVisit.services_taken || [];
      const currentStaff = customerForVisit.staff_served || [];
      const newServices = [...new Set([...currentServices, ...vServicesData.map(vs => vs.service_name)])];
      const newStaffList = [...new Set([...currentStaff, staff.find(s => s.id === visitStaffId)?.name || ''])].filter(Boolean);

      await customerService.updateCustomer(customerForVisit.id, {
        services_taken: newServices,
        staff_served: newStaffList
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
  
  // Compute totals from visits
  const totalRevenue = visits.reduce((sum, v) => sum + (v.grand_total || 0), 0);
  const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const selectedCustomer = customers.find(c => c.id === selectedCustomerForHistory);

  const getCustomerTotalSpend = (customerId: number) => {
    return visits.filter(v => v.customer_id === customerId).reduce((sum, v) => sum + (v.grand_total || 0), 0);
  };
  const getCustomerVisitCount = (customerId: number) => {
    return visits.filter(v => v.customer_id === customerId).length;
  };

  return (
    <div className="space-y-8 relative max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white">Customers</h2>
          <p className="text-white/50 mt-2 font-light tracking-wide">Manage your client relationships and view their history.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="btn-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/10 p-3 rounded-2xl border border-white/20">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">Total Customers</dt>
                <dd className="text-3xl font-light text-white mt-1">{totalCustomers}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/10 p-3 rounded-2xl border border-white/20">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">New This Month</dt>
                <dd className="text-3xl font-light text-white mt-1">{newThisMonth}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/10 p-3 rounded-2xl border border-white/20">
              <IndianRupee className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">Lifetime Revenue</dt>
                <dd className="text-3xl font-light text-white mt-1">₹{totalRevenue.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/10 p-3 rounded-2xl border border-white/20">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">Average Spend</dt>
                <dd className="text-3xl font-light text-white mt-1">₹{Math.round(avgSpend).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center w-full max-w-md glass-panel px-4 py-3 focus-within:ring-1 focus-within:ring-white/30 transition-all">
        <Search className="h-5 w-5 text-white/40 mr-3" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="bg-transparent outline-none w-full text-sm text-white placeholder-white/40"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            Loading customers...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-danger">
            <p>{error}</p>
            <button onClick={loadData} className="mt-4 text-sm font-semibold underline text-white">Try Again</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-white">
              <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-5">Customer</th>
                  <th className="px-6 py-5">Contact</th>
                  <th className="px-6 py-5">Lifetime Spend</th>
                  <th className="px-6 py-5">Visits</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-white/50">
                      <User className="h-10 w-10 mx-auto mb-4 text-white/30" />
                      <p className="text-base font-light tracking-wide text-white">No customers found</p>
                    </td>
                  </tr>
                )}
                {filteredCustomers.map((customer) => {
                  const initials = customer.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  
                  return (
                    <tr key={customer.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="h-11 w-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-white text-base">{customer.name}</div>
                            {customer.dob && <div className="text-xs text-white/50 mt-1 uppercase tracking-wide">DOB: {format(new Date(customer.dob), 'dd MMM yyyy')}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-white/70 font-light">
                        {customer.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-light text-white text-lg">
                          ₹{getCustomerTotalSpend(customer.id).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10">
                          {getCustomerVisitCount(customer.id)} visits
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openVisitModal(customer)}
                            className="px-4 py-2 text-xs font-bold bg-white text-black hover:bg-gray-200 rounded-xl transition-colors flex items-center shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          >
                            <Plus className="w-3 h-3 mr-1.5" /> Record Visit
                          </button>
                          <button onClick={() => setSelectedCustomerForHistory(customer.id)} className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors">
                            <CalendarIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(customer)} className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(customer.id)} className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-light tracking-tight text-white">{customerToEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitCustomer)} className="flex flex-col flex-1">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Full Name *</label>
                  <input type="text" {...register("name")} className="glass-input w-full px-4 py-3" placeholder="e.g. Jane Doe" />
                  {errors.name && <p className="text-danger text-xs mt-1.5">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Phone Number *</label>
                  <input type="tel" {...register("phone")} className="glass-input w-full px-4 py-3" placeholder="e.g. 9876543210" />
                  {errors.phone && <p className="text-danger text-xs mt-1.5">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Date of Birth</label>
                  <input type="date" {...register("dob")} className="glass-input w-full px-4 py-3" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Services Taken</label>
                  <input type="text" {...register("services_taken")} className="glass-input w-full px-4 py-3" placeholder="e.g. Haircut, Spa" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Amount Paid (₹)</label>
                  <input type="number" {...register("amountPaid")} className="glass-input w-full px-4 py-3" placeholder="e.g. 500" />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-black/20 rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
                  {customerToEdit ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Visit Modal */}
      {isVisitModalOpen && customerForVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-black/20 rounded-t-2xl">
              <div>
                <h3 className="text-2xl font-light tracking-tight text-white">Record Visit</h3>
                <p className="text-sm font-light text-white/50 mt-1 tracking-wide">for {customerForVisit.name}</p>
              </div>
              <button onClick={() => setIsVisitModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X className="w-6 h-6"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              {/* Staff Selection */}
              <div>
                <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-3">Select Staff Member *</label>
                <select 
                  value={visitStaffId} 
                  onChange={(e) => setVisitStaffId(e.target.value)}
                  className="glass-input w-full px-4 py-3.5 appearance-none"
                >
                  <option value="" className="bg-black">-- Choose Staff --</option>
                  {staff.map(s => <option key={s.id} value={s.id} className="bg-black">{s.name || s.staff_name}</option>)}
                </select>
              </div>

              {/* Services Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase">Services Taken *</label>
                  <button onClick={() => setVisitServices([...visitServices, {serviceId: ''}])} className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
                    + Add Service
                  </button>
                </div>
                {visitServices.length === 0 ? (
                  <div className="text-sm text-white/30 font-light italic p-6 bg-white/5 rounded-2xl border border-dashed border-white/20 text-center">No services added. Click above to add.</div>
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
                          className="glass-input flex-1 px-4 py-3 appearance-none"
                        >
                          <option value="" className="bg-black">-- Select Service --</option>
                          {Object.entries(groupedServices).map(([category, items]) => (
                            <optgroup key={category} label={category} className="bg-black text-white/50">
                              {items.map(s => <option key={s.id} value={s.id} className="text-white bg-black">{s.service_name} - ₹{s.price}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <button onClick={() => setVisitServices(visitServices.filter((_, i) => i !== idx))} className="p-3 text-danger hover:bg-danger/20 rounded-xl bg-danger/10 border border-danger/20 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Products Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase">Products Purchased</label>
                  <button onClick={() => setVisitProducts([...visitProducts, {productId: '', quantity: 1}])} className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
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
                          className="glass-input flex-1 px-4 py-3 appearance-none"
                        >
                          <option value="" className="bg-black">-- Select Product --</option>
                          {products.map(p => <option key={p.id} value={p.id} className="bg-black">{(p.name || '').substring(0,40)} - ₹{p.selling_price || p.sellingPrice || 0}</option>)}
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
                          className="glass-input w-24 px-3 py-3 text-center"
                        />
                        <button onClick={() => setVisitProducts(visitProducts.filter((_, i) => i !== idx))} className="p-3 text-danger hover:bg-danger/20 rounded-xl bg-danger/10 border border-danger/20 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Summary */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-center text-sm font-bold text-white relative z-10">
                  <span className="tracking-wide uppercase text-white/70">Grand Total</span>
                  <span className="text-3xl font-light tracking-tight">
                    ₹{
                      visitServices.reduce((sum, vs) => sum + Number(services.find(s => s.id === vs.serviceId)?.price || 0), 0) +
                      visitProducts.reduce((sum, vp) => sum + (Number(products.find(p => p.id === vp.productId)?.selling_price || products.find(p => p.id === vp.productId)?.sellingPrice || 0) * vp.quantity), 0)
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-black/40 rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsVisitModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={submitVisit} className="btn-primary">Save Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile History Modal */}
      {selectedCustomerForHistory && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between p-8 border-b border-white/10 bg-black/20 shrink-0">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-3xl font-light tracking-tight text-white">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-white/50 tracking-wide uppercase">
                    <span className="flex items-center"><User className="w-4 h-4 mr-2"/> {selectedCustomer.phone}</span>
                    {selectedCustomer.dob && <span>DOB: {format(new Date(selectedCustomer.dob), 'dd MMM yyyy')}</span>}
                    <span>Joined {format(new Date(selectedCustomer.createdAt), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomerForHistory(null)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X className="w-6 h-6"/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-transparent custom-scrollbar">
              <div className="grid md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">Total Visits</p>
                  <p className="text-3xl font-light text-white mt-2">{selectedHistory.length}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">Lifetime Spend</p>
                  <p className="text-3xl font-light text-white mt-2">₹{getCustomerTotalSpend(selectedCustomer.id).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-xs font-bold tracking-[0.1em] text-white/50 uppercase">Average Spend</p>
                  <p className="text-3xl font-light text-white mt-2">
                    ₹{selectedHistory.length > 0 ? Math.round(getCustomerTotalSpend(selectedCustomer.id) / selectedHistory.length).toLocaleString() : '0'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-light tracking-tight text-white mb-6 flex items-center">
                  <Receipt className="w-5 h-5 mr-3 text-white/50"/> Visit History
                </h4>
                {selectedHistory.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-white/50 font-light">
                    No visits recorded yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedHistory.map(v => (
                      <div key={v.id} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <p className="text-lg font-medium text-white">Visit on {format(new Date(v.visit_date), 'dd MMM yyyy, hh:mm a')}</p>
                            <p className="text-sm font-light text-white/50 mt-1 tracking-wide">
                              Served by {staff.find(s => s.id === v.staff_id)?.name || staff.find(s => s.id === v.staff_id)?.staff_name || 'Unknown'}
                            </p>
                          </div>
                          <span className="font-light text-white text-2xl bg-white/10 border border-white/10 px-4 py-1.5 rounded-xl">₹{(v.grand_total || 0).toLocaleString()}</span>
                        </div>
                        
                        <div className="bg-black/20 rounded-xl p-5 text-sm space-y-3 border border-white/5">
                          {v.visit_services?.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                              <span className="text-white/50 font-bold tracking-widest uppercase text-xs flex items-center"><Scissors className="w-3.5 h-3.5 mr-2"/> Services:</span> 
                              <span className="text-white font-light">{v.visit_services.map((s: any) => s.service_name).join(', ')}</span>
                            </div>
                          )}
                          {v.visit_products?.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mt-3">
                              <span className="text-white/50 font-bold tracking-widest uppercase text-xs flex items-center"><Package className="w-3.5 h-3.5 mr-2"/> Products:</span> 
                              <span className="text-white font-light">{v.visit_products.map((p: any) => `${p.product_name} (x${p.quantity})`).join(', ')}</span>
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
