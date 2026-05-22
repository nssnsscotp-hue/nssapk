import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Plus, Search, Trash2, Loader2, Save, X, Droplets, MapPin, AlertCircle, Phone, Megaphone, Download, Filter, User, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface EmergencyRequest {
  bloodGroup: string;
  count: string;
  venue: string;
  contact: string;
  status: 'active' | 'resolved';
  row: string;
}

interface Donor {
  id: string;
  full_name: string;
  blood_group: string;
  mobile: string;
  unit: string;
  created_at: string;
}

export default function BloodAdmin() {
  const [activeTab, setActiveTab] = useState<'tickers' | 'donors'>('tickers');
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');

  const [formData, setFormData] = useState({
    bloodGroup: 'A+',
    count: '1 Unit',
    venue: '',
    contact: '',
  });

  useEffect(() => {
    if (activeTab === 'tickers') {
      fetchRequests();
    } else {
      fetchDonors();
    }
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blood_emergency_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setRequests(data.map(r => ({
          bloodGroup: r.blood_group,
          count: r.units_required,
          venue: r.hospital_venue,
          contact: r.contact_number,
          status: r.status as 'active' | 'resolved',
          row: r.id || r.row
        })));
      }
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blood_donors')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setDonors(data);
    } catch (err) {
      console.error("Failed to fetch donors", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Full Name', 'Blood Group', 'Mobile', 'Unit', 'Registered At'];
    const rows = donors.map(d => [
      `"${d.full_name}"`,
      d.blood_group,
      d.mobile,
      d.unit,
      new Date(d.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `blood_donors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDonor = async (id: string) => {
    if (confirmingDelete !== `donor-${id}`) {
      setConfirmingDelete(`donor-${id}`);
      return;
    }

    setActioning(`donor-${id}`);
    setConfirmingDelete(null);
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const { error } = await supabase.from('blood_donors').delete().eq('id', id);
      if (error) throw error;
      alert("Donor record removed.");
      fetchDonors();
    } catch (err) {
      console.error(err);
      alert("Failed to delete record.");
    } finally {
      setActioning(null);
    }
  };

  const filteredDonors = donors.filter(d => {
    const matchesSearch = d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || d.mobile.includes(searchTerm);
    const matchesFilter = filterGroup === 'All' || d.blood_group === filterGroup;
    return matchesSearch && matchesFilter;
  });

  const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setActioning('saving');
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const { error } = await supabase
        .from('blood_emergency_requests')
        .insert([{
          blood_group: formData.bloodGroup,
          units_required: formData.count,
          hospital_venue: formData.venue,
          contact_number: formData.contact,
          status: 'active'
        }]);

      if (error) throw error;
      
      alert("Broadcast Active");
      setIsAdding(false);
      setFormData({ bloodGroup: 'A+', count: '1 Unit', venue: '', contact: '' });
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert("Broadcast failed");
    } finally {
      setActioning(null);
    }
  };

  const handleStatus = async (id: any, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'resolved' : 'active';
    setActioning(`status-${id}`);
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const { error } = await supabase
        .from('blood_emergency_requests')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (id: any) => {
    if (!id) return;
    
    if (confirmingDelete !== `alert-${id}`) {
      setConfirmingDelete(`alert-${id}`);
      return;
    }

    setActioning(`delete-${id}`);
    setConfirmingDelete(null);
    const idStr = id.toString();
    const numericId = parseInt(idStr);
    const isNumeric = !isNaN(numericId);

    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      // try both field names for maximum compatibility
      const { error } = await supabase
        .from('blood_emergency_requests')
        .delete()
        .eq('id', id);
      
      if (error) {
        if (isNumeric) {
          await supabase.from('blood_emergency_requests').delete().eq('id', numericId);
          await supabase.from('blood_emergency_requests').delete().eq('row', numericId);
        } else {
          await supabase.from('blood_emergency_requests').delete().eq('row', id);
        }
      }
      
      alert("Alert removed successfully.");
      await fetchRequests();
    } catch (err: any) {
      console.error(err);
      alert("Error removing alert: " + (err.message || "Database connection error"));
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Blood Bank Command</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Manage donor archives and emergency broadcast tickers.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('tickers')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'tickers' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Tickers
          </button>
          <button 
            onClick={() => setActiveTab('donors')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'donors' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Donors
          </button>
        </div>
      </header>

      {activeTab === 'tickers' ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <Megaphone size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency Broadcast</p>
                <p className="text-sm font-bold text-slate-900">Current active alerts on homepage</p>
              </div>
            </div>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="h-10 px-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all flex items-center gap-2"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              {isAdding ? 'Cancel' : 'New Alert'}
            </button>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-600/5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-6 flex items-center gap-2 italic">
                    <AlertCircle size={14} /> Send Emergency Alert
                  </h3>
                  <form onSubmit={handleBroadcast} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Blood Group</label>
                      <select 
                        value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-red-600 font-bold text-xs"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Requirements</label>
                      <input 
                        type="text" required placeholder="e.g. 2 Units"
                        value={formData.count} onChange={e => setFormData({...formData, count: e.target.value})}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-red-600 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hospital / Venue</label>
                      <input 
                        type="text" required placeholder="e.g. Ottapalam Hospital"
                        value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-red-600 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Details</label>
                      <input 
                        type="text" required placeholder="Phone number"
                        value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-red-600 font-bold text-xs"
                      />
                    </div>
                    <div className="lg:col-span-4 flex justify-end">
                       <button 
                        disabled={actioning === 'saving'}
                        type="submit"
                        className="h-12 px-8 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all flex items-center gap-2"
                      >
                        {actioning === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Megaphone size={16} />}
                        Launch Ticker
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-red-200" size={32} /></div>
            ) : requests.length > 0 ? (
              requests.map((r, i) => (
                <div key={r.row || i} className={cn(
                  "p-8 rounded-[2.5rem] border transition-all relative overflow-hidden",
                  r.status === 'active' ? "bg-white border-red-100 shadow-xl shadow-red-600/5 transition-all" : "bg-slate-50 border-slate-200 opacity-60"
                )}>
                  {confirmingDelete === `alert-${r.row}` && (
                    <button 
                      onClick={() => setConfirmingDelete(null)}
                      className="absolute top-8 right-32 h-10 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic z-20"
                    >
                      Cancel
                    </button>
                  )}
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border",
                        r.status === 'active' ? "bg-red-600 text-white border-red-500" : "bg-slate-200 text-slate-400 border-slate-300"
                      )}>
                        {r.bloodGroup}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase italic tracking-tighter">{r.count} required</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           <MapPin size={10} className="text-red-500" /> {r.venue}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleStatus(r.row, r.status)}
                        disabled={!!actioning}
                        className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center font-black text-[10px]"
                      >
                        {actioning === `status-${r.row}` ? <Loader2 size={14} className="animate-spin" /> : (r.status === 'active' ? 'End' : 'Live')}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.row);
                        }}
                        disabled={!!actioning}
                        className={cn(
                          "w-10 h-10 rounded-xl transition-all flex items-center justify-center",
                          confirmingDelete === `alert-${r.row}` 
                            ? "bg-red-600 text-white animate-pulse" 
                            : "bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white"
                        )}
                      >
                        {actioning === `delete-${r.row}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white relative z-10">
                    <Phone size={14} className="text-red-400" />
                    <span className="text-xs font-black uppercase tracking-widest">{r.contact}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-slate-400 italic font-medium border-2 border-dashed border-slate-200 rounded-[2.5rem]">No pending blood requests.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search donors by name or mobile..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-red-600 font-bold text-xs"
              />
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                <div className="p-1.5 bg-white text-slate-400 rounded-lg shadow-sm">
                  <Filter size={14} />
                </div>
                <select 
                  value={filterGroup} 
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none pr-4"
                >
                  {bloodGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button 
                onClick={downloadCSV}
                className="h-12 px-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-red-600/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Donor Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Group</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Info</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-8 py-4"><div className="h-4 bg-slate-100 rounded-lg w-full" /></td>
                      </tr>
                    ))
                  ) : filteredDonors.length > 0 ? (
                    filteredDonors.map((d) => (
                      <tr key={d.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black text-xs">
                              {d.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{d.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{new Date(d.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black tracking-widest uppercase">
                            {d.blood_group}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                            <Phone size={12} />
                            {d.mobile}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 w-fit px-3 py-1 rounded-full">Unit {d.unit}</p>
                        </td>
                        <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                          {confirmingDelete === `donor-${d.id}` && (
                            <button 
                              onClick={() => setConfirmingDelete(null)}
                              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 italic"
                            >
                              No
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteDonor(d.id)}
                            disabled={actioning === `donor-${d.id}`}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              confirmingDelete === `donor-${d.id}` 
                                ? "bg-red-600 text-white animate-pulse" 
                                : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            )}
                          >
                            {actioning === `donor-${d.id}` ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <Droplets size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No donors found matching criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
