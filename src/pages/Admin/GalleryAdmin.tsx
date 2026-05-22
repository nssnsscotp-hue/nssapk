import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Image as ImageIcon, Trash2, Loader2, 
  Send, Calendar, Type, Link as LinkIcon, Upload, X, CheckCircle, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../../../firebase-applet-config.json';

// Initialize Firebase Storage
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

interface GalleryItem {
  id: string;
  url: string;
  title: string;
  date: string;
  category: string;
}

export default function GalleryAdmin() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  
  // Storage source selection
  const [sourceMode, setSourceMode] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Form State
  const [newItem, setNewItem] = useState({
    url: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Activity'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate and revoke local URL for image file preview
  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setItems(data.map(x => ({ 
          id: x.id, 
          url: x.url, 
          title: x.title, 
          date: x.date, 
          category: x.category 
        })));
      }
    } catch (err) { 
      console.error('Gallery fetch failed', err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchGallery(); 
  }, []);

  // Handlers for drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setStatus(null);
      } else {
        setStatus({ type: 'error', msg: "Please upload an image file (PNG, JPG, WEBP, GIF)." });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setStatus(null);
      } else {
        setStatus({ type: 'error', msg: "Please select an image file (PNG, JPG, WEBP, GIF)." });
      }
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Validate title and date
    if (!newItem.title.trim()) {
      setStatus({ type: 'error', msg: "Image Title is mandatory." });
      return;
    }

    let resolvedUrl = '';

    if (sourceMode === 'upload') {
      if (!file) {
        setStatus({ type: 'error', msg: "Please select or drop an image to upload." });
        return;
      }

      setSubmitting(true);
      setUploadProgressMsg('Uploading photo to cloud storage... (please wait)');

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "gallery_photos");

        const response = await fetch('/api/firebase/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Server upload proxy failed.");
        }

        const resData = await response.json();
        if (resData.success && resData.url) {
          resolvedUrl = resData.url;
        } else {
          throw new Error("Invalid response from storage proxy.");
        }

      } catch (uploadErr: any) {
        console.error("Firebase Storage Proxy Upload Error:", uploadErr);
        setStatus({ 
          type: 'error', 
          msg: `Firebase upload failed: ${uploadErr.message || "Please check connection or rules."}` 
        });
        setSubmitting(false);
        setUploadProgressMsg('');
        return;
      }
    } else {
      if (!newItem.url.trim()) {
        setStatus({ type: 'error', msg: "Please enter a valid Image URL." });
        return;
      }
      resolvedUrl = newItem.url.trim();
      setSubmitting(true);
    }

    // Now insert path into Supabase gallery table
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      const { error } = await supabase
        .from('gallery')
        .insert([{
          url: resolvedUrl,
          title: newItem.title.trim(),
          date: newItem.date,
          category: newItem.category
        }]);
      
      if (error) throw error;

      setStatus({ type: 'success', msg: "Success! Image published to activity gallery." });
      setNewItem({ url: '', title: '', date: new Date().toISOString().split('T')[0], category: 'Activity' });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchGallery();
    } catch (err: any) { 
      console.error("Error inserting record:", err);
      setStatus({ 
        type: 'error', 
        msg: `Failed to register image in activity index: ${err.message || 'Database error.'}` 
      });
    } finally { 
      setSubmitting(false); 
      setUploadProgressMsg('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      return;
    }

    setDeleting(id);
    setConfirmingDelete(null);
    const numericId = parseInt(id, 10);
    const isNumeric = !isNaN(numericId);

    // Get item URL first to check if we should delete from Firebase
    const targetedItem = items.find(item => item.id === id);
    const isFirebaseStorage = targetedItem?.url?.includes('firebasestorage.googleapis.com');

    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();

      // Delete from Firebase Storage first if applicable
      if (isFirebaseStorage && targetedItem?.url) {
        try {
          const fileRef = ref(storage, targetedItem.url);
          await deleteObject(fileRef);
          console.log("Successfully removed file from Firebase storage.");
        } catch (storageDelErr) {
          console.warn("Storage item removal warning (already deleted or access restricted):", storageDelErr);
        }
      }

      // Drop from Supabase gallery
      let { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', id);
      
      if (error || isNumeric) {
        if (isNumeric) {
          await supabase.from('gallery').delete().eq('id', numericId);
          await supabase.from('gallery').delete().eq('row', numericId);
        }
        await supabase.from('gallery').delete().eq('row', id);
      }
      
      setStatus({ type: 'success', msg: "Activity gallery card removed safely." });
      await fetchGallery();
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete record: " + (err.message || "Database error"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
            <ImageIcon className="text-emerald-600" size={32} /> Gallery Studio
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-widest">Curate and publish activity highlights.</p>
        </div>
      </header>

      {/* Global alert banner inside admin dashboard */}
      {status && (
        <div className={cn(
          "p-4 rounded-2xl flex items-start gap-3 text-xs font-bold transition-all animate-in fade-in zoom-in duration-300",
          status.type === 'success' 
            ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500" 
            : "bg-red-50 text-red-800 border-l-4 border-red-500"
        )}>
          {status.type === 'success' ? (
            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
          ) : (
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
          )}
          <span className="leading-normal">{status.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Publisher */}
        <div className="lg:col-span-5">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 italic sticky top-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
              <Plus size={16} /> New Activity Card
            </h3>

            <form onSubmit={handlePublish} className="space-y-6">
              
              {/* Image Input Selection Source Mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Photo Upload Mode</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode('upload');
                      setStatus(null);
                    }}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all text-center",
                      sourceMode === 'upload' 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🌐 Firebase Storage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode('link');
                      setStatus(null);
                    }}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all text-center",
                      sourceMode === 'link' 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🔗 Paste Web Link
                  </button>
                </div>
              </div>

              {/* Upload field or text input depending on the mode */}
              {sourceMode === 'upload' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Upload Photo</label>
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] gap-2",
                      dragActive ? "border-emerald-600 bg-emerald-50/50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {!file ? (
                      <>
                        <Upload className="text-slate-400" size={24} />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Drag and drop file here</p>
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">or click to browse local storage</p>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 test-white relative group/file">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <ImageIcon className="text-emerald-600 shrink-0" size={16} />
                          <div className="text-left min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{file.name}</p>
                            <p className="text-[8px] font-bold text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSelectedFile();
                          }}
                          className="w-6 h-6 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Direct Image URL</label>
                  <div className="relative">
                    <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="url" required={sourceMode === 'link'} placeholder="https://i.postimg.cc/..." 
                      value={newItem.url} onChange={e => setNewItem({...newItem, url: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-xs" 
                    />
                  </div>
                </div>
              )}

              {/* Title, Date and Category Fields */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Activity Title</label>
                <div className="relative">
                  <Type size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" required placeholder="e.g. Mega Blood Donation" 
                    value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date" required 
                      value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-xs" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category / Tag</label>
                  <select 
                    value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-[10px] uppercase tracking-widest"
                  >
                    <option>Activity</option>
                    <option>Achievement</option>
                    <option>Camp</option>
                    <option>Meeting</option>
                  </select>
                </div>
              </div>

              {/* Progress message during upload tasks */}
              {submitting && uploadProgressMsg && (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <Loader2 className="animate-spin text-emerald-600 shrink-0" size={16} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{uploadProgressMsg}</span>
                </div>
              )}

              {/* Preview image */}
              {sourceMode === 'upload' && localPreviewUrl ? (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Preview Selected Photo</p>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={localPreviewUrl} alt="Preview Selected" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              ) : sourceMode === 'link' && newItem.url ? (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Preview URL Image</p>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={newItem.url} alt="Preview URL" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Publish to Gallery</>}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Management */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" size={40} /></div>
            ) : items.length > 0 ? items.map((item) => {
              const isUploadedToFirebase = item.url?.includes('firebasestorage.googleapis.com');
              return (
                <div key={item.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="aspect-video relative">
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      {isUploadedToFirebase && (
                        <span className="h-6 px-3 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center">
                          Cloud
                        </span>
                      )}
                      <span className="h-6 px-3 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex justify-between items-center italic">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-slate-900 leading-tight line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {confirmingDelete === item.id && (
                        <button 
                          onClick={() => setConfirmingDelete(null)}
                          className="text-[10px] font-black uppercase text-slate-400"
                        >
                          No
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(item.id)}
                        disabled={!!deleting}
                        className={cn(
                          "p-3 rounded-xl transition-all",
                          confirmingDelete === item.id 
                            ? "bg-red-600 text-white animate-pulse" 
                            : "text-slate-200 hover:text-red-500 hover:bg-red-50 group-hover:text-slate-400"
                        )}
                      >
                        {deleting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 italic text-slate-400 text-center">
                <ImageIcon size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">No activities published yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
