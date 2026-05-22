import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, FolderOpen, Loader2, CheckCircle2, ChevronRight, FileCode, Users } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const name = localStorage.getItem('name') || '';

  const [formData, setFormData] = useState({
    name: name,
    program: '',
    folder: '',
    fileName: '',
    file: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        fileName: file.name,
        file: file
      });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.folder || !formData.program) {
      alert("Please fill all fields and select a file");
      return;
    }

    setLoading(true);
    try {
      // Ensure session for RLS
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) await supabase.auth.signInAnonymously();

      const fileExt = formData.file.name.split('.').pop();
      const filePath = `${formData.folder}/${formData.program}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('reports') 
        .upload(filePath, formData.file);

      if (error) throw error;

      // Log the upload in a reports table if needed
      await supabase.from('reports_log').insert([{
        volunteer_name: formData.name,
        program_name: formData.program,
        category: formData.folder,
        file_path: filePath,
        file_name: formData.fileName
      }]);

      setSuccess(true);
      setFormData({ ...formData, program: '', folder: '', fileName: '', file: null });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Make sure 'reports' bucket exists in your Supabase storage.");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'BROCHURES', name: 'Brochures', icon: '📄' },
    { id: 'PHOTOS', name: 'Photos', icon: '📸' },
    { id: 'REPORTS', name: 'Reports', icon: '📑' },
    { id: 'OTHER1', name: 'Other 01', icon: '📁' },
    { id: 'OTHER2', name: 'Other 02', icon: '📁' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info Side */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                <FileText size={32} />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Reports & Archival</h1>
              <p className="text-slate-500 mt-2 text-lg">Central hub for uploading program documentation and viewing unit reports.</p>
            </div>

            <div className="space-y-4">
               <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><Users size={20} /></div>
                  <div>
                    <h4 className="font-bold text-slate-900">Volunteer Hub</h4>
                    <p className="text-xs text-slate-500">Access program guidelines and templates.</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-300" />
               </div>
               <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><FileCode size={20} /></div>
                  <div>
                    <h4 className="font-bold text-slate-900">Consolidated Reports</h4>
                    <p className="text-xs text-slate-500">View annual and monthly audit logs.</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-300" />
               </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/20">
               <h3 className="font-bold mb-4 uppercase tracking-widest text-xs opacity-50">Upload Guidelines</h3>
               <ul className="space-y-3 text-sm text-slate-400">
                 <li className="flex gap-2"><span>•</span> Documents should be in PDF or DOCX format.</li>
                 <li className="flex gap-2"><span>•</span> Photos must be compressed (Limit: 5MB).</li>
                 <li className="flex gap-2"><span>•</span> Ensure file names are descriptive.</li>
               </ul>
            </div>
          </div>

          {/* Upload Form */}
          <div>
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div className="mb-8">
                 <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                   <Upload size={24} className="text-blue-600" />
                   NSS Cloud
                 </h3>
                 <p className="text-slate-400 text-sm mt-1">Direct upload to NSS Google Drive.</p>
               </div>

               {success && (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-2xl flex items-center gap-2 font-bold text-sm">
                   <CheckCircle2 size={18} /> File uploaded successfully!
                </motion.div>
               )}

               <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Volunteer Name</label>
                    <input 
                      type="text" readOnly value={formData.name}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none text-slate-500 font-medium cursor-default" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Program Name</label>
                    <input 
                      type="text" required placeholder="e.g. Yoga Day 2026" 
                      value={formData.program} onChange={e => setFormData({...formData, program: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      required 
                      value={formData.folder} onChange={e => setFormData({...formData, folder: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold"
                    >
                      <option value="">Choose category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select File</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-blue-500 transition-all bg-slate-50">
                        <FolderOpen className="text-slate-300 group-hover:text-blue-500 transition-colors" size={32} />
                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600">
                          {formData.fileName || "Click to browse or drag file"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 mt-6 text-lg disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Start Upload"}
                  </button>
               </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
