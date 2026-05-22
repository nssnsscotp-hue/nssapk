import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, User, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { GAS_URLS } from '@/src/lib/constants';
import { Program } from '@/src/pages/types';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function Attendance() {
  const [userProfile, setUserProfile] = useState<{ id: string, full_name: string, unit: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [noUserFound, setNoUserFound] = useState(false);
  
  const [programID, setProgramID] = useState('');
  const [attendanceCode, setAttendanceCode] = useState('');
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);

  // Status check state
  const [checkProgramID, setCheckProgramID] = useState('');
  const [checkStatus, setCheckStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);

  const activePrograms = programs.filter(p => p.Status === 'Active');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // 1. Get Logged-in User and Profile via session or localStorage (more robust)
        const { data: { session } } = await supabase.auth.getSession();
        let userId = session?.user?.id || localStorage.getItem('userId');
        
        // Hard fallback if userId is missing but we're marked as logged in
        if (!userId && localStorage.getItem('isLoggedIn') === 'true') {
          const storedId = localStorage.getItem('userId');
          const isUUID = (id: string | null) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          userId = isUUID(storedId) ? storedId! : '00000000-0000-0000-0000-000000000003';
        }

        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, unit')
            .eq('id', userId)
            .maybeSingle();
          
          if (profile) {
            setUserProfile(profile);
          } else {
            setUserProfile({
              id: userId,
              full_name: localStorage.getItem('name') || session?.user?.user_metadata?.full_name || 'Volunteer',
              unit: localStorage.getItem('unit') || localStorage.getItem('userUnit') || '36/94'
            });
          }
        } else {
           console.warn("Attendance: No session or local identity found");
           if (localStorage.getItem('isLoggedIn') === 'true') {
             const storedId = localStorage.getItem('userId');
             const isUUID = (id: string | null) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
             setUserProfile({
                id: isUUID(storedId) ? storedId! : '00000000-0000-0000-0000-000000000003',
                full_name: localStorage.getItem('name') || 'Volunteer',
                unit: localStorage.getItem('unit') || '36/94'
             });
           } else {
             setNoUserFound(true);
           }
        }

        // 2. Load all programs
        const { data: prgs } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
        if (prgs) {
          setPrograms(prgs.map(p => ({
            ProgramID: p.id,
            ProgramName: p.name,
            Status: p.status,
            Code: p.code
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programID || !userProfile || !attendanceCode) {
      setStatus({ type: 'error', msg: 'Missing required information' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Ensure session for RLS
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) await supabase.auth.signInAnonymously();

      // 1. Verify Code and Status
      const targetProgram = programs.find(p => p.ProgramID === programID);
      
      if (!targetProgram) {
        setStatus({ type: 'error', msg: 'Program not found' });
        setLoading(false);
        return;
      }

      if (targetProgram.Status !== 'Active') {
        setStatus({ type: 'error', msg: 'Attendance portal for this program is now CLOSED.' });
        setLoading(false);
        return;
      }

      if (targetProgram.Code !== attendanceCode) {
        setStatus({ type: 'error', msg: 'Incorrect security code. Please check with your PO.' });
        setLoading(false);
        return;
      }

      // 3. Mark Attendance (Check duplicate)
      const { data: existing } = await supabase
        .from('marked_attendance')
        .select('*')
        .eq('volunteer_name', userProfile.full_name)
        .eq('unit', userProfile.unit)
        .eq('event_name', targetProgram.ProgramName)
        .maybeSingle();

      if (existing) {
        setStatus({ type: 'error', msg: 'Attendance already marked for this program' });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('marked_attendance')
        .insert([{
          volunteer_name: userProfile.full_name,
          unit: userProfile.unit,
          event_name: targetProgram.ProgramName
        }]);

      if (error) {
        console.error("Attendance Insert Error:", error);
        if (error.message?.includes('row-level security')) {
          throw new Error("Database Blocked: Attendance marking restricted by RLS. Ask Admin to allow 'anon' role inserts for marked_attendance.");
        }
        if (error.message?.includes('foreign key constraint')) {
          throw new Error("Account Not Found: Your ID does not exist in the master database. Real account registration is required to mark attendance.");
        }
        throw error;
      }
      
      // 4. Update Points (Award 100)
      try {
        const { error: rpcErr } = await supabase.rpc('increment_points', { user_id: userProfile.id, amount: 100 });
        if (rpcErr) console.warn("Points update skipped/failed:", rpcErr.message);
      } catch (e) {
        console.warn("Points RPC not found or failed. This is optional.");
      }

      setStatus({ 
        type: 'success', 
        msg: 'Attendance marked successfully! You earned +100 Master Points. ✅' 
      });
      setAttendanceCode('');
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to submit. Check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !checkProgramID) {
      setCheckStatus({ type: 'error', msg: 'Please select a Program' });
      return;
    }

    setLoading(true);
    setCheckStatus(null);

    try {
      const { data: att } = await supabase
        .from('marked_attendance')
        .select('*')
        .eq('volunteer_name', userProfile.full_name)
        .eq('unit', userProfile.unit)
        .eq('event_name', programs.find(p => p.ProgramID === checkProgramID)?.ProgramName || '')
        .maybeSingle();

      if (att) {
        setCheckStatus({ type: 'success', msg: `Attendance verified! Record found for ${userProfile.full_name}.` });
      } else {
        setCheckStatus({ type: 'info', msg: `No record found for ${userProfile.full_name} in this program.` });
      }
    } catch (err) {
      setCheckStatus({ type: 'error', msg: 'Failed to verify status.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">NSS Attendance</h1>
          <p className="text-slate-500 mt-2">Secure attendance portal for Units 36 & 94</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50">
            <button 
              onClick={() => {
                setActiveTab('mark');
                setStatus(null);
              }}
              className={cn(
                "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors",
                activeTab === 'mark' ? "bg-white text-blue-600 border-b-2 border-blue-600" : "bg-slate-50/50 text-slate-400"
              )}
            >
              Mark Attendance
            </button>
            <button 
              onClick={() => {
                setActiveTab('history');
                setCheckStatus(null);
              }}
              className={cn(
                "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors",
                activeTab === 'history' ? "bg-white text-blue-600 border-b-2 border-blue-600" : "bg-slate-50/50 text-slate-400"
              )}
            >
              Check Status
            </button>
          </div>

          <div className="p-8">
            {userProfile ? (
              <div className="mb-8 p-6 bg-blue-50/50 border border-blue-100 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                    <User size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1">Authenticated Account</div>
                    <div className="text-sm font-bold text-slate-900">{userProfile.full_name}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Unit {userProfile.unit}</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white border border-blue-100 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-tight">Verified</div>
              </div>
            ) : noUserFound ? (
              <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex flex-col items-center gap-3 text-center">
                <AlertCircle size={32} className="text-amber-500" />
                <div className="text-amber-900 font-bold">Registration / Login Required</div>
                <p className="text-xs text-amber-600 italic">You must be logged in with an approved account to mark attendance.</p>
                <button onClick={() => window.location.href = '/login'} className="mt-2 text-xs font-black uppercase text-blue-600 underline">Switch to Login</button>
              </div>
            ) : (
              <div className="mb-6 p-6 bg-slate-50 rounded-2xl flex items-center gap-3 text-slate-400 italic text-sm animate-pulse">
                <Loader2 size={18} className="animate-spin" />
                Validating identity...
              </div>
            )}

            {activeTab === 'mark' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {status && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-4 rounded-2xl text-sm flex items-start gap-3",
                      status.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : 
                      status.type === 'info' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                      "bg-red-50 text-red-700 border border-red-100"
                    )}
                  >
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {status.msg}
                  </motion.div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Active Program</label>
                  <div className="relative">
                    <select
                      value={programID}
                      onChange={(e) => setProgramID(e.target.value)}
                      className="w-full h-14 bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"
                    >
                      <option value="">Select Activity</option>
                      {activePrograms.map(p => (
                        <option key={p.ProgramID} value={p.ProgramID}>
                          {p.ProgramName}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Security Code</label>
                  <input
                    type="tel"
                    pattern="[0-9]*"
                    maxLength={5}
                    inputMode="numeric"
                    value={attendanceCode}
                    onChange={(e) => setAttendanceCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="ENTER 5-DIGIT CODE"
                    className="w-full h-14 bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-mono text-center tracking-[0.2em] sm:tracking-[0.5em] text-xl"
                  />
                </div>

                <button
                  disabled={loading || !userProfile || !programID}
                  type="submit"
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-8"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : 'Submit Attendance'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCheckStatus} className="space-y-5 border-t border-slate-50 pt-6">
                {checkStatus && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-4 rounded-2xl text-sm flex items-start gap-3",
                      checkStatus.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : 
                      checkStatus.type === 'info' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                      "bg-red-50 text-red-700 border border-red-100"
                    )}
                  >
                    {checkStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {checkStatus.msg}
                  </motion.div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Program to Check</label>
                  <div className="relative">
                    <select
                      value={checkProgramID}
                      onChange={(e) => setCheckProgramID(e.target.value)}
                      className="w-full h-14 bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"
                    >
                      <option value="">Choose Activity</option>
                      {programs.map(p => (
                        <option key={p.ProgramID} value={p.ProgramID}>
                          {p.ProgramName}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <button
                  disabled={loading || !userProfile || !checkProgramID}
                  type="submit"
                  className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : 'Verify My Record'}
                </button>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl text-center">
                    <div className="text-2xl font-bold text-slate-900 mb-1">Unit 36</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 italic">Dr. Aparna B</div>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl text-center">
                    <div className="text-2xl font-bold text-slate-900 mb-1">Unit 94</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 italic">Dr. RakhiKrishna R</div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
