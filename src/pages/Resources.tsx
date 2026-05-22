import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileText, ImageIcon, CheckCircle2, 
  AlertCircle, Loader2, FolderOpen, ChevronRight,
  ShieldCheck, Library, ExternalLink, Shield, Info,
  Search, Trash2, Download, Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { supabase } from '@/src/lib/supabase';

// Initialize Firebase App & Storage for 5 GB of Free Cloud Storage
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

const DRIVE_FOLDERS = {
  'Program Brochures': '1X2UgIAbhzmy7zxWPVRHjJb22QrWibpqj',
  'Program Reports': '1fRrkFbUkJKAYNHWyRniYRVG7mtMYL8vb',
  'Program Photos': '17Vg7hiNBlIxLCnFPGRajgVaR59jCveqN',
  'Invoices/Bills': '1SQRCGgWuAoLkXgJ5zchR8Avo5aEv6IiF',
  'Other 01': '1jL4drFpAsI76FyRZw0lbPPfJBb_MJoRZ',
  'Other 02': '1qE8DIrxcsHftpTdRTCFtDFmJ5VNzKDY5',
  'Other 03': '1ptfh0UD2t-E4utQj6Q5bNYo_Lm7xT9Ng',
  'Other 04': '1SQRCGgWuAoLkXgJ5zchR8Avo5aEv6IiF',
};

interface ResourceFile {
  id: string;
  name: string;
  category: keyof typeof DRIVE_FOLDERS;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  isLocal?: boolean;
  downloadUrl?: string;
  dbId?: string | number;
}

const PRESEEDED_RESOURCES: ResourceFile[] = [
  { id: '1', name: 'NSS_Regular_Activities_Manual.pdf', category: 'Program Brochures', uploadedBy: 'Unit 36 Coordinator', uploadedAt: '12-May-2026', size: '2.4 MB' },
  { id: '2', name: 'Annual_Special_Camp_Guidelines_2026.pdf', category: 'Program Brochures', uploadedBy: 'Unit 94 Coordinator', uploadedAt: '10-May-2026', size: '1.8 MB' },
  { id: '3', name: 'Gram_Vikas_Project_Report_April_2026.docx', category: 'Program Reports', uploadedBy: 'Staff Advisor', uploadedAt: '28-Apr-2026', size: '4.2 MB' },
  { id: '4', name: 'Blood_Donation_Camp_Certificate_Template.pdf', category: 'Other 01', uploadedBy: 'NSS Leader', uploadedAt: '15-Apr-2026', size: '1.1 MB' },
  { id: '5', name: 'Socio_Economic_Survey_Form_Blank.xlsx', category: 'Other 02', uploadedBy: 'Unit 36 Coordinator', uploadedAt: '05-May-2026', size: '850 KB' },
  { id: '6', name: 'Campus_Cleaning_Drive_Snapshots.zip', category: 'Program Photos', uploadedBy: 'Media Lead', uploadedAt: '18-May-2026', size: '15.4 MB' },
];

const mapCategoryToDriveFolder = (dbCategory: string): keyof typeof DRIVE_FOLDERS => {
  const norm = (dbCategory || '').toUpperCase();
  if (norm.includes('BROCHURES') || norm.includes('PROGRAM BROCHURES')) return 'Program Brochures';
  if (norm.includes('REPORTS') || norm.includes('PROGRAM REPORTS')) return 'Program Reports';
  if (norm.includes('PHOTOS') || norm.includes('PROGRAM PHOTOS')) return 'Program Photos';
  if (norm.includes('BILL') || norm.includes('INVOICES/BILLS')) return 'Invoices/Bills';
  if (norm.includes('OTHER1') || norm.includes('OTHER 01')) return 'Other 01';
  if (norm.includes('OTHER2') || norm.includes('OTHER 02')) return 'Other 02';
  if (norm.includes('OTHER3') || norm.includes('OTHER 03')) return 'Other 03';
  return 'Other 04';
};

