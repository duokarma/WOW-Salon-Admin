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
    <div className="flex h-full w-full flex-col bg-card border border-border rounded-xl shadow-sm relative overflow-hidden">
      
      {/* Brand Header */}
      <div className="flex h-24 shrink-0 items-center px-8 border-b border-border relative">
        <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center mr-3 shadow-sm">
          <Scissors className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          WOW <span className="text-gray-500 font-medium">SALON</span>
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar px-4 py-6 bg-white">
        <nav className="flex-1 space-y-1.5">
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Menu</p>
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
                    isActive ? 'text-gray-900 font-bold bg-gray-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex items-center z-10 w-full">
                      <Icon
                        className={cn("mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110", 
                          isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-900"
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
      <div className="p-4 border-t border-border bg-gray-50 space-y-3 relative">
        {currentUser && (
          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-border shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
              <UserIcon className="w-4 h-4 text-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs font-medium text-gray-500 truncate uppercase tracking-wider">{currentUser.role}</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="w-full group flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 border border-transparent hover:border-red-100"
        >
          <LogOut className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
