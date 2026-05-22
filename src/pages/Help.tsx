import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare, Send, Mail, MapPin, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function Help() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([formData]);
      
      if (error) throw error;

      setSuccess(true);
      setFormData({ name: '', email: '', role: '', message: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const contacts = [
    { icon: Mail, label: 'Units Email', value: 'nssnsscotp@gmail.com', href: 'mailto:nssnsscotp@gmail.com' },
    { icon: Phone, label: 'College Office', value: '0466 224 4382', href: 'tel:04662244382' },
    { icon: MapPin, label: 'Location', value: 'NSS College Ottapalam', href: '#' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px]" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex p-4 bg-white/10 backdrop-blur-xl rounded-3xl mb-6">
            <HelpCircle size={40} className="text-blue-400" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">HELP & FEEDBACK</h1>
          <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto">
            Have a question, request, or suggestion? We're here to listen and help units grow together.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Quick Contact */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 border-l-4 border-blue-600 pl-4 uppercase tracking-tighter">Direct Channels</h2>
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.label} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <contact.icon size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{contact.label}</div>
                    <a href={contact.href} className="text-slate-900 font-bold hover:text-blue-600 transition-colors">
                      {contact.value}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-600/20">
              <h3 className="text-xl font-bold mb-2">Office Hours</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Our Program Officers are available during standard college hours at the NSS Room.
              </p>
              <div className="p-4 bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest">
                Mon - Fri • 9:30 AM - 4:30 PM
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-slate-900">Send a Message</h3>
                <p className="text-slate-400 mt-1">Fill out the form below and we'll get back to you shortly.</p>
              </div>

              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-center gap-3 font-bold text-sm"
                >
                  <CheckCircle2 /> Your message has been sent successfully!
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label>
                    <input 
                      type="text" required placeholder="Enter name" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                    <input 
                      type="email" placeholder="email@example.com" 
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Your Role</label>
                  <input 
                    type="text" placeholder="e.g. Student / Teacher / Public" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea 
                    required placeholder="How can we help you today?" 
                    rows={5}
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none text-slate-900" 
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 mt-6 text-lg"
                >
                  {loading ? <Loader2 className="animate-spin text-white" /> : (
                    <>
                      <Send size={20} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
