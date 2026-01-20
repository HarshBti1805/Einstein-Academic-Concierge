"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  BookOpen, 
  MapPin, 
  Users, 
  Clock, 
  CalendarDays,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-clip-text text-transparent"
            style={{ fontFamily: "var(--font-vonique), sans-serif" }}
          >
            Dashboard Overview
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 font-medium"
          >
            Welcome back, Administrator. Here's what's happening today.
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/60 text-sm font-medium text-gray-600 flex items-center gap-2 shadow-sm"
        >
          <CalendarDays size={16} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </motion.div>
      </div>
      
      {/* Quick Actions Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <DashboardCard 
          title="Manage Students" 
          description="Register new students, update records, or perform bulk uploads."
          icon={<Users size={24} className="text-indigo-600" />}
          href="/admin/students"
          actionText="Add Student"
          variants={itemVariants}
          gradient="from-indigo-500/10 to-indigo-500/5"
        />
        
        <DashboardCard 
          title="Manage Courses" 
          description="Create new courses, assign instructors, and manage curriculum."
          icon={<BookOpen size={24} className="text-violet-600" />}
          href="/admin/courses"
          actionText="Add Course"
          variants={itemVariants}
          gradient="from-violet-500/10 to-violet-500/5"
        />
        
        <DashboardCard 
          title="Manage Rooms" 
          description="Configure classrooms, labs, and assign seating arrangements."
          icon={<MapPin size={24} className="text-emerald-600" />}
          href="/admin/rooms"
          actionText="Add Room"
          variants={itemVariants}
          gradient="from-emerald-500/10 to-emerald-500/5"
        />
      </motion.div>

      {/* Stats Section Placeholder */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
        className="mt-8 p-8 bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl shadow-gray-200/40 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-3 opacity-10">
           <Clock size={120} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-6" style={{ fontFamily: "var(--font-vonique), sans-serif" }}>System Status</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatItem label="Total Students" value="1,248" delay={0.5} />
           <StatItem label="Active Courses" value="86" delay={0.6} />
           <StatItem label="Classrooms" value="42" delay={0.7} />
           <StatItem label="System Uptime" value="99.9%" delay={0.8} />
        </div>
      </motion.div>
    </div>
  );
}

function DashboardCard({ title, description, icon, href, actionText, variants, gradient }: any) {
  return (
    <motion.div 
      variants={variants}
      whileHover={{ y: -5 }}
      className="group relative bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 shadow-lg shadow-gray-200/50 overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "var(--font-vonique), sans-serif" }}>{title}</h2>
        <p className="text-gray-500 text-sm mb-6 h-10">{description}</p>
        
        <Link 
          href={href} 
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 group-hover:text-black transition-colors"
        >
          {actionText}
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:translate-x-1 transition-transform">
             <ArrowRight size={14} />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="p-4 bg-white/50 rounded-xl border border-gray-100"
    >
      <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-800 font-mono">{value}</p>
    </motion.div>
  );
}
