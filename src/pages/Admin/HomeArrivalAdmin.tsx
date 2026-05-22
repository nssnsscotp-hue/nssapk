import React, { useState, useEffect } from 'react';
import { 
  Home, User, Clock, CheckCircle2, Navigation, 
  Search, Filter, Loader2, ShieldCheck, MapPin
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

interface ArrivalRecord {
  user_id: string;
  volunteer_name: string;
  unit: string;
  status: 'Resting' | 'On the Way' | 'Reached Home';
  message?: string;
  updated_at: string;
}

export default function HomeArrivalAdmin() {
  const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const fetchArrivals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('home_arrival')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setArrivals(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArrivals();
  }, []);

  const filtered = arrivals.filter(a => {
    const matchesSearch = a.volunteer_name.toLowerCase().includes(search.toLowerCase());
    const matchesUnit = unitFilter ? a.unit === unitFilter : true;
    return matchesSearch && matchesUnit;
  });

  const stats = {
    total: arrivals.length,
    onWay: arrivals.filter(a => a.status === 'On the Way').length,
    reached: arrivals.filter(a => a.status === 'Reached Home').length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic underline decoration-indigo-500/30">Arrival Monitoring</h2>
          <p className="text-slate-500 text-sm font-medium">Real-time safety status of volunteers after programs.</p>
        </div>
        <div className="flex gap-2">
            <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 flex items-center gap-2">
                <span className="text-sm font-black italic">{stats.onWay}</span>
                <span className="text-[10px] uppercase font-black tracking-widest">On Way</span>
            </div>
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2">
                <span className="text-sm font-black italic">{stats.reached}</span>
                <span className="text-[10px] uppercase font-black tracking-widest">Home</span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <section className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Search Profile</label>
               <div className="relative">
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name..." 
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 pl-10 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filter Unit</label>
               <div className="flex gap-2">
                  {['', '36', '94'].map(u => (
                    <button
                      key={u}
                      onClick={() => setUnitFilter(u)}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        unitFilter === u ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400 border border-slate-100"
                      )}
                    >
                      {u || 'All'}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
             <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Admin Control</span>
             </div>
             <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Data refreshes automatically when a volunteer updates their status. 
                Keep this dashboard open for real-time monitoring.
             </p>
          </div>
        </section>

        <section className="lg:col-span-3">
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Volunteer</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Journey Details</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" /></td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={3} className="py-20 text-center text-slate-400 font-bold italic">No records found matching filters.</td></tr>
                    ) : filtered.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm">
                                 {a.volunteer_name[0]}
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-900 italic tracking-tight">{a.volunteer_name}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit {a.unit}</div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="space-y-2">
                             <div className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight",
                                a.status === 'Reached Home' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                a.status === 'On the Way' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                "bg-slate-100 text-slate-500"
                             )}>
                                {a.status === 'Reached Home' ? <CheckCircle2 size={12} /> : a.status === 'On the Way' ? <Navigation size={12} className="rotate-45" /> : <Clock size={12} />}
                                {a.status}
                             </div>
                             {a.message && (
                               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 max-w-xs">
                                 <p className="text-[10px] font-bold text-slate-600 italic">" {a.message} "</p>
                               </div>
                             )}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="text-xs font-bold text-slate-900">{new Date(a.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(a.updated_at).toLocaleDateString()}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
