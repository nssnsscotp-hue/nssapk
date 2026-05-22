import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, Sparkles, User, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function NSSAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Namaste! I am your NSS Assistant. How can I help you today with NSS Units 36 & 94?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const suggestions = [
    "Who are the Program Officers?",
    "Who is the NSS Secretary?",
    "How to file a complaint?",
    "Track my complaint",
    "Upcoming NSS Events",
    "Blood Donation Benefits"
  ];

  const trackComplaint = async (id: string) => {
    setMessages(prev => [...prev, { role: 'user', content: id }]);
    setIsTyping(true);
    
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id.trim())
        .single();
      
      if (data) {
        const statusMsg = `🔍 **Complaint Found!**\n\n**ID:** #${data.id}\n**Category:** ${data.category}\n**Status:** ${data.status}\n\nOur team is working on it. You can see more details in the Complaints section.`;
        setMessages(prev => [...prev, { role: 'assistant', content: statusMsg }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "❌ I couldn't find a complaint with that ID. Please double-check the ID and try again." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Sorry, I encountered an error while tracking your complaint. Please try again later." }]);
    } finally {
      setIsTyping(false);
      setIsTracking(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    if (text === "Track my complaint") {
      setMessages(prev => [
        ...prev, 
        { role: 'user', content: text },
        { role: 'assistant', content: "Sure! Please enter your **Complaint ID** (e.g., NSS-12345) to check the status:" }
      ]);
      setIsTracking(true);
      return;
    }

    if (isTracking) {
      await trackComplaint(text);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    try {
      const systemInstruction = `You are the official NSS AI Assistant for NSS Units 36 & 94 of NSS College, Ottapalam.
          Your goal is to help volunteers with information, event details, and general NSS guidelines.
          
          Context:
          - College: NSS College, Ottapalam.
          - Units: 36 & 94.
          - Principal: Shri. Rajesh R.
          - Programme Officer (Unit 36): Dr. Aparna B (Assistant Professor, English Department).
          - Programme Officer (Unit 94): Dr. Rakhikrishna R (Assistant Professor, Physics Department).
          - Volunteer Secretary: Mr. Abhinav V A.
          - Motto: "Not Me, But You".
          - Activities: Regular camping, blood donation, environmental protection, and social service.
          - Complaints: Guide users to the 'Complaints' section of the portal for serious issues.
          - Tone: Professional, helpful, empathetic, and patriotic.
          - Keep responses concise and use formatting like bullet points where helpful.`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, systemInstruction }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch from AI server");
      }

      const data = await response.json();
      const aiResponse = data.text || "I'm sorry, I couldn't process that. Please try again or contact your Programme Officer.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Connectivity issue. Please check your internet or try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[60] group"
      >
        {isOpen ? <X size={24} /> : <div className="relative">
          <MessageSquare size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </div>}
        
        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            NSS Assistant
          </div>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[350px] md:w-[400px] h-[550px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col z-[60] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bot size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest leading-none">NSS Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Online | AI Powered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                  <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1.5 px-1">
                    {msg.role === 'user' ? 'You' : 'NSS AI'}
                  </div>
                </div>
              ))}
              
              {messages.length === 1 && !isTyping && (
                <div className="pt-2 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-3">Quick Questions</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isTyping && (
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assistant is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form 
              onSubmit={handleSend}
              className="p-4 bg-white border-t border-slate-100"
            >
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isTracking ? "Enter Complaint ID..." : "Ask something about NSS..."}
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 pr-14 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-bold text-slate-700"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 justify-center mt-3 opacity-30">
                <Sparkles size={10} className="text-blue-600" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Powered by Gemini AI</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
