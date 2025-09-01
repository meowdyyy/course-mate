import { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { enqueueGif } from '../../utils/gamification';

export default function MCQResults() {
  const { id } = useParams();
  const location = useLocation();
  const initialAttempt = location.state?.result || null;
  const [attempt, setAttempt] = useState(initialAttempt);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!initialAttempt);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!attempt) {
          // No attempt passed; load recent history and select latest if present
          const hist = await axios.get(`/api/quizzes/attempts/${id}`);
          setHistory(hist.data.attempts || []);
          if (hist.data.attempts?.length) setAttempt(hist.data.attempts[0]);
        } else {
          const hist = await axios.get(`/api/quizzes/attempts/${id}`);
          setHistory(hist.data.attempts || []);
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load results');
      } finally { setLoading(false); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Show perfect score gif once when coming here; chain level-up after
  useEffect(() => {
    if (!attempt) return;
    (async () => {
      if (attempt.total > 0 && attempt.score === attempt.total) {
        await enqueueGif('/assets/perfectscore.gif', 6000, 'Perfect score! +10 coins, +20% EXP');
      }
      // If server flagged level-up in navigation state, chain 10s level-up
      const leveledUp = location.state && location.state.leveledUp;
      if (leveledUp) {
        await enqueueGif('/assets/levelup.webp', 6000, 'Level up! Keep it going.');
      }
    })();
    // Refresh gamification HUD in case server granted rewards (e.g., perfect score)
  (async () => {
      try {
        const res = await axios.get('/api/gamification/me');
        window.dispatchEvent(new CustomEvent('gamification:update', { detail: { state: res.data } }));
      } catch {}
    })();
  }, [attempt, location.state]);

  if (loading) return <div className="p-6"><div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4"/><div className="h-20 bg-gray-100 rounded"/></div>;
  if (error) return <div className="p-6"><div className="p-4 bg-red-50 border border-red-200 text-red-700">{error}</div></div>;
  if (!attempt) return <div className="p-6"><p className="text-gray-600">No attempts yet. <Link className="text-black underline" to={`/courses/${id}/quiz`}>Take a quiz</Link>.</p></div>;

  const pct = Math.round((attempt.score / (attempt.total || 1)) * 100);
  const startedAt = new Date(attempt.createdAt);
  const duration = attempt.durationSeconds || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quiz Results</h1>
        <div className="flex items-center gap-2">
          <Link className="btn btn-secondary" to={`/courses/${id}`}>Back to Course</Link>
          <Link className="btn btn-primary" to={`/courses/${id}/quiz`}>Retake Quiz</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600">Score</div>
          <div className="text-3xl font-bold">{attempt.score} / {attempt.total}</div>
          <div className="text-gray-600">{pct}%</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Time</div>
          <div className="text-xl font-semibold">{duration}s</div>
          <div className="text-gray-600">{startedAt.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Questions</div>
          <div className="text-xl font-semibold">{attempt.questions?.length || attempt.total}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Your Answers</h2>
        <div className="space-y-3">
          {attempt.questions?.map((q, i) => {
            const userAns = attempt.answers?.[i];
            const isCorrect = userAns === q.correctIndex;
            return (
              <div key={q.id || i} className={`rounded-lg border p-4 ${isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="font-medium mb-2">{i+1}. {q.question}</div>
                <ul className="ml-6 list-disc text-sm text-gray-800">
                  {q.options.map((opt, oi) => (
                    <li key={oi} className={`${oi === q.correctIndex ? 'font-semibold' : ''} ${oi === userAns && oi !== q.correctIndex ? 'line-through text-red-700' : ''}`}>{String.fromCharCode(65+oi)}. {opt}</li>
                  ))}
                </ul>
                {q.explanation && <div className="mt-2 text-sm text-gray-700"><span className="font-semibold">Explanation:</span> {q.explanation}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Previous Attempts</h2>
          <button onClick={async()=>{ const hist = await axios.get(`/api/quizzes/attempts/${id}`); setHistory(hist.data.attempts || []); }} className="btn btn-secondary btn-sm">Refresh</button>
        </div>
        {history.length === 0 ? (
          <p className="text-gray-600">No previous attempts.</p>
        ) : (
          <ul className="divide-y">
            {history.map(a => {
              const p = Math.round((a.score/(a.total||1))*100);
              return (
                <li key={a._id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{new Date(a.createdAt).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">{a.durationSeconds || 0}s • {a.total} questions</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{a.score}/{a.total}</div>
                    <div className="text-sm text-gray-600">{p}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
