import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, RefreshCcw, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function ComplaintsAdmin() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, profiles(full_name, mobile)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log("Fetched complaints:", data);
      setComplaints(data || []);
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const updateComplaint = async (complaintId: any, updates: any) => {
    if (!complaintId) return;
    const cidString = complaintId.toString();
    setUpdating(cidString);
    
    try {
      // 1. Ensure Auth Session (Crucial for RLS)
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = session?.user;

      if (!session) {
        console.log("[ComplaintsAdmin] No active session, attempting anonymous sign-in...");
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          console.error("[ComplaintsAdmin] Auth failed:", authError.message);
          alert("Authentication Error: Anonymous sign-in must be enabled in Supabase dashboard.");
          setUpdating(null);
          return;
        }
        currentUser = authData.user;
      }

      console.log(`[ComplaintsAdmin] Using User ID: ${currentUser?.id} to update ${cidString}`, updates);

      // 2. Identify the record in local state to have all possible IDs
      const localRecord = complaints.find(c => 
        (c.id?.toString() === cidString) || (c.tracking_id?.toString() === cidString)
      );

      const targetId = localRecord?.id || complaintId;
      const targetTrackingId = localRecord?.tracking_id || cidString;

      // 3. Update with .select() to verify persistence immediately
      // Using select() with RLS will return data ONLY if the update was successful AND row is visible
      const { data, error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', targetId)
        .select('*, profiles(full_name, mobile)');
      
      if (error) throw error;

      let finalRecord = data?.[0];

      // fallback to tracking_id if ID failed to result in a row
      if (!finalRecord) {
        console.warn("[ComplaintsAdmin] Update by ID yielded no row. Trying tracking_id...");
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('complaints')
          .update(updates)
          .eq('tracking_id', targetTrackingId)
          .select('*, profiles(full_name, mobile)');
        
        if (fallbackError) throw fallbackError;
        finalRecord = fallbackData?.[0];
      }

      if (finalRecord) {
        setComplaints(prev => prev.map(c => 
          (c.id === finalRecord.id || c.tracking_id === finalRecord.tracking_id) ? finalRecord : c
        ));
        console.log("[ComplaintsAdmin] Update Success:", finalRecord);
      } else {
        // Check if record exists at ALL
        const { data: exists } = await supabase.from('complaints').select('id').eq('id', targetId).maybeSingle();
        if (exists) {
           console.error("[ComplaintsAdmin] Record exists but update returned no data. Likely RLS restriction.");
           alert("Update Failed: You do not have permission to modify this record.");
        } else {
           console.error("[ComplaintsAdmin] Record not found in DB.");
           alert("Update Failed: Record no longer exists in the database.");
        }
        fetchComplaints();
      }
    } catch (err: any) { 
      console.error("[ComplaintsAdmin] Update failed:", err);
      alert(`System Error: ${err.message || "Connection failure"}`);
    }
    finally { setUpdating(null); }
  };

  const deleteEntry = async (id: any) => {
    if (!id) return;
    if (!confirm('Permanently delete this complaint record?')) return;
    
    const stringId = id.toString();
    setUpdating(stringId);

    try {
      // 1. Ensure Session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      // 2. Identify target IDs
      const localRecord = complaints.find(c => 
        (c.id?.toString() === stringId) || (c.tracking_id?.toString() === stringId)
      );
      const targetId = localRecord?.id || id;
      const targetTrackingId = localRecord?.tracking_id || stringId;

      // 3. Attempt Delete
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', targetId);
      
      if (error) {
        console.warn("[ComplaintsAdmin] Delete by ID failed. Trying tracking_id...");
        const { error: trackError } = await supabase
          .from('complaints')
          .delete()
          .eq('tracking_id', targetTrackingId);
        
        if (trackError) throw trackError;
      }
      
      console.log("[ComplaintsAdmin] Record deleted successfully.");
      fetchComplaints();
    } catch (err: any) { 
       console.error("[ComplaintsAdmin] Delete error:", err);
       alert("Delete failed: " + err.message);
    }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Complaint Hotline</h2>
          <p className="text-slate-500 text-sm font-medium">Monitor and resolve issues submitted through the portal.</p>
        </div>
        <button onClick={fetchComplaints} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
          <RefreshCcw size={20} className={loading ? "animate-spin text-blue-600" : "text-slate-600"} />
        </button>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">ID / Reporter</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Issue / Response</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && complaints.length === 0 ? (
                <tr><td colSpan={5} className="py-32 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Accessing Database...</p>
                  </div>
                </td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan={5} className="py-32 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No complaints found.</td></tr>
              ) : complaints.map((c) => (
                <tr key={c.id || c.tracking_id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-8">
                    <div className="font-black text-slate-900 text-sm tracking-tight mb-1">{c.tracking_id}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex flex-col gap-0.5">
                      <span className="text-slate-600">{c.profiles?.full_name || 'Anonymous'}</span>
                      <span>{c.profiles?.mobile || 'No Phone'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{c.category}</span>
                  </td>
                  <td className="px-8 py-8 max-w-xs">
                    <p className="text-xs text-slate-600 font-bold leading-relaxed line-clamp-2 mb-2">{c.description}</p>
                    <input 
                      type="text" 
                      placeholder="Add admin comment..."
                      value={c.admin_comment || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComplaints(prev => prev.map(comp => 
                          (comp.id === c.id || (c.tracking_id && comp.tracking_id === c.tracking_id)) 
                          ? { ...comp, admin_comment: val } 
                          : comp
                        ));
                      }}
                      onBlur={(e) => {
                        updateComplaint(c.id || c.tracking_id, { admin_comment: e.target.value });
                      }}
                      className="w-full text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-8 py-8">
                    <div className={cn(
                       "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]",
                      (!c.status || c.status?.toLowerCase() === "pending") ? "text-orange-500" :
                      (c.status?.toLowerCase() === "processing" || c.status?.toLowerCase() === "in progress") ? "text-blue-500" : "text-emerald-500"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", 
                        (!c.status || c.status?.toLowerCase() === "pending") ? "bg-orange-500 animate-pulse" : 
                        (c.status?.toLowerCase() === "processing" || c.status?.toLowerCase() === "in progress") ? "bg-blue-500" : "bg-emerald-500"
                      )} />
                      {c.status || 'Pending'}
                    </div>
                  </td>
                   <td className="px-8 py-8">
                    <div className="flex items-center justify-end gap-3">
                       <select 
                        disabled={updating === c.id?.toString() || updating === c.tracking_id?.toString()}
                        value={c.status || "Pending"}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          // Optimistic update
                          setComplaints(prev => prev.map(comp => 
                            (comp.id === c.id || (c.tracking_id && comp.tracking_id === c.tracking_id)) 
                            ? { ...comp, status: newVal } 
                            : comp
                          ));
                          updateComplaint(c.id || c.tracking_id, { status: newVal });
                        }}
                        className="text-[10px] font-black bg-slate-100 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors"
                       >
                         <option value="Pending">Pending</option>
                         <option value="In Progress">In Progress</option>
                         <option value="Resolved">Resolved</option>
                       </select>
                       <button
                         disabled={updating === c.id?.toString() || updating === c.tracking_id?.toString()}
                         onClick={() => deleteEntry(c.id || c.tracking_id)}
                         className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
