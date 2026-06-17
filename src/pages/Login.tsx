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
          style: { background: '#ffffff', color: '#000000', borderRadius: '12px', fontWeight: 'bold' },
          iconTheme: { primary: '#000000', secondary: '#ffffff' },
        });
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error('Invalid credentials. Please try again.', {
          style: { background: '#EF4444', color: '#fff', borderRadius: '12px', fontWeight: 'bold' }
        });
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black font-sans selection:bg-white selection:text-black">
      <Toaster position="top-center" />
      
      {/* Cinematic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-white/[0.03] blur-[150px] rounded-full mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/[0.02] blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      
      {/* Premium Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md p-6 sm:p-0"
      >
        {/* Luxury Liquid Glass Card */}
        <div className="liquid-glass rounded-[2.5rem] p-10 sm:p-12 relative overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          
          <div className="text-center mb-10 relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="mx-auto w-20 h-20 bg-white shadow-[0_0_40px_rgba(255,255,255,0.3)] rounded-2xl flex items-center justify-center mb-8 relative"
            >
              <div className="absolute inset-0 rounded-2xl ring-1 ring-black/10 shadow-inner"></div>
              <Scissors className="text-black w-10 h-10 transform -rotate-45" />
            </motion.div>
            <h1 className="text-4xl font-light tracking-tighter text-white mb-3">WOW <span className="font-bold">SALON</span></h1>
            <div className="h-[1px] w-12 bg-white/20 mx-auto mb-3"></div>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Exclusive Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/30 group-focus-within:text-white transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-2xl pl-14 pr-4 py-4 focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all duration-300 text-sm shadow-inner"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/30 group-focus-within:text-white transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/20 rounded-2xl pl-14 pr-14 py-4 focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all duration-300 text-sm shadow-inner"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 pb-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border border-white/20 rounded-md bg-white/5 checked:bg-white checked:border-white transition-all cursor-pointer"
                  />
                  <div className="absolute text-black opacity-0 peer-checked:opacity-100 pointer-events-none">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs font-medium text-white/40 group-hover:text-white/80 transition-colors tracking-wide">Keep me signed in</span>
              </label>
              
              <a href="#" className="text-xs font-bold text-white/40 hover:text-white transition-colors tracking-wide">
                Recover Password
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-white hover:bg-gray-100 text-black font-bold tracking-[0.2em] uppercase py-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Authorizing</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-10 pt-8 border-t border-white/[0.05] text-center relative z-10">
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-medium">Default credentials: admin / admin123</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
