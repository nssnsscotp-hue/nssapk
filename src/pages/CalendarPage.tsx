import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const importantDays: Record<string, string> = {
    // 2026 Sample (Matching original app's list)
    "2026-01-01": "New Year's Day",
    "2026-01-26": "Republic Day",
    "2026-02-21": "International Mother Language Day",
    "2026-03-08": "International Women's Day",
    "2026-03-22": "World Water Day",
    "2026-04-07": "World Health Day",
    "2026-05-01": "International Workers' Day",
    "2026-06-05": "World Environment Day",
    "2026-08-15": "Independence Day of India",
    "2026-10-02": "Gandhi Jayanti",
    "2026-12-10": "Human Rights Day",
    "2026-12-25": "Christmas Day",
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const changeYear = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear() + delta, currentDate.getMonth(), 1));
  };

  const changeMonth = (month: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
            <CalendarIcon size={32} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Observance Calendar</h1>
          <p className="text-slate-500 mt-2 text-lg">National and International days of significance (2026-2030).</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 text-white">
            <div className="flex items-center gap-4">
               <button onClick={() => changeYear(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                 <ChevronLeft size={24} />
               </button>
               <h2 className="text-3xl font-black tracking-tighter w-24 text-center">{currentYear}</h2>
               <button onClick={() => changeYear(1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                 <ChevronRight size={24} />
               </button>
            </div>

            <div className="flex gap-2 p-1 bg-white/10 rounded-2xl overflow-x-auto max-w-full no-scrollbar">
               {monthNames.map((m, i) => (
                 <button 
                  key={m} 
                  onClick={() => changeMonth(i)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    currentMonth === i ? "bg-white text-slate-900" : "hover:bg-white/5"
                  )}
                 >
                   {m.slice(0, 3)}
                 </button>
               ))}
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 py-4">
                  {d}
                </div>
              ))}
              
              {calDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                
                const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const event = importantDays[dateKey];
                
                return (
                  <motion.div 
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      "aspect-square rounded-2xl flex items-center justify-center relative transition-all group cursor-default border",
                      event 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                        : "bg-white border-slate-50 text-slate-900"
                    )}
                  >
                    <span className="font-bold">{day}</span>
                    {event && (
                      <div className="absolute bottom-[-400%] left-1/2 -translate-x-1/2 w-48 p-4 bg-slate-900 rounded-2xl text-[10px] leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-2xl">
                         <div className="flex items-center gap-2 mb-1 text-blue-400">
                           <Info size={10} />
                           SIGNIFICANCE
                         </div>
                         <div className="font-bold opacity-80">{event}</div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
           {Object.entries(importantDays).filter(([key]) => key.startsWith(currentYear.toString()) && parseInt(key.split('-')[1]) === currentMonth + 1).map(([key, value]) => (
             <div key={key} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                <div className="text-2xl font-black text-slate-200 w-12 text-center">{key.split('-')[2]}</div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5">Observance</div>
                  <div className="font-bold text-slate-900 leading-tight">{value}</div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
