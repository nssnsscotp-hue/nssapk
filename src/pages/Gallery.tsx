import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, ZoomIn, Calendar, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface GalleryItem {
  src: string;
  caption: string;
  date?: string;
  location?: string;
}

export default function Gallery() {
  const [selectedImg, setSelectedImg] = useState<GalleryItem | null>(null);
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setImages(data.map(x => ({ 
          src: x.url, 
          caption: x.title,
          date: x.date,
          location: x.category
        })));
      }
    } catch (err) { console.error('Gallery fetch failed', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGallery(); }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 italic">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
            <ImageIcon size={32} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Activities Gallery</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-xs">Capturing moments of service and community impact.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {images.map((img, index) => (
              <motion.div
                layoutId={img.src}
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onClick={() => setSelectedImg(img)}
                className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-zoom-in group border border-slate-100"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img 
                    src={img.src} 
                    alt={img.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white" size={32} />
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    {img.date && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                        <Calendar size={12} />
                        {img.date}
                      </div>
                    )}
                    {img.location && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                        <MapPin size={12} />
                        {img.location}
                      </div>
                    )}
                  </div>
                  <h4 className="text-slate-900 font-bold leading-snug group-hover:text-emerald-600 transition-colors uppercase tracking-tight text-sm">
                    {img.caption}
                  </h4>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">
            <p className="text-[10px] font-black uppercase tracking-widest">No activities have been published yet.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
            onClick={() => setSelectedImg(null)}
          >
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2">
              <X size={48} />
            </button>
            
            <div className="max-w-5xl w-full flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
              <motion.img 
                layoutId={selectedImg.src}
                src={selectedImg.src} 
                className="max-h-[70vh] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10"
              />
              <div className="text-center text-white max-w-2xl">
                <h3 className="text-2xl font-bold mb-2 tracking-tight">{selectedImg.caption}</h3>
                <div className="flex justify-center gap-4 text-white/50 text-sm font-medium">
                   <span className="flex items-center gap-1"><Calendar size={14} /> {selectedImg.date}</span>
                   <span className="flex items-center gap-1"><MapPin size={14} /> {selectedImg.location}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
