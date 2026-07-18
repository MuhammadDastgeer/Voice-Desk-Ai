import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PhoneCall, Shield, Key, Mail, Building, ArrowRight, User, Check, Database, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { supabaseService, SUPABASE_STATUS } from '../lib/supabase';

interface SignupPageProps {
  onSignup: () => void;
}

export default function SignupPage({ onSignup }: SignupPageProps) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!shopName.trim()) {
      setError('Please provide a Shop / Business name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await supabaseService.signUp(email, password, fullName);

      // Save user session in localStorage
      localStorage.setItem('vd_is_logged_in', 'true');
      if (user) {
        localStorage.setItem('vd_current_user_id', user.id);
        localStorage.setItem('vd_current_user_email', user.email || email);
        localStorage.setItem('vd_current_user_name', fullName);

        // Pre-save profile and hours for local mode
        if (supabaseService.isMock) {
          const defaultProfile = {
            name: shopName,
            phone: '555-123-4567',
            email: email,
            address: '',
            city: '',
            state: '',
            zip: '',
            website: '',
            timezone: 'America/New_York'
          };
          localStorage.setItem(`vd_profile_${user.id}`, JSON.stringify(defaultProfile));
        } else {
          // If live database, we try to write the actual profile with the customized shop name
          try {
            await supabaseService.saveBusinessProfile(user.id, {
              name: shopName,
              phone: '',
              email: email,
              address: '',
              city: '',
              state: '',
              zip: '',
              website: '',
              timezone: 'America/New_York'
            });
          } catch (profileErr) {
            console.error('Failed to pre-populate live business profile:', profileErr);
          }
        }
      }

      onSignup();
      navigate('/overview');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration. Please try again.');
      setIsLoading(false);
    }
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
        <div className="flex items-center justify-center gap-2 mb-4">
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

        {/* Database Status Indicator */}
        <div className="flex justify-center mb-5">
          {SUPABASE_STATUS.isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
              <Database className="w-3 h-3 text-emerald-400" /> Supabase Live Database Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5">
              <Database className="w-3 h-3 text-amber-400" /> Supabase Sandbox Mode (Keys Missing)
            </span>
          )}
        </div>

        <h2 className="text-center text-3xl font-display font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
          Start your free trial
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Or{' '}
          <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1">
            sign in to your existing workspace <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        className="mt-6 sm:mx-auto w-full sm:max-w-md z-10 px-4 sm:px-0"
      >
        <div className="bg-[#0b101d]/90 backdrop-blur-xl py-8 px-6 border border-gray-800/80 shadow-2xl sm:rounded-2xl sm:px-10 relative group/card hover:border-emerald-500/20 transition-all duration-300">
          {/* Card subtle upper lighting edge */}
          <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
              <label htmlFor="fullName" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Full Name
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="block w-full pl-11 pr-3 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="shopName" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Shop / Business Name
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building className="h-4 w-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="shopName"
                  name="shopName"
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Apex Auto Repairs"
                  className="block w-full pl-11 pr-3 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Email Address (Gmail, Yahoo, Apple, Google, etc.)
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
                  placeholder="name@gmail.com, yahoo.com, apple.com..."
                  className="block w-full pl-11 pr-3 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Create Secure Password
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="block w-full pl-11 pr-10 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Confirm Password
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="block w-full pl-11 pr-10 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-1">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                defaultChecked
                className="h-4 w-4 rounded bg-gray-950 border-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900 cursor-pointer"
              />
              <label htmlFor="terms" className="ml-2.5 block text-xs text-gray-400 cursor-pointer select-none">
                I agree to the <span className="text-emerald-400 font-semibold hover:underline">Terms of Service</span> and <span className="text-emerald-400 font-semibold hover:underline">Privacy Policy</span>
              </label>
            </div>

            <div className="pt-2">
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
                    Create Workspace <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <div className="mt-4 border-t border-gray-900 pt-4">
            <p className="text-[10px] text-center text-gray-500 leading-relaxed">
              No credit card required. Free trials include <span className="text-emerald-400/80 font-medium">500 outbound call minutes</span> and full custom AI voice prompt configurability.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
