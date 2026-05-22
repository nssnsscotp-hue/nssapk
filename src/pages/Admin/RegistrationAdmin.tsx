import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, XCircle, Loader2, UserCheck, Shield, ShieldAlert,
  ChevronRight, Search, UserPlus, Star, Trash2
} from 'lucide-react';
import { GAS_URLS } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import bcrypt from 'bcryptjs';

interface Volunteer {
  name: string;
  unit: string;
  mobile: string;
  username: string;
  row: string;
  role?: string;
  password?: string;
  department?: string;
}

export default function RegistrationAdmin() {
  const [pending, setPending] = useState<Volunteer[]>([]);
  const [approved, setApproved] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegForm, setShowRegForm] = useState(false);
  const [showHODForm, setShowHODForm] = useState(false);
  const [regData, setRegData] = useState({
    unit: '36',
    name: '',
    mobile: '',
    username: '',
    password: '',
    department: 'English'
  });
  const [hodData, setHodData] = useState({
    name: '',
    username: '',
    password: '',
    department: 'English'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const pendRes = await supabase.from('pending_requests').select('*').order('created_at', { ascending: false });
      const appRes = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      
      if (pendRes.error) {
        console.error("Pending Requests Error:", pendRes.error);
        if (pendRes.error.message?.includes('RLS')) {
          setError("Database Access Denied: Check Supabase RLS Policies.");
        } else {
          setError("Connection Error: " + pendRes.error.message);
        }
      }
      
      if (pendRes.data) {
        setPending(pendRes.data.map((p: any) => ({
          name: p.full_name,
          unit: p.unit,
          mobile: p.mobile,
          username: p.username,
          row: p.id,
          password: p.password,
          department: p.department || ''
        })));
      }
      
      if (appRes.data) {
        setApproved(appRes.data.map((a: any) => ({
          name: a.full_name,
          unit: a.unit,
          mobile: a.mobile,
          username: a.username,
          row: a.id,
          role: a.role,
          department: a.department || ''
        })));
      }
    } catch (err: any) { 
      console.error("Fetch error:", err); 
      setError("Fatal Connection Error. Check console.");
    } finally { 
      setLoading(false); 
    }
  };

  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'makeAdmin' | 'deleteApproved') => {
    const actionKey = `${action}-${id}`;
    if (confirmingAction !== actionKey) {
      setConfirmingAction(actionKey);
      return;
    }
    
    setActioning(id);
    setConfirmingAction(null);
    const numericId = parseInt(id);
    const isNumeric = !isNaN(numericId);

    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      if (action === 'approve') {
        const userToApprove = pending.find(p => p.row && (p.row.toString() === id.toString() || p.username.toLowerCase() === id.toString().toLowerCase()));
        
        if (!userToApprove) {
          console.error("User not found in pending list. Looking for ID:", id);
          console.log("Current pending items:", pending);
          throw new Error("User not found in the pending list. Try refreshing.");
        }

        console.log("Attempting to approve user:", userToApprove);

        // Ensure we have a valid UUID for the profiles table
        let newProfileId = '';
        const generateUUID = () => {
          try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              return crypto.randomUUID();
            }
          } catch (e) {}
          // Manual fallback that is a VALID UUID format
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        newProfileId = userToApprove.row; // Use the same ID as the pending request

        // 1. Insert into profiles
        const profileData: any = {
          id: newProfileId, 
          username: userToApprove.username.toLowerCase(),
          full_name: userToApprove.name,
          unit: userToApprove.unit,
          mobile: userToApprove.mobile,
          password: (userToApprove as any).password,
          role: 'volunteer',
          points: 0,
          created_at: new Date().toISOString(),
          department: (userToApprove as any).department || 'English'
        };

        console.log("Attempting profile creation with ID:", newProfileId);

        let { error: insErr } = await supabase.from('profiles').insert([profileData]);
        
        if (insErr) {
          console.error("Primary Insertion Failed:", insErr);
          
          // If the pending row ID failed (maybe because it's not a UUID or not in Auth), 
          // try a fresh UUID as a last resort, but we know this might hit the FK constraint if one exists.
          if (insErr.message?.includes('invalid input syntax for type uuid') || insErr.message?.includes('violates foreign key constraint')) {
            const fallbackId = '00000000-0000-4xxx-yxxx-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');
            console.log("Attempting fallback with random UUID:", fallbackId);
            const { error: insErr2 } = await supabase.from('profiles').insert([{ ...profileData, id: fallbackId }]);
            insErr = insErr2;
          }
        }

        if (insErr) {
          throw new Error(`Profile Creation Failed: ${insErr.message}. This usually means the 'profiles' table has a Foreign Key constraint to 'auth.users' but no Auth user exists for this person. Please check your Supabase Database Schema.`);
        }

        // 2. Delete from pending_requests
        // Try deleting by both 'id' and 'row' to be sure
        const { error: delErr } = await supabase.from('pending_requests').delete().eq('id', userToApprove.row);
        
        if (delErr) {
          console.warn("Could not delete from pending (maybe already gone?):", delErr);
          // Try by username as backup
          await supabase.from('pending_requests').delete().eq('username', userToApprove.username);
        }
        
        alert(`Success! ${userToApprove.name} is now an active volunteer.`);
      } else if (action === 'reject') {
        const { error } = await supabase.from('pending_requests').delete().eq('id', id);
        if (error && isNumeric) {
          await supabase.from('pending_requests').delete().eq('row', numericId);
        }
        alert("Request Rejected");
      } else if (action === 'makeAdmin') {
        const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
        if (error && isNumeric) {
          await supabase.from('profiles').update({ role: 'admin' }).eq('row', numericId);
        }
        alert("Promoted to Admin");
      } else if (action === 'deleteApproved' as any) {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error && isNumeric) {
          await supabase.from('profiles').delete().eq('row', numericId);
        }
        alert("Account Deleted. They can now register again.");
      }
      
      fetchData();
    } catch (err: any) { 
      console.error(err); 
      alert("Action failed: " + (err.message || "Database error"));
    } finally { 
      setActioning(null); 
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name || !regData.unit || !regData.username || !regData.password || !regData.mobile || !regData.department) {
      alert("Please fill all fields");
      return;
    }

    setActioning('register');
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const hashedPassword = await bcrypt.hash(regData.password, 10);
      
      const { error } = await supabase.from('pending_requests').insert([{
        full_name: regData.name,
        unit: regData.unit,
        mobile: regData.mobile,
        username: regData.username.toLowerCase(),
        password: hashedPassword,
        department: regData.department
      }]);

      if (error) throw error;
      
      alert("Registration request created successfully");
      setRegData({ unit: '36', name: '', mobile: '', username: '', password: '', department: 'English' });
      setShowRegForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Registration failed.");
    } finally {
      setActioning(null);
    }
  };

  const handleRegisterHOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hodData.name || !hodData.username || !hodData.password || !hodData.department) {
      alert("Please fill all fields");
      return;
    }

    setActioning('register_hod');
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const hashedPassword = await bcrypt.hash(hodData.password, 10);
      
      const newHODId = 'hod-' + Math.random().toString(16).slice(2, 14);

      const { error } = await supabase.from('profiles').insert([{
        id: newHODId,
        full_name: hodData.name,
        username: hodData.username.toLowerCase(),
        password: hashedPassword,
        role: 'hod',
        department: hodData.department,
        unit: 'HOD-DEP',
        points: 0,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      
      alert(`Success! HOD registered successfully for ${hodData.department} department.`);
      setHodData({ name: '', username: '', password: '', department: 'English' });
      setShowHODForm(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("HOD registration failed: " + (err.message || "Database error"));
    } finally {
      setActioning(null);
    }
  };

  const filteredPending = pending.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.unit.toString().includes(searchTerm) || 
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApproved = approved.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.unit.toString().includes(searchTerm) || 
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Volunteer Onboarding</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 uppercase tracking-widest font-bold">Manage entry requests and administrative privileges.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <button 
            onClick={() => { setShowRegForm(!showRegForm); setShowHODForm(false); }}
            className="w-full sm:w-auto h-12 px-6 bg-slate-900 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={18} /> {showRegForm ? 'Cancel' : 'Register Volunteer'}
          </button>
          
          <button 
            onClick={() => { setShowHODForm(!showHODForm); setShowRegForm(false); }}
            className="w-full sm:w-auto h-12 px-6 bg-blue-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <Shield size={18} /> {showHODForm ? 'Cancel' : 'Register HOD'}
          </button>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search name or unit..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-white border border-slate-200 rounded-2xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-[10px] sm:text-xs uppercase tracking-widest placeholder:italic"
            />
          </div>
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-red-50 border border-red-100 rounded-[2rem] text-red-600 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-red-600/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Database Sync Alert</p>
              <p className="text-sm font-bold opacity-80">{error}</p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all"
          >
            Retry Connection
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {showHODForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-blue-200 shadow-xl shadow-blue-600/5 italic">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 mb-6 flex items-center gap-2">
                <Shield size={14} /> Direct HOD Account Provisioning
              </h3>
              <form onSubmit={handleRegisterHOD} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">HOD Full Name</label>
                  <input 
                    type="text" required placeholder="e.g. Dr. Ramesh P"
                    value={hodData.name} onChange={e => setHodData({...hodData, name: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Choose Username</label>
                  <input 
                    type="text" required placeholder="e.g. hod_cs"
                    value={hodData.username} onChange={e => setHodData({...hodData, username: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                  <input 
                    type="password" required placeholder="••••••••"
                    value={hodData.password} onChange={e => setHodData({...hodData, password: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Department</label>
                  <div className="flex gap-2">
                    <select 
                      value={hodData.department} onChange={e => setHodData({...hodData, department: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                    >
                      {['English', 'Hindi', 'Malayalam', 'Commerce', 'Physics', 'Chemistry', 'Economics', 'Computer Science', 'Electronics', 'Botany', 'Zoology', 'Mathematics', 'History'].map(dep => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                    <button 
                      type="submit"
                      disabled={actioning === 'register_hod'}
                      className="h-12 px-6 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {actioning === 'register_hod' ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={20} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRegForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-600/5 italic">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6 flex items-center gap-2">
                <UserPlus size={14} /> Quick Volunteer Registration
              </h3>
              <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input 
                    type="text" required placeholder="e.g. Rahul K"
                    value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</label>
                  <input 
                    type="tel" required placeholder="e.g. 9876543210"
                    value={regData.mobile} onChange={e => setRegData({...regData, mobile: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit Number</label>
                  <input 
                    type="text" required placeholder="e.g. 36"
                    value={regData.unit} onChange={e => setRegData({...regData, unit: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Desired Username</label>
                  <input 
                    type="text" required placeholder="e.g. rahul36"
                    value={regData.username} onChange={e => setRegData({...regData, username: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password & Dept</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" required placeholder="••••••••"
                      value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs"
                    />
                    <select 
                      value={regData.department} onChange={e => setRegData({...regData, department: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs shrink"
                    >
                      {['English', 'Hindi', 'Malayalam', 'Commerce', 'Physics', 'Chemistry', 'Economics', 'Computer Science', 'Electronics', 'Botany', 'Zoology', 'Mathematics', 'History'].map(dep => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                    <button 
                      type="submit"
                      disabled={actioning === 'register'}
                      className="h-12 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center disabled:opacity-50 shrink-0"
                    >
                      {actioning === 'register' ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={20} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-blue-700">
           <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2 italic">
             <UserPlus size={18} />
             Pending Requests
             <span className="ml-2 px-3 py-0.5 bg-white/20 text-white text-[10px] rounded-full border border-white/20">{pending.length}</span>
           </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 italic">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Volunteer</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID / Username</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : filteredPending.length > 0 ? (
                filteredPending.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg italic shadow-lg shadow-slate-900/10">
                          {p.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-bold text-slate-900 uppercase tracking-tight">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-600 font-bold text-xs">{p.mobile || 'N/A'}</td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-lg border border-blue-100">Unit {p.unit}</span>
                    </td>
                    <td className="px-8 py-6 text-slate-400 font-mono text-xs uppercase">{p.username}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {confirmingAction === `approve-${p.row}` && (
                          <button onClick={() => setConfirmingAction(null)} className="h-10 px-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                        )}
                        <button 
                          disabled={actioning === p.row.toString()}
                          onClick={() => handleAction(p.row, 'approve')}
                          className={cn(
                            "h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                            confirmingAction === `approve-${p.row}` ? "bg-emerald-700 text-white animate-pulse" : "bg-emerald-600 text-white hover:bg-emerald-500"
                          )}
                        >
                          {actioning === p.row.toString() ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                        </button>

                        {confirmingAction === `reject-${p.row}` && (
                          <button onClick={() => setConfirmingAction(null)} className="h-10 px-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                        )}
                        <button 
                          disabled={actioning === p.row.toString()}
                          onClick={() => handleAction(p.row, 'reject')}
                          className={cn(
                            "h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                            confirmingAction === `reject-${p.row}` ? "bg-red-700 text-white animate-pulse" : "bg-red-600 text-white hover:bg-red-500"
                          )}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic text-sm">No pending requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approved Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900">
           <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2 italic">
             <Shield size={18} />
             Active Roster
             <span className="ml-2 px-3 py-0.5 bg-white/20 text-white text-[10px] rounded-full border border-white/20">{approved.length}</span>
           </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 italic">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Volunteer</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Privilege</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : filteredApproved.length > 0 ? (
                filteredApproved.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-black text-lg italic border border-slate-200">
                          {u.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight">{u.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Unit {u.unit}</span>
                       {(u as any).department && (
                         <span className="block text-[9px] font-bold text-blue-600 uppercase">{(u as any).department}</span>
                       )}
                    </td>
                    <td className="px-8 py-6">
                       <div className={cn(
                         "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                         u.role === 'admin' 
                           ? "bg-blue-50 border-blue-100 text-blue-600" 
                           : "bg-slate-50 border-slate-100 text-slate-400"
                       )}>
                         {u.role === 'admin' ? <Star size={10} fill="currentColor" /> : <Shield size={10} />}
                         {u.role || 'volunteer'}
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 ml-auto">
                          {u.role !== 'admin' ? (
                            <>
                              {confirmingAction === `makeAdmin-${u.row}` && (
                                <button onClick={() => setConfirmingAction(null)} className="h-10 px-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                              )}
                              <button 
                                disabled={actioning === u.row.toString()}
                                onClick={() => handleAction(u.row, 'makeAdmin')}
                                className={cn(
                                  "h-10 px-5 border text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                                  confirmingAction === `makeAdmin-${u.row}` ? "bg-blue-700 text-white animate-pulse border-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-blue-700 hover:text-white hover:border-blue-700"
                                )}
                              >
                                <Star size={14} /> Promote Admin
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 cursor-default p-2">System Master</span>
                          )}
                          
                          {confirmingAction === `deleteApproved-${u.row}` && (
                            <button onClick={() => setConfirmingAction(null)} className="h-10 px-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                          )}
                          <button 
                            disabled={actioning === u.row.toString()}
                            onClick={() => handleAction(u.row, 'deleteApproved')}
                            className={cn(
                              "h-10 w-10 flex items-center justify-center border rounded-xl transition-all",
                              confirmingAction === `deleteApproved-${u.row}` ? "bg-red-700 text-white animate-pulse border-red-700" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white"
                            )}
                            title="Remove from system"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">No approved users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
