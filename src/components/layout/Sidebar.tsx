import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Package, Calendar, 
  FileText, PieChart, Scissors,
  LogOut, User as UserIcon, List
} from 'lucide-react';
 import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Customer Management', href: '/customers', icon: Users },
  { name: 'Services', href: '/services', icon: List },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Expenses', href: '/expenses', icon: FileText },
  { name: 'Accounts', href: '/accounts', icon: PieChart },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full w-full flex-col glass-sidebar rounded-[24px] relative overflow-hidden">
      
      {/* Brand Header */}
      <div className="flex h-24 shrink-0 items-center px-8 border-b border-white/10 relative">
        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mr-3 shadow-sm border border-white/20">
          <Scissors className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          WOW <span className="text-white/60 font-medium">SALON</span>
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar px-4 py-6 bg-transparent">
        <nav className="flex-1 space-y-2">
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Menu</p>
          </div>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'relative group flex items-center rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-300',
                    isActive 
                      ? 'text-white font-bold bg-white/10 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex items-center z-10 w-full">
                      <Icon
                        className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110", 
                          isActive ? "text-white" : "text-white/40 group-hover:text-white"
                        )}
                        aria-hidden="true"
                      />
                      <span className="relative z-10">{item.name}</span>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/10 bg-black/20 space-y-3 relative">
        {currentUser && (
          <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/10 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-xs font-medium text-white/50 truncate uppercase tracking-wider">{currentUser.role}</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="w-full group flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-danger hover:bg-danger/10 transition-all duration-300 border border-transparent hover:border-danger/20"
        >
          <LogOut className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
