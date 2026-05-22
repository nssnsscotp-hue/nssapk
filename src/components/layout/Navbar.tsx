import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogOut, LogIn, Home, Bell, User, ShieldAlert, Heart, MessageSquare, Image, HelpCircle, Trophy, Contact, BarChart3, Library, GraduationCap, Calendar } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  const handleLogout = async () => {
    try {
      console.log('Logout initiated...');
      // 1. Sign out from Supabase if possible
      await supabase.auth.signOut().catch(() => {});
      
      // 2. Clear all auth data
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.clear();
      
      console.log('Storage cleared, redirecting...');
      
      // 3. Force redirect using multiple methods to be sure
      navigate('/login');
      window.location.hash = '/login';
      window.location.reload(); 
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.clear();
      window.location.href = '/#/login';
      window.location.reload();
    }
  };

  const allNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'My Profile', href: '/profile', icon: User },
    { name: 'Metrics', href: '/performance', icon: BarChart3 },
    { name: 'Attendance', href: '/attendance', icon: Calendar },
    { name: 'Safety Status', href: '/home-arrival', icon: Home },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Quiz Hub', href: '/quiz', icon: HelpCircle },
    { name: 'My ID', href: '/id-card', icon: Contact },
    { name: 'Announcements', href: '/announcements', icon: Bell },
    { name: 'Resources', href: '/resources', icon: Library },
    { name: 'Gallery', href: '/gallery', icon: Image },
    { name: 'Alumni', href: '/alumni', icon: GraduationCap },
    { name: 'Blood Bank', href: '/bloodbank', icon: Heart },
    { name: 'SOS', href: '/sos', icon: ShieldAlert },
    { name: 'Complaints', href: '/complaints', icon: MessageSquare },
  ];

  const publicNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Announcements', href: '/announcements', icon: Bell },
    { name: 'Gallery', href: '/gallery', icon: Image },
  ];

  const navItems = isLoggedIn ? [...allNavItems] : [...publicNavItems];

  if (isLoggedIn && isAdmin) {
    navItems.push({ name: 'Admin', href: '/admin', icon: User });
  }

  return (
    <nav className="sticky top-0 z-[100] px-4 py-4 md:px-8 md:py-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass shadow-2xl shadow-slate-200/40 rounded-[2rem] px-4 md:px-8 h-20 md:h-24 flex items-center justify-between border border-white/50">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 sm:gap-4 group">
              <div className="flex items-center -space-x-3.5 sm:-space-x-4 transition-transform group-hover:scale-105 duration-500">
                <div className="w-10 h-10 sm:w-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-md border border-slate-100 p-1 md:p-1.5 z-20">
                  <img src="https://i.ibb.co/k6WG4cv2/1000350739-removebg-preview.png" alt="College Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="w-10 h-10 sm:w-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-md border border-slate-100 p-1 md:p-1.5 z-10">
                  <img src="https://i.postimg.cc/Xq7KPnqK/pngkey-com-allu-arjun-png-2479287.png" alt="NSS Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
              <div className="flex flex-col justify-center items-start text-left select-none">
                <h1 className="text-[10px] min-[360px]:text-xs sm:text-base md:text-xl lg:text-2xl font-black tracking-tighter leading-none italic uppercase text-slate-900 transition-all">
                  NSS <span className="text-brand-600">COLLEGE</span> <span className="text-slate-500/80">OTTAPALAM</span>
                </h1>
                <p className="text-slate-400 text-[6px] sm:text-[9px] font-black uppercase tracking-[0.05em] sm:tracking-[0.25em] md:tracking-[0.35em] mt-0.5 sm:mt-1 opacity-60">
                  NSS UNITS 36 & 94
                </p>
              </div>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-1 lg:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl transition-all duration-300 flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest",
                    location.pathname === item.href 
                      ? "bg-brand-600 text-white shadow-xl shadow-brand-500/30" 
                      : "text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                  )}
                >
                  <item.icon size={16} />
                  <span className="hidden lg:inline">{item.name}</span>
                </Link>
              ))}
              <div className="w-px h-8 bg-slate-200 mx-2" />
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-red-600 transition-all duration-300 shadow-lg shadow-slate-900/20"
                  title="Logout"
                >
                  <LogOut size={18} className="pointer-events-none" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="px-6 h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-brand-500/20 font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
                >
                  <LogIn size={14} />
                  <span>Portal Login</span>
                </Link>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="md:hidden mt-2"
          >
            <div className="glass rounded-[2.5rem] p-3 shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
              <div className="overflow-y-auto p-1 space-y-1.5 custom-scrollbar">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      location.pathname === item.href 
                        ? "bg-brand-600 text-white shadow-xl shadow-brand-500/20" 
                        : "text-slate-600 hover:bg-brand-50"
                    )}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="p-1 mt-1 border-t border-slate-100/50">
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} className="pointer-events-none" />
                    Logout Account
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <LogIn size={18} />
                    Portal Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
