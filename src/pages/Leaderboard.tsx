import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, Users, Flame, Heart, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface Volunteer {
  id: string;
  name: string;
  unit: string;
  points: number;
  attendance: number;
  bloodDonations: number;
  rank: number;
  avatar: string;
}

export default function Leaderboard() {
  const [filter, setFilter] = useState<'overall' | 'monthly' | 'blood'>('overall');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Profiles
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, username, full_name, unit, points');
      
      if (userError) throw userError;

      // 2. Fetch Blood Donations
      let bloodQuery = supabase.from('blood_donors').select('full_name, created_at');
      
      // 3. Fetch Attendance Stats
      let attendanceQuery = supabase.from('marked_attendance').select('volunteer_name, unit, created_at');

      const isMonthly = filter === 'monthly';
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      if (isMonthly) {
        bloodQuery = bloodQuery.gte('created_at', firstDayOfMonth);
        attendanceQuery = attendanceQuery.gte('created_at', firstDayOfMonth);
      }

      const [{ data: donors }, { data: attendance }] = await Promise.all([
        bloodQuery,
        attendanceQuery
      ]);
      
      const donorMap: Record<string, number> = {};
      donors?.forEach(d => {
        const key = d.full_name.trim().toLowerCase();
        donorMap[key] = (donorMap[key] || 0) + 1;
      });

      const attMap: Record<string, number> = {};
      attendance?.forEach(a => {
        const key = `${a.volunteer_name.trim().toLowerCase()}-${a.unit}`;
        attMap[key] = (attMap[key] || 0) + 1;
      });

      if (users) {
        const mapped: Volunteer[] = users.map((u, idx) => {
          const nameClean = u.full_name.trim().toLowerCase();
          const key = `${nameClean}-${u.unit}`;
          const attCount = attMap[key] || 0;
          const bloodCount = donorMap[nameClean] || 0;
          
          // For monthly, we calculate live. For overall, we use stored points (which include historical GAS data)
          const totalPoints = isMonthly 
            ? (attCount * 100) + (bloodCount * 500)
            : u.points || (attCount * 100) + (bloodCount * 500);

          return {
            id: u.username || `v-${idx}`,
            name: u.full_name,
            unit: u.unit,
            points: totalPoints,
            attendance: attCount,
            bloodDonations: bloodCount,
            rank: 0,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random&color=fff`
          };
        });

        // Filter and Sort
        let filtered = [...mapped];
        if (filter === 'blood') {
          filtered = filtered.filter(v => v.bloodDonations > 0).sort((a, b) => b.bloodDonations - a.bloodDonations || b.points - a.points);
        } else if (isMonthly) {
          filtered = filtered.filter(v => v.points > 0).sort((a, b) => b.points - a.points);
        } else {
          filtered.sort((a, b) => b.points - a.points);
        }

        // Apply ranking
        filtered.forEach((v, i) => v.rank = i + 1);
        setVolunteers(filtered);
      }
    } catch (err) {
      console.error("Leaderboard logic error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Trophy size={64} className="text-blue-100 animate-bounce" />
          <Loader2 size={24} className="absolute inset-0 m-auto animate-spin text-blue-600" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Calculating Hall of Fame...</p>
      </div>
    );
  }

  const topThree = volunteers.slice(0, 3);
  const others = volunteers.slice(3);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16 px-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute top-40 -right-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md mb-6 border border-white/10">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hero Rankings</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic mb-4">Volunteer Hall of Fame</h1>
            <p className="text-slate-400 font-bold max-w-xl mx-auto uppercase tracking-widest text-xs">Recognizing the backbone of NSS Units 36 & 94 Ottapalam</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-10 mb-20 relative z-20">
        {/* Filters */}
        <div className="flex bg-white rounded-2xl shadow-xl border border-slate-200 p-2 mb-8 items-center overflow-x-auto">
          <button 
            onClick={() => setFilter('overall')}
            className={cn(
              "flex-1 min-w-[120px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              filter === 'overall' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Star size={14} /> Overall
          </button>
          <button 
            onClick={() => setFilter('monthly')}
            className={cn(
              "flex-1 min-w-[120px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              filter === 'monthly' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
             <Flame size={14} /> Monthly Top
          </button>
          <button 
            onClick={() => setFilter('blood')}
            className={cn(
              "flex-1 min-w-[120px] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              filter === 'blood' ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Heart size={14} /> Life Savers
          </button>
        </div>

        {/* Podium (Top 3) */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Rank 2 */}
            {topThree[1] && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="md:order-1 mt-8"
              >
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-lg text-center relative overflow-hidden group">
                  <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-100 transition-colors">
                    <Medal size={48} />
                  </div>
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <img src={topThree[1].avatar} className="w-full h-full rounded-full border-4 border-slate-100 shadow-inner object-cover" />
                    <div className="absolute -bottom-2 -right-2 bg-slate-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-4 border-white">2</div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{topThree[1].name}</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Unit {topThree[1].unit}</p>
                  <div className="bg-slate-50 rounded-xl py-4 px-6 flex justify-between items-center border border-slate-100">
                    <div className="text-left">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Points</div>
                      <div className="text-lg font-black text-slate-900 tracking-tighter">{topThree[1].points}</div>
                    </div>
                    <TrendingUp size={20} className="text-green-500" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:order-2"
              >
                <div className="bg-white rounded-[2.5rem] p-10 border-4 border-yellow-400/20 shadow-2xl text-center relative overflow-hidden group transform hover:scale-105 transition-transform">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/10 rounded-full blur-2xl" />
                  <div className="absolute top-6 right-6 text-yellow-400">
                    <Trophy size={64} />
                  </div>
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    <img src={topThree[0].avatar} className="w-full h-full rounded-full border-4 border-yellow-400 shadow-xl object-cover" />
                    <div className="absolute -bottom-3 -right-3 bg-yellow-400 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border-4 border-white">1</div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{topThree[0].name}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Unit {topThree[0].unit}</p>
                  <div className="bg-slate-900 rounded-2xl py-6 px-8 flex justify-between items-center shadow-xl">
                    <div className="text-left">
                      <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Master Points</div>
                      <div className="text-2xl font-black text-white tracking-tighter">{topThree[0].points}</div>
                    </div>
                    <Star size={24} className="text-yellow-400 fill-yellow-400" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="md:order-3 mt-8"
              >
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-lg text-center relative overflow-hidden group">
                  <div className="absolute top-4 right-4 text-orange-200 group-hover:text-orange-100 transition-colors">
                    <Medal size={48} />
                  </div>
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <img src={topThree[2].avatar} className="w-full h-full rounded-full border-4 border-slate-100 shadow-inner object-cover" />
                    <div className="absolute -bottom-2 -right-2 bg-orange-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-4 border-white">3</div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{topThree[2].name}</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Unit {topThree[2].unit}</p>
                  <div className="bg-slate-50 rounded-xl py-4 px-6 flex justify-between items-center border border-slate-100">
                    <div className="text-left">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Points</div>
                      <div className="text-lg font-black text-slate-900 tracking-tighter">{topThree[2].points}</div>
                    </div>
                    <Star size={20} className="text-orange-300" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* List (Rank 4+) */}
        <div className="space-y-4">
          <div className="px-8 pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
            <div className="w-10 text-center">Rank</div>
            <div className="flex-1">Volunteer Name</div>
            <div className="w-24 text-center hidden sm:block">Attendance</div>
            <div className="w-24 text-center hidden sm:block">Blood</div>
            <div className="w-24 text-right">Points</div>
          </div>
          {others.length > 0 ? others.map((v, idx) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (idx + 1) }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 font-black text-sm border border-slate-100">
                {v.rank}
              </div>
              <div className="flex-1 flex items-center gap-4">
                <img src={v.avatar} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{v.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit {v.unit}</p>
                </div>
              </div>
              <div className="w-24 text-center hidden sm:block">
                <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">
                  <Users size={10} /> {v.attendance}
                </div>
              </div>
              <div className="w-24 text-center hidden sm:block">
                <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black">
                  <Heart size={10} /> {v.bloodDonations}
                </div>
              </div>
              <div className="w-24 text-right font-black text-slate-900 tracking-tighter text-lg">
                {v.points.toLocaleString()}
              </div>
            </motion.div>
          )) : topThree.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
               <Sparkles size={40} className="mx-auto text-blue-200 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No volunteers ranked yet. Start marking attendance!</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic mb-2">Want to be on the board?</h3>
              <p className="text-blue-100 text-sm font-medium">Attend more events, donate blood, and actively participate to earn points.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 min-w-[100px] border border-white/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-blue-200">Attendance</div>
                <div className="text-xl font-black">+100pts</div>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 min-w-[100px] border border-white/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-blue-200">Blood Donation</div>
                <div className="text-xl font-black">+500pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
