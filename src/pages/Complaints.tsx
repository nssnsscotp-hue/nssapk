import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, CheckCircle2, Loader2, ClipboardList, Phone, User, Tag, HelpCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { GAS_URLS } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function ComplaintPortal() {
  const [activeMode, setActiveMode] = useState<'file' | 'track'>('file');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [successID, setSuccessID] = useState<string | null>(null);
  const [trackID, setTrackID] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // File form
  const [fileData, setFileData] = useState({
    category: '',
    complaint: ''
  });

  const [userData, setUserData] = useState({
    name: localStorage.getItem("name") || "",
    phone: localStorage.getItem("phone") || ""
  });
  
  // Repair session on mount if needed
  React.useEffect(() => {
    const repairSession = async () => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      const username = localStorage.getItem("user");
      let userId = localStorage.getItem("userId");
      
      if (userId === "null" || userId === "undefined") userId = null;

      if (isLoggedIn && !userId && username) {
        console.log("Repairing session for:", username);
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, mobile')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        
        if (profile?.id) {
          localStorage.setItem("userId", profile.id);
          const name = profile.full_name || "Volunteer";
          const phone = profile.mobile || "Verified User";
          if (profile.full_name) localStorage.setItem("name", name);
          if (profile.mobile) localStorage.setItem("phone", phone);
          setUserData({ name, phone });
        }
      }
    };
    repairSession();
  }, []);

  const handleFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    console.log("Submit clicked. Category:", fileData.category);

    if (!fileData.category || !fileData.complaint) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      // 1. Ensure a valid Supabase Auth Session (fixes many RLS issues)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) {
        console.log("No active Supabase session, attempting anonymous sign-in...");
        await supabase.auth.signInAnonymously();
      }

      // 2. Get User Identity with high robustness
      let userId = localStorage.getItem("userId");
      const username = localStorage.getItem("user");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      
      // Filter out literal "null" or "undefined" strings
      if (userId === "null" || userId === "undefined") userId = null;

      // Fallback 1: Supabase Session (for users logged in via standard supabase auth)
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      }

      // Fallback 2: If isLoggedIn is true but userId is missing, try to fetch from profiles by username
      if (!userId && isLoggedIn && username) {
        console.log("Missing userId but logged in as", username, ". Fetching ID...");
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        
        if (profile?.id) {
          userId = profile.id;
          localStorage.setItem("userId", userId); // Repair localStorage
        }
      }

      console.log("Auth Status for Submission:", { userId, username, isLoggedIn });

      if (!userId) {
        setSubmitError("Authentication Error: Your session is incomplete. Please log out and log in again to refresh your credentials.");
        setLoading(false);
        return;
      }

      // 2. Prepare Data
      const trackingId = `NSS-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // 3. Database Insert
      const complaintPayload = {
        tracking_id: trackingId,
        profile_id: userId,
        category: fileData.category,
        subject: fileData.category.substring(0, 100),
        description: fileData.complaint,
        status: 'Pending'
      };

      console.log("Attempting Database Insert...", complaintPayload);

      const { error: insertError } = await supabase
        .from('complaints')
        .insert([complaintPayload]);

      if (insertError) {
        console.error("Supabase Insert Failed:", insertError);
        throw new Error(`Database Error: ${insertError.message}`);
      }

      console.log("Submission Successful! Tracking ID:", trackingId);

      // 4. Update UI State
      setSuccessID(trackingId);
      setFileData({ category: '', complaint: '' });
      
    } catch (err: any) {
      console.error("Fatal Submission Error:", err);
      let errorMessage = err.message || "An unexpected system error occurred. Please try again.";
      
      if (errorMessage.includes("row-level security")) {
        errorMessage = "Database Permission Error: Please ensure RLS policies allow inserts for anonymous users, or contact the site admin to run the database setup script.";
      }
      
      setSubmitError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e?: React.FormEvent, providedId?: string) => {
    if (e) e.preventDefault();
    const idToTrack = providedId || trackID;
    if (!idToTrack) return;
    
    setLoading(true);
    setStatus(null);
    setSuccessID(null);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('tracking_id', idToTrack.trim().replace('#', ''))
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setStatus({
          status: "found",
          complaintID: data.tracking_id,
          category: data.category,
          progress: data.status,
          adminComment: data.admin_comment
        });
      } else {
        alert("Complaint ID not found.");
      }
    } catch (err) {
      console.error("Tracking error:", err);
      alert("Error tracking complaint.");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["Harassment", "Safety Issue", "Event Related", "Volunteer Concern", "Infrastructure Issue", "Other"];

  const renderFileMode = () => {
    if (successID) {
      return (
        <motion.div
          key="success-screen"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-12 text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Complaint Submitted!</h3>
          <p className="text-slate-500 font-medium mb-8">Thank you for your feedback. Our team will review the issue shortly.</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 inline-block w-full max-w-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Complaint ID</div>
            <div className="text-3xl font-black text-blue-700 tracking-tighter">{successID}</div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">Save this ID to track progress later</p>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => {
                const id = successID;
                setSuccessID(null);
                setTrackID(id);
                setActiveMode('track');
                handleTrack(undefined, id);
              }}
              className="h-14 px-8 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <Search size={16} /> Track Now
            </button>
            <button 
              onClick={() => setSuccessID(null)}
              className="h-14 px-8 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
            >
              File Another
            </button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="file-form"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Submit Concern</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Help us make NSS better</p>
          </div>
        </div>

        <div className="flex bg-slate-50 rounded-2xl p-6 border border-slate-100 items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <User size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</div>
              <div className="text-sm font-black text-slate-900 uppercase italic">{userData.name || localStorage.getItem("name") || "Volunteer"}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</div>
            <div className="text-sm font-black text-slate-900 italic">{userData.phone || localStorage.getItem("phone") || "Verified User"}</div>
          </div>
        </div>

        <form onSubmit={handleFile} className="space-y-6">
          {submitError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-widest"
            >
              <AlertTriangle size={16} />
              {submitError}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Tag size={12} /> Category
            </label>
            <div className="relative">
              <select 
                required 
                value={fileData.category} onChange={e => setFileData({...fileData, category: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-slate-700 appearance-none"
              >
                <option value="">Select a Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight size={18} className="rotate-90" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <HelpCircle size={12} /> Complaint Details
            </label>
            <textarea 
              required placeholder="Describe your complaint or concern in detail..." 
              rows={5}
              value={fileData.complaint} onChange={e => setFileData({...fileData, complaint: e.target.value})}
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-slate-700 placeholder:text-slate-300 resize-none" 
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full h-16 bg-blue-700 hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <CheckCircle2 size={20} />
                Submit Complaint
              </>
            )}
          </button>
        </form>
      </motion.div>
    );
  };

  const renderTrackMode = () => {
    return (
      <motion.div
        key="track-form"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <Search size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Track Progress</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Get live updates on your case</p>
            </div>
          </div>

          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" required placeholder="Enter Complaint ID (e.g., NSS-12345)" 
              value={trackID} onChange={e => setTrackID(e.target.value)}
              className="flex-1 h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-black text-slate-700 placeholder:text-slate-300" 
            />
            <button 
              disabled={loading}
              type="submit"
              className="h-14 px-8 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Verify"}
            </button>
          </form>
        </div>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
          >
            <div className={cn(
              "px-8 py-6 flex items-center justify-between border-b",
              status.progress?.toLowerCase() === "pending" ? "bg-orange-50 border-orange-100" :
              (status.progress?.toLowerCase() === "in progress" || status.progress?.toLowerCase() === "processing") ? "bg-blue-50 border-blue-100" :
              "bg-green-50 border-green-100"
            )}>
              <div className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Live Status</div>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                status.progress?.toLowerCase() === "pending" ? "text-orange-600" :
                (status.progress?.toLowerCase() === "in progress" || status.progress?.toLowerCase() === "processing") ? "text-blue-600" :
                "text-green-600"
              )}>
                {status.progress}
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Complaint ID</div>
                  <div className="text-xl font-black text-slate-900 tracking-tighter">#{status.complaintID}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Category</div>
                  <div className="text-xl font-black text-slate-900 tracking-tighter">{status.category}</div>
                </div>
              </div>

              <div className="relative pl-8 border-l-2 border-slate-100 space-y-12">
                <div className="relative">
                  <div className={cn(
                    "absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm ring-4 ring-slate-50",
                    status.progress?.toLowerCase() === "pending" ? "bg-orange-500 animate-pulse" : "bg-green-500"
                  )} />
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight italic">Complaint Recorded</h4>
                    <p className="text-slate-500 text-sm font-medium">Your concern has been registered in the NSS database.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className={cn(
                    "absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm ring-4 ring-slate-50",
                    (status.progress?.toLowerCase() === "in progress" || status.progress?.toLowerCase() === "processing") ? "bg-blue-500 animate-pulse" : 
                    status.progress?.toLowerCase() === "resolved" ? "bg-green-500" : "bg-slate-200"
                  )} />
                  <div>
                    <h4 className={cn("font-black uppercase tracking-tight italic", (status.progress?.toLowerCase() === "in progress" || status.progress?.toLowerCase() === "processing" || status.progress?.toLowerCase() === "resolved") ? "text-slate-900" : "text-slate-300")}>Admin Action</h4>
                    <p className="text-slate-400 text-sm font-medium">Programme Officer is currently reviewing the submission.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className={cn(
                    "absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm ring-4 ring-slate-50",
                    status.progress?.toLowerCase() === "resolved" ? "bg-green-500" : "bg-slate-200"
                  )} />
                  <div>
                    <h4 className={cn("font-black uppercase tracking-tight italic", status.progress?.toLowerCase() === "resolved" ? "text-slate-900" : "text-slate-300")}>Resolution</h4>
                    <p className="text-slate-400 text-sm font-medium">Final resolution has been reached and closed.</p>
                  </div>
                </div>

                {status.adminComment && (
                  <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Admin Comment</div>
                    <p className="text-sm font-bold leading-relaxed">{status.adminComment}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#002c6c] to-[#0051c3] text-white py-12 px-4 shadow-lg text-center">
        <motion.div
           initial={{ y: -20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">NSS UNITS 36 & 94</h1>
          <p className="text-blue-100 font-bold uppercase tracking-[0.2em] mt-2 opacity-80">Official Complaint Portal</p>
        </motion.div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 p-1.5">
          <button 
            onClick={() => { setActiveMode('file'); setStatus(null); setSuccessID(null); }}
            className={cn(
              "flex-1 py-4 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeMode === 'file' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ClipboardList size={18} />
            File Complaint
          </button>
          <button 
            onClick={() => { setActiveMode('track'); setStatus(null); setSuccessID(null); }}
            className={cn(
              "flex-1 py-4 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeMode === 'track' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Search size={18} />
            Track Status
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeMode === 'file' ? renderFileMode() : renderTrackMode()}
        </AnimatePresence>
      </div>
    </div>
  );
}
