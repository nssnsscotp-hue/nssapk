import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Plus, Search, Trash2, Edit2, Loader2, Save, X, ArrowRight, User } from 'lucide-react';
import { GAS_URLS } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface Alumnus {
  name: string;
  batch: string;
  phone: string;
  email: string;
  role: string;
  row: string;
}

export default function AlumniAdmin() {
  const [alumni, setAlumni] = useState<Alumnus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    batch: '',
    phone: '',
    email: '',
    role: ''
  });

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setAlumni(data.map(a => ({
          name: a.full_name,
          batch: a.batch,
          phone: a.mobile, // Mapping mobile to phone for local UI
          email: a.email,
          role: a.legacy_role,
          row: a.id
        })));
      }
    } catch (err: any) {
      console.error("Failed to fetch alumni", err);
      setStatus({ type: 'error', msg: "Fetch Error: " + (err.message || "Failed to load alumni database.") });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActioning('saving');
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const payload = {
        full_name: formData.name,
        batch: formData.batch,
        mobile: formData.phone,
        email: formData.email,
        legacy_role: formData.role
      };
      
      if (editingId !== null) {
        const { error } = await supabase
          .from('alumni')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        setStatus({ type: 'success', msg: `Successfully updated the alumni profile of ${formData.name}!` });
      } else {
        const { error } = await supabase
          .from('alumni')
          .insert([payload]);
        if (error) throw error;
        setStatus({ type: 'success', msg: `Successfully enrolled ${formData.name} to the alumni network!` });
      }

      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', batch: '', phone: '', email: '', role: '' });
      await fetchAlumni();
    } catch (err: any) {
      console.error("Action error in alumni admin:", err);
      setStatus({ 
        type: 'error', 
        msg: "Failed to enroll alumni: " + (err.message || "Database permission denied or columns constraint violated. Please check if your Supabase 'alumni' table permits anonymous inserts under Row Level Security policies.") 
      });
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (id: any, name: string) => {
    setStatus(null);
    setActioning(`delete-${id}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { error } = await supabase
        .from('alumni')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setStatus({ type: 'success', msg: `Removed ${name} from the alumni database.` });
      await fetchAlumni();
    } catch (err: any) {
      console.error("Delete error in alumni admin:", err);
      setStatus({ type: 'error', msg: "Delete failed: " + (err.message || "Database restricted deletion") });
    } finally {
      setActioning(null);
    }
  };

  const startEdit = (a: Alumnus) => {
    setStatus(null);
    setEditingId(a.row);
    setFormData({
      name: a.name,
      batch: a.batch,
      phone: a.phone,
      email: a.email,
      role: a.role
    });
    setIsAdding(true);
  };

  const filteredAlumni = alumni.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.batch.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Alumni Database</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Maintain the legacy roster of Units 36 & 94.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => { setIsAdding(!isAdding); if (!isAdding) setEditingId(null); setStatus(null); }}
            className="w-full md:w-auto h-12 px-6 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            {isAdding ? 'Cancel' : 'Add Alumnus'}
          </button>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search name or batch..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-white border border-slate-200 rounded-2xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-xs uppercase tracking-widest"
            />
          </div>
        </div>
      </header>

      {status && (
        <div className={cn(
          "p-5 rounded-2xl flex items-center justify-between text-xs font-bold uppercase tracking-wider shadow-sm transition-all border",
          status.type === 'success' 
            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
            : "bg-red-50 text-red-800 border-red-100"
        )}>
          <div className="flex items-center gap-3">
            <span className={cn(
              "w-2 h-2 rounded-full",
              status.type === 'success' ? "bg-emerald-500" : "bg-red-500"
            )} />
            <span>{status.msg}</span>
          </div>
          <button 
            onClick={() => setStatus(null)} 
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-700 ml-4 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-600/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 flex items-center gap-2 italic">
                <GraduationCap size={14} /> {editingId !== null ? 'Update Alumni Record' : 'Enroll New Alumnus'}
              </h3>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input 
                    type="text" required placeholder="e.g. Anand Sharma"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Batch (Year)</label>
                  <input 
                    type="text" required placeholder="e.g. 2018-2021"
                    value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number</label>
                  <input 
                    type="tel" required placeholder="e.g. 9876543210"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                  <input 
                    type="email" required placeholder="name@example.com"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Former Role</label>
                  <input 
                    type="text" required placeholder="e.g. Program Officer"
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-xs"
                  />
                </div>
                <div className="flex items-end">
                   <button 
                    disabled={actioning === 'saving'}
                    type="submit"
                    className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {actioning === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {editingId !== null ? 'Update Profile' : 'Confirm Enrollment'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 italic">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Alumnus</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Batch</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Legacy Role</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-200" /></td></tr>
              ) : filteredAlumni.length > 0 ? (
                filteredAlumni.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-900 text-white rounded-xl flex items-center justify-center font-black text-lg italic shadow-lg shadow-indigo-900/10 shrink-0">
                          {a.name?.charAt(0) || <User size={20} />}
                        </div>
                        <span className="font-bold text-slate-900 uppercase tracking-tight">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-lg border border-indigo-100">{a.batch}</span>
                    </td>
                    <td className="px-8 py-6 text-slate-500 font-black text-[10px] uppercase tracking-widest italic">{a.role}</td>
                    <td className="px-8 py-6">
                       <div className="text-xs font-bold text-slate-900">{a.phone}</div>
                       <div className="text-[10px] text-slate-400">{a.email}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => startEdit(a)}
                          className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          disabled={actioning === `delete-${a.row}`}
                          onClick={() => handleDelete(a.row, a.name)}
                          className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                          title="Delete"
                        >
                          {actioning === `delete-${a.row}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic text-sm">No alumni found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
