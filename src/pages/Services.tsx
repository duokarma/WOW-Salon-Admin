import React, { useState, useEffect } from 'react';
import { serviceService } from '../lib/serviceService';
import type { SalonService } from '../lib/serviceService';
import { 
  Search, Plus, Scissors, Trash2, Edit2, X, 
  Settings, Activity, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const serviceSchema = z.object({
  service_name: z.string().min(2, "Name is required"),
  category: z.string().min(2, "Category is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  duration: z.number().min(1, "Duration must be positive"),
  status: z.enum(['Active', 'Inactive'])
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function Services() {
  const [services, setServices] = useState<SalonService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<SalonService | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema)
  });

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const data = await serviceService.getServices();
      setServices(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load services');
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAddModal = () => {
    setServiceToEdit(null);
    reset({ service_name: '', category: '', description: '', price: 0, duration: 30, status: 'Active' });
    setIsModalOpen(true);
  };

  const openEditModal = (service: SalonService) => {
    setServiceToEdit(service);
    reset({
      service_name: service.service_name,
      category: service.category,
      description: service.description || '',
      price: service.price,
      duration: service.duration,
      status: service.status
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ServiceFormData) => {
    try {
      if (serviceToEdit) {
        await serviceService.updateService(serviceToEdit.id, data);
        toast.success('Service updated successfully');
      } else {
        await serviceService.addService(data);
        toast.success('Service added successfully');
      }
      setIsModalOpen(false);
      loadServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await serviceService.deleteService(id);
      toast.success('Service deleted successfully');
      loadServices();
    } catch (err: any) {
      toast.error('Failed to delete service');
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.service_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const categories = Array.from(new Set(services.map(s => s.category)));

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Services</h2>
          <p className="text-gray-500 mt-1">Manage your salon's service menu and pricing.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-50 p-3 rounded-xl">
              <Scissors className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Services</dt>
                <dd className="text-2xl font-bold text-gray-900">{services.length}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-emerald-50 p-3 rounded-xl">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Services</dt>
                <dd className="text-2xl font-bold text-gray-900">{services.filter(s => s.status === 'Active').length}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-50 p-3 rounded-xl">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Categories</dt>
                <dd className="text-2xl font-bold text-gray-900">{categories.length}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-gray-900 transition-all">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search services..."
            className="bg-transparent outline-none w-full text-sm text-gray-900 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 shadow-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            Loading services...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-4" />
            <p>{error}</p>
            <button onClick={loadServices} className="mt-4 text-sm font-semibold underline">Try Again</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Service Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price & Duration</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-500">
                      <Scissors className="h-10 w-10 mx-auto mb-4 text-gray-300" />
                      <p className="text-base font-medium text-gray-900">No services found</p>
                    </td>
                  </tr>
                )}
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50/80 transition-colors group bg-white">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{service.service_name}</div>
                      {service.description && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{service.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs">{service.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">₹{service.price.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{service.duration} mins</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${service.status === 'Active' ? 'bg-success/10 text-success border-success/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(service)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(service.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{serviceToEdit ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Service Name *</label>
                  <input type="text" {...register("service_name")} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" placeholder="e.g. Haircut" />
                  {errors.service_name && <p className="text-red-500 text-xs mt-1">{errors.service_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <input type="text" {...register("category")} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" placeholder="e.g. Hair Care" />
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (₹) *</label>
                    <input type="number" {...register("price", { valueAsNumber: true })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (mins) *</label>
                    <input type="number" {...register("duration", { valueAsNumber: true })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" />
                    {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select {...register("status")} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea {...register("description")} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-900" placeholder="Details about the service..."></textarea>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-black disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
