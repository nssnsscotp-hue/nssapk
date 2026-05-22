import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, BookOpen, Clock, CheckCircle2, AlertCircle, Loader2, Award, ChevronRight, History, Calendar } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface DbQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  points: number;
}

interface UserScore {
  id: string;
  score: number;
  completed_at: string;
}

const DEFAULT_FALLBACK_QUESTIONS: DbQuestion[] = [
  {
    id: "default-1",
    question: "What is the official motto of the National Service Scheme (NSS)?",
    options: ["Not Me But You", "Service Before Self", "Unity and Discipline", "Truth Alone Triumphs"],
    correct_option: 0,
    points: 10
  },
  {
    id: "default-2",
    question: "In which centenary year of Mahatma Gandhi was the NSS formally launched?",
    options: ["1950", "1969", "1975", "1947"],
    correct_option: 1,
    points: 10
  },
  {
    id: "default-3",
    question: "On which date is NSS Day celebrated annually across India?",
    options: ["15th August", "2nd October", "24th September", "12th January"],
    correct_option: 2,
    points: 10
  },
  {
    id: "default-4",
    question: "What does the giant wheel featured in the NSS badge represent?",
    options: ["Progress, movement, and the Konark Sun Temple wheel", "The Ashoka Chakra of the national flag", "Industrial growth of rural India", "Agricultural prosperity of farmers"],
    correct_option: 0,
    points: 10
  },
  {
    id: "default-5",
    question: "Who is the patron/inspiration behind NSS, in whose name National Youth Day is also celebrated?",
    options: ["Jawaharlal Nehru", "Swami Vivekananda", "Subhas Chandra Bose", "Mahatma Gandhi"],
    correct_option: 1,
    points: 10
  }
];

