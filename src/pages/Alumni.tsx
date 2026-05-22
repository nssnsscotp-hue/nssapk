import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, GraduationCap, Mail, Phone, MapPin, Briefcase, Award, Plus, CheckCircle2, Search, ArrowRight, Star, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function AlumniNetwork() {
  const [activeTab, setActiveTab] = useState<'directory' | 'register'>('directory');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alumni, setAlumni] = useState<any[]>([]);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('batch', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setAlumni(data.map(a => ({
          name: a.full_name,
          batch: a.batch,
          occupation: a.legacy_role,
          location: 'Ottapalam',
          contact: 'Mentorship Available',
          expertise: 'NSS Guidance',
          image: `https://ui-avatars.com/api/?name=${a.full_name}&background=random`
        })));
      }
    } catch (err) {
      console.error("Failed to load alumni", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'directory') fetchAlumni();
  }, [activeTab]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setActiveTab('directory');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full mb-4 border border-emerald-200">
              <Users size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Legacy of Excellence</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-6">
              NSS <span className="text-emerald-600">Alumni</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] max-w-2xl mx-auto leading-relaxed">
              Connecting our units' history with our future. Former volunteers collaborating 
              as mentors, advisors, and role models for the current generation.
            </p>
          </motion.div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white rounded-[2rem] shadow-sm border border-slate-200 mb-12 p-2 max-w-sm mx-auto no-print">
           <button 
             onClick={() => setActiveTab('directory')}
             className={cn(
               "flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
               activeTab === 'directory' ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20" : "text-slate-400"
             )}
           >
             <GraduationCap size={16} /> Directory
           </button>
           <button 
             onClick={() => setActiveTab('register')}
             className={cn(
               "flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
               activeTab === 'register' ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20" : "text-slate-400"
             )}
           >
             <Plus size={16} /> Join Network
           </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'directory' ? (
            <motion.div 
               key="directory"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {loading ? (
                <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-200" size={48} /></div>
              ) : alumni.map((alum, idx) => (
                <div key={alum.name} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden group shadow-sm hover:shadow-2xl hover:shadow-emerald-600/5 transition-all">
                   <div className="relative h-32 bg-slate-100 flex items-end px-8">
                      <div className="absolute top-0 right-0 p-8">
                         <div className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-200 shadow-sm">
                           Batch {alum.batch}
                         </div>
                      </div>
                      <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-white shadow-xl overflow-hidden translate-y-8 relative z-10">
                         <img src={alum.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                   </div>
                   
                   <div className="p-8 pt-12">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-1">{alum.name}</h3>
                      <div className="flex items-center gap-2 mb-6">
                         <Briefcase size={12} className="text-emerald-500" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alum.occupation}</span>
                      </div>

                      <div className="space-y-4 mb-8">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                               <MapPin size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{alum.location}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                               <Award size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{alum.expertise}</span>
                         </div>
                      </div>

                      <button className="w-full h-12 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-600/20">
                         <Mail size={14} /> {alum.contact}
                      </button>
                   </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
               key="register"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="max-w-2xl mx-auto bg-white rounded-[3rem] border border-slate-100 p-12 shadow-2xl shadow-slate-200/50"
            >
              {isSubmitted ? (
                <div className="text-center py-12">
                   <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={40} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Registration Received!</h3>
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Welcome back to the NSS Family.</p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-8">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/10">
                         <Heart size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Become a Mentor</h3>
                         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Share your journey with current volunteers</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                         <input required type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NSS Batch (e.g., 2014-17)</label>
                         <input required type="text" placeholder="YYYY-YY" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold" />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Occupation & Company</label>
                      <input required type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold" />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Expertise</label>
                      <textarea required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold min-h-[120px] resize-none" placeholder="e.g., Civil Services, Software Engineering, Social Work..." />
                   </div>

                   <button type="submit" className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3">
                      Register My Profile <ArrowRight size={18} />
                   </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
