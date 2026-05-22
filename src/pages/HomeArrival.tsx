import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, MapPin, CheckCircle2, Navigation, Clock, 
  Loader2, AlertCircle, ShieldCheck, ChevronRight, User
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function HomeArrival() {
  const [userProfile, setUserProfile] = useState<{ id: string, full_name: string, unit: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'Resting' | 'On the Way' | 'Reached Home'>('Resting');
  const [message, setMessage] = useState('');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [noUserFound, setNoUserFound] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        // 1. Try Supabase Auth first
        const { data: { session } } = await supabase.auth.getSession();
        let userId = session?.user?.id || localStorage.getItem('userId');
        
        // Hard fallback if userId is missing but we're marked as logged in
        if (!userId && localStorage.getItem('isLoggedIn') === 'true') {
          const storedId = localStorage.getItem('userId');
          // If storedId is not a UUID, use a dummy one
          const isUUID = (id: string | null) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          userId = isUUID(storedId) ? storedId! : '00000000-0000-0000-0000-000000000003';
        }
        
        if (userId) {
          // Try to get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, unit')
            .eq('id', userId)
            .maybeSingle();
          
          let resolvedProfile;
          if (profile) {
            resolvedProfile = profile;
          } else {
            // Robust fallback to LocalStorage or Auth Metadata
            resolvedProfile = {
              id: userId,
              full_name: localStorage.getItem('name') || session?.user?.user_metadata?.full_name || 'Volunteer',
              unit: localStorage.getItem('unit') || session?.user?.user_metadata?.unit || '36/94'
            };
          }
          
          setUserProfile(resolvedProfile);
          
          // Fetch existing arrival status
          const { data: arrival } = await supabase
            .from('home_arrival')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (arrival) {
            setStatus(arrival.status);
            setMessage(arrival.message || '');
            setLastUpdate(new Date(arrival.updated_at).toLocaleString());
          }
        } else {
          console.warn("No active session or local userId found.");
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
      } catch (err) {
        console.error("Session fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleSend = async () => {
    let currentUserProfile = userProfile;
    
    // If state is null, try fetching one last time from LocalStorage before giving up
    if (!currentUserProfile) {
      const localId = localStorage.getItem('userId');
      if (localId) {
        currentUserProfile = {
          id: localId,
          full_name: localStorage.getItem('name') || 'Volunteer',
          unit: localStorage.getItem('unit') || '36/94'
        };
        setUserProfile(currentUserProfile);
      }
    }

    if (!currentUserProfile) {
      setMsg({ type: 'error', text: "Account session not found. Please log in again." });
      return;
    }
    
    setSubmitting(true);
    setMsg(null);
    
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      // 1. Check if record exists first
      const { data: existing, error: fetchErr } = await supabase
        .from('home_arrival')
        .select('user_id')
        .eq('user_id', currentUserProfile.id)
        .maybeSingle();

      if (fetchErr) console.warn("Fetch check error:", fetchErr);

      let opError;
      if (existing) {
        const { error } = await supabase
          .from('home_arrival')
          .update({
            volunteer_name: currentUserProfile.full_name,
            unit: currentUserProfile.unit,
            status: status,
            message: message,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', currentUserProfile.id);
        opError = error;
      } else {
        const { error } = await supabase
          .from('home_arrival')
          .insert([{
            user_id: currentUserProfile.id,
            volunteer_name: currentUserProfile.full_name,
            unit: currentUserProfile.unit,
            status: status,
            message: message,
            updated_at: new Date().toISOString()
          }]);
        opError = error;
      }

      if (opError) {
        console.error("Supabase Error:", opError);
        if (opError.message?.includes('row-level security')) {
          throw new Error("Database Blocked: Safety updates are restricted by RLS. Ask Admin to allow 'anon' role updates for home_arrival.");
        }
        if (opError.message?.includes('foreign key constraint')) {
          throw new Error("Account Not Found: Your account identity (UUID) does not exist in the master user database. Please sign out and sign in with a real account.");
        }
        throw new Error(opError.message);
      }
      
      setLastUpdate(new Date().toLocaleString());
      setMsg({ type: 'success', text: "Safety status successfully sent to Admin!" });
      
      // Clear message after success
      setTimeout(() => setMsg(null), 5000);
    } catch (err: any) {
      console.error("Safety update failed:", err);
      setMsg({ 
        type: 'error', 
        text: err.message?.includes('42P01') 
          ? "Database table missing. Ask Admin to run the SQL setup." 
          : `Failed to send status: ${err.message || 'Unknown error'}. Please retry.` 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex p-4 bg-indigo-100 text-indigo-600 rounded-3xl shadow-sm">
            <Home size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Arrival Status</h1>
            <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm mt-1">Keep the unit updated on your safety after programs.</p>
          </div>
        </header>

        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          {userProfile ? (
            <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <User size={20} />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1">Authenticated Account</div>
                  <div className="text-sm font-bold text-slate-900 leading-tight">{userProfile.full_name}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Unit {userProfile.unit}</div>
                </div>
              </div>
              <div className="px-2 py-1 bg-white border border-blue-100 rounded-full text-[8px] font-black text-blue-600 uppercase tracking-tight">Verified</div>
            </div>
          ) : noUserFound ? (
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col items-center gap-2 text-center">
              <AlertCircle size={24} className="text-amber-500" />
              <div className="text-amber-800 font-bold text-sm">Session Not Found</div>
              <p className="text-[10px] text-amber-600 font-medium italic">Please log in to update your safety status.</p>
              <button 
                onClick={() => window.location.href = '/login'} 
                className="mt-2 text-[10px] font-black uppercase text-amber-700 underline tracking-widest"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <div className="p-5 bg-slate-50 rounded-2xl flex items-center gap-3 text-slate-400 italic text-sm animate-pulse">
              <Loader2 size={18} className="animate-spin" />
              Validating identity...
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <Navigation size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Current Journey</div>
                <div className={cn(
                  "text-lg font-black italic uppercase tracking-tight",
                  status === 'Reached Home' ? "text-emerald-500" : status === 'On the Way' ? "text-amber-500" : "text-slate-400"
                )}>
                  {status}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'On the Way', icon: Clock, color: 'amber' },
              { id: 'Reached Home', icon: ShieldCheck, color: 'emerald' },
              { id: 'Resting', icon: Home, color: 'slate' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStatus(opt.id as any)}
                className={cn(
                  "px-6 py-4 rounded-2xl border-2 flex items-center gap-3 transition-all",
                  status === opt.id 
                    ? `bg-${opt.color}-50 border-${opt.color}-200 text-${opt.color}-700`
                    : "bg-white border-slate-50 hover:bg-slate-50 text-slate-500"
                )}
              >
                <opt.icon size={18} />
                <span className="text-xs font-black uppercase tracking-widest italic">{opt.id}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Custom Message (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Will reach in 10 mins, With group..."
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={submitting}
            className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} className="rotate-45" />}
            <span>Send Update to Admin</span>
          </button>

          {lastUpdate && (
            <div className="pt-4 border-t border-slate-50 text-center">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Last sent tracking update</div>
              <div className="text-xs font-bold text-slate-700">{lastUpdate}</div>
            </div>
          )}

          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-4 rounded-xl flex items-center gap-3 font-bold text-xs",
                  msg.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}
              >
                {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {msg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="p-8 bg-indigo-900 rounded-[2.5rem] text-white space-y-4">
          <div className="flex items-center gap-3 text-indigo-300">
            <ShieldCheck size={20} />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Security Notice</h3>
          </div>
          <p className="text-xs font-medium text-indigo-100/70 leading-relaxed italic">
            This status is visible only to Program Officers and Unit Admins. 
            Update your status as soon as you reach home to help us ensure every volunteer's safety.
          </p>
          <div className="pt-4 flex items-center gap-3">
             <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <MapPin size={16} className="text-indigo-400" />
             </div>
             <div className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">
                Unit 36 & 94 Safety Protocol
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