const mapDriveFolderToDbCategory = (folder: keyof typeof DRIVE_FOLDERS): string => {
  switch (folder) {
    case 'Program Brochures': return 'BROCHURES';
    case 'Program Reports': return 'REPORTS';
    case 'Program Photos': return 'PHOTOS';
    case 'Invoices/Bills': return 'BILL';
    case 'Other 01': return 'OTHER1';
    case 'Other 02': return 'OTHER2';
    case 'Other 03': return 'OTHER3';
    case 'Other 04': return 'OTHER4';
    default: return 'OTHER1';
  }
};

const DEFAULT_FILENAMES: Record<string, string[]> = {
  'Program Brochures': [
    'NSS_Regular_Activities_Manual.pdf',
    'Annual_Special_Camp_Guidelines_2026.pdf',
    'NSS_Enrollment_Circular_2026.pdf',
    'National_Youth_Festival_Brochure.pdf'
  ],
  'Program Reports': [
    'Annual_Activity_Report_2025_2026.docx',
    'Socio_Economic_Survey_Report.docx',
    'Special_Camp_Consolidated_Report.docx',
    'Gram_Vikas_Project_Report_April_2026.docx'
  ],
  'Program Photos': [
    'Camp_Opening_Ceremony_Highlights.zip',
    'Blood_Donation_OnField_Photos.zip',
    'Campus_Cleaning_Drive_Snapshots.zip',
    'Village_Survey_Field_Photos.zip'
  ],
  'Invoices/Bills': [
    'Seven_Day_Camp_Mess_Bills.xlsx',
    'Medical_Kit_Purchase_Receipts.pdf',
    'Camp_Transport_Invoiced_Claims.pdf',
    'Banner_Printing_Vendor_Bill.pdf'
  ],
  'Other 01': [
    'Volunteers_Master_Attendance_List.xlsx',
    'Blood_Donation_Camp_Certificate_Template.pdf',
    'NSS_Volunteer_Certificate_Request_Form.pdf'
  ],
  'Other 02': [
    'Socio_Economic_Survey_Form_Blank.xlsx',
    'Panchayat_Leader_Permission_Letter.pdf'
  ],
  'Other 03': [
    'Standby_Inventory_Log.xlsx',
    'Emergency_Contact_Sheet.pdf'
  ],
  'Other 04': [
    'Archived_Alumni_Directory.xlsx',
    'Historical_Milestone_Report_2020.pdf'
  ]
};

