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
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Inventory ERP</h2>
          <p className="text-gray-500 mt-1">Track master inventory, purchases, retail sales, and salon consumption.</p>
        </div>
        <button 
          onClick={() => handleOpenAddStock()}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Stock Purchase
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="glass-card p-6 flex items-center justify-between bg-white border border-gray-200">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalInventoryValue.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
        <div className="glass-card p-6 flex items-center justify-between bg-white border border-gray-200">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Retail Revenue</p>
            <p className="text-2xl font-bold text-success">₹{totalSoldValue.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
        <div className="glass-card p-6 flex items-center justify-between bg-white border border-gray-200">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Consumption Cost</p>
            <p className="text-2xl font-bold text-warning">₹{totalConsumedValue.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </div>
        <div className={`glass-card p-6 flex items-center justify-between bg-white border ${lowStockCount > 0 ? 'border-danger/50 bg-danger/5 shadow-sm' : 'border-gray-200'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Low Stock Alerts</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-danger' : 'text-gray-900'}`}>{lowStockCount} <span className="text-sm font-medium lowercase text-gray-500">items</span></p>
          </div>
          <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${lowStockCount > 0 ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-1 w-full md:w-auto p-1 bg-gray-100 border border-gray-200 rounded-xl shadow-sm">
          {(['Master Inventory', 'Purchased Logs', 'Sold Products', 'Service Consumption'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
            <div className="flex items-center bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200 w-full md:w-64 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500 transition-all">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="bg-transparent outline-none w-full text-sm placeholder-gray-400 text-gray-900" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* MASTER INVENTORY TAB */}
      {activeTab === 'Master Inventory' && (
        <div className="glass-card bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
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
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(item => {
                   const isLowStock = item.stockQuantity <= item.lowStockThreshold;
                   return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.supplierName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase">
                          {item.brand}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border ${item.stockQuantity === 0 ? 'bg-danger/10 text-danger border-danger/20' : isLowStock ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}`}>
                          {item.stockQuantity} {isLowStock && <AlertTriangle className="w-3 h-3 ml-1" />}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">₹{item.purchasePrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">₹{item.sellingPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">₹{(item.stockQuantity * item.purchasePrice).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleOpenAddStock(item.id)}
                          className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
                        >
                          + Add Stock
                        </button>
                      </td>
                    </tr>
                   );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PURCHASED LOGS TAB */}
      {activeTab === 'Purchased Logs' && (
        <div className="glass-card bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center"><Barcode className="w-4 h-4 mr-2 text-gray-500"/> Recent Purchases (Stock In)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-right">Cost Price</th>
                  <th className="px-6 py-4 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseLogs.slice().reverse().map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{format(new Date(log.date), 'dd MMM yyyy, hh:mm a')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{log.productName}</td>
                    <td className="px-6 py-4 text-gray-500">{log.supplierName || '-'}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">+{log.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-900">₹{log.costPrice?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-danger">₹{((log.costPrice || 0) * log.quantity).toLocaleString()}</td>
                  </tr>
                ))}
                {purchaseLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">No purchase logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SOLD PRODUCTS TAB */}
      {activeTab === 'Sold Products' && (
        <div className="glass-card bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center"><ShoppingCart className="w-4 h-4 mr-2 text-success"/> Retail Sales (Stock Out)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-right">Selling Price</th>
                  <th className="px-6 py-4 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {soldLogs.slice().reverse().map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{format(new Date(log.date), 'dd MMM yyyy, hh:mm a')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{log.productName}</td>
                    <td className="px-6 py-4 text-gray-500">
                       {log.customerName}
                       {log.invoiceId && <span className="block text-xs mt-0.5 text-gray-400">Inv #{log.invoiceId.split('_')[1]}</span>}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900">-{log.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-900">₹{log.sellingPrice?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-success">₹{((log.sellingPrice || 0) * log.quantity).toLocaleString()}</td>
                  </tr>
                ))}
                {soldLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">No retail sales logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SERVICE CONSUMPTION TAB */}
      {activeTab === 'Service Consumption' && (
        <div className="glass-card bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center"><Scissors className="w-4 h-4 mr-2 text-warning"/> Internal Service Consumption (Stock Out)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product Used</th>
                  <th className="px-6 py-4">Used On (Customer)</th>
                  <th className="px-6 py-4 text-center">Quantity Deducted</th>
                  <th className="px-6 py-4 text-right">Internal Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consumedLogs.slice().reverse().map(log => {
                   const p = products.find(prod => prod.id === log.productId);
                   const costValue = (p?.purchasePrice || 0) * log.quantity;
                   return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{format(new Date(log.date), 'dd MMM yyyy, hh:mm a')}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{log.productName}</td>
                      <td className="px-6 py-4 text-gray-500">
                         {log.customerName}
                         {log.invoiceId && <span className="block text-xs mt-0.5 text-gray-400">Inv #{log.invoiceId.split('_')[1]}</span>}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-900">-{log.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-warning">₹{costValue.toLocaleString()}</td>
                    </tr>
                   );
                })}
                {consumedLogs.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">No consumption logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Restock Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Product *</label>
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
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900 text-sm shadow-sm transition-all"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>)}
                </select>
              </div>

              {selectedProductId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                      <input 
                        type="number" 
                        required 
                        min="1" 
                        value={addQuantity} 
                        onChange={e => setAddQuantity(e.target.value)} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900 placeholder-gray-400 text-sm shadow-sm transition-all" 
                        placeholder="E.g., 10" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cost / Unit (₹) *</label>
                      <input 
                        type="number" 
                        required 
                        min="0" 
                        step="0.01"
                        value={addCost} 
                        onChange={e => setAddCost(e.target.value)} 
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900 text-sm shadow-sm transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier</label>
                    <input 
                      type="text" 
                      value={addSupplier} 
                      onChange={e => setAddSupplier(e.target.value)} 
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-900 placeholder-gray-400 text-sm shadow-sm transition-all" 
                      placeholder="Supplier Name" 
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-4 text-sm shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-500">Total Expense Cost:</span>
                      <span className="text-lg font-bold text-danger">₹{((parseFloat(addCost) || 0) * (parseInt(addQuantity, 10) || 0)).toLocaleString()}</span>
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-4 py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-sm">
                    Confirm Purchase
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-2">This will automatically record an expense and add stock.</p>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
