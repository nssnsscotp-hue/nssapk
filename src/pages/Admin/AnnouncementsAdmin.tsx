import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Loader2 } from 'lucide-react';
import { Announcement } from '@/src/pages/types';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function AnnouncementsAdmin() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setAnnouncements(data.map(ann => ({
          id: (ann.id || ann.row || '').toString(),
          title: ann.title,
          message: ann.content,
          date: new Date(ann.created_at || Date.now()).toLocaleDateString()
        })));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleDelete = async (id: string) => {
    if (!id) return;
    
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      return;
    }

    setActioning(id);
    setConfirmingDelete(null);
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      // try numeric conversion for postgrest compatibility
      const numericId = parseInt(id);
      const isNumeric = !isNaN(numericId);

      // Attempt delete by id
      let { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      
      if (error || isNumeric) {
        if (isNumeric) {
          await supabase.from('announcements').delete().eq('id', numericId);
          await supabase.from('announcements').delete().eq('row', numericId);
        }
        await supabase.from('announcements').delete().eq('row', id);
      }
      
      alert("Announcement removed successfully.");
      await fetchAnnouncements();
    } catch (err: any) {
      console.error(err);
      alert("Error deleting: " + (err.message || "Database error"));
    } finally {
      setActioning(null);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      console.log("Attempting to broadcast announcement...");
      
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
      
      const { error } = await supabase
        .from('announcements')
        .insert([{
          title: formData.title,
          content: formData.content
        }]);
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      alert("Announcements broadcasted successfully!");
      setFormData({ title: '', content: '' });
      fetchAnnouncements();
    } catch (err: any) { 
      console.error(err); 
      alert("Error broadcasting: " + (err.message || "Database error"));
    }
    finally { 
      setSubmitting(false); 
      console.log("Broadcast process finished.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Global Announcements</h2>
        <p className="text-slate-500 text-sm">Send urgent push notifications and news to all volunteers.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">Compose</h3>
            <form onSubmit={handlePost} className="space-y-4">
              <input 
                type="text" required placeholder="Subject" 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-medium" 
              />
              <textarea 
                required placeholder="Message body..." 
                rows={5}
                value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium resize-none text-sm" 
              />
              <button
                disabled={submitting}
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" /> : "🚀 Broadcast News"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">History</h3>
            {loading ? (
               <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : (
              <div className="space-y-4">
                {announcements.slice(0, 10).map((ann, i) => (
                  <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      {confirmingDelete === ann.id && (
                        <button 
                          onClick={() => setConfirmingDelete(null)}
                          className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic bg-white rounded-xl border border-slate-100"
                        >
                          No
                        </button>
                      )}
                      <button 
                        onClick={() => ann.id && handleDelete(ann.id)}
                        disabled={!!actioning}
                        className={cn(
                          "p-3 rounded-xl transition-all border border-slate-100 shadow-sm",
                          confirmingDelete === ann.id 
                            ? "bg-red-600 text-white animate-pulse" 
                            : "text-slate-400 hover:text-red-500 hover:bg-white md:opacity-50 md:group-hover:opacity-100"
                        )}
                        title="Delete Announcement"
                      >
                        {actioning === ann.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1 pr-10">{ann.title}</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">{ann.message}</p>
                    <div className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{ann.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
