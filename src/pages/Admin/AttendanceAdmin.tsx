import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Loader2, Download, CheckCircle, Clock, Search, ArrowUpDown, Filter, User, ShieldAlert, ArrowLeft, ChevronRight } from 'lucide-react';
import { Program } from '@/src/pages/types';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

interface AttendanceRecord {
  id?: string;
  volunteer_name: string;
  unit: string;
  event_name: string;
  created_at: string;
}

export default function AttendanceAdmin() {
  const [activeView, setActiveView] = useState<'programs' | 'records'>('programs');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProgramName, setSelectedProgramName] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    status: 'Active'
  });

  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: prgData, error: prgErr } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (prgErr) throw prgErr;
      
      const { data: recData, error: recErr } = await supabase
        .from('marked_attendance')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (recErr) throw recErr;
      
      if (prgData) {
        setPrograms(prgData.map(p => ({
          ProgramID: p.id,
          ProgramName: p.name,
          Status: p.status,
          Code: p.code
        })));
      }
      
      if (recData) {
        setRecords(recData);
      }
    } catch (err: any) { 
      console.error(err); 
      setError("Failed to fetch database data: " + (err.message || "Unknown error"));
    }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData();
  }, [sortOrder]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const { error } = await supabase
        .from('programs')
        .insert([{
          id: formData.id,
          name: formData.name,
          code: formData.code,
          status: formData.status
        }]);

      if (error) throw error;
      setStatus({ type: 'success', msg: "Program created successfully!" });
      setFormData({ id: '', name: '', code: '', status: 'Active' });
      await fetchData();
    } catch (err: any) { 
      console.error(err); 
      setStatus({ type: 'error', msg: "Failed: " + (err.message || "Unknown error") });
    }
    finally { setSubmitting(false); }
  };

  const closeProgram = async (pId: string) => {
    // Immediate feedback
    console.log("closeProgram triggered for:", pId);
    setStatus({ type: 'success', msg: "Requesting server to close..." });
    setUpdatingId(pId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No session found, signing in anonymously");
        await supabase.auth.signInAnonymously();
      }

      console.log("Executing update for id:", pId);
      const { error } = await supabase
        .from('programs')
        .update({ status: 'Closed' })
        .eq('id', pId);
      
      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }
      
      console.log("Update call finished");
      setStatus({ type: 'success', msg: "SUCCESS: Program Closed!" });
      
      // Refresh list
      await fetchData();
    } catch (err: any) { 
      console.error("CATCH in closeProgram:", err); 
      setStatus({ type: 'error', msg: "FAILED: " + (err.message || "Unknown db error") });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRecords = records.filter(r => {
    // If a specific program is selected, filter by its name
    if (selectedProgramName && r.event_name !== selectedProgramName) {
      return false;
    }
    return (
      r.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.unit.includes(searchTerm)
    );
  });

  const exportData = () => {
    const dataToExport = activeView === 'records' ? filteredRecords : programs;
    const csvString = [
      activeView === 'records' ? ["Name", "Unit", "Event", "Date"] : ["ID", "Name", "Code", "Status"],
      ...dataToExport.map(item => 
        activeView === 'records' 
          ? [(item as AttendanceRecord).volunteer_name, (item as AttendanceRecord).unit, (item as AttendanceRecord).event_name, new Date((item as AttendanceRecord).created_at).toLocaleDateString()]
          : [(item as any).ProgramID, (item as any).ProgramName, (item as any).Code, (item as any).Status]
      )
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nss_attendance_${activeView === 'records' && selectedProgramName ? selectedProgramName.replace(/\s+/g, '_') : activeView}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Control</h2>
          <p className="text-slate-500 text-sm">Manage programs and volunteer participation.</p>
        </div>
        <div className="flex gap-2">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100 text-xs font-bold animate-pulse">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}
          <button 
            onClick={() => {
              setActiveView(activeView === 'programs' ? 'records' : 'programs');
              setSelectedProgramName(null);
              setSearchTerm('');
            }}
            className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl border border-slate-100 hover:bg-slate-50 transition-all shadow-sm"
          >
            {activeView === 'programs' ? 'View Attendance' : 'Manage Programs'}
          </button>
          <button 
            onClick={exportData}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </header>

      {activeView === 'programs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">Create Program</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                {status && (
                  <div className={cn(
                    "p-3 rounded-xl text-xs font-bold flex items-center gap-2",
                    status.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                  )}>
                    {status.type === 'success' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {status.msg}
                  </div>
                )}
                <input 
                  type="text" required placeholder="Program ID (e.g. CAMP01)" 
                  value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-medium" 
                />
                <input 
                  type="text" required placeholder="Display Name" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-medium" 
                />
                <input 
                  type="text" required placeholder="5-Digit Security Code" 
                  maxLength={5}
                  value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-center tracking-[0.5em]" 
                />
                <select 
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                >
                  <option>Active</option>
                  <option>Closed</option>
                </select>
                <button
                  disabled={submitting}
                  type="submit"
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/10 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : "Save Program"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {status && activeView === 'programs' && (
              <div className={cn(
                "p-4 rounded-2xl text-sm font-bold flex items-center justify-between",
                status.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
              )}>
                <div className="flex items-center gap-2">
                  {status.type === 'success' ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                  {status.msg}
                </div>
                <button onClick={() => setStatus(null)} className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100">Dismiss</button>
              </div>
            )}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[10px]">Active Systems</h3>
              <div className="space-y-3">
                {loading ? (
                  <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
                ) : programs.length === 0 ? (
                   <div className="py-12 text-center text-slate-400 font-medium italic">No programs created yet.</div>
                ) : programs.map((p, i) => (
                  <div key={p.ProgramID || i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group">
                     <div 
                       onClick={() => {
                         setSelectedProgramName(p.ProgramName);
                         setActiveView('records');
                       }}
                       className="flex items-center gap-5 flex-1 cursor-pointer"
                       title="Click to view attendance for this program"
                     >
                        <div className={cn(
                          "p-3 rounded-xl shadow-sm border border-white group-hover:bg-blue-600 group-hover:text-white transition-all",
                          p.Status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-500"
                        )}>
                           <Calendar size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            {p.ProgramName}
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-blue-600 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1" />
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {p.ProgramID}</span>
                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 rounded">CODE: {p.Code}</span>
                             <span className="text-[10px] font-medium text-slate-500 bg-slate-200/50 px-1.5 rounded">
                               {records.filter(r => r.event_name === p.ProgramName).length} marked
                             </span>
                          </div>
                        </div>
                     </div>
                     {p.Status === 'Active' ? (
                       <button 
                        onClick={() => closeProgram(p.ProgramID)}
                        disabled={updatingId === p.ProgramID}
                        className="px-4 py-2 bg-white text-orange-600 text-xs font-black uppercase tracking-widest rounded-lg border border-orange-100 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                       >
                          {updatingId === p.ProgramID ? <Loader2 size={12} className="animate-spin" /> : null}
                          Close Portal
                       </button>
                     ) : (
                       <div className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5">
                         <Clock size={10} /> Finished
                       </div>
                     )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedProgramName === null ? (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[10px] mb-1">Select Program Attendance Portal</h3>
                <p className="text-slate-500 text-xs text-slate-400">Choose a program below to view and manage marked volunteer attendance for that desired program.</p>
              </div>

              {loading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
              ) : programs.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-medium italic">No programs available yet. Please create a program first.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {programs.map((p, i) => {
                    const count = records.filter(r => r.event_name === p.ProgramName).length;
                    return (
                      <div 
                        key={p.ProgramID || i}
                        onClick={() => setSelectedProgramName(p.ProgramName)}
                        className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-white transition-all cursor-pointer group flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-3 rounded-xl shadow-sm border border-white group-hover:bg-blue-600 group-hover:text-white transition-all",
                            p.Status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-500"
                          )}>
                            <Calendar size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                              {p.ProgramName}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>ID: {p.ProgramID}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span>Code: {p.Code}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block text-xs font-black text-slate-700">{count} Marked</span>
                            <span className={cn(
                              "inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-0.5",
                              p.Status === 'Active' 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                              {p.Status}
                            </span>
                          </div>
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px]">
              <button 
                onClick={() => {
                  setSelectedProgramName(null);
                  setSearchTerm('');
                }}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mb-6"
              >
                <ArrowLeft size={12} /> Back to Program Selector
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full border border-blue-100">
                      Program Portal
                    </span>
                    {programs.find(p => p.ProgramName === selectedProgramName)?.Status === 'Active' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Active Check-in Portal" />
                    ) : null}
                  </div>
                  <h3 className="font-bold text-slate-900 text-xl tracking-tight mt-1">
                    {selectedProgramName}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Showing marked attendance list for this desired program ({filteredRecords.length} records).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search volunteer name or unit..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 h-10 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-left">
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Volunteer Name</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Program Name</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 pr-4">Marked At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></td></tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-medium italic">No attendance records found for this program matching your criteria.</td></tr>
                    ) : filteredRecords.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <User size={14} />
                          </div>
                          {record.volunteer_name}
                        </td>
                        <td className="py-4 text-sm font-medium text-slate-500">Unit {record.unit}</td>
                        <td className="py-4">
                          <span className="px-2 py-1 bg-blue-50/70 text-blue-600 text-[10px] font-black uppercase rounded">
                            {record.event_name}
                          </span>
                        </td>
                        <td className="py-4 text-[10px] font-bold text-slate-400 pr-4">
                          {new Date(record.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
