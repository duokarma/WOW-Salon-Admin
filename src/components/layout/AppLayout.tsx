import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-text selection:bg-primary/30 font-sans p-4 gap-6 relative">
      
      {/* Fixed Sidebar Container */}
      <div className="h-full w-56 shrink-0 relative z-10">
        <Sidebar />
      </div>

      {/* Main Content Container */}
      <div className="flex flex-1 flex-col h-full rounded-[24px] overflow-hidden relative z-10">
        <Header />
        
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-6 custom-scrollbar relative">
          <div className="mx-auto max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      
    </div>
  );
}
