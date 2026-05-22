import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Award, Calendar, BarChart3, TrendingUp, Star, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function PerformanceDashboard() {
  const name = localStorage.getItem('name') || localStorage.getItem('user') || 'Volunteer';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    points: 0,
    attendance: 0,
    bloodDonations: 0,
    rank: '-',
    totalVolunteers: 0
  });

  const [history, setHistory] = useState([
    { name: 'Week 1', points: 0 },
    { name: 'Week 2', points: 0 },
    { name: 'Week 3', points: 0 },
    { name: 'Week 4', points: 0 },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch all profiles
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .order('points', { ascending: false });
        
        if (pErr) throw pErr;

        // 2. Fetch blood donations for current user
        const { data: bloodDonations, error: bErr } = await supabase
          .from('blood_donors')
          .select('*')
          .eq('name', name);
        
        const bloodCount = bloodDonations?.length || 0;

        if (profiles) {
          const myProfile = profiles.find(p => p.full_name === name || p.username === name);
          const myIndex = profiles.findIndex(p => p.full_name === name || p.username === name);
          
          if (myProfile) {
            // Count attendance
            const { count: attendanceCount } = await supabase
              .from('marked_attendance')
              .select('*', { count: 'exact', head: true })
              .eq('volunteer_name', myProfile.full_name)
              .eq('unit', myProfile.unit);

            setStats({
              points: myProfile.points || 0,
              attendance: attendanceCount || 0,
              bloodDonations: bloodCount,
              rank: (myIndex !== -1 ? myIndex + 1 : '-').toString(),
              totalVolunteers: profiles.length
            });

            // Mock history for chart visualization
            const pts = myProfile.points || 0;
            setHistory([
              { name: 'Phase 1', points: Math.floor(pts * 0.2) },
              { name: 'Phase 2', points: Math.floor(pts * 0.4) },
              { name: 'Phase 3', points: Math.floor(pts * 0.7) },
              { name: 'Current', points: pts },
            ]);
          }
        }
      } catch (err) {
        console.error("Dashboard error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [name]);

  const nextMilestone = stats.points < 500 ? 500 : stats.points < 1000 ? 1000 : stats.points < 2500 ? 2500 : 5000;
  const progress = (stats.points / nextMilestone) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Syncing master stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:py-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20">
                <BarChart3 size={24} />
              </div>
              <span className="pro-label text-brand-600">Volunteer Analytics</span>
            </div>
            <h1 className="text-5xl md:text-8xl pro-heading text-slate-900 leading-none">
              Metric <span className="text-brand-600">Sync</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-6 md:mt-8 ml-1">Volunteer: {name} • Units 36 & 94</p>
          </motion.div>
          
          <div className="flex flex-col sm:flex-row gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="pro-card p-10 text-center min-w-[180px] bg-white border-slate-200"
            >
               <div className="pro-label mb-2">Global Rank</div>
               <div className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">#{stats.rank}</div>
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">Active Contributor</div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="pro-card p-10 text-center min-w-[200px] bg-slate-950 text-white border-transparent shadow-2xl shadow-brand-500/20"
            >
               <div className="pro-label text-slate-500 mb-2">Total Points</div>
               <div className="text-5xl font-black text-brand-400 tracking-tighter italic leading-none">{stats.points}</div>
               <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-4">Master Points (MP)</div>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Graph */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                 <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                     <TrendingUp className="text-blue-600" /> Points Progression
                   </h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Growth over participation phases</p>
                 </div>
                 <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                   Active Season
                 </div>
               </div>

               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="points" 
                        stroke="#2563eb" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorPoints)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Participation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stats.attendance}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sessions Attended</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Consistency</span>
                      <span>{Math.min(100, stats.attendance * 5)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, stats.attendance * 5)}%` }} />
                    </div>
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                      <Award size={24} />
                    </div>
                    <div>
                      <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stats.bloodDonations}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Blood Donations</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Life Saver Level</span>
                      <span>Lvl {stats.bloodDonations + 1}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${Math.min(100, stats.bloodDonations * 25)}%` }} />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Rank Path */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
               
               <div className="flex items-center gap-3 mb-8">
                 <Trophy className="text-yellow-400" size={24} />
                 <h3 className="text-xl font-black uppercase tracking-tight italic">Level Up Path</h3>
               </div>

               <div className="mb-8">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Current Class</div>
                      <div className="text-2xl font-black tracking-tighter uppercase italic">{stats.points < 500 ? 'Rookie' : stats.points < 1500 ? 'Veteran' : 'Apex'}</div>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {stats.points} / {nextMilestone} MP
                    </div>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                    Earn <span className="text-white">{nextMilestone - stats.points} more points</span> to unlock next tier badges.
                  </p>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center gap-4 group cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <Sparkles className="text-blue-400" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white">Daily Tasks</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Check announcements for extra points</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                  </div>
               </div>
            </div>

            {/* Badges Preview */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Unlocked Badges</h3>
               <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: '🛡️', name: 'Verified', earned: true },
                    { icon: '🩸', name: 'Donor', earned: stats.bloodDonations > 0 },
                    { icon: '🔥', name: 'Active', earned: stats.attendance > 5 },
                    { icon: '👑', name: 'Crown', earned: stats.rank === '1' },
                    { icon: '🤝', name: 'Social', earned: true },
                    { icon: '🧪', name: 'Science', earned: false },
                  ].map((b, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all",
                        b.earned 
                          ? "bg-blue-50 border-blue-100 text-blue-600 shadow-sm" 
                          : "bg-slate-50 border-transparent text-slate-300 grayscale"
                      )}
                    >
                      <span className="text-xl mb-1">{b.icon}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
