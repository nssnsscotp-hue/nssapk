import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, Search, Edit2, Loader2, Save, X, User, ShieldCheck, MapPin, Calendar, Phone } from 'lucide-react';
import { GAS_URLS } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface Volunteer {
  name: string;
  username: string;
  unit: string;
  mobile: string;
  role: string;
  row: string;
}

export default function VolunteerIDAdmin() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    mobile: '',
    role: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setVolunteers(data.map(v => ({
          name: v.full_name,
          username: v.username,
          unit: v.unit,
          mobile: v.mobile,
          role: v.role,
          row: v.id
        })));
      }
    } catch (err) {
      console.error("Failed to fetch volunteers", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    setActioning('saving');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          unit: formData.unit,
          mobile: formData.mobile,
          role: formData.role
        })
        .eq('id', editingId);

      if (error) throw error;
      
      alert("ID Updated");
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setActioning(null);
    }
  };

  const startEdit = (v: Volunteer) => {
    setEditingId(v.row);
    setFormData({
      name: v.name,
      unit: v.unit,
      mobile: v.mobile,
      role: v.role || 'Volunteer'
    });
  };

  const filtered = volunteers.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.username.includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">ID Card Management</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Manage official identity data for active volunteers.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-white border border-slate-200 rounded-2xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs uppercase tracking-widest"
          />
        </div>
      </header>

      <AnimatePresence>
        {editingId !== null && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2 italic">
                  <ShieldCheck size={14} /> Editing Official Identity
                </h3>
                <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Legal Name</label>
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unit Hub</label>
                    <select 
                      value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-white"
                    >
                      <option value="36" className="bg-slate-900">Unit 36</option>
                      <option value="94" className="bg-slate-900">Unit 94</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mobile Contact</label>
                    <input 
                      type="tel" required
                      value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role Designation</label>
                    <input 
                      type="text" required
                      value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-white"
                    />
                  </div>
                  <div className="lg:col-span-4 flex justify-end gap-3 mt-4">
                    <button 
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-12 px-6 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/10"
                    >
                      Dismiss
                    </button>
                    <button 
                      disabled={actioning === 'saving'}
                      type="submit"
                      className="h-12 px-8 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
                    >
                      {actioning === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Deploy Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 italic">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID Identity</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Hub</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Verification</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Card Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-200" /></td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 shrink-0">
                           <User className="text-slate-400" size={24} />
                        </div>
                        <div>
                           <div className="font-bold text-slate-900 uppercase tracking-tight">{v.name}</div>
                           <div className="text-[10px] font-mono text-slate-400 uppercase">UID: {v.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-xs font-black text-slate-600 uppercase italic">Unit {v.unit}</div>
                       <div className="text-[9px] text-slate-400 uppercase tracking-widest py-1 flex items-center gap-1">
                          <MapPin size={10} className="text-blue-500" /> Ottapalam Hub
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-900 leading-none">
                             <Phone size={10} className="text-blue-500" /> {v.mobile}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 leading-none">
                             <Calendar size={10} className="text-blue-500" /> Member since 2024
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                        onClick={() => startEdit(v)}
                        className="h-10 px-5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 ml-auto shadow-sm"
                      >
                        <Edit2 size={14} /> Update ID
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">No volunteers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
