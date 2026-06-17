import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  IndianRupee, 
  Users, 
  PackageOpen, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const [visits, setVisits] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: visitsData },
        { data: expensesData },
        { data: productsData }
      ] = await Promise.all([
        supabase.from('customer_visits').select('*').order('visit_date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('products').select('*')
      ]);

      setVisits(visitsData || []);
      setExpenses(expensesData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_visits' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const today = new Date();

  // --- Row 1: Metrics ---
  const todayVisits = visits.filter(v => v.visit_date && isSameDay(new Date(v.visit_date), today));
  const uniqueCustomerIds = new Set(todayVisits.map(v => v.customer_id).filter(Boolean));
  const todayCustomersCount = uniqueCustomerIds.size;
  
  const todayRevenue = todayVisits.reduce((sum, v) => sum + (Number(v.grand_total) || 0), 0);
  
  const todayExpensesItems = expenses.filter(exp => exp.date && isSameDay(new Date(exp.date), today));
  const todayExpensesAmount = todayExpensesItems.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const todayProfit = todayRevenue - todayExpensesAmount;

  // --- Low Stock Products ---
  const lowStockProducts = products.filter(p => (Number(p.stock_quantity) || 0) <= (Number(p.low_stock_threshold) || 0)).slice(0, 10);

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <motion.div variants={itemVariants} className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-gray-300 transition-all duration-300">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
      </div>
      <div className="relative z-10 mt-2">
        <h3 className="text-gray-500 text-sm font-medium mb-1 tracking-wide uppercase">{title}</h3>
        <p className="text-4xl font-bold tracking-tight text-gray-900">{value}</p>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      className="space-y-8 pb-12 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-lg">Welcome back. Here's your salon's performance overview for today.</p>
      </div>

      {loading ? (
         <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
         </div>
      ) : (
        <>
          {/* Key Daily Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Today's Revenue" 
              value={`₹${todayRevenue.toLocaleString()}`}
              icon={IndianRupee} 
              colorClass="text-gray-900"
            />
            <StatCard 
              title="Today's Profit" 
              value={`₹${todayProfit.toLocaleString()}`}
              icon={TrendingUp} 
              colorClass="text-gray-700"
            />
            <StatCard 
              title="Today's Customers" 
              value={todayCustomersCount.toString()}
              icon={Users} 
              colorClass="text-gray-900"
            />
            <StatCard 
              title="Today's Expenses" 
              value={`₹${todayExpensesAmount.toLocaleString()}`}
              icon={IndianRupee} 
              colorClass="text-red-500"
            />
          </div>

          {/* Low Stock Alerts */}
          <motion.div variants={itemVariants} className="glass-card p-6 border-gray-200 flex flex-col min-h-[300px] mt-8">
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-gray-900" />
                <h3 className="text-xl font-bold text-gray-900">Low Stock Alerts</h3>
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {lowStockProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-10">
                  <PackageOpen className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-base font-medium">Inventory levels look good.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex flex-col p-4 rounded-xl bg-red-50 border border-red-100 transition-all hover:shadow-sm">
                      <p className="text-base font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 mb-3">{product.brand}</p>
                      <div className="flex justify-between items-end mt-auto">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Threshold</p>
                          <p className="text-sm font-semibold text-gray-700">{product.low_stock_threshold || product.lowStockThreshold || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-red-500 uppercase tracking-wide font-bold">Current Stock</p>
                          <p className="text-xl font-bold text-red-600">{product.stock_quantity || product.stockQuantity || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
