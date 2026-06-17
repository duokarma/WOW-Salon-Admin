import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  IndianRupee, 
  Users, 
  PackageOpen, 
  ArrowUpRight, 
  ArrowDownRight, 
  Star,
  Cake,
  TrendingUp,
  FileText,
  AlertTriangle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { isSameDay, format, subDays, startOfDay } from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

// --- Monochrome Chart Colors ---
const CHART_COLORS = {
  primary: '#000000',
  secondary: '#4B5563',
  tertiary: '#9CA3AF',
  quaternary: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280'
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, '#1F2937'];

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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: billsData },
        { data: expensesData },
        { data: customersData },
        { data: staffData },
        { data: productsData }
      ] = await Promise.all([
        supabase.from('bills').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('staff').select('*'),
        supabase.from('products').select('*')
      ]);

      setInvoices(billsData || []);
      setExpenses(expensesData || []);
      setCustomers(customersData || []);
      setStaff(staffData || []);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const today = new Date();

  // --- Row 1: Metrics ---
  const todayInvoices = invoices.filter(inv => inv.date && isSameDay(new Date(inv.date), today));
  // Today's customers are unique customers from today's bills
  const uniqueCustomerIds = new Set(todayInvoices.map(inv => inv.customer_id).filter(Boolean));
  const todayCustomersCount = uniqueCustomerIds.size;
  
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  
  const todayExpensesItems = expenses.filter(exp => exp.date && isSameDay(new Date(exp.date), today));
  const todayExpensesAmount = todayExpensesItems.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const todayProfit = todayRevenue - todayExpensesAmount;
  
  const productsSoldToday = todayInvoices.reduce((sum, inv) => {
    const sold = inv.sold_products || [];
    const qty = Array.isArray(sold) ? sold.reduce((itemSum: number, i: any) => itemSum + (Number(i.quantity) || 0), 0) : 0;
    return sum + qty;
  }, 0);

  // --- Row 2: Revenue Chart Data ---
  const revenueTrend = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(today, 6 - i);
    const dayInvoices = invoices.filter(inv => inv.date && isSameDay(new Date(inv.date), d));
    const dayRev = dayInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    return { name: format(d, 'EEE'), revenue: Math.floor(dayRev) };
  });

  // --- Row 2: Service Popularity Pie Chart Data ---
  const serviceCounts: Record<string, number> = {};
  invoices.forEach(inv => {
    const svcs = inv.services || [];
    if (Array.isArray(svcs)) {
      svcs.forEach((s: any) => {
        const cat = s.category || 'Other';
        serviceCounts[cat] = (serviceCounts[cat] || 0) + 1;
      });
    }
  });
  
  const serviceDistribution = Object.entries(serviceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  // --- Row 3: Staff Performance Bar Chart Data ---
  const staffPerformanceMap: Record<string, number> = {};
  invoices.forEach(inv => {
    if (inv.staff_name) {
      staffPerformanceMap[inv.staff_name] = (staffPerformanceMap[inv.staff_name] || 0) + (Number(inv.grand_total) || 0);
    }
  });

  const staffPerformance = Object.entries(staffPerformanceMap)
    .map(([name, revenue]) => ({ name: name.split(' ')[0], revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // --- Row 4: Recent Activity ---
  const recentCustomers = [...customers].slice(0, 5);
  const recentBills = [...invoices].slice(0, 5);

  // --- Row 5: Alerts & Operations ---
  const lowStockProducts = products.filter(p => (Number(p.stock_quantity) || 0) <= (Number(p.low_stock_threshold) || 0)).slice(0, 5);
  
  // Real upcoming birthdays
  const upcomingBirthdays = customers.filter(c => {
    if (!c.dob) return false;
    const dob = new Date(c.dob);
    if (isNaN(dob.getTime())) return false;
    const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBirthday < startOfDay(today)) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).slice(0, 3);

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }: any) => (
    <motion.div variants={itemVariants} className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-gray-300 transition-all duration-300">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        {trendValue > 0 && trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trendValue}%
          </div>
        )}
      </div>
      <div className="relative z-10 mt-2">
        <h3 className="text-gray-500 text-sm font-medium mb-1 tracking-wide">{title}</h3>
        <p className="text-4xl font-bold tracking-tight text-gray-900">{value}</p>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      className="space-y-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500">Welcome back. Here's your salon's performance overview.</p>
      </div>

      {/* Row 1: Key Daily Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Revenue" 
          value={`₹${todayRevenue.toLocaleString()}`}
          icon={IndianRupee} 
          trend="up" 
          trendValue={0}
          colorClass="text-gray-900"
        />
        <StatCard 
          title="Today's Profit" 
          value={`₹${todayProfit.toLocaleString()}`}
          icon={TrendingUp} 
          trend={todayProfit >= 0 ? "up" : "down"}
          trendValue={0}
          colorClass="text-gray-700"
        />
        <StatCard 
          title="Today's Customers" 
          value={todayCustomersCount.toString()}
          icon={Users} 
          trend="up" 
          trendValue={0}
          colorClass="text-gray-900"
        />
        <StatCard 
          title="Products Sold" 
          value={productsSoldToday.toString()}
          icon={PackageOpen} 
          trend="up" 
          trendValue={0}
          colorClass="text-gray-700"
        />
      </div>

      {/* Row 2: Charts - Revenue & Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Large Revenue Chart (2/3 width) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
              <p className="text-sm text-gray-500 mt-1">Last 7 Days Performance</p>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            {revenueTrend.every(r => r.revenue === 0) ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} tickFormatter={(value) => `₹${value / 1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: '#111827', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: CHART_COLORS.primary, fontWeight: 'bold' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Service Popularity Pie Chart (1/3 width) */}
        <motion.div variants={itemVariants} className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Service Breakdown</h3>
              <p className="text-sm text-gray-500 mt-1">By Category</p>
            </div>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 w-full relative flex flex-col justify-center">
            {serviceDistribution.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: '#111827' }}
                    itemStyle={{ color: CHART_COLORS.primary, fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: CHART_COLORS.text }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

      </div>

      {/* Row 3: Staff Performance Bar Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Staff Performance Bar Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6 flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Top Performers</h3>
              <p className="text-sm text-gray-500 mt-1">Revenue by Staff Member</p>
            </div>
            <Star className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 w-full relative">
            {staffPerformance.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} tickFormatter={(value) => `₹${value / 1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: '#111827' }}
                    itemStyle={{ color: CHART_COLORS.primary, fontWeight: 'bold' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Recent Bills */}
        <motion.div variants={itemVariants} className="glass-card p-6 flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-lg font-bold text-gray-900">Recent Bills</h3>
            <button className="text-xs font-semibold text-gray-900 hover:text-gray-600 transition-colors border border-gray-200 px-3 py-1.5 rounded-lg bg-white shadow-sm">View All</button>
          </div>
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {recentBills.length === 0 ? (
              <p className="text-sm text-gray-500 text-center mt-10">No recent bills.</p>
            ) : (
              recentBills.map((bill, i) => (
                <div key={bill.id || i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bill.customer_name || bill.customerName || 'Walk-in'}</p>
                      <p className="text-xs text-gray-500">{bill.date ? format(new Date(bill.date), 'dd MMM, hh:mm a') : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{(Number(bill.grand_total) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-success uppercase font-bold tracking-wider">PAID</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>

      {/* Row 4: Alerts & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Alerts */}
        <motion.div variants={itemVariants} className="glass-card p-6 border-gray-200 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-900" />
              <h3 className="text-lg font-bold text-gray-900">Low Stock Alerts</h3>
            </div>
          </div>
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <PackageOpen className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Inventory levels look good.</p>
              </div>
            ) : (
              lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-danger/5 border border-danger/10">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-danger">{product.stock_quantity || product.stockQuantity || 0} left</p>
                    <p className="text-[10px] text-gray-500">Threshold: {product.low_stock_threshold || product.lowStockThreshold || 0}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Upcoming Birthdays */}
        <motion.div variants={itemVariants} className="glass-card p-6 border-gray-200 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-gray-900" />
              <h3 className="text-lg font-bold text-gray-900">Upcoming Birthdays</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200">Next 7 Days</span>
          </div>
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-gray-500 text-center mt-10">No upcoming birthdays.</p>
            ) : (
              upcomingBirthdays.map((customer, idx) => {
                const dob = new Date(customer.dob);
                return (
                  <div key={customer.id || idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-900 p-[1px]">
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                          <Cake className="w-4 h-4 text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{format(dob, 'MMM dd')}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

      </div>

    </motion.div>
  );
}
