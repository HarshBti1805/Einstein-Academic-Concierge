"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LogOut, 
  Bell, 
  Settings, 
  User,
  ChevronDown 
} from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backPath?: string;
  userName?: string;
  userRole?: string;
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  backPath = "/dashboard",
  userName = "John Doe",
  userRole = "Student",
}: HeaderProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("studentData");
    router.push("/");
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 glass border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(backPath)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </motion.button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Bell className="h-5 w-5 text-zinc-400" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-500 rounded-full" />
            </motion.button>

            {/* Settings */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Settings className="h-5 w-5 text-zinc-400" />
            </motion.button>

            {/* User Dropdown */}
            <div className="relative ml-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDropdown(!showDropdown)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg",
                  "bg-white/5 hover:bg-white/10 transition-colors"
                )}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-xs text-zinc-400">{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-400 hidden sm:block" />
              </motion.button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 py-2 bg-[#111118] border border-white/10 rounded-xl shadow-xl"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
