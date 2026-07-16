import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PhoneCall, Shield, Key, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@voicedesk.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate authenticating
    setTimeout(() => {
      if (email.trim() && password.length >= 6) {
        onLogin();
        navigate('/overview');
      } else {
        setError('Please enter a valid email and a password of at least 6 characters.');
        setIsLoading(false);
      }
    }, 800);
  };

  const handleFillDemo = () => {
    setEmail('demo@voicedesk.ai');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#060810] text-gray-300 font-sans relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden select-none">
      
      {/* Decorative ambient lights */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>
      
      {/* Dynamic ambient blur orbs */}
      <div className="absolute top-[5%] left-[15%] w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[5%] right-[15%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[130px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sm:mx-auto w-full sm:max-w-md z-10 px-4 sm:px-0"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.05 }}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
            >
              <PhoneCall className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            </motion.div>
            <span className="font-display font-bold text-white text-2xl tracking-tighter">
              VoiceDesk <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">AI</span>
            </span>
          </Link>
        </div>
        <h2 className="text-center text-3xl font-display font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Or{' '}
          <Link to="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1">
            create a new 14-day free trial account <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        className="mt-8 sm:mx-auto w-full sm:max-w-md z-10 px-4 sm:px-0"
      >
        <div className="bg-[#0b101d]/90 backdrop-blur-xl py-8 px-6 border border-gray-800/80 shadow-2xl sm:rounded-2xl sm:px-10 relative group/card hover:border-emerald-500/20 transition-all duration-300">
          {/* Card subtle upper lighting edge */}
          <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-950/40 border border-red-900/30 text-red-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2"
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-11 pr-3 py-2.5 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-3 py-2.5 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleFillDemo}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer inline-flex items-center gap-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
                >
                  <Sparkles className="w-3 h-3" /> Use Demo Credentials
                </motion.button>
              </div>
            </div>

            <div>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:from-emerald-700 disabled:to-teal-700 text-black font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-900 pt-6">
            <div className="bg-gray-950/60 rounded-xl p-3.5 border border-gray-800/40 text-[11px] text-gray-400 leading-relaxed relative">
              <div className="absolute -top-2.5 left-4 bg-emerald-950 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded">
                💡 Sandbox Access
              </div>
              <p className="mt-1">
                Login is fully validated on the client side. Clicking the <span className="text-emerald-400 font-semibold cursor-pointer" onClick={handleFillDemo}>"Use Demo Credentials"</span> button or entering any test email and password will instantly unlock the main dashboard!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
