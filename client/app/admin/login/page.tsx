"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { fontVariables } from "@/lib/fonts";
import { 
  Building2, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Loader2,
  AlertCircle,
  Check
} from "lucide-react";

export default function AdminLoginPage() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  // Particle animation state
  const [particles, setParticles] = useState<Array<{
    x: number;
    y: number;
    duration: number;
    delay: number;
    left: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 15 }, () => ({
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 10,
        duration: 10 + Math.random() * 10,
        delay: Math.random() * 10,
        left: `${Math.random() * 100}%`,
      }))
    );
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/universities/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode }),
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please check if the server is running.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth state
      localStorage.setItem('admin_university', JSON.stringify(data.university));
      
      setIsSuccess(true);
      
      // Delay redirect for animation
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden py-8 bg-gradient-to-br from-slate-50 via-white to-gray-100 ${fontVariables}`}>
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Gradient orbs - Light version */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-gray-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-gray-300/40 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating particles - Light version */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gray-400/40 rounded-full"
            initial={{
              x: particle.x,
              y: particle.y,
            }}
            animate={{
              y: -10,
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            }}
            style={{
              left: particle.left,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-gray-200/50 via-gray-300/50 to-gray-200/50 rounded-[28px] blur-xl opacity-70" />
          
          {/* Main card */}
          <div className="relative bg-white/90 backdrop-blur-2xl rounded-[26px] p-8 sm:p-10 border border-gray-200/60 shadow-xl shadow-gray-500/5">
            
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 15, 
                  delay: 0.1,
                  opacity: { duration: 0.3, delay: 0.1 }
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-lg shadow-gray-900/30 mb-6 p-4 relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                <Building2 className="h-8 w-8 text-white relative z-10" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-2xl sm:text-3xl mb-3 bg-gradient-to-r from-gray-800 via-gray-900 to-black bg-clip-text text-transparent font-bold"
                style={{ fontFamily: "var(--font-vonique), system-ui, sans-serif" }}
              >
                UNIVERSITY PORTAL
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 text-sm flex items-center justify-center gap-2"
                style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
              >
                <ShieldCheck className="h-4 w-4 text-gray-700" />
                Administrative Access Only
              </motion.p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label 
                  htmlFor="accessCode" 
                  className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    focusedField === 'accessCode' ? 'text-gray-900' : 'text-gray-600'
                  }`}
                  style={{ fontFamily: "var(--font-bogita-mono), system-ui, sans-serif" }}
                >
                  Access Code
                </label>
                
                <div className="relative group">
                  {/* Input glow on focus */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                    focusedField === 'accessCode' ? 'opacity-20' : 'group-hover:opacity-10'
                  }`} />
                  
                  <div className="relative flex items-center">
                    <div className={`absolute left-4 transition-all duration-300 ${
                      focusedField === 'accessCode' 
                        ? 'text-gray-900 scale-110' 
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}>
                      <Lock className="h-[18px] w-[18px]" />
                    </div>
                    <input
                      type="password"
                      id="accessCode"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onFocus={() => setFocusedField('accessCode')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-500/20 outline-none transition-all duration-300"
                      placeholder="Enter unique university code"
                      required
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    />
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading || isSuccess}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative group w-full px-6 py-3.5 flex items-center justify-center gap-3 text-white font-semibold rounded-xl overflow-hidden disabled:cursor-not-allowed transition-all duration-300"
                style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-black transition-all duration-300" />
                
                {/* Hover shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                {/* Button glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-black blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                
                <span className="relative z-10 flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {isSuccess ? (
                      <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-5 w-5" />
                        Verified
                      </motion.span>
                    ) : loading ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Verifying...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        Access Portal
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </motion.button>
            </form>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400"
              style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
            >
              <p>Protected System • Authorized Personnel Only</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