export default function QuizSystem() {
  const [questions, setQuestions] = useState<DbQuestion[]>(DEFAULT_FALLBACK_QUESTIONS);
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'browse' | 'quiz' | 'result' | 'confirm'>('browse');
  
  // Active playing states
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [certLink, setCertLink] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const userName = localStorage.getItem('name') || 'Volunteer';

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch questions from public.quiz_questions
      const { data: qData, error: qError } = await supabase
        .from('quiz_questions')
        .select('*')
        .order('created_at', { ascending: true });

      if (qError) {
        console.warn("Supabase fetch quiz_questions failed, using local seed fallback:", qError);
      } else if (qData && qData.length > 0) {
        const parsed: DbQuestion[] = qData.map(q => {
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
            options: opts.length > 0 ? opts : ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_option: typeof q.correct_option === 'number' ? q.correct_option : parseInt(q.correct_option || '0', 10),
            points: q.points || 10
          };
        });
        setQuestions(parsed);
      }

      // 2. Fetch scores from public.quiz_scores matching the current user
      const activeUserKey = localStorage.getItem('username') || localStorage.getItem('user') || '';
      if (activeUserKey) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', activeUserKey.toLowerCase())
          .single();

        if (profile) {
          const { data: scoreData, error: scoreError } = await supabase
            .from('quiz_scores')
            .select('*')
            .eq('profile_id', profile.id)
            .order('completed_at', { ascending: false });

          if (scoreData && !scoreError) {
            setScores(scoreData.map(s => ({
              id: s.id,
              score: s.score,
              completed_at: s.completed_at
            })));
          }
        }
      }
    } catch (err) {
      console.error("Quiz Hub loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (mode === 'quiz' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, timeLeft]);

  const selectQuizStart = () => {
    setTimeLeft(questions.length * 60); // 1 minute per question
    setMode('confirm');
  };

  const startQuiz = () => {
    setAnswers(new Array(questions.length).fill(null));
    setCurrentQ(0);
    setMode('quiz');
  };

  const finishQuiz = async () => {
    setScoreSubmitting(true);
    let finalScore = 0;
    
    // Accumulate scores
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_option) {
        finalScore += q.points;
      }
    });

    setScore(finalScore);

    try {
      const activeUserKey = localStorage.getItem('username') || localStorage.getItem('user') || '';
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', activeUserKey.toLowerCase())
        .single();

      // Persist locally for Profile tab and charts response
      const localLogs = localStorage.getItem('nss_local_quiz_attempts_backup');
      let attemptsList: any[] = [];
      if (localLogs) {
        try {
          attemptsList = JSON.parse(localLogs);
        } catch (pe) {
          attemptsList = [];
        }
      }

      const freshLocalAttempt = {
        id: `local-ach-${Date.now()}`,
        quiz_id: 'nss_assessment',
        quiz_title: 'NSS Comprehensive Assessment',
        score: finalScore,
        total_questions: questions.length,
        created_at: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      };
      attemptsList.unshift(freshLocalAttempt);
      localStorage.setItem('nss_local_quiz_attempts_backup', JSON.stringify(attemptsList));

      if (profile) {
        const { error } = await supabase
          .from('quiz_scores')
          .insert([{
            profile_id: profile.id,
            score: finalScore,
            completed_at: new Date().toISOString()
          }]);

        if (error) {
          console.warn("Quiz score insert failed:", error);
        }
      }

      // Generate dynamic credential link
      setCertLink(`https://certificate-gen.nss.workers.dev/gen?name=${encodeURIComponent(userName)}&score=${finalScore}&quiz=NSS+Comprehensive+Assessment`);
      setMode('result');
      fetchData(); // Reload history
    } catch (err) {
      console.error("Score persist handler exception:", err);
      setMode('result');
    } finally {
      setScoreSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-purple-100 text-purple-600 rounded-3xl mb-4 shadow-sm hover:scale-105 transition-transform">
            <Trophy size={36} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">NSS Assessment Portal</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Verify your NSS service guidelines knowledge and claim official credentials.</p>
        </div>

        {mode === 'browse' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Master Assessment Banner */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <span className="bg-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Official Service Certification
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold mt-4 tracking-tight leading-tight">
                  Comprehensive NSS Volunteer Assessment
                </h3>
                <p className="text-purple-100 mt-2 text-sm max-w-lg leading-relaxed font-light">
                  Complete this assessment to qualify for service badges. Questions will test your proficiency in NSS code, ethics, leadership principles, and disaster relief workflows.
                </p>

                <div className="grid grid-cols-3 gap-4 mt-8 border-t border-white/20 pt-6">
                  <div>
                    <div className="text-xl md:text-2xl font-black">{questions.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-purple-200">Questions</div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-black">{totalPoints}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-purple-200">Total Points</div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-black">{questions.length} Min</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-purple-200">Time Limit</div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={selectQuizStart}
                    disabled={loading}
                    className="h-14 px-8 bg-white text-purple-700 hover:bg-slate-100 select-none shadow-lg active:scale-95 transition-all font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2"
                  >
                    Start Assessment Now
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Assessment History */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                <History size={14} /> My Assessment Scores & Badges
              </h2>

              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
              ) : scores.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {scores.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:border-purple-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                          <Award size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">Score Achieved: {item.score} Points</span>
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                              Verified
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            <Calendar size={10} /> Completed on {new Date(item.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => window.location.href = `https://certificate-gen.nss.workers.dev/gen?name=${encodeURIComponent(userName)}&score=${item.score}&quiz=NSS+Comprehensive+Assessment`}
                        className="w-full sm:w-auto h-11 px-5 border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2"
                      >
                        <Download size={14} /> Claim Certificate
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200 italic text-slate-400 text-xs px-4">
                  No historical attempts logged yet. Attend the assessment above to claim your digital certificates!
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'confirm' && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-300">
            <div className="inline-flex p-4 bg-purple-50 text-purple-600 rounded-2xl mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Are you ready?</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto font-bold uppercase tracking-widest text-[10px] leading-relaxed">
              You are about to start the <span className="text-purple-600">NSS Comprehensive Assessment</span>. 
              You have exactly <span className="text-slate-900">{questions.length} minutes</span> to answer <span className="text-slate-900">{questions.length} questions</span>.
              Ensure you have a reliable internet speed configured.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={startQuiz}
                className="flex-1 h-16 bg-purple-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-purple-600/20 hover:bg-purple-500 transition-all flex items-center justify-center gap-2 text-xs"
              >
                Start Now <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setMode('browse')}
                className="flex-1 h-16 border-2 border-slate-100 text-slate-400 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 transition-all text-xs"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {mode === 'quiz' && questions.length > 0 && (
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden animate-in fade-in duration-300">
            {/* Progress Bar */}
            <div 
              className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-1000" 
              style={{ width: `${(timeLeft / (questions.length * 60)) * 100}%` }} 
            />
            
            <div className="flex justify-between items-center mb-10">
               <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Question {currentQ + 1} of {questions.length}</span>
               <div className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest",
                 timeLeft < 60 ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-50 text-slate-400"
               )}>
                 <Clock size={14} />
                 {formatTime(timeLeft)}
               </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                +{questions[currentQ].points} Points
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-10 tracking-tight">
              {questions[currentQ].question}
            </h3>

            <div className="space-y-3">
              {questions[currentQ].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newAnswers = [...answers];
                    newAnswers[currentQ] = idx;
                    setAnswers(newAnswers);
                  }}
                  className={cn(
                    "w-full p-6 text-left rounded-2xl border-2 transition-all font-bold text-sm",
                    answers[currentQ] === idx 
                      ? "bg-purple-50 border-purple-600 text-purple-700 shadow-md" 
                      : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {answers[currentQ] === idx && (
                      <CheckCircle2 size={18} className="text-purple-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-12 border-t border-slate-100 pt-8">
              <button 
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(prev => prev - 1)}
                className="flex-1 h-14 border-2 border-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Previous
              </button>
              {currentQ < questions.length - 1 ? (
                <button 
                  onClick={() => setCurrentQ(prev => prev + 1)}
                  className="flex-1 h-14 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
                >
                  Next
                </button>
              ) : (
                <button 
                  disabled={scoreSubmitting}
                  onClick={finishQuiz}
                  className="flex-1 h-14 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
                >
                  {scoreSubmitting ? <Loader2 className="animate-spin" /> : "Finish & Score"}
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'result' && (
          <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />
             
             <div className="inline-flex p-6 bg-emerald-50 text-emerald-600 rounded-[2rem] mb-6 shadow-sm">
                < Award size={64} />
             </div>
             
             <h2 className="text-4xl font-black text-slate-900 mb-2">Congratulations!</h2>
             <p className="text-slate-500 text-lg mb-8">You have completed the NSS Assessment successfully.</p>
             
             <div className="flex justify-center gap-4 mb-10">
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 min-w-32">
                   <div className="text-4xl font-black text-slate-900">{score}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">My Score</div>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 min-w-32">
                   <div className="text-4xl font-black text-slate-900">{totalPoints}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Available</div>
                </div>
             </div>

             {certLink && (
               <button 
                onClick={() => window.location.href = certLink}
                className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 mb-4 text-lg"
               >
                 <Download size={24} />
                 Download Digital Certificate
               </button>
             )}

             <button 
              onClick={() => { setMode('browse'); setAnswers([]); }}
              className="w-full text-slate-400 font-bold hover:text-slate-600 transition-colors py-4 uppercase tracking-widest text-xs"
             >
               Return to Hub
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Download({ size }: { size: number }) {
  return (
    <svg 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" 
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
