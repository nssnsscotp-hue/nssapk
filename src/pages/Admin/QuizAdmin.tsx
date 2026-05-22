import React, { useState, useEffect } from 'react';
import { Plus, Trophy, CheckCircle, Loader2, Trash2, BookOpen, Clock, ChevronRight, HelpCircle, Send, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface QuestionItem {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  points: number;
  created_at: string;
}

export default function QuizAdmin() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Custom non-blocking status panel
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

  // Current Question Form State
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct: '0',
    points: '10'
  });

  const sqlPolicyFix = `-- Run this in your Supabase SQL Editor to make sure Quiz Admin can write:
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Allow admin insert questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Allow admin delete questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Allow user select scores" ON public.quiz_scores;
DROP POLICY IF EXISTS "Allow user insert scores" ON public.quiz_scores;

CREATE POLICY "Allow public select questions" ON public.quiz_questions FOR SELECT TO public USING (true);
CREATE POLICY "Allow admin insert questions" ON public.quiz_questions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow admin delete questions" ON public.quiz_questions FOR DELETE TO public USING (true);
CREATE POLICY "Allow user select scores" ON public.quiz_scores FOR SELECT TO public USING (true);
CREATE POLICY "Allow user insert scores" ON public.quiz_scores FOR INSERT TO public WITH CHECK (true);`;

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setQuestions(data.map((q: any) => {
          let opts: string[] = [];
          if (Array.isArray(q.options)) {
            opts = q.options;
          } else {
            try {
              opts = typeof q.options === 'string' ? JSON.parse(q.options) : [];
            } catch (pErr) {
              opts = [q.opt1, q.opt2, q.opt3, q.opt4].filter(Boolean);
            }
          }
          return {
            id: q.id,
            question: q.question || '',
            options: opts,
            correct_option: typeof q.correct_option === 'number' ? q.correct_option : parseInt(q.correct_option || '0', 10),
            points: q.points || 10,
            created_at: q.created_at
          };
        }));
      }
    } catch (err) {
      console.error('Quiz Admin Library Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // 1. Basic validation
    if (!newQuestion.question.trim() || !newQuestion.option1.trim() || !newQuestion.option2.trim()) {
      setStatus({
        type: 'error',
        text: 'Validation Error',
        details: 'Please provide the question body and at least Option 1 & Option 2.'
      });
      return;
    }

    // 2. Validate that the selected correct option exists and has text
    const correctIdx = parseInt(newQuestion.correct, 10);
    const optionsMap = [newQuestion.option1, newQuestion.option2, newQuestion.option3, newQuestion.option4];
    const correctValue = optionsMap[correctIdx]?.trim();
    if (!correctValue) {
      setStatus({
        type: 'error',
        text: 'Configuration Error',
        details: `You marked Option ${correctIdx + 1} as the correct answer, but Option ${correctIdx + 1} is blank! Please enter text for Option ${correctIdx + 1} first.`
      });
      return;
    }

    setSubmitting(true);
    try {
      const optsArray = [
        newQuestion.option1.trim(),
        newQuestion.option2.trim(),
        newQuestion.option3.trim(),
        newQuestion.option4.trim()
      ].filter(o => o !== '');

      const { error } = await supabase
        .from('quiz_questions')
        .insert([{
          question: newQuestion.question.trim(),
          options: optsArray,
          correct_option: correctIdx,
          points: parseInt(newQuestion.points, 10) || 10
        }]);

      if (error) throw error;

      setStatus({
        type: 'success',
        text: 'Success! Question added to the official NSS Active Question Bank.'
      });

      setNewQuestion({
        question: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        correct: '0',
        points: '10'
      });
      fetchQuestions();
    } catch (err: any) {
      console.error("Supabase insert error:", err);
      setStatus({
        type: 'error',
        text: 'Database Save Failed',
        details: err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    setStatus(null);
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setStatus({
        type: 'success',
        text: 'Question successfully deleted.'
      });
      setQuestions(prev => prev.filter(q => q.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        text: 'Delete operation failed',
        details: err.message || String(err)
      });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
            <Trophy className="text-purple-600" size={32} /> Quiz Master Pro
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-widest">Configure official interactive questions for volunteers.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm shadow-purple-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Database Live Connected</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Create/Insert Form */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Plus size={16} /> 1. Write Question & Weight
            </h3>

            {status && (
              <div className={cn(
                "p-4 rounded-2xl mb-6 text-xs font-bold font-sans flex flex-col gap-1 border animate-in fade-in duration-300",
                status.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                status.type === 'error' ? "bg-rose-50 text-rose-800 border-rose-200" :
                "bg-blue-50 text-blue-800 border-blue-200"
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 tracking-widest h-2 rounded-full shrink-0",
                    status.type === 'success' ? "bg-emerald-500 animate-pulse" :
                    status.type === 'error' ? "bg-rose-500 animate-bounce" :
                    "bg-blue-500"
                  )} />
                  <span className="font-extrabold uppercase tracking-wide">{status.text}</span>
                </div>
                {status.details && (
                  <p className="pl-4 mt-1 opacity-90 leading-relaxed font-mono text-[10px] whitespace-pre-wrap break-all bg-white/60 p-2.5 rounded-lg border border-black/5 mt-2">
                    {status.details}
                  </p>
                )}
              </div>
            )}
            
            <form onSubmit={handleAddQuestion} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Question Body</label>
                <textarea 
                  required 
                  placeholder="e.g., What is Mahatma Gandhi's major guidance to community volunteer service?" 
                  rows={2}
                  value={newQuestion.question} 
                  onChange={e => setNewQuestion({...newQuestion, question: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold text-xs resize-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Points Value</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 rounded-xl px-4 h-12">
                  <Award size={14} className="text-slate-400" />
                  <input 
                    type="number" 
                    value={newQuestion.points} 
                    onChange={e => setNewQuestion({...newQuestion, points: e.target.value})}
                    className="bg-transparent outline-none flex-1 font-bold text-xs" 
                    placeholder="Points (e.g., 10)"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Configure Options & Key Selection</label>
                
                {[1, 2, 3, 4].map((num, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-bold text-slate-400">Option {num} {idx > 1 && '(Optional)'}</span>
                      {newQuestion.correct === idx.toString() && (
                        <span className="text-[9px] font-extrabold uppercase text-emerald-600 italic">Correct Key</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder={`Option value...`}
                        value={idx === 0 ? newQuestion.option1 : idx === 1 ? newQuestion.option2 : idx === 2 ? newQuestion.option3 : newQuestion.option4}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (idx === 0) setNewQuestion({...newQuestion, option1: val});
                          else if (idx === 1) setNewQuestion({...newQuestion, option2: val});
                          else if (idx === 2) setNewQuestion({...newQuestion, option3: val});
                          else setNewQuestion({...newQuestion, option4: val});
                        }}
                        className={cn(
                          "flex-1 h-12 border rounded-xl px-4 outline-none transition-all font-bold text-xs",
                          newQuestion.correct === idx.toString() ? "bg-emerald-50 border-emerald-300 focus:ring-emerald-500" : "bg-slate-50 border-slate-100 focus:ring-purple-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setNewQuestion({...newQuestion, correct: idx.toString()})}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-90",
                          newQuestion.correct === idx.toString() ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        )}
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/15 disabled:opacity-50 transition-all mt-4"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : (
                  <>
                    <Send size={14} /> Add To Assessment Table
                  </>
                )}
              </button>
            </form>
          </section>

          {/* New Collapsible Database troubleshooting rules box */}
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl shrink-0 mt-0.5">
                <HelpCircle size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Database Policy Helper</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-bold">
                  If clicking add question gives a &quot;row violates row-level security policy&quot; error, run these quick SQL commands in your Supabase dashboard to enable instant insertions.
                </p>
              </div>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-300 rounded-xl text-[9px] font-mono overflow-x-auto max-h-[140px] border border-slate-800">
              {sqlPolicyFix}
            </pre>

            <button
              onClick={() => {
                navigator.clipboard.writeText(sqlPolicyFix);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full h-10 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
            >
              {copied ? "Copied SQL Setup!" : "Copy SQL Policy Script"}
            </button>
          </div>
        </div>

        {/* Right Side: Active Questions List */}
        <div className="lg:col-span-7 space-y-6">
          <SectionHeader count={questions.length} />

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <Loader2 className="animate-spin text-purple-600 mx-auto" size={40} />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">Loading active question pool...</p>
              </div>
            ) : questions.length > 0 ? (
              <AnimatePresence>
                {questions.map((q, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={q.id} 
                    className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between gap-4 group hover:border-purple-200 transition-all"
                  >
                    <div className="flex items-start gap-4 overflow-hidden">
                      <span className="w-8 h-8 bg-purple-50 border border-purple-100 rounded-xl shrink-0 flex items-center justify-center text-xs font-black text-purple-600 mt-0.5">
                        {questions.length - idx}
                      </span>
                      <div className="overflow-hidden space-y-2">
                        <p className="text-sm font-bold text-slate-800 leading-normal tracking-tight">{q.question}</p>
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="bg-purple-100 text-purple-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            +{q.points} Points
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Key: Option {q.correct_option + 1}
                          </span>
                        </div>

                        {/* Options preview */}
                        <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-[11px] font-medium text-slate-500">
                          {q.options.map((opt, oIdx) => (
                            <div 
                              key={oIdx} 
                              className={cn(
                                "flex items-center gap-2", 
                                q.correct_option === oIdx ? "text-emerald-600 font-black" : ""
                              )}
                            >
                              <span className="opacity-40">{oIdx + 1}.</span>
                              <span>{opt}</span>
                              {q.correct_option === oIdx && <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-1 py-0.2 rounded">(Correct Option)</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {deleteConfirmId === q.id ? (
                      <div className="flex flex-col sm:flex-row items-center gap-1.5 self-start shrink-0 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="h-8 px-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-95"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="h-8 px-2.5 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirmId(q.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all self-start shrink-0 active:scale-95"
                        title="Delete Question"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="py-20 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center italic text-slate-400">
                <HelpCircle size={36} className="mb-2 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest">Question Bank is currently empty.</p>
                <p className="text-[9px] text-slate-400 mt-1 max-w-xs text-center font-bold">Use the composer on the left to publish your first active question and reward community badges.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 italic">
        Active Assessment Questions ({count})
      </h4>
    </div>
  );
}
