import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Filter, AlertTriangle, Package, ShoppingCart, Scissors, Barcode, X, IndianRupee, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'Master Inventory' | 'Purchased Logs' | 'Sold Products' | 'Service Consumption';

export default function Inventory() {
  const store = useStore();
  const products = store.products;
  const inventoryLogs = store.inventoryLogs || []; // Fallback if undefined during hot reload
  const [activeTab, setActiveTab] = useState<TabType>('Master Inventory');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Stock Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [addCost, setAddCost] = useState('');
  const [addSupplier, setAddSupplier] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Derived metrics
  const lowStockCount = products.filter(p => p.stockQuantity <= p.lowStockThreshold).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.purchasePrice), 0);
  
  const soldLogs = inventoryLogs.filter(log => log.type === 'SALE');
  const consumedLogs = inventoryLogs.filter(log => log.type === 'CONSUMPTION');
  const purchaseLogs = inventoryLogs.filter(log => log.type === 'PURCHASE');

  const totalSoldValue = soldLogs.reduce((sum, log) => sum + ((log.sellingPrice || 0) * log.quantity), 0);
  const totalConsumedValue = consumedLogs.reduce((sum, log) => {
    const product = products.find(p => p.id === log.productId);
    return sum + ((product?.purchasePrice || 0) * log.quantity);
  }, 0);

  const handleOpenAddStock = (id?: string) => {
    setSelectedProductId(id || '');
    setAddQuantity('');
    
    if (id) {
       const product = products.find(p => p.id === id);
       setAddCost(product?.purchasePrice.toString() || '');
       setAddSupplier(product?.supplierName || '');
    } else {
       setAddCost('');
       setAddSupplier('');
    }
    
    setAddNotes('');
    setIsModalOpen(true);
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    
    const qty = parseInt(addQuantity, 10);
    const cost = parseFloat(addCost);
    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const totalCost = cost * qty;

    if (confirm(`Add ${qty} units of ${product.name} to stock? This will record an expense of ₹${totalCost}.`)) {
      // Use the new store action which updates stock, creates a log, and creates an expense
      store.addPurchaseStock(selectedProductId, qty, cost, addSupplier || product.supplierName, addNotes);
      alert('Stock added and Expense recorded successfully!');
      setIsModalOpen(false);
    }
  };

  const filteredProducts = products.filter(item => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return item.name.toLowerCase().includes(lowerSearch) || 
           item.brand.toLowerCase().includes(lowerSearch) || 
           item.supplierName.toLowerCase().includes(lowerSearch);
  });

  return (
    <div className="space-y-8 relative max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-light tracking-tight text-white">Inventory ERP</h2>
          <p className="text-white/50 mt-2 font-light tracking-wide">Track master inventory, purchases, retail sales, and salon consumption.</p>
        </div>
        <button 
          onClick={() => handleOpenAddStock()}
          className="btn-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Stock Purchase
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Total Value</p>
            <p className="text-3xl font-light text-white tracking-tight">₹{totalInventoryValue.toLocaleString()}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-2xl group-hover:bg-success/20 transition-all"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Retail Revenue</p>
            <p className="text-3xl font-light text-success tracking-tight">₹{totalSoldValue.toLocaleString()}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success shadow-[0_0_15px_rgba(34,197,94,0.1)] relative z-10">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
        <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-2xl group-hover:bg-warning/20 transition-all"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Consumption Cost</p>
            <p className="text-3xl font-light text-warning tracking-tight">₹{totalConsumedValue.toLocaleString()}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shadow-[0_0_15px_rgba(234,179,8,0.1)] relative z-10">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </div>
        <div className={`glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-all ${lowStockCount > 0 ? 'border-danger/30' : ''}`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-all ${lowStockCount > 0 ? 'bg-danger/20 group-hover:bg-danger/30' : 'bg-white/5 group-hover:bg-white/10'}`}></div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Low Stock Alerts</p>
            <p className={`text-3xl font-light tracking-tight ${lowStockCount > 0 ? 'text-danger' : 'text-white'}`}>{lowStockCount} <span className="text-sm font-light lowercase text-white/50">items</span></p>
          </div>
          <div className={`h-12 w-12 rounded-full border flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] ${lowStockCount > 0 ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-white/10 border-white/20 text-white/50'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
          {(['Master Inventory', 'Purchased Logs', 'Sold Products', 'Service Consumption'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                activeTab === tab 
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'Master Inventory' && <Package className="w-4 h-4" />}
              {tab === 'Purchased Logs' && <Barcode className="w-4 h-4" />}
              {tab === 'Sold Products' && <ShoppingCart className="w-4 h-4" />}
              {tab === 'Service Consumption' && <Scissors className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </div>
        
        {activeTab === 'Master Inventory' && (
          <div className="flex items-center w-full md:w-auto gap-2">
            <div className="flex items-center bg-white/5 rounded-xl px-4 py-3 border border-white/10 w-full md:w-72 focus-within:border-white/30 transition-all backdrop-blur-md">
              <Search className="h-4 w-4 text-white/40 mr-3" />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="bg-transparent outline-none w-full text-sm placeholder-white/30 text-white font-light tracking-wide" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* MASTER INVENTORY TAB */}
      {activeTab === 'Master Inventory' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-white">
              <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Brand/Category</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-right">Purchase Price</th>
                  <th className="px-6 py-4 text-right">Selling Price</th>
                  <th className="px-6 py-4 text-right">Inventory Value</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map(item => {
                   const isLowStock = item.stockQuantity <= item.lowStockThreshold;
                   return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group font-light">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white text-base">{item.name}</div>
                        <div className="text-xs text-white/50 mt-1 uppercase tracking-wider">{item.supplierName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-white border border-white/10 uppercase tracking-widest">
                          {item.brand}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${item.stockQuantity === 0 ? 'bg-danger/10 text-danger border-danger/20' : isLowStock ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}`}>
                          {item.stockQuantity} {isLowStock && <AlertTriangle className="w-3 h-3 ml-1" />}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-white">₹{item.purchasePrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-white">₹{item.sellingPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-medium text-white">₹{(item.stockQuantity * item.purchasePrice).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleOpenAddStock(item.id)}
                          className="text-white/50 font-bold hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs tracking-wide"
                        >
                          + Add Stock
                        </button>
                      </td>
                    </tr>
                   );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-white/50 font-light text-lg">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PURCHASED LOGS TAB */}
      {activeTab === 'Purchased Logs' && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-black/20">
            <h3 className="font-light tracking-wide text-white flex items-center text-xl"><Barcode className="w-5 h-5 mr-3 text-white/50"/> Recent Purchases (Stock In)</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-white">
              <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-right">Cost Price</th>
                  <th className="px-6 py-4 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {purchaseLogs.slice().reverse().map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors font-light">
                    <td className="px-6 py-4 whitespace-nowrap text-white/70">{format(new Date(log.date), 'dd MMM yyyy, hh:mm a')}</td>
                    <td className="px-6 py-4 font-medium text-white">{log.productName}</td>
                    <td className="px-6 py-4 text-white/50 uppercase text-xs tracking-wider">{log.supplierName || '-'}</td>
                    <td className="px-6 py-4 text-center font-bold text-white">+{log.quantity}</td>
                    <td className="px-6 py-4 text-right text-white">₹{log.costPrice?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-danger">₹{((log.costPrice || 0) * log.quantity).toLocaleString()}</td>
                  </tr>
                ))}
                {purchaseLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-white/50 font-light text-lg">No purchase logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SOLD PRODUCTS TAB */}
      {activeTab === 'Sold Products' && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-black/20">
            <h3 className="font-light tracking-wide text-white flex items-center text-xl"><ShoppingCart className="w-5 h-5 mr-3 text-success"/> Retail Sales (Stock Out)</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-white">
              <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-right">Selling Price</th>
                  <th className="px-6 py-4 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {soldLogs.slice().reverse().map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors font-light">
                    <td className="px-6 py-4 whitespace-nowrap text-white/70">{format(new Date(log.date), 'dd MMM yyyy, hh:mm a')}</td>
                    <td className="px-6 py-4 font-medium text-white">{log.productName}</td>
                    <td className="px-6 py-4 text-white/50">
                       <span className="text-white">{log.customerName}</span>
                       {log.visitId && <span className="block text-[10px] mt-1 text-white/30 uppercase tracking-widest">Visit #{log.visitId.split('_')[1] || log.visitId.substring(0, 8)}</span>}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-white">-{log.quantity}</td>
                    <td className="px-6 py-4 text-right text-white">₹{log.sellingPrice?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-success">₹{((log.sellingPrice || 0) * log.quantity).toLocaleString()}</td>
                  </tr>
                ))}
                {soldLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-white/50 font-light text-lg">No retail sales logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SERVICE CONSUMPTION TAB */}
      {activeTab === 'Service Consumption' && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-black/20">
            <h3 className="font-light tracking-wide text-white flex items-center text-xl"><Scissors className="w-5 h-5 mr-3 text-warning"/> Internal Service Consumption (Stock Out)</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-white">
              <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product Used</th>
                  <th className="px-6 py-4">Used On (Customer)</th>
                  <th className="px-6 py-4 text-center">Quantity Deducted</th>
                  <th className="px-6 py-4 text-right">Internal Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {consumedLogs.slice().reverse().map(log => {
                   const p = products.find(prod => prod.id === log.productId);
                   const costValue = (p?.purchasePrice || 0) * log.quantity;
                   return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors font-light">
                      <td className="px-6 py-4 whitespace-nowrap text-white/70">{format(new Date(log.date), 'dd MMM yyyy, hh:mm a')}</td>
                      <td className="px-6 py-4 font-medium text-white">{log.productName}</td>
                      <td className="px-6 py-4 text-white/50">
                         <span className="text-white">{log.customerName}</span>
                         {log.visitId && <span className="block text-[10px] mt-1 text-white/30 uppercase tracking-widest">Visit #{log.visitId.split('_')[1] || log.visitId.substring(0, 8)}</span>}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-white">-{log.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-warning">₹{costValue.toLocaleString()}</td>
                    </tr>
                   );
                })}
                {consumedLogs.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-16 text-white/50 font-light text-lg">No consumption logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-black/20">
              <h3 className="text-xl font-light tracking-tight text-white">Restock Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Select Product *</label>
                <select 
                  required 
                  value={selectedProductId || ''} 
                  onChange={e => {
                     const id = e.target.value;
                     setSelectedProductId(id);
                     const p = products.find(prod => prod.id === id);
                     if (p) {
                       setAddCost(p.purchasePrice.toString());
                       setAddSupplier(p.supplierName);
                     }
                  }} 
                  className="glass-input w-full px-4 py-3 appearance-none"
                >
                  <option value="" className="bg-black">-- Choose Product --</option>
                  {products.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name} (Stock: {p.stockQuantity})</option>)}
                </select>
              </div>

              {selectedProductId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Quantity *</label>
                      <input 
                        type="number" 
                        required 
                        min="1" 
                        value={addQuantity} 
                        onChange={e => setAddQuantity(e.target.value)} 
                        className="glass-input w-full px-4 py-3" 
                        placeholder="E.g., 10" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Cost / Unit (₹) *</label>
                      <input 
                        type="number" 
                        required 
                        min="0" 
                        step="0.01"
                        value={addCost} 
                        onChange={e => setAddCost(e.target.value)} 
                        className="glass-input w-full px-4 py-3" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-widest text-white/50 uppercase mb-2">Supplier</label>
                    <input 
                      type="text" 
                      value={addSupplier} 
                      onChange={e => setAddSupplier(e.target.value)} 
                      className="glass-input w-full px-4 py-3" 
                      placeholder="Supplier Name" 
                    />
                  </div>

                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-light text-white/50 text-sm tracking-wide">Total Expense Cost:</span>
                      <span className="text-xl font-light text-danger tracking-tight">₹{((parseFloat(addCost) || 0) * (parseInt(addQuantity, 10) || 0)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="btn-primary w-full justify-center py-4 text-base">
                      Confirm Purchase
                    </button>
                    <p className="text-[10px] text-center text-white/30 uppercase tracking-widest mt-3">This will automatically record an expense and add stock.</p>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
