import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { reward, showGifToast, showCoinLossToast } from '../../utils/gamification';

const DEFAULT_COUNT = 8;
const PER_QUIZ_SECONDS = 60 * 7; // 7 minutes default cap

export default function MCQQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // selected index per question
  const [desiredCount, setDesiredCount] = useState(DEFAULT_COUNT);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PER_QUIZ_SECONDS);
  const timerRef = useRef(null);

  const score = useMemo(() => {
    let s = 0; questions.forEach((q, i) => { if (Number.isInteger(answers[i]) && answers[i] === q.correctIndex) s++; });
    return s;
  }, [questions, answers]);

  useEffect(() => {
    generate();
   
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    setSecondsLeft(PER_QUIZ_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Submit inline to avoid extra deps
          (async () => {
            try {
              const res = await axios.post(`/api/quizzes/attempts/${id}`, { questions, answers, durationSeconds: PER_QUIZ_SECONDS });
              navigate(`/courses/${id}/quiz/results`, { state: { result: res.data.attempt, leveledUp: res.data.leveledUp } });
            } catch {}
          })();
          return 0;
        }
        return prev - 1;
      })
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [questions.length, id, navigate, questions, answers]);

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post(`/api/quizzes/generate/${id}`, { count: desiredCount });
      const qs = res.data.questions || [];
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to generate quiz');
    } finally { setLoading(false); }
  };

  const selectAnswer = (qi, oi) => {
    setAnswers(prev => {
      const copy = [...prev]; copy[qi] = oi; return copy;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
  const res = await axios.post(`/api/quizzes/attempts/${id}`, { questions, answers, durationSeconds: PER_QUIZ_SECONDS - secondsLeft });
  // Navigate with leveledUp flag from server to chain 10s level-up gif after success gif
  navigate(`/courses/${id}/quiz/results`, { state: { result: res.data.attempt, leveledUp: res.data.leveledUp } });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save attempt');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    // Apply quit penalty: −5 coins and show failure gif
    try {
      await reward({ expPercent: 0, coins: -5 });
      showGifToast('/assets/failure.gif', 3000, 'Quiz cancelled — −5 coins');
      try { showCoinLossToast('Lost 5 coins'); } catch {}
    } catch {}
    navigate(`/courses/${id}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link to={`/courses/${id}`} className="btn btn-secondary inline-flex items-center"><ArrowLeftIcon className="h-4 w-4 mr-1"/>Back to Course</Link>
        </div>
        <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/courses/${id}`} className="btn btn-secondary inline-flex items-center"><ArrowLeftIcon className="h-4 w-4 mr-1"/>Back</Link>
          <h1 className="text-xl font-semibold">Self‑Assessment Quiz</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <div className="flex items-center gap-2"><ClockIcon className="h-5 w-5"/><span className="font-mono">{secondsLeft}s</span></div>
          <div className="px-2 py-0.5 rounded border">Score: {score}/{questions.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-3 shadow-sm flex items-center justify-between">
        <div className="text-sm text-gray-700">Number of questions</div>
        <div className="flex items-center gap-2">
          <input type="number" min={3} max={20} className="w-24 border rounded px-2 py-1 text-sm" value={desiredCount} onChange={e=>setDesiredCount(Number(e.target.value)||DEFAULT_COUNT)} />
          <button className="btn btn-secondary" onClick={generate}>Regenerate</button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={q.id || qi} className="bg-white border rounded-xl p-5">
            <div className="text-gray-900 font-medium mb-3">{qi+1}. {q.question}</div>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                return (
                  <button key={oi} onClick={()=>selectAnswer(qi, oi)} className={`text-left border rounded-md px-3 py-2 transition ${selected ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}>
                    {String.fromCharCode(65+oi)}. {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Your current score updates as you select answers.</div>
        <div className="flex items-center gap-2">
          <button onClick={handleCancel} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>{submitting? 'Submitting...' : 'Submit & Save'}</button>
        </div>
      </div>
    </div>
  );
}
