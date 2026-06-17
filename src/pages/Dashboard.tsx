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
    <motion.div variants={itemVariants} className="glass-card p-8 flex flex-col justify-between relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/[0.02] rounded-full blur-3xl group-hover:bg-white/[0.04] transition-all duration-500"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm backdrop-blur-md">
          <Icon className="w-6 h-6 text-white/60" />
        </div>
      </div>
      <div className="relative z-10 mt-4">
        <h3 className="text-white/40 text-[11px] font-medium mb-3 tracking-[0.2em] uppercase">{title}</h3>
        <p className="text-6xl font-serif text-white tracking-tight">{value}</p>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      className="space-y-12 pb-16 max-w-[1400px] mx-auto px-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="mb-12 mt-6">
        <h1 className="text-6xl font-serif text-white tracking-tight mb-4">Dashboard</h1>
        <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Executive Overview • {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
      </div>

      {loading ? (
         <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
         </div>
      ) : (
        <>
          {/* Key Daily Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Today's Revenue" 
              value={`₹${todayRevenue.toLocaleString()}`}
              icon={IndianRupee} 
            />
            <StatCard 
              title="Today's Profit" 
              value={`₹${todayProfit.toLocaleString()}`}
              icon={TrendingUp} 
            />
            <StatCard 
              title="Customers" 
              value={todayCustomersCount.toString()}
              icon={Users} 
            />
            <StatCard 
              title="Expenses" 
              value={`₹${todayExpensesAmount.toLocaleString()}`}
              icon={IndianRupee} 
            />
          </div>

          {/* Low Stock Alerts */}
          <motion.div variants={itemVariants} className="glass-card p-8 flex flex-col min-h-[350px] mt-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-danger/[0.02] rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-8 shrink-0 border-b border-white/5 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <h3 className="text-2xl font-light tracking-tight text-white">Low Stock Alerts</h3>
              </div>
            </div>
            
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 relative z-10">
              {lowStockProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40 mt-10">
                  <PackageOpen className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm font-medium tracking-wide uppercase">Inventory levels optimal</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex flex-col p-5 rounded-2xl bg-danger/[0.03] border border-danger/10 backdrop-blur-md transition-all hover:bg-danger/[0.05] hover:border-danger/30">
                      <p className="text-lg font-medium text-white truncate">{product.name}</p>
                      <p className="text-xs text-white/40 mb-4 tracking-wider uppercase">{product.brand}</p>
                      <div className="flex justify-between items-end mt-auto">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-[0.1em] mb-1">Threshold</p>
                          <p className="text-sm font-semibold text-white/70">{product.low_stock_threshold || product.lowStockThreshold || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-danger uppercase tracking-[0.1em] font-bold mb-1">Current Stock</p>
                          <p className="text-2xl font-light text-danger">{product.stock_quantity || product.stockQuantity || 0}</p>
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
