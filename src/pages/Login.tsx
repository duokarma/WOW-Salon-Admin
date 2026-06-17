import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Scissors } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useStore } from '../store/useStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useStore(state => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    // Simulate network request for premium feel
    setTimeout(() => {
      const success = login(username, password);
      
      if (success) {
        toast.success('Login successful! Redirecting...', {
          duration: 1000,
          style: {
            background: '#C8A46B',
            color: '#fff',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#C8A46B',
          },
        });
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error('Invalid credentials. Please try again.', {
          style: {
            background: '#EF4444',
            color: '#fff',
          }
        });
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0B0B0D] font-sans">
      <Toaster position="top-right" />
      
      {/* Subtle Salon-themed background element (abstract shapes/blur) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         {/* Animated particles placeholder (using css background for now to keep it simple and performant) */}
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-[#C9A86A]/5 blur-[120px] rounded-full mix-blend-screen" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-[#D8B08C]/5 blur-[120px] rounded-full mix-blend-screen" />
         {/* Subtle pattern overlay */}
         <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md p-8 sm:p-10"
      >
        {/* Animated Gold Glow Behind Card */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C9A86A]/0 via-[#C9A86A]/30 to-[#C9A86A]/0 rounded-[2.5rem] blur-xl opacity-50 animate-pulse pointer-events-none"></div>

        {/* Glassmorphic Card */}
        <div className="relative bg-[#141418]/60 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-premium">
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#C9A86A] to-[#A68446] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(201,168,106,0.3)]">
              <Scissors className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">WOW <span className="text-[#C9A86A] font-medium">SALON</span></h1>
            <p className="text-[#A1A1AA] text-sm uppercase tracking-widest">Salon Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider pl-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/40 group-focus-within:text-[#C9A86A] transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 text-white placeholder-white/20 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-[#C9A86A]/50 focus:ring-1 focus:ring-[#C9A86A]/50 transition-all text-sm shadow-inner"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider pl-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40 group-focus-within:text-[#C9A86A] transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 text-white placeholder-white/20 rounded-xl pl-12 pr-12 py-3.5 focus:outline-none focus:border-[#C9A86A]/50 focus:ring-1 focus:ring-[#C9A86A]/50 transition-all text-sm shadow-inner"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 border border-white/20 rounded bg-black/40 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  />
                  <div className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors">Remember me</span>
              </label>
              
              <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative mt-6 bg-gradient-to-r from-[#C8A46B] to-[#b38e55] hover:from-[#d1af7a] hover:to-[#be985d] text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(200,164,107,0.3)] hover:shadow-[0_0_25px_rgba(200,164,107,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">Default credentials: admin / admin123</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
