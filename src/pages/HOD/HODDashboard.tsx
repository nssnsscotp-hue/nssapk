import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, CheckCircle, GraduationCap, Download, Search, 
  LogOut, Shield, ArrowUpDown, Filter, BookOpen, Loader2 
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

interface StudentProfile {
  id: string;
  username: string;
  full_name: string;
  mobile: string;
  unit: string;
  role: string;
  points: number;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  volunteer_name: string;
  unit: string;
  event_name: string;
  created_at: string;
}

export default function HODDashboard() {
  const navigate = useNavigate();
  
  // Logged-in HOD details from LocalStorage
  const hodName = localStorage.getItem('name') || 'HOD';
  const hodDepartment = localStorage.getItem('department') || 'Computer Science';
  const hodUsername = localStorage.getItem('user') || 'hod';

  const [activeTab, setActiveTab] = useState<'students' | 'records'>('students');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch volunteers registered under this HOD's department
      const { data: profilesData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('department', hodDepartment)
        .eq('role', 'volunteer');

      if (profileErr) throw profileErr;
      const loadedStudents: StudentProfile[] = (profilesData || []).map((p: any) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        mobile: p.mobile || 'No Contact',
        unit: p.unit || '36/94',
        role: p.role,
        points: p.points || 0,
        created_at: p.created_at
      }));
      setStudents(loadedStudents);

      // 2. Fetch attendance registered by volunteers from this department
      if (loadedStudents.length > 0) {
        const studentNames = loadedStudents.map(s => s.full_name);
        
        // Supabase query to match student attendance
        const { data: attendanceData, error: attErr } = await supabase
          .from('marked_attendance')
          .select('*')
          .in('volunteer_name', studentNames)
          .order('created_at', { ascending: false });

        if (attErr) throw attErr;
        setAttendance(attendanceData || []);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      console.error("Error loading HOD stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hodDepartment]);

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.unit.includes(searchTerm)
  );

  const filteredAttendance = attendance.filter(a => 
    a.volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.event_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.unit.includes(searchTerm)
  );

  const exportCSV = () => {
    const csvString = [
      activeTab === 'records' 
        ? ["Volunteer Name", "Unit", "Event Name", "Marked Time"] 
        : ["Full Name", "Username", "Unit ID", "Contact No", "Master Points"],
      ...(activeTab === 'records' 
        ? filteredAttendance.map(a => [a.volunteer_name, a.unit, a.event_name, new Date(a.created_at).toLocaleString()])
        : filteredStudents.map(s => [s.full_name, s.username, s.unit, s.mobile, s.points]))
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `department_${hodDepartment.toLowerCase().replace(/\s+/g, '_')}_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Dynamic Navigation Header styled like Admin Panel */}
      <nav className="bg-slate-900 text-white shadow-xl px-4 py-4 md:py-6 sticky top-16 z-40 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white p-1 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <img src="https://i.postimg.cc/Xq7KPnqK/pngkey-com-allu-arjun-png-2479287.png" alt="University" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-600/30 border border-blue-600/60 text-blue-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">HOD Panel</span>
                <span className="bg-emerald-600/30 border border-emerald-600/60 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">{hodDepartment}</span>
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight italic mt-1 text-white">{hodName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={loadData}
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white px-2 py-1 transition-all"
            >
              Reload Data
            </button>
            <button 
              onClick={handleLogout}
              className="px-5 py-3 bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Dashboard Layout */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex-1 space-y-8 md:space-y-10">
        
        {/* Statistics Headings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5"
          >
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-930">{students.length}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Department Students</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5"
          >
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-930">{attendance.length}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marked Attendance Logs</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5"
          >
            <div className="p-4 rounded-2xl bg-purple-50 text-purple-600">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-930">
                {students.length > 0 ? (attendance.length / students.length).toFixed(1) : '0.0'}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Average Attendance Point</div>
            </div>
          </motion.div>
        </div>

        {/* Tab Controls, Searchbar & Action Panel */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* View Switching tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm w-full">
              <button 
                onClick={() => { setActiveTab('students'); setSearchTerm(''); }}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  activeTab === 'students' ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Volunteers List
              </button>
              <button 
                onClick={() => { setActiveTab('records'); setSearchTerm(''); }}
                className={cn(
                  "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  activeTab === 'records' ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Attendance Records
              </button>
            </div>

            {/* Dynamic Controls / Search and Export Column */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={activeTab === 'students' ? "Search students..." : "Search programs..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs uppercase tracking-widest"
                />
              </div>

              <button 
                onClick={exportCSV}
                className="w-full sm:w-auto h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>

          </div>

          {/* Records and rosters views */}
          <div className="overflow-x-auto border-t border-slate-50 pt-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
                <span className="text-sm font-semibold text-slate-500">Retrieving department logs...</span>
              </div>
            ) : activeTab === 'students' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="pb-4 px-6 text-left">Volunteer</th>
                    <th className="pb-4 px-6 text-left">Contact No</th>
                    <th className="pb-4 px-6 text-left">NSS Unit</th>
                    <th className="pb-4 px-6 text-left">Points Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-700 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-700/10">
                              {s.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 uppercase tracking-tight">{s.full_name}</p>
                              <p className="text-[10px] font-mono text-slate-400 uppercase">@{s.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-xs text-slate-600 font-bold">{s.mobile}</td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-lg">
                            Unit {s.unit}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase rounded-lg">
                            {s.points} PTS
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">
                        No students found registered for this department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="pb-4 px-6 text-left">Student</th>
                    <th className="pb-4 px-6 text-left">Unit</th>
                    <th className="pb-4 px-6 text-left">Program / Event Name</th>
                    <th className="pb-4 px-6 text-right">Marked Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg">
                              {a.volunteer_name?.charAt(0) || '?'}
                            </div>
                            <p className="font-bold text-slate-900 uppercase tracking-tight">{a.volunteer_name}</p>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase rounded-lg">
                            Unit {a.unit}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-xs text-slate-800 font-bold">{a.event_name}</td>
                        <td className="py-5 px-6 text-right text-xs text-slate-400 font-mono">
                          {new Date(a.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 italic text-sm">
                        No attendance logs found for this department's volunteers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      <footer className="py-8 bg-slate-900 text-slate-500 text-center text-xs mt-auto italic">
        "Not Me But You" | NSS College Ottapalam
      </footer>
    </div>
  );
}
