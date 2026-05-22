import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Share2, ShieldCheck, Calendar, Phone, MapPin, Award, CheckCircle, User, Loader2, Trophy } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GAS_URLS } from '@/src/lib/constants';
import { supabase } from '@/src/lib/supabase';

export default function VolunteerID() {
  const storedUser = localStorage.getItem('user') || '';
  const storedName = localStorage.getItem('name') || 'Volunteer Name';
  const [userName, setUserName] = useState(storedName);
  const [phone, setPhone] = useState(localStorage.getItem('phone') || 'No Phone');
  const [role, setRole] = useState(localStorage.getItem('role') || 'Volunteer');
  const userId = localStorage.getItem('userId') || 'NSS-2024-XXXX';
  const [downloading, setDownloading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({ points: 0, attendance: 0, rank: '-' });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!storedUser) return;
      try {
        setLoadingStats(true);
        // 1. Fetch Profile info (fresh)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', storedUser.toLowerCase())
          .single();

        if (profile) {
          setUserName(profile.full_name);
          setPhone(profile.mobile || 'No Phone');
          setRole(profile.role || 'Volunteer');
        }

        // 2. Fetch Leaderboard for Rank & Points
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('username, points')
          .order('points', { ascending: false });

        if (allProfiles) {
          const myIndex = allProfiles.findIndex(p => p.username.toLowerCase() === storedUser.toLowerCase());
          const myProfile = allProfiles[myIndex];
          
          // 3. Fetch Attendance count
          const { count } = await supabase
            .from('marked_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('volunteer_name', profile?.full_name || '')
            .eq('unit', profile?.unit || '');

          if (myProfile) {
            setStats({
              points: myProfile.points || 0,
              attendance: count || 0,
              rank: myIndex !== -1 ? (myIndex + 1).toString() : '-'
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch ID stats", err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchUserStats();
  }, [storedUser]);

  // Digital Achievements
  const achievements = [
    { name: 'Blood Donor', earned: stats.points >= 500, icon: '🩸' },
    { name: 'Camp Star', earned: true, icon: '⛺' },
    { name: 'Master Vol.', earned: stats.attendance >= 10, icon: '🎓' },
    { name: 'Top 10', earned: stats.rank !== '-' && parseInt(stats.rank) <= 10, icon: '🌟' },
  ];

  const handleDownload = () => {
    setDownloading(true);
    // Simple way for now: Print the card
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
           <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
           >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-4 border border-blue-200">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Volunteer ID</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900">Your Digital NSS ID</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Official Identity - Units 36 & 94 Ottapalam</p>
          </motion.div>
        </div>

        {/* ID Card Display */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative group print:shadow-none"
        >
          {/* Main Card */}
          <div 
            ref={cardRef}
            className="w-full aspect-[1.6/1] md:aspect-[1.58/1] bg-slate-900 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden relative border-4 border-slate-800"
          >
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 skew-x-[-15deg] translate-x-20" />
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700" />
            
            {/* Content Container */}
            <div className="h-full flex flex-col p-8 md:p-12 relative z-10">
              {/* Top Header */}
              <div className="flex justify-between items-start mb-auto">
                <div className="flex items-center gap-4">
                   <div className="bg-white rounded-xl p-1.5 w-14 h-14 shadow-lg border border-white/20">
                     <img src="https://i.ibb.co/k6WG4cv2/1000350739-removebg-preview.png" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                   </div>
                   <div className="text-left">
                     <h2 className="text-lg font-black text-white leading-none uppercase italic tracking-tighter">NSS COLLEGE OTTAPALAM</h2>
                     <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">NSS UNITS 36 & 94</p>
                   </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">ID Number</div>
                  <div className="text-sm font-mono font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10 tracking-widest">{userId}</div>
                </div>
              </div>

              {/* Main Body */}
              <div className="flex items-end gap-10">
                {/* Photo Area */}
                <div className="relative shrink-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-800 rounded-3xl border-4 border-slate-700 overflow-hidden shadow-2xl relative">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${userName}&background=002c6c&color=fff&size=512`} 
                      className="w-full h-full object-cover grayscale brightness-110" 
                    />
                    <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay" />
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl">
                    <CheckCircle size={20} />
                  </div>
                </div>

                {/* Details Area */}
                <div className="flex-1 pb-2">
                  <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none mb-4">{userName}</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <User size={10} className="text-blue-500" /> Designation
                      </div>
                      <div className="text-xs font-black text-blue-400 uppercase tracking-widest">{role} Vol.</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Phone size={10} className="text-blue-500" /> Contact
                      </div>
                      <div className="text-xs font-bold text-white leading-none">{phone}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Calendar size={10} className="text-blue-500" /> Joined
                      </div>
                      <div className="text-xs font-bold text-white leading-none">Sept 2024</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <MapPin size={10} className="text-blue-500" /> Station
                      </div>
                      <div className="text-xs font-bold text-white leading-none uppercase">Ottapalam</div>
                    </div>
                  </div>

                  {/* Points & Rank Overlay */}
                  <div className="mt-6 flex gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                       <div className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Master Points</div>
                       <div className="text-sm font-black text-white tracking-tighter leading-none">{stats.points}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                       <div className="text-[7px] font-black text-yellow-400 uppercase tracking-widest leading-none mb-1">Unit Rank</div>
                       <div className="text-sm font-black text-white tracking-tighter leading-none">#{stats.rank}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Hologram */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-45 scale-150">
                <img src="https://i.ibb.co/k6WG4cv2/1000350739-removebg-preview.png" className="w-[800px]" referrerPolicy="no-referrer" />
              </div>
            </div>

            {/* Signature Area */}
            <div className="absolute bottom-10 right-10 text-right opacity-30 group-hover:opacity-100 transition-opacity">
              <div className="text-[8px] font-black text-white uppercase tracking-widest mb-4">Auth. Sign (PO)</div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Signature_of_Barack_Obama.svg" className="h-8 invert ml-auto filter grayscale opacity-80" />
            </div>
          </div>
        </motion.div>

        {/* Digital Achievements Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 italic">
              <Award className="text-yellow-500" /> Performance Badges
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3 / 4 Earned</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((ach) => (
              <div 
                key={ach.name}
                className={cn(
                  "p-6 rounded-3xl text-center border-2 transition-all",
                  ach.earned 
                    ? "bg-white border-yellow-400/20 shadow-lg shadow-yellow-400/5" 
                    : "bg-slate-100 border-transparent grayscale opacity-50"
                )}
              >
                <div className="text-4xl mb-4">{ach.icon}</div>
                <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{ach.name}</div>
                {ach.earned && (
                  <div className="mt-2 text-[8px] font-black text-green-500 uppercase tracking-widest flex items-center justify-center gap-1">
                    <CheckCircle size={8} /> Verified
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 no-print">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 h-14 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
          >
            {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            Download Official ID Card
          </button>
          <button className="h-14 px-8 bg-white text-slate-600 border border-slate-200 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3">
            <Share2 size={18} />
            Share Profile
          </button>
        </div>

        <p className="mt-8 text-center text-slate-400 text-[10px] font-medium uppercase tracking-widest no-print">
          * This is a digital identity used for NSS Unit verification. 
          Keep it for event check-ins.
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .min-h-screen { min-height: auto !important; height: auto !important; padding: 0 !important; }
          .max-w-2xl { max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
        }
      `}</style>
    </div>
  );
}
