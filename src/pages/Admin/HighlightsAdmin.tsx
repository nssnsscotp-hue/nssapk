import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Plus, Trash2, Loader2, Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Highlight } from '@/src/pages/types';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function HighlightsAdmin() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actioning, setActioning] = useState<string | number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | number | null>(null);
  
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    venue: '',
    description: '',
    image_url: 'https://picsum.photos/seed/nss/800/600'
  });

  const fetchHighlights = async () => {
    try {
      // Ensure session for RLS in case it's restrictive
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) await supabase.auth.signInAnonymously();

      const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setHighlights(data.map(h => ({
          id: (h.id || h.row || '').toString(),
          event: h.event_name || h.event || 'Untitled',
          date: h.event_date || h.date || 'No Date',
          venue: h.venue || '',
          description: h.description || '',
          image: h.image_url || h.image
        })));
      }
    } catch (err) {
      console.error("Fetch Highlights Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();
      
      const { error } = await supabase
        .from('highlights')
        .insert([{
          event_name: formData.event_name,
          event_date: formData.event_date,
          venue: formData.venue,
          description: formData.description,
          image_url: formData.image_url
        }]);
      
      if (error) throw error;

      alert("Highlight published successfully!");
      setFormData({ 
        event_name: '', 
        event_date: '', 
        venue: '',
        description: '',
        image_url: 'https://picsum.photos/seed/nss/800/600'
      });
      fetchHighlights();
    } catch (err: any) {
      console.error(err);
      alert("Error publishing: " + (err.message || "Database error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!id) return;
    
    // Use manual confirmation instead of window.confirm for better mobile/iframe compatibility
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      return;
    }
    
    setActioning(id);
    setConfirmingDelete(null);
    const idStr = id.toString();
    const numericId = parseInt(idStr);
    const isNumeric = !isNaN(numericId);

    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      // Attempt delete by ANY possible ID field
      // We try a more efficient single call first
      let { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', id);
      
      // If that fails or doesn't delete, try fallback fields
      if (error || isNumeric) {
        if (isNumeric) {
          await supabase.from('highlights').delete().eq('id', numericId);
          await supabase.from('highlights').delete().eq('row', numericId);
        }
        await supabase.from('highlights').delete().eq('row', id);
      }
      
      alert("Highlight removed from Unit Gallery.");
      await fetchHighlights();
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert("Failed to delete: " + (err.message || "Database error"));
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight tracking-tighter uppercase italic leading-none">Manage Highlights</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Create and remove events featured on the homepage.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5">
            <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2 uppercase italic text-sm">
              <Plus size={18} className="text-blue-600" />
              New Highlight
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">Event Title</label>
                <input 
                  type="text" required placeholder="NSS Special Camp 2026" 
                  value={formData.event_name} onChange={e => setFormData({...formData, event_name: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-xs font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">Event Date</label>
                <input 
                  type="date" required 
                  value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-xs font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">Venue Location</label>
                <input 
                  type="text" required placeholder="Campus Grounds" 
                  value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-xs font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">Brief Context</label>
                <textarea 
                  placeholder="Summarize the impact..." 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full h-32 bg-slate-50 border border-slate-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-xs font-bold resize-none" 
                />
              </div>
              <button
                disabled={submitting}
                type="submit"
                className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-3 text-[10px] italic mt-4"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <>🚀 Publish Highlight <ChevronRight size={14} /></>}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-1 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2 italic">
                <Trophy size={18} className="text-yellow-600" />
                Active Unit Feed
              </h3>
            </div>
            
            <div className="p-4 sm:p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-blue-200" size={40} />
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Syncing with Cloud Registry...</p>
                </div>
              ) : highlights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {highlights.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5 transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl italic shadow-xl shadow-slate-900/10 shrink-0">
                          {h.event.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg leading-none mb-2">{h.event}</h4>
                          <p className="text-slate-500 text-xs font-medium line-clamp-1 mb-3">{h.description}</p>
                          <div className="flex flex-wrap gap-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 italic">
                              <Calendar size={12} className="text-blue-500" /> {h.date}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 italic">
                              <MapPin size={12} className="text-blue-500" /> {h.venue}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {confirmingDelete === h.id && (
                          <button 
                            onClick={() => setConfirmingDelete(null)}
                            className="h-12 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic"
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(h.id)}
                          disabled={actioning === h.id || submitting}
                          className={cn(
                            "w-12 h-12 flex items-center justify-center rounded-2xl transition-all shrink-0",
                            confirmingDelete === h.id 
                              ? "bg-red-600 text-white shadow-xl shadow-red-600/30 animate-pulse" 
                              : "bg-slate-50 text-slate-400 hover:bg-red-600 hover:text-white"
                          )}
                          title="Delete Highlight"
                        >
                          {actioning === h.id ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                  <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] italic">No highlights recorded in registry</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
