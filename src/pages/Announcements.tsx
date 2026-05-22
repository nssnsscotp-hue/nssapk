import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Calendar, RefreshCcw, Loader2, Info, CheckCircle2, UserPlus } from 'lucide-react';
import { GAS_URLS } from '@/src/lib/constants';
import { Announcement } from '@/src/pages/types';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('announcement_rsvps');
    if (saved) setRsvps(JSON.parse(saved));
  }, []);

  const handleRSVP = (id: string) => {
    const newRsvps = { ...rsvps, [id]: !rsvps[id] };
    setRsvps(newRsvps);
    localStorage.setItem('announcement_rsvps', JSON.stringify(newRsvps));
    if (!rsvps[id]) {
      alert("RSVP Successful! We've recorded your interest for this event.");
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setRefreshing(true);
      
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setAnnouncements(data.map(a => ({
          id: (a.id || a.row || Math.random().toString()).toString(),
          title: a.title || 'Untitled Notification',
          message: a.content || a.message || '',
          date: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent'
        })));
      }
    } catch (err) {
      console.error("Failed to load announcements", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex p-3 bg-blue-100 text-blue-700 rounded-2xl mb-4">
              <Bell size={32} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Announcements</h1>
            <p className="text-slate-500 mt-2 text-lg">Stay updated with the latest news and event notices.</p>
          </div>
          
          <button 
            onClick={fetchAnnouncements}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50 h-fit"
          >
            {refreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            Refresh
          </button>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 size={48} className="animate-spin text-blue-600" />
              <p className="text-slate-400 animate-pulse font-medium">Fetching updates...</p>
            </div>
          ) : announcements.length > 0 ? (
            <AnimatePresence>
              {announcements.map((ann, index) => {
                const annId = ann.id || `ann-${index}`;
                const isRsvp = rsvps[annId];
                
                return (
                  <motion.div
                    key={annId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                        {ann.title}
                      </h2>
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-xs font-bold whitespace-nowrap">
                        <Calendar size={14} />
                        {ann.date || 'Recent'}
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap mb-8">
                      {ann.message}
                    </p>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleRSVP(annId)}
                        className={cn(
                          "px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          isRsvp 
                            ? "bg-green-100 text-green-700 pointer-events-none" 
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                        )}
                      >
                        {isRsvp ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                        {isRsvp ? "Going" : "RSVP Now"}
                      </button>
                      {isRsvp && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Added to your events
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="inline-flex p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No Announcements Yet</h3>
              <p className="text-slate-400 mt-2">Check back later for fresh updates from Units 36 & 94.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
