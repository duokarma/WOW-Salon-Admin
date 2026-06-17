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

    setTimeout(() => {
      const success = login(username, password);
      
      if (success) {
        toast.success('Login successful! Redirecting...', {
          duration: 1000,
          style: { background: '#ffffff', color: '#000000' },
          iconTheme: { primary: '#000000', secondary: '#ffffff' },
        });
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error('Invalid credentials. Please try again.', {
          style: { background: '#EF4444', color: '#fff' }
        });
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black font-sans">
      <Toaster position="top-right" />
      
      {/* Background glow matching the admin panel */}
      <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-white/[0.02] blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md p-8 sm:p-10"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-b from-white/[0.08] to-transparent rounded-[2.5rem] blur-sm pointer-events-none"></div>

        {/* Glassmorphic Card */}
        <div className="glass-panel rounded-[2rem] p-10 relative">
          
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-xl">
              <Scissors className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2">WOW <span className="font-bold">SALON</span></h1>
            <p className="text-white/50 text-xs uppercase tracking-[0.2em]">Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/30 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white placeholder-white/20 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-white/40 focus:bg-white/5 transition-all text-sm"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/30 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white placeholder-white/20 rounded-xl pl-12 pr-12 py-3.5 focus:outline-none focus:border-white/40 focus:bg-white/5 transition-all text-sm"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 border border-white/20 rounded bg-black/40 checked:bg-white checked:border-white transition-all cursor-pointer"
                  />
                  <div className="absolute text-black opacity-0 peer-checked:opacity-100 pointer-events-none">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors uppercase tracking-wider">Remember me</span>
              </label>
              
              <a href="#" className="text-xs font-bold text-white/50 hover:text-white transition-colors uppercase tracking-wider">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-white hover:bg-gray-200 text-black font-bold tracking-wide uppercase py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Default credentials: admin / admin123</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