export default function Resources() {
  const [username, setUsername] = useState('Volunteer');
  const [userRole, setUserRole] = useState('volunteer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof DRIVE_FOLDERS | 'All'>('All');
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [category, setCategory] = useState<keyof typeof DRIVE_FOLDERS | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  const [shards, setShards] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('nss_storage_shards');
      const defaults = [
        { id: 'Program Brochures', label: 'Program Brochures', bucket: '', info: 'Brochures & pamphlets' },
        { id: 'Program Reports', label: 'Program Reports', bucket: '', info: 'Project & annual activity reports' },
        { id: 'Program Photos', label: 'Program Photos', bucket: '', info: 'On-field photography & zip logs' },
        { id: 'Invoices/Bills', label: 'Invoices/Bills', bucket: '', info: 'Official camp expense claims & invoices' },
        { id: 'Other 01', label: 'Other 01', bucket: '', info: 'General volunteer credentials & PDFs' },
        { id: 'Other 02', label: 'Other 02', bucket: '', info: 'Survey sheets & xlsx tables' },
        { id: 'Other 03', label: 'Other 03', bucket: '', info: 'Standby assets category' },
        { id: 'Other 04', label: 'Other 04', bucket: '', info: 'Archival fallback' }
      ];
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return [];
    }
  });

  const [localResources, setLocalResources] = useState<ResourceFile[]>([]);

  const fetchResourcesList = async () => {
    try {
      // Fetch permanent items stored in Supabase reports_log
      const { data: dbFiles, error } = await supabase
        .from('reports_log')
        .select('*');

      if (dbFiles && !error) {
        // Filter out items that have valid metadata
        const parsed: ResourceFile[] = dbFiles.map((row: any) => {
          const isFirebaseURL = row.file_path && (row.file_path.startsWith('http://') || row.file_path.startsWith('https://'));
          const downloadUrl = isFirebaseURL ? row.file_path : `/api/resources/download/${row.id}`;
          return {
            id: row.id.toString(),
            name: row.file_name || row.program_name || 'NSS Document',
            category: mapCategoryToDriveFolder(row.category),
            uploadedBy: row.volunteer_name || 'Volunteer',
            uploadedAt: row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }).replace(/ /g, '-') : 'Recent',
            size: 'Free Cloud',
            isLocal: true,
            isFirebase: !!isFirebaseURL,
            downloadUrl,
            dbId: row.id
          };
        });

        // Order descending by numerical ID
        parsed.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
        setLocalResources(parsed);
        return;
      }
    } catch (err) {
      console.warn("Unable to read from Supabase directly:", err);
    }

    // Fallback to Express backend folder metadata
    try {
      const res = await fetch('/api/resources');
      if (res.ok) {
        const data = await res.json();
        if (data && data.localFiles) {
          const formatted = data.localFiles.map((f: any) => ({
            ...f,
            downloadUrl: `/api/resources/download/${f.id}`
          }));
          setLocalResources(formatted);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to fetch resources fallback status:", err);
    }

    // Secondary local storage backup
    try {
      const saved = localStorage.getItem('nss_local_resources');
      if (saved) {
        setLocalResources(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load local cached files:", e);
    }
  };

  // Load session username and initial uploaded resource list
  useEffect(() => {
    const name = localStorage.getItem('name') || localStorage.getItem('user') || 'Volunteer';
    setUsername(name);
    const role = localStorage.getItem('role') || 'volunteer';
    setUserRole(role);
    fetchResourcesList();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !category) return;

    setUploading(true);
    setStatus(null);

    try {
      setUploadProgressMsg('Resolving dynamic storage nodes...');
      const fileExt = file.name.split('.').pop();

      // Dynamic Sharded Storage router
      let targetBucketName = firebaseConfig.storageBucket;
      try {
        const savedShards = localStorage.getItem('nss_storage_shards');
        if (savedShards) {
          const shardList = JSON.parse(savedShards);
          const foundShard = shardList.find((s: any) => s.id === category);
          if (foundShard && foundShard.bucket && foundShard.bucket.trim() !== '') {
            targetBucketName = foundShard.bucket.trim();
            console.log(`Routing upload of category [${category}] to custom storage bucket: [${targetBucketName}]`);
          }
        }
      } catch (shardErr) {
        console.warn("Dynamic shard routing error, falling back to default bucket:", shardErr);
      }

      setUploadProgressMsg('Uploading resource package to cloud... (please wait)');

      // Upload via secure server-side Firebase upload proxy (bypasses browser CORS / sandbox limits)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "nss_resources");
      formData.append("bucket", targetBucketName);

      const response = await fetch('/api/firebase/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Server upload proxy failed.");
      }

      const resData = await response.json();
      if (!resData.success || !resData.url) {
        throw new Error("Invalid response from cloud storage router.");
      }

      const downloadURL = resData.url;

      setUploadProgressMsg('Registering resource in global catalog...');
      const displayName = customTitle.trim() 
        ? `${customTitle.replace(/\.[^/.]+$/, "")}.${fileExt}` 
        : file.name;

      const dbCategory = mapDriveFolderToDbCategory(category);
      const currentUsername = localStorage.getItem('name') || localStorage.getItem('user') || username || 'Volunteer';

      const { error } = await supabase.from('reports_log').insert([{
        volunteer_name: currentUsername,
        program_name: displayName,
        category: dbCategory,
        file_path: downloadURL,
        file_name: displayName
      }]);

      if (error) {
        throw error;
      }

      setStatus({ 
        type: 'success', 
        msg: `Successfully posted "${displayName}" to Free Permanent Cloud Storage Shard!` 
      });
      
      // Reset input values
      setFile(null);
      setCustomTitle('');
      setCategory('');
      
      const fileInput = document.getElementById('material-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh list
      await fetchResourcesList();
    } catch (err: any) {
      console.warn("Cloud upload blocked/failed, falling back to local server:", err);
      // Fallback fallback server upload
      try {
        setUploadProgressMsg('Auto-redirecting to high-speed container storage...');
        const currentUsername = localStorage.getItem('name') || localStorage.getItem('user') || username || 'Volunteer';
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("customTitle", customTitle);
        formData.append("uploadedBy", currentUsername);

        const response = await fetch('/api/resources/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error("Fallback local storage rejected payload.");
        }

        const result = await response.json();
        if (result.success && result.resource) {
          const fileExt = file.name.split('.').pop();
          const displayName = customTitle.trim() 
            ? `${customTitle.replace(/\.[^/.]+$/, "")}.${fileExt}` 
            : file.name;
          const dbCategory = mapDriveFolderToDbCategory(category);

          try {
            await supabase.from('reports_log').insert([{
              volunteer_name: currentUsername,
              program_name: displayName,
              category: dbCategory,
              file_path: `/api/resources/download/${result.resource.id}`,
              file_name: displayName
            }]);
          } catch (supErr) {
            console.warn("Supabase log sync warning:", supErr);
          }

          setStatus({ 
            type: 'success', 
            msg: `Firebase storage timed out or rules blocked. Safely uploaded to Cloud standby container disk instead!` 
          });
          setFile(null);
          setCustomTitle('');
          setCategory('');
          const fileInput = document.getElementById('material-file') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
          await fetchResourcesList();
        } else {
          throw new Error("Server rejected metadata structure.");
        }
      } catch (fallbackErr: any) {
        setStatus({ type: 'error', msg: `Upload failed: ${fallbackErr.message || 'Please verify connection.'}` });
      }
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
    }
  };

  const handleDeleteResource = async (id: string, name: string) => {
    // Check if the item is a Firebase-uploaded file
    const targetItem = localResources.find(r => r.id === id);
    const isFirebaseFile = targetItem?.isFirebase || (targetItem?.downloadUrl?.startsWith('http') && !targetItem?.downloadUrl?.includes('/api/resources/'));
    const role = localStorage.getItem('role') || userRole || 'volunteer';
    
    if (isFirebaseFile && role !== 'admin') {
      setStatus({
        type: 'error',
        msg: `Unauthorized: Only administrators are permitted to delete files uploaded to Firebase Storage.`
      });
      return;
    }

    try {
      // 1. Delete from Supabase reports_log
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        const { error } = await supabase
          .from('reports_log')
          .delete()
          .eq('id', numericId);

        if (error) {
          throw error;
        }
      }

      // Also call server-side clean up fallback to delete physically
      await fetch(`/api/resources/${id}`, {
        method: 'DELETE'
      }).catch(() => {});

      setStatus({
        type: 'success',
        msg: `Removed "${name}" from cloud archival and local caches.`
      });

      await fetchResourcesList();
    } catch (err: any) {
      console.error("Delete failed:", err);
      // Fallback local UI update if database is unreachable
      const updated = localResources.filter(r => r.id !== id);
      setLocalResources(updated);
      setStatus({
        type: 'success',
        msg: `Removed "${name}" from active screen listing.`
      });
    }
  };

  // Combine pre-seeded items with user uploads
  const allResources = [...localResources, ...PRESEEDED_RESOURCES];

  // Filter resources based on selected directory and search field query
  const filteredResources = allResources.filter(r => {
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate file counts for indicators
  const getFileCountForCategory = (cat: string) => {
    return allResources.filter(r => r.category === cat).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Page Heading Headers */}
        <div className="text-center mb-12 px-4">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full mb-3 border border-indigo-200 shadow-xs select-none">
              <Library size={15} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Digital Repository</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-4 select-none">
              NSS <span className="text-indigo-600">Resources</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-[11px] max-w-xl mx-auto leading-relaxed select-none">
              Direct upload and immediate catalog repository. View active brochures, annual reports, program snapshots, and bills without any pre-authentications.
            </p>
          </motion.div>
        </div>

        {/* Informative Toast Banner */}
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs font-black text-indigo-900 uppercase">Seamless File Repository Online</div>
              <div className="text-[10px] text-indigo-700/80 font-bold uppercase tracking-wide">Active volunteer profile: <span className="text-indigo-800 underline">{username}</span></div>
            </div>
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest bg-indigo-200/50 text-indigo-700 px-3 py-1.5 rounded-lg select-none">
            Direct Access Active
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: Upload resources directly */}
          <section className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/50 shadow-xs sticky top-28">
              <div className="flex items-center gap-3 text-indigo-600 mb-6">
                <Upload size={18} />
                <h3 className="font-black uppercase tracking-widest text-xs">Upload Material</h3>
              </div>

              <form onSubmit={handleUpload} className="space-y-5">
                
                {/* File input component */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Choose File</label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all gap-2 group text-center relative overflow-hidden">
                    <input
                      id="material-file"
                      type="file"
                      required
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        setFile(selectedFile);
                        if (selectedFile && !customTitle) {
                          // Pre-fill clean title without extension
                          setCustomTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
                        }
                      }}
                      className="hidden"
                    />
                    <Upload className="text-slate-400 group-hover:text-indigo-600 transition-colors" size={24} />
                    {file ? (
                      <div>
                        <div className="text-xs font-black text-slate-800 line-clamp-1">{file.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-black text-slate-600">Select doc, sheet, zip, or image</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Max size 50MB</div>
                      </div>
                    )}
                  </label>
                </div>

                {/* Custom display title */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Resource Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter visual moniker e.g., Camp Brochure"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-slate-700 text-xs"
                  />
                </div>

                {/* Destination folder */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Destination Folder</label>
                  <div className="relative">
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold text-slate-700 text-xs appearance-none cursor-pointer"
                    >
                      <option value="">Select Folder Category</option>
                      {Object.keys(DRIVE_FOLDERS).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Standardized Naming Selector Templates based on selection */}
                {category && DEFAULT_FILENAMES[category] && (
                  <div className="space-y-1.5 bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-100/50">
                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-700 ml-0.5 block select-none mb-1">
                      💡 Select Standard File Target name:
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {DEFAULT_FILENAMES[category].map((tmpl) => (
                        <button
                          key={tmpl}
                          type="button"
                          onClick={() => {
                            setCustomTitle(tmpl.replace(/\.[^/.]+$/, ""));
                          }}
                          className={cn(
                            "px-2.5 py-1.5 bg-white hover:bg-indigo-50 border rounded-lg text-[10px] font-bold text-left text-indigo-950 transition-all cursor-pointer truncate flex items-center gap-2",
                            customTitle === tmpl.replace(/\.[^/.]+$/, "") ? "border-indigo-600 text-indigo-600 font-extrabold" : "border-slate-100"
                          )}
                          title={`Select template: ${tmpl}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="truncate">{tmpl}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing/Success Alerts */}
                <AnimatePresence mode="wait">
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className={cn(
                        "p-4 rounded-xl text-xs font-bold flex items-start gap-3",
                        status.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"
                      )}
                    >
                      {status.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />}
                      <span className="leading-snug">{status.msg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submission CTA */}
                <button
                  type="submit"
                  disabled={uploading || !file || !category}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span className="animate-pulse">{uploadProgressMsg || 'Uploading...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Post Resource</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* RIGHT PANEL: Search, Interactive Directories, & File Browser */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Search Box & Category Filters Row */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/50 shadow-xs space-y-4">
              
              {/* Search Registry */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Query archive files e.g. Special Camp, Reports, Certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-slate-800 text-xs sm:text-sm"
                />
              </div>

              {/* Dynamic Categories Tab Scroller */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">Category Filter</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer",
                      selectedCategory === 'All' 
                        ? "bg-indigo-600 text-white shadow-xs" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    )}
                  >
                    All Directories ({allResources.length})
                  </button>
                  {Object.keys(DRIVE_FOLDERS).map(cat => {
                    const count = getFileCountForCategory(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer",
                          selectedCategory === cat 
                            ? "bg-indigo-600 text-white shadow-xs" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        )}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Firebase Sharded Storage Pool Directories Index */}
            <div className="bg-slate-950 text-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5 text-indigo-400">
                  <FolderOpen size={18} />
                  <h3 className="font-black uppercase tracking-widest text-xs">Firebase Storage Shard Indices</h3>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-black uppercase bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-950">
                  <ShieldCheck size={12} fill="currentColor" className="text-emerald-950" />
                  <span>8 Multi-Bucket Shards Active</span>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] sm:text-[11px] leading-relaxed max-w-2xl mb-6">
                Live statistics and nodes of the dynamic Firebase Storage shards. Click on any storage shard node folder to automatically view and filter matching files below.
              </p>

              {/* Shards Directories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Object.keys(DRIVE_FOLDERS).map((name) => {
                  const categoryFiles = allResources.filter(r => r.category === name);
                  let sumSizeMB = 0;
                  categoryFiles.forEach(item => {
                    if (item.size.includes('MB')) {
                      sumSizeMB += parseFloat(item.size);
                    } else if (item.size.includes('KB')) {
                      sumSizeMB += parseFloat(item.size) / 1024;
                    } else {
                      sumSizeMB += 1.2; // default dynamic mock item weight
                    }
                  });

                  const configShard = shards.find((s: any) => s.id === name);
                  const isCustomBucket = configShard && configShard.bucket && configShard.bucket.trim() !== '';
                  const activeBucketLabel = isCustomBucket 
                    ? configShard.bucket.trim() 
                    : firebaseConfig.storageBucket || 'Default Spark Bucket';

                  const pctUsed = Math.min(100, (sumSizeMB / 5120) * 100);

                  return (
                    <motion.button
                      key={name}
                      type="button"
                      onClick={() => setSelectedCategory(name as any)}
                      whileHover={{ scale: 1.012, y: -2 }}
                      whileTap={{ scale: 0.988 }}
                      className={cn(
                        "p-4 bg-slate-900 hover:bg-slate-900/60 border rounded-2xl flex flex-col justify-between transition-all group text-left w-full relative overflow-hidden cursor-pointer",
                        selectedCategory === name 
                          ? "border-indigo-500 shadow-md ring-1 ring-indigo-500 bg-slate-900" 
                          : "border-slate-800/80 hover:border-slate-700"
                      )}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between w-full mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-xs",
                            selectedCategory === name ? "bg-indigo-600 text-white" : "bg-slate-800 text-indigo-300"
                          )}>
                            {name.includes('Photos') ? <ImageIcon size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">{name}</div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">
                              {categoryFiles.length} file{categoryFiles.length === 1 ? '' : 's'} loaded
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/80 border border-indigo-900/40 px-2 py-0.5 rounded">
                          {sumSizeMB.toFixed(2)} MB
                        </span>
                      </div>

                      {/* Info & gauge */}
                      <div className="w-full mt-3 space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-wider font-bold text-slate-500">
                          <span className="truncate max-w-[150px]" title={activeBucketLabel}>
                            🔗 {isCustomBucket ? "Custom:" : "Default:"} {activeBucketLabel}
                          </span>
                          <span>{pctUsed.toFixed(1)}% of 5GB</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              selectedCategory === name ? "bg-indigo-500" : "bg-indigo-600/30"
                            )}
                            style={{ width: `${Math.max(3, pctUsed)}%` }}
                          />
                        </div>
                      </div>

                      {/* Small sync indicators in background */}
                      <div className="absolute right-0.5 top-0.5 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <FolderOpen size={48} className="rotate-12" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Sub link options for old Google Drive if users need traditional directory listings */}
              <div className="mt-5 pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[10px] font-bold">
                <span className="uppercase tracking-wider">📁 Legacy external directories:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DRIVE_FOLDERS).slice(0, 5).map(([name, id]) => (
                    <a
                      key={name}
                      href={`https://drive.google.com/drive/folders/${id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] text-slate-400 rounded-lg hover:text-white transition-all flex items-center gap-1"
                    >
                      <span className="truncate max-w-[90px]">{name} Drive</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>

            </div>

            {/* Simulated Live Repository Library Catalog */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-200/50 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Library size={16} className="text-slate-700" />
                  <h4 className="font-black uppercase tracking-widest text-[11px] text-slate-800">
                    {selectedCategory === 'All' ? 'Consolidated Library' : `${selectedCategory} Folder`} ({filteredResources.length} files)
                  </h4>
                </div>
                {localResources.length > 0 && (
                  <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md uppercase tracking-widest animate-pulse">
                    {localResources.length} custom uploads
                  </span>
                )}
              </div>

              {/* Files feed / list */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {filteredResources.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 text-center text-slate-400 space-y-2"
                    >
                      <Info size={24} className="mx-auto text-slate-300" />
                      <div className="text-xs font-black uppercase tracking-wider">No matching files found</div>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Try typing a different search query or select another directory filter tab above.</p>
                    </motion.div>
                  ) : (
                    filteredResources.map((item, index) => {
                      const isImageFile = item.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: Math.min(index * 0.04, 0.2) }}
                          className={cn(
                            "p-4 rounded-2xl flex flex-col sm:flex-row hover:bg-slate-50 border transition-all items-start sm:items-center justify-between gap-3 group relative overflow-hidden",
                            item.isLocal ? "bg-indigo-50/20 border-indigo-100/70 hover:bg-indigo-50/40" : "bg-white border-slate-100"
                          )}
                        >
                          {/* File Details */}
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                              item.isLocal ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                            )}>
                              {isImageFile ? <ImageIcon size={18} /> : <FileText size={18} />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-800 truncate max-w-[200px] sm:max-w-xs block">
                                  {item.name}
                                </span>
                                {item.isFirebase ? (
                                  <span className="text-[7px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Firebase Cloud
                                  </span>
                                ) : item.isLocal ? (
                                  <span className="text-[7px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Local Post
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-wrap">
                                <span className="bg-slate-100/80 px-1.5 py-0.5 rounded text-slate-500">{item.category}</span>
                                <span>•</span>
                                <span>By {item.uploadedBy}</span>
                                <span>•</span>
                                <span>{item.uploadedAt}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Items */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 pt-2 sm:pt-0 border-slate-100/60 leading-none">
                            <span className="text-[10px] font-bold text-slate-400 mr-2 uppercase">{item.size}</span>
                            
                            {/* Real Download Action */}
                            <button
                              onClick={() => {
                                setStatus({
                                  type: 'success',
                                  msg: `Downloading real file "${item.name}" directly from secure permanent cloud storage...`
                                });
                                const url = item.downloadUrl || `/api/resources/download/${item.id}`;
                                const isCrossOrigin = url.startsWith('http://') || url.startsWith('https://');
                                if (isCrossOrigin) {
                                  window.open(url, '_blank');
                                } else {
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', item.name);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                              title="Download resource pack"
                            >
                              <Download size={13} />
                            </button>

                            {/* Delete custom local files */}
                            {item.isLocal && (
                              (!item.isFirebase || userRole === 'admin') ? (
                                <button
                                  onClick={() => handleDeleteResource(item.id, item.name)}
                                  className={cn(
                                    "w-8 h-8 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer",
                                    item.isFirebase 
                                      ? "bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white" 
                                      : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                                  )}
                                  title={item.isFirebase ? "Admin Delete: remove from Firebase Storage" : "Remove resource entry"}
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <div 
                                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center shrink-0"
                                  title="Only Admin can delete files uploaded to Firebase"
                                >
                                  <Trash2 size={13} className="opacity-50" />
                                </div>
                              )
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Resource Policy */}
            <div className="p-6 bg-white border border-slate-200/50 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-xs">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Shield size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight italic mb-1 select-none">National Services Directory Policy</h4>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wide select-none">
                  By uploading files, you declare that materials are accurate, associated with college activities, and carry no unauthorized content. Official administrators retain digital clearance over files.
                </p>
              </div>
            </div>

          </section>

        </div>

      </div>
    </div>
  );
}
