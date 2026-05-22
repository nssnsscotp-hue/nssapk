import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Phone, Droplets, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function BloodBank() {
  const [activeTab, setActiveTab] = useState<'register' | 'requests'>('register');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Emergency Request form
  const [emergencyData, setEmergencyData] = useState({
    hospital: '',
    requiredGroup: '',
    units: '',
    details: '',
    contactName: '',
    contactPhone: ''
  });

  // Donor Registration form
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    class: '',
    contact: '',
    bloodGroup: ''
  });

  const handleEmergencyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('blood_emergency_requests')
        .insert([{
          blood_group: emergencyData.requiredGroup,
          units_required: emergencyData.units,
          hospital_venue: emergencyData.hospital,
          contact_number: emergencyData.contactPhone,
          status: 'active'
        }]);

      if (error) throw error;
      
      alert("Emergency Alert Broadcasted! NSS Volunteers will be notified.");
      setEmergencyData({ hospital: '', requiredGroup: '', units: '', details: '', contactName: '', contactPhone: '' });
      setActiveTab('register');
    } catch (err) {
      alert("Error broadcasting alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Ensure session for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { error } = await supabase
        .from('blood_donors')
        .insert([{
          full_name: formData.name,
          blood_group: formData.bloodGroup,
          mobile: formData.contact,
          unit: formData.department || localStorage.getItem('unit') || 'Unknown'
        }]);

      if (error) {
        console.error("Donor Registration Error:", error);
        throw new Error(error.message);
      }
      
      alert("Donor Registered Successfully! Your data is protected and visible only to admins.");
      setFormData({ name: '', department: '', class: '', contact: '', bloodGroup: '' });
    } catch (err: any) {
      alert(`Registration Failed: ${err.message || 'Database connection error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-red-600 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
              <Heart size={40} className="fill-current text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Amrit Blood Bank</h1>
            <p className="text-red-100 mt-2 text-lg font-medium">NSS College Ottapalam | Private & Secure Donor Network</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 max-w-sm">
            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Security Notice</p>
            <p className="text-sm font-bold text-white/90">Donor identities are kept confidential and visible only to authorized NSS officials for emergency coordination.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Tab Switcher */}
        <div className="flex bg-white rounded-3xl shadow-sm border border-slate-100 p-2 max-w-lg mx-auto mb-12">
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'register' ? "bg-red-600 text-white shadow-xl shadow-red-600/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Register as Donor
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'requests' ? "bg-red-600 text-white shadow-xl shadow-red-600/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Request Blood
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'register' ? (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl shadow-red-600/5 border border-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[4rem] flex items-center justify-center">
                  <Droplets size={48} className="text-red-500" />
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter uppercase italic">Be a Lifesaver.</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity</label>
                    <input 
                      type="text" required placeholder="Full Name" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Department</label>
                      <input 
                        type="text" placeholder="e.g. Physics, Commerce" 
                        value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                        className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Blood Group</label>
                      <select 
                        required 
                        value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                        className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 outline-none focus:ring-4 focus:ring-red-100 transition-all font-black text-red-600"
                      >
                        <option value="">SELECT GROUP</option>
                        {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direct Contact Number</label>
                    <input 
                      type="tel" required placeholder="10-digit Mobile Number" 
                      value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})}
                      className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold" 
                    />
                  </div>
                  
                  <button
                    disabled={submitting}
                    type="submit"
                    className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-red-600/30 transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : <>Submit Registration <ArrowRight size={18} /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-red-600/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-red-100 text-red-600 rounded-3xl">
                    <AlertCircle size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Submit Emergency Request</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Broadcast to all matching unit donors instantly</p>
                  </div>
                </div>

                <form onSubmit={handleEmergencyRequest} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital Name</label>
                       <input required type="text" value={emergencyData.hospital} onChange={e => setEmergencyData({...emergencyData, hospital: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold" placeholder="e.g., Taluk Hospital, Ottapalam" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Blood Group</label>
                       <select required value={emergencyData.requiredGroup} onChange={e => setEmergencyData({...emergencyData, requiredGroup: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-red-100 transition-all font-black">
                          <option value="">Select Group</option>
                          {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Name</label>
                       <input required type="text" value={emergencyData.contactName} onChange={e => setEmergencyData({...emergencyData, contactName: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                       <input required type="tel" value={emergencyData.contactPhone} onChange={e => setEmergencyData({...emergencyData, contactPhone: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Details</label>
                    <textarea value={emergencyData.details} onChange={e => setEmergencyData({...emergencyData, details: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-100 transition-all font-bold min-h-[100px] resize-none" placeholder="Reason for requirement, patient name, etc." />
                  </div>

                  <button type="submit" disabled={submitting} className="w-full h-16 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-3">
                    {submitting ? <Loader2 className="animate-spin" /> : <>Broadcast Emergency Request <ArrowRight size={18} /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
