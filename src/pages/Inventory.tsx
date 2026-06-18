import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    purchase_price: 0,
    selling_price: 0,
    purchased_quantity: 0,
    sold_quantity: 0,
    salon_consumption: 0,
    current_stock: 0
  });

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openAddModal = () => {
    setProductToEdit(null);
    setFormData({ name: '', purchase_price: 0, selling_price: 0, purchased_quantity: 0, sold_quantity: 0, salon_consumption: 0, current_stock: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setProductToEdit(product);
    setFormData({
      name: product.name,
      purchase_price: product.purchase_price || 0,
      selling_price: product.selling_price || 0,
      purchased_quantity: product.purchased_quantity || 0,
      sold_quantity: product.sold_quantity || 0,
      salon_consumption: product.salon_consumption || 0,
      current_stock: product.current_stock || 0
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Product name is required');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        purchased_quantity: Number(formData.purchased_quantity),
        sold_quantity: Number(formData.sold_quantity),
        salon_consumption: Number(formData.salon_consumption),
        current_stock: Number(formData.current_stock)
      };

      if (productToEdit) {
        const { error } = await supabase.from('products').update(payload).eq('id', productToEdit.id);
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        toast.success('Product added successfully');
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (err: any) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 relative max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white">Inventory</h2>
          <p className="text-white/50 mt-2 font-light tracking-wide">Manage your product stock quantities directly.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="flex items-center w-full max-w-md glass-panel px-4 py-3 focus-within:ring-1 focus-within:ring-white/30 transition-all">
        <Search className="h-5 w-5 text-white/40 mr-3" />
        <input
          type="text"
          placeholder="Search products by name..."
          className="bg-transparent outline-none w-full text-sm text-white placeholder-white/40"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            Loading inventory...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-danger">
            <p>{error}</p>
            <button onClick={loadProducts} className="mt-4 text-sm font-semibold underline text-white">Try Again</button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-white">
              <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-5">Product Name</th>
                  <th className="px-6 py-5 text-center">Cost</th>
                  <th className="px-6 py-5 text-center">Price</th>
                  <th className="px-6 py-5 text-center">Purchased Qty</th>
                  <th className="px-6 py-5 text-center">Sold Qty</th>
                  <th className="px-6 py-5 text-center">Salon Consumption</th>
                  <th className="px-6 py-5 text-center">Current Stock</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-white/50">
                      <Package className="h-10 w-10 mx-auto mb-4 text-white/30" />
                      <p className="text-base font-light tracking-wide text-white">No products found</p>
                    </td>
                  </tr>
                )}
                {filteredProducts.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group font-light">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white text-base">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-white/70">₹{item.purchase_price || 0}</td>
                    <td className="px-6 py-4 text-center text-white/70">₹{item.selling_price || 0}</td>
                    <td className="px-6 py-4 text-center text-white/70">{item.purchased_quantity}</td>
                    <td className="px-6 py-4 text-center text-white/70">{item.sold_quantity}</td>
                    <td className="px-6 py-4 text-center text-white/70">{item.salon_consumption}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold border ${item.current_stock === 0 ? 'bg-danger/10 text-danger border-danger/20' : 'bg-success/10 text-success border-success/20'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(item)} className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-light tracking-tight text-white">{productToEdit ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Product Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="glass-input w-full px-4 py-3" placeholder="e.g. L'Oreal Shampoo" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Purchase Price (Cost)</label>
                    <input type="number" min="0" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})} className="glass-input w-full px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Selling Price</label>
                    <input type="number" min="0" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: Number(e.target.value)})} className="glass-input w-full px-4 py-3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Purchased Qty</label>
                    <input type="number" min="0" value={formData.purchased_quantity} onChange={e => setFormData({...formData, purchased_quantity: Number(e.target.value)})} className="glass-input w-full px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Sold Qty</label>
                    <input type="number" min="0" value={formData.sold_quantity} onChange={e => setFormData({...formData, sold_quantity: Number(e.target.value)})} className="glass-input w-full px-4 py-3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Salon Consumption</label>
                    <input type="number" min="0" value={formData.salon_consumption} onChange={e => setFormData({...formData, salon_consumption: Number(e.target.value)})} className="glass-input w-full px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Current Stock</label>
                    <input type="number" min="0" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: Number(e.target.value)})} className="glass-input w-full px-4 py-3" />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-black/20 rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{productToEdit ? 'Save Changes' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
