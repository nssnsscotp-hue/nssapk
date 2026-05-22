import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Phone, MapPin, MessageSquare, AlertTriangle, Volume2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function SOS() {
  const [playing, setPlaying] = useState(false);

  const emergencyContacts = [
    { name: 'Women Helpline', number: '1091', icon: ShieldAlert },
    { name: 'Police Emergency', number: '112', icon: ShieldAlert },
    { name: 'Fire Emergency', number: '101', icon: AlertTriangle },
    { name: 'Ottapalam Police', number: '9497934004', icon: ShieldAlert },
  ];

  const handleSOSCall = () => {
    window.location.href = "tel:112";
  };

  const playAlarm = () => {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
    audio.play();
    setPlaying(true);
    setTimeout(() => setPlaying(false), 5000);
  };

  const getLocation = (): Promise<{lat: number, lon: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject('Permission denied')
      );
    });
  };

  const shareWhatsApp = async () => {
    try {
      const { lat, lon } = await getLocation();
      const msg = `I need help. My current location: https://maps.google.com/?q=${lat},${lon}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    } catch (err) {
      alert(err);
    }
  };

  const shareSMS = async () => {
    try {
      const { lat, lon } = await getLocation();
      const msg = `I am in danger! My location: https://maps.google.com/?q=${lat},${lon}`;
      window.location.href = `sms:?body=${encodeURIComponent(msg)}`;
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-flex p-4 bg-red-600 text-white rounded-full mb-4 shadow-xl shadow-red-600/30"
          >
            <ShieldAlert size={48} />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Women Safety SOS</h1>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Immediate emergency support. Use these tools if you feel unsafe or are in danger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button 
            onClick={handleSOSCall}
            className="col-span-full h-24 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] shadow-2xl shadow-red-600/20 flex items-center justify-center gap-4 transition-all group active:scale-95"
          >
            <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-colors">
              <Phone size={28} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-widest opacity-80">Primary Emergency</div>
              <div className="text-2xl font-black">CALL SOS (112)</div>
            </div>
          </button>

          <button 
            onClick={playAlarm}
            className={cn(
              "h-20 rounded-[2rem] flex items-center justify-center gap-3 font-bold transition-all border-2",
              playing 
                ? "bg-amber-100 border-amber-300 text-amber-700 animate-pulse" 
                : "bg-white border-slate-100 text-slate-800 hover:border-amber-500"
            )}
          >
            <Volume2 />
            Trigger Panic Alarm
          </button>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={shareWhatsApp}
              className="h-20 bg-green-500 hover:bg-green-600 text-white rounded-[2rem] flex items-center justify-center gap-3 font-bold shadow-lg shadow-green-500/10 transition-all"
            >
              <MessageSquare />
              Share on WhatsApp
            </button>
            <button 
              onClick={shareSMS}
              className="h-20 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] flex items-center justify-center gap-3 font-bold shadow-lg shadow-slate-900/10 transition-all"
            >
              <MessageSquare />
              Send Emergency SMS
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-red-600 rounded-full" />
            Quick Helpline Contacts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {emergencyContacts.map((contact) => (
              <a 
                key={contact.name}
                href={`tel:${contact.number}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <div className="p-3 bg-white text-red-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <contact.icon size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{contact.name}</div>
                  <div className="text-xs text-slate-500 font-mono tracking-wider">{contact.number}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 p-6 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 text-center text-xs text-slate-500 italic">
          Your location data is only accessed when you click share buttons and is sent directly to your chosen contacts.
        </div>
      </div>
    </div>
  );
}
