"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { fontVariables } from "@/lib/fonts";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  BookOpen, 
  MapPin, 
  LogOut, 
  University,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Skip check for login page
    if (pathname === '/admin/login') {
      setAuthorized(true); // Allow rendering login page
      return;
    }

    const storedAuth = localStorage.getItem('admin_university');
    if (!storedAuth) {
      router.push('/admin/login');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    // Check if we're on desktop
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  const isLoginPage = pathname === '/admin/login';

  if (!authorized && !isLoginPage) {
    return null; // Don't render anything while checking auth
  }

  if (isLoginPage) {
      return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 text-slate-800 ${fontVariables}`}>
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 md:hidden bg-white/80 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 text-gray-600"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || isDesktop) && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className={`
              w-72 bg-white/70 backdrop-blur-xl border-r border-gray-200/60 p-6 fixed h-full z-40
              md:translate-x-0 transition-transform duration-300
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
          >
            <div className="flex items-center gap-3 mb-10 px-2">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-lg shadow-gray-200">
                  <University className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600" style={{ fontFamily: "var(--font-vonique), sans-serif" }}>Einstein</h1>
                 <p className="text-xs text-gray-500 font-medium">Admin Portal</p>
               </div>
            </div>
            
            <nav className="space-y-2">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 mt-8">Main Menu</p>
              
              <NavLink href="/admin" active={pathname === '/admin'} icon={<LayoutDashboard size={18} />}>
                Dashboard
              </NavLink>
              
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 mt-8">Management</p>
              
              <NavLink href="/admin/students" active={pathname === '/admin/students'} icon={<UserPlus size={18} />}>
                Add Student
              </NavLink>
              <NavLink href="/admin/students/bulk" active={pathname === '/admin/students/bulk'} icon={<Users size={18} />}>
                Bulk Upload
              </NavLink>
              <NavLink href="/admin/courses" active={pathname === '/admin/courses'} icon={<BookOpen size={18} />}>
                Add Course
              </NavLink>
              <NavLink href="/admin/rooms" active={pathname === '/admin/rooms'} icon={<MapPin size={18} />}>
                Add Room
              </NavLink>
            </nav>
            
            <div className="absolute bottom-6 left-6 right-6">
                <button 
                    onClick={() => {
                        localStorage.removeItem('admin_university');
                        router.push('/admin/login');
                    }}
                    className="group w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-200 border border-transparent hover:border-red-100"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Log Out
                </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <main className={`flex-1 p-8 relative z-10 transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, children, active, icon }: { href: string; children: React.ReactNode; active: boolean; icon: React.ReactNode }) {
    return (
        <Link 
            href={href} 
            className={`
                relative group flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 mb-1
                ${active 
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                }
            `}
        >
            <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
              {icon}
            </span>
            <span className="font-medium">{children}</span>
            
            {active && (
              <motion.div 
                layoutId="active-pill"
                className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white"
              />
            )}
        </Link>
    )
}
