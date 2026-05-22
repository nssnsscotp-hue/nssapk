import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Calendar, User, Heart, MessageSquare, Trophy, School, MapPin, 
  Loader2, BarChart3, Library, GraduationCap, Star, Flame, ArrowRight, 
  Instagram, MessageCircle, ExternalLink, HelpCircle, ChevronDown, 
  HeartHandshake, ChevronRight, ShieldCheck, Award, Info, BookOpen,
  Smartphone, Download, Check
} from 'lucide-react';
import { Highlight } from '@/src/pages/types';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function Home() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [activeInstallTab, setActiveInstallTab] = useState<'pwa' | 'apk'>('pwa');
  
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const username = localStorage.getItem('name') || localStorage.getItem('user') || 'Volunteer';
  const userRole = localStorage.getItem('role') || 'volunteer';

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        // Ensure anonymous session for database read operations
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          await supabase.auth.signInAnonymously();
        }

        // 1. Fetch live Highlights
        const { data: highlightsData } = await supabase
          .from('highlights')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (highlightsData) {
          setHighlights(highlightsData.map(h => ({
            id: (h.id || h.row || Math.random().toString()).toString(),
            event: h.event_name || h.event || 'Untitled',
            venue: h.venue || 'N/A',
            date: h.event_date || h.date || new Date().toLocaleDateString(),
            image: h.image_url || h.image || 'https://picsum.photos/seed/nss/800/600',
            description: h.description || ''
          })));
        }

        // 2. Fetch Active Emergency Requests (No dummy counts, just the real alerts)
        const { data: alertsData } = await supabase
          .from('blood_emergency_requests')
          .select('*')
          .eq('status', 'active');
        
        if (alertsData) {
          setEmergencyAlerts(alertsData.map(a => ({
            bloodGroup: a.blood_group,
            venue: a.hospital_venue,
            contact: a.contact_number,
            status: a.status
          })));
        }

        // 3. Fetch announcements for homepage notice board feed
        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
        
        if (announcementsData) {
          setAnnouncements(announcementsData.map(a => ({
            id: (a.id || a.row || Math.random().toString()).toString(),
            title: a.title || 'Official Notification',
            content: a.content || a.message || '',
            date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'Recent'
          })));
        }
      } catch (err) {
        console.error('Home data load failed', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('blood_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_emergency_requests' }, () => {
        fetchHomeData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const punchCards = [
    { title: 'Leaderboard', href: '/leaderboard', icon: Trophy, color: 'bg-amber-600 text-amber-600 hover:border-amber-200 hover:bg-amber-50/50' },
    { title: 'Performance Meter', href: '/performance', icon: BarChart3, color: 'bg-indigo-600 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50' },
    { title: 'Digital ID Card', href: '/id-card', icon: User, color: 'bg-blue-600 text-blue-600 hover:border-blue-200 hover:bg-blue-50/50' },
    { title: 'Bulletin Board', href: '/announcements', icon: Bell, color: 'bg-orange-600 text-orange-600 hover:border-orange-200 hover:bg-orange-50/50' },
    { title: 'Resource Hub', href: '/resources', icon: Library, color: 'bg-emerald-600 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50' },
    { title: 'Alumni Network', href: '/alumni', icon: GraduationCap, color: 'bg-purple-600 text-purple-600 hover:border-purple-200 hover:bg-purple-50/50' },
    { title: 'NSS Quiz Hub', href: '/quiz', icon: Flame, color: 'bg-rose-600 text-rose-600 hover:border-rose-200 hover:bg-rose-50/50' },
    { title: 'Attendance Log', href: '/attendance', icon: Calendar, color: 'bg-teal-600 text-teal-600 hover:border-teal-200 hover:bg-teal-50/50' },
    { title: 'Blood Directory', href: '/bloodbank', icon: Heart, color: 'bg-red-600 text-red-600 hover:border-red-200 hover:bg-red-50/50' },
    { title: 'Reporting System', href: '/complaints', icon: MessageSquare, color: 'bg-slate-600 text-slate-600 hover:border-slate-200 hover:bg-slate-50/50' },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-slate-900 pb-24 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden relative">
      {/* Soft futuristic atmospheric ambient glowing dots */}
      <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/5 to-indigo-500/10 -z-10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 -z-10 blur-[130px] rounded-full pointer-events-none" />

      {/* Notice Board Bulletin Ticker */}
      <div className="bg-slate-950 text-white py-3 overflow-hidden border-b border-slate-900 relative z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Notice Feed</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee text-xs text-slate-300 font-medium">
              {emergencyAlerts.length > 0 ? (
                <span className="inline-flex items-center gap-12">
                  {emergencyAlerts.map((alert, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2.5">
                      <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 animate-pulse" />
                      <strong className="text-white uppercase font-black text-[9px] bg-red-600/30 px-2 py-0.5 rounded tracking-wide">Emergency Request</strong> 
                      Need <span className="font-semibold text-red-400 text-sm">{alert.bloodGroup}</span> blood at {alert.venue}. Contact hotline: <strong className="text-white underline">{alert.contact}</strong>
                    </span>
                  ))}
                  <span className="text-slate-600 font-bold">•</span>
                  <span>⚡ Official digital system updated for Units 36 & 94 NSS College Ottapalam. Please log in to view and register your activities.</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-4">
                  <span>⚡ Official digital system updated for Units 36 & 94 College Ottapalam. Please access the portal below if you are an authorized volunteer to mark your participation roster.</span>
                  <span className="text-slate-600 font-bold">•</span>
                  <span>⚡ National Service Scheme — Not Me, But You — Grade-A Accredited College Wing Activities.</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 sm:pt-8 md:pt-10 space-y-12 animate-fade-in">
        
        {/* Integrated Panoramic Scenic Header Banner (Beautiful, clean, non-obstructed centerpiece) */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative w-full aspect-[21/6] sm:aspect-[21/5] min-h-[130px] sm:min-h-[160px] md:min-h-[185px] rounded-[2.2rem] overflow-hidden border border-slate-100 shadow-xl group z-10"
        >
          {/* Panoramic Campus Image */}
          <img 
            src="https://i.ibb.co/3yvNCYQ6/sl-1-1.jpg" 
            alt="NSS College Ottapalam Main Campus Panoramic" 
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-700 z-0"
            referrerPolicy="no-referrer"
          />
          {/* Ambient clear layout - no blocking gradients or text banners */}
          <div className="absolute inset-0 bg-black/5 z-10" />
        </motion.section>

        {/* Dynamic & Clean Core Motto Introduction section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-[0_5px_15px_rgba(241,245,249,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl pointer-events-none -z-10" />
          
          <div className="lg:col-span-12 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/50 border border-blue-100/50 text-blue-700 rounded-full text-[10px] font-semibold uppercase tracking-widest">
              <Award size={11} className="text-blue-500 animate-pulse" /> National Youth Welfare Division
            </div>
 
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight leading-[0.9] uppercase italic font-sans">
                  Not Me <br />
                  <span className="text-blue-600 relative inline-block">
                    But You.
                    <span className="absolute left-0 bottom-1.5 w-full h-[6px] bg-blue-100/70 -z-10 skew-x-12" />
                  </span>
                </h2>
 
                <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium">
                  The National Service Scheme (NSS) at NSS College Ottapalam operates on the philosophy of democratic living and selfless community service. Volunteers under Units 36 and 94 undergo active social integration, maintaining continuous lifelines for clinical emergencies, nature restoration, public wellness campaigns, and local literacy initiatives.
                </p>
              </div>
 
              <div className="flex flex-col sm:flex-row gap-3.5 shrink-0 self-start md:self-end">
                <Link 
                  to="/gallery" 
                  className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group shadow-xs hover:shadow-md"
                >
                  <span>Campus Activity Diary</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link 
                  to="/help" 
                  className="h-12 px-6 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <HelpCircle size={14} />
                  <span>Help Guide</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE PORTAL INSTALLER & EXPORT HUB */}
        <section className="bg-white border border-slate-100 rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-[0_5px_15px_rgba(241,245,249,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none -z-10" />
          
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/50 border border-amber-100/50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <Smartphone size={12} className="text-amber-500 animate-pulse" /> Mobile-Optimized System
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight italic">
                  Instant Mobile Installation Hub
                </h3>
              </div>
              
              {/* Tab Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-center shrink-0">
                <button
                  onClick={() => setActiveInstallTab('pwa')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                    activeInstallTab === 'pwa'
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  📱 Install Web App (No PC)
                </button>
                <button
                  onClick={() => setActiveInstallTab('apk')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                    activeInstallTab === 'apk'
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  🤖 Build APK for Android
                </button>
              </div>
            </div>

            {activeInstallTab === 'pwa' ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Visual Phone Frame */}
                <div className="lg:col-span-4 bg-slate-950 p-6 rounded-[2.2rem] border-4 border-slate-900 shadow-2xl relative min-h-[300px] flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl z-0" />
                  
                  <div className="relative z-10 text-center space-y-4 pt-6">
                    <div className="w-16 h-16 bg-white p-2.5 rounded-2xl mx-auto shadow-lg animate-bounce">
                      <img src="https://i.ibb.co/k6WG4cv2/1000350739-removebg-preview.png" alt="NSS Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-extrabold text-sm tracking-tight uppercase">NSS Portal App</h4>
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Affiliated under Units 36 & 94</p>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      ● Standalone Ready
                    </div>
                  </div>

                  <div className="relative z-10 bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                      Launches full-screen automatically, stores rosters offline, provides lightning-fast performance, and opens directly from your core app drawer!
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="lg:col-span-8 space-y-5 flex flex-col justify-center">
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-900 uppercase">How to install directly on your phone (Progressive Web App):</h4>
                    <p className="text-slate-500 text-xs font-semibold">
                      Your device supports instant web application installation, which launches in full native window mode exactly like an app downloaded from Google Play or App Store!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Android Instruction */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">A</span>
                        <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">Android (Google Chrome / Brave)</h5>
                      </div>
                      <ul className="space-y-2 text-[11px] text-slate-500 font-bold uppercase tracking-tight leading-loose pl-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 shrink-0">1.</span>
                          <span>Tap the <strong>three dots (⋮)</strong> at the top/bottom right of your web browser.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 shrink-0">2.</span>
                          <span>Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 shrink-0">3.</span>
                          <span>Wait 3 seconds for the shortcut icon to appear on your device desktop!</span>
                        </li>
                      </ul>
                    </div>

                    {/* iOS Instruction */}
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">i</span>
                        <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">Apple iOS (Safari Browser)</h5>
                      </div>
                      <ul className="space-y-2 text-[11px] text-slate-500 font-bold uppercase tracking-tight leading-loose pl-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 shrink-0">1.</span>
                          <span>Tap the <strong>Share</strong> button (box with an arrow pointing up) in Safari.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 shrink-0">2.</span>
                          <span>Scroll down and select <strong>"Add to Home Screen" (⊞)</strong> from the menu.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 shrink-0">3.</span>
                          <span>Click <strong>Add</strong> on the top-right to confirm full native launching format!</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Left Step column */}
                <div className="lg:col-span-8 space-y-4 flex flex-col justify-center">
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-900 uppercase">Automatic APK Compile Pipeline:</h4>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                      We have pre-configured a comprehensive **GitHub Actions Android packaging pipeline** in your workspace! Because you are operating from a mobile device, you can trigger this cloud compiler directly using the AI Studio export feature:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { step: "1", title: "Open Settings / Export Menu", desc: "Look at the toolbar on top of your AI Studio Build workspace screen. Click the settings cog (⚙️) or find the 'Export' buttons." },
                      { step: "2", title: "Export Repository / Connect to GitHub", desc: "Select 'Export to GitHub' or link your personal GitHub profile. AI Studio will securely create a matching code repository for you containing all portal assets." },
                      { step: "3", title: "Auto-Building starts on GitHub", desc: "Our preset GitHub Actions workflow (.github/workflows/android-build.yml) automatically triggers, installing Android SDK & JDK 17, compiling Capacitor wrapper and outputting the final debug APK!" },
                      { step: "4", title: "Download APK instantly to Phone", desc: "Click the actions tab in your GitHub repository, then download and install the direct Android APK file to your mobile device!" }
                    ].map((step, idx) => (
                      <div key={idx} className="flex gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {step.step}
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">{step.title}</h5>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Visual banner */}
                <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-[2.2rem] border border-slate-800 text-white flex flex-col justify-between space-y-6 relative overflow-hidden shadow-xl">
                  {/* Glowing core background */}
                  <div className="absolute inset-0 bg-blue-500/5 blur-3xl pointer-events-none" />
                  
                  <div className="space-y-3.5 relative z-10">
                    <div className="inline-flex p-3 bg-white/10 rounded-2xl text-blue-400">
                      <Download size={20} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">Capacitor Native Engine</span>
                      <h4 className="text-base font-black uppercase tracking-tight italic leading-snug">
                        Ready-to-package Android Blueprint
                      </h4>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                    The config.ts, android directory, and workflow files are fully implemented. Any push or export event initiates compile pipelines without requiring any manual terminal, Java setups, or coding environments on your end!
                  </p>

                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    📱 Perfect for Touchscreens
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* SECURE VOLUNTEER PANEL - Shown strictly ONLY when isLoggedIn is true */}
        <AnimatePresence>
          {isLoggedIn && (
            <motion.section 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">Interactive Portal</p>
                  <h3 className="text-xl font-black uppercase text-slate-900">Volunteer Operations Hub</h3>
                </div>
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Select a workflow option below to query databases or claim points
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {punchCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.title}
                      to={card.href}
                      className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center hover:border-blue-200 transition-all duration-200 hover:-translate-y-1 shadow-xs hover:shadow-md group h-32"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2.5 shadow-xs group-hover:scale-105 transition-transform", card.color.split(' ')[0])}>
                        <Icon size={18} />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2 px-1">
                        {card.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Double Column Display: Program Diaries + Notice Bulletin Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Highlights Module (Left Column 60%) */}
          <section className="lg:col-span-7 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Field Logbook</p>
                <h3 className="text-lg font-black text-slate-900 uppercase">Active Program Diaries</h3>
              </div>
              <Link to="/gallery" className="text-blue-600 hover:text-blue-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <span>View Full Gallery</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {highlights.length > 0 ? (
              (() => {
                const activeId = selectedHighlightId || highlights[0]?.id;
                const activeH = highlights.find(h => h.id === activeId) || highlights[0];
                return (
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-5 shadow-xs">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner">
                      <img 
                        src={activeH.image} 
                        alt={activeH.event} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                        📍 {activeH.venue}
                      </div>
                      <div className="absolute bottom-3 right-3 bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded">
                        {activeH.date}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{activeH.event}</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {activeH.description || "The National Service Scheme team takes up direct regional operations matching emergency campaigns across Palakkad districts."}
                      </p>
                    </div>

                    {/* Choose activity file slider */}
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select an activity to review</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 select-none scrollbar-thin">
                        {highlights.map((h) => (
                          <button
                            key={h.id}
                            onClick={() => setSelectedHighlightId(h.id)}
                            className={cn(
                              "text-left p-2 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center gap-2.5 shrink-0 min-w-[190px]",
                              h.id === activeId 
                                ? "bg-blue-50/50 border-blue-200 text-blue-700" 
                                : "bg-white hover:bg-slate-50 border-slate-100 text-slate-600"
                            )}
                          >
                            <img src={h.image} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                            <span className="line-clamp-1">{h.event}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl text-xs text-slate-400 font-medium">
                No active highlights posted. Highlights can be managed inside the secure cabinet panels.
              </div>
            )}
          </section>

          {/* Official Bulletin Notices Module (Right Column 40%) */}
          <aside className="lg:col-span-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Circular Feed</p>
              <h3 className="text-lg font-black text-slate-900 uppercase">Official Announcements</h3>
            </div>

            <div className="space-y-3.5">
              {announcements.length > 0 ? (
                announcements.map((ann, idx) => (
                  <div key={ann.id || idx} className="bg-white border border-slate-100 p-4.5 rounded-2xl hover:border-blue-200 transition-all flex gap-3.5 group relative shadow-xs">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-slate-400">{ann.date}</span>
                        <span className="bg-slate-100 border border-slate-200/80 text-slate-500 text-[8px] font-bold uppercase px-1.5 py-0.2 rounded">Official</span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight group-hover:text-blue-700 transition-colors leading-snug">
                        {ann.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {ann.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center bg-white border border-dashed border-slate-100 rounded-2xl text-[11px] text-slate-400 italic">
                  No active bulletins published recently.
                </div>
              )}

              <Link
                to="/announcements"
                className="w-full h-11 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Bell size={13} className="text-blue-600" /> 
                <span>Open Public Notice Cabinet</span>
              </Link>
            </div>
          </aside>
        </div>

        {/* Real-world Leadership & Patronage Profiles with Correct Photos & Premium Interactive Frames */}
        <section className="space-y-6 relative">
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-gradient-to-tr from-blue-500/5 to-transparent -z-10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">Institutional Pillar</p>
              <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">OUR TEAM</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              NSS Program Officers Committee
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                name: "Dr. Rajesh R", 
                role: "PRINCIPAL",
                dept: "Patron & Head of Institution",
                image: "https://i.ibb.co/CKWMvrGV/1000144256.jpg",
                accent: "from-blue-600 to-sky-500"
              },
              { 
                name: "Dr. Aparna B", 
                role: "ASST. PROFESSOR ENGLISH", 
                dept: "NSS Programme Officer (Unit 36)",
                image: "https://i.ibb.co/jkrny0qs/1000080292-2.jpg",
                accent: "from-indigo-600 to-purple-500"
              },
              { 
                name: "Dr. Rakhikrishna R", 
                role: "ASST. PROFESSOR PHYSICS", 
                dept: "NSS Programme Officer (Unit 94)",
                image: "https://i.ibb.co/S7yYBqrK/1000080292.jpg",
                accent: "from-emerald-600 to-teal-500"
              }
            ].map((leader, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group bg-white border border-slate-100 rounded-2xl p-4.5 hover:shadow-lg hover:border-blue-100 transition-all duration-300 relative overflow-hidden"
              >
                {/* Visual gradient stripe accent top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${leader.accent}`} />
                
                {/* Rounded avatar layout with premium glowing border */}
                <div className="flex items-center gap-3.5 pt-1.5">
                  <div className="relative shrink-0">
                    <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-tr ${leader.accent} opacity-20 group-hover:opacity-40 blur-xs transition-opacity`} />
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-white overflow-hidden relative shadow-sm">
                      <img 
                        src={leader.image} 
                        alt={leader.name} 
                        className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block leading-none">{leader.role}</span>
                    <h4 className="font-extrabold text-sm text-slate-900 uppercase mt-0.5 leading-tight tracking-tight">{leader.name}</h4>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5 block leading-none">{leader.dept}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Real Statistics Table Framework (No fake larping descriptions) */}
        <section className="bg-slate-950 text-white rounded-[2rem] p-6 sm:p-8 md:p-10 border border-slate-900 shadow-xl overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Unit Framework</span>
              <h4 className="text-base font-black uppercase italic leading-none">Accreditation Summary</h4>
              <p className="text-[11px] text-slate-400 font-medium max-w-[190px] mt-1.5">
                Official institutional metrics registered under the university inspectorate database.
              </p>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8 space-y-1">
              <span className="text-[28px] font-black tracking-tight text-white leading-none">2 Units</span>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Unit 36 & Unit 94</p>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8 space-y-1">
              <span className="text-[28px] font-black tracking-tight text-emerald-400 leading-none">110+</span>
              <p className="text-[9px] font-black text-slate-500 tracking-wider uppercase">Enrolled Volunteers</p>
            </div>

            <div className="pt-4 md:pt-0 md:pl-8 space-y-1">
              <span className="text-[28px] font-black tracking-tight text-sky-400 leading-none">Grade-A</span>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Accredited State Rating</p>
            </div>
          </div>
        </section>

        {/* FAQs and External Directories */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
          
          {/* FAQ Column */}
          <div className="md:col-span-8 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Frequently Asked Guidelines</h3>
            <div className="space-y-2.5">
              {[
                { 
                  q: "What is the core NSS motto?", 
                  a: "The core motto is 'Not Me But You'. It underlines democratic living and insists that one's welfare depends on the welfare of society as a whole." 
                },
                { 
                  q: "Under which university is NSS College affiliated?", 
                  a: "NSS College Ottapalam is affiliated under Calicut University. The NSS units operate strictly under the central rules of the University NSS Cell." 
                },
                {
                  q: "How to register as an HOD or volunteer?",
                  a: "Department Heads can register securely inside the HOD registration section in the admin panel. Once approved, login allows HODs to view their department roster attendance directly."
                }
              ].map((item, i) => {
                const isOpen = faqOpenIndex === i;
                return (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
                    <button
                      onClick={() => setFaqOpenIndex(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left font-extrabold uppercase text-[10px] tracking-tight text-slate-900 group"
                    >
                      <span className="group-hover:text-blue-600 transition-colors">{item.q}</span>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="p-4 pt-0 text-[11px] text-slate-500 font-bold leading-relaxed border-t border-slate-50">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Links Column */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Official Portal Links</h3>
            <div className="space-y-2">
              <a 
                href="https://nsscollegeottapalam.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3.5 bg-blue-50/50 border border-blue-200/60 rounded-xl flex items-center justify-between text-[11px] font-black uppercase text-blue-700 tracking-wider hover:bg-blue-50 hover:border-blue-300 hover:-translate-x-0.5 transition"
              >
                <span>NSS College Ottapalam Website</span>
                <ExternalLink size={12} className="text-blue-500" />
              </a>
              <a 
                href="https://nss.gov.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between text-[11px] font-black uppercase text-slate-700 tracking-wider hover:border-blue-100 hover:-translate-x-0.5 transition"
              >
                <span>National NSS Portal</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
              <a 
                href="https://mybharat.gov.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between text-[11px] font-black uppercase text-slate-700 tracking-wider hover:border-blue-100 hover:-translate-x-0.5 transition"
              >
                <span>MyBharat Portal</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* Modern High-End Footer */}
      <footer className="pt-16 pb-10 bg-slate-950 text-slate-400 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-10">
            <div className="flex items-center gap-3.5 text-center md:text-left">
              <div className="w-12 h-12 bg-white p-1.5 rounded-xl">
                <img src="https://i.ibb.co/k6WG4cv2/1000350739-removebg-preview.png" alt="NSS Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h4 className="text-white font-black text-sm uppercase tracking-wider leading-snug">NSS COLLEGE OTTAPALAM</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">National Service Scheme | Welfare Cells 36 & 94</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <a 
                href="https://www.instagram.com/nss_nsscotp?igsh=eDRsODA4MTFobzYy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition"
                title="Instagram Handle"
              >
                <Instagram size={17} />
              </a>
              <a 
                href="https://chat.whatsapp.com/Brz2cw30s1VCwJjAsot8rg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition"
                title="Official Whatsapp Directory"
              >
                <MessageCircle size={17} />
              </a>
            </div>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest text-center">
            <span>© 2026 NSS COLLEGE OTTAPALAM DIGITAL HUB. ALL RIGHTS RESERVED.</span>
            <span className="text-slate-400 tracking-[0.2em]">"Not Me But You"</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
