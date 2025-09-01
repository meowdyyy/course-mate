import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { showCoinLossToast } from '../../utils/gamification';

export default function SelfAssessment({ isEnrolled }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lastAttempt, setLastAttempt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!isEnrolled) return;
      try {
        setLoading(true);
        const res = await axios.get(`/api/quizzes/attempts/${id}`);
        if (!ignore) setLastAttempt((res.data.attempts || [])[0] || null);
      } catch (_) {
        // ignore
      } finally { setLoading(false); }
    }
    load();
    return () => { ignore = true; };
  }, [id, isEnrolled]);

  useEffect(() => {
    let ignore = false;
    async function loadCoins() {
      try {
        const g = await axios.get('/api/gamification/me');
        if (!ignore) setCoins(g.data.coins);
      } catch {}
    }
    loadCoins();
    const onUpdate = (e) => setCoins(prev => e.detail?.state?.coins ?? prev);
    window.addEventListener('gamification:update', onUpdate);
    return () => { ignore = true; window.removeEventListener('gamification:update', onUpdate); };
  }, []);

  const renderLastAttempt = () => {
    if (loading) return <div className="text-sm text-gray-500">Loading your recent results…</div>;
    if (!lastAttempt) return <div className="text-sm text-gray-500">No attempts yet. Try a quick quiz!</div>;
    const pct = Math.round((lastAttempt.score / (lastAttempt.total || 1)) * 100);
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="px-2 py-0.5 rounded-full bg-gray-100 border">Last score: <span className="font-semibold">{lastAttempt.score}/{lastAttempt.total}</span> ({pct}%)</span>
        <span className="text-gray-500">{new Date(lastAttempt.createdAt).toLocaleString()}</span>
      </div>
    );
  };

  const hasCoins = (coins ?? 0) >= 2;
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Self Assessment</h2>
          <p className="text-gray-600 text-sm mt-1">Level up and climb your student leaderboard</p>
        </div>
        <div className="hidden md:block">
          {isEnrolled ? renderLastAttempt() : <div className="text-sm text-gray-500">Enroll to unlock assessments</div>}
        </div>
      </div>

    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
      to={isEnrolled && hasCoins ? `/courses/${id}/flashcards` : '#'}
      className={`btn border bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200 focus:ring-emerald-300 ${(!isEnrolled || !hasCoins) ? 'pointer-events-none opacity-60' : ''}`}
      title={isEnrolled ? (hasCoins ? 'Practice with Flashcards' : 'Need at least 2 coins') : 'Enroll to access'}
        >
          Practice Flashcards
        </Link>
        <Link
      to={isEnrolled && hasCoins ? `/courses/${id}/quiz` : '#'}
      onClick={(e)=>{
        if (isEnrolled && hasCoins) {
          e.preventDefault();
          try { showCoinLossToast('−2 coins (Quiz)'); } catch {}
          setTimeout(()=> navigate(`/courses/${id}/quiz`), 1200);
        }
      }}
      className={`btn border bg-sky-100 text-sky-900 border-sky-200 hover:bg-sky-200 focus:ring-sky-300 ${(!isEnrolled || !hasCoins) ? 'pointer-events-none opacity-60' : ''}`}
      title={isEnrolled ? (hasCoins ? 'Take a quick MCQ quiz' : 'Need at least 2 coins') : 'Enroll to access'}
        >
          Take Quiz
        </Link>
      </div>

      <div className="mt-4 md:hidden">
        {isEnrolled ? renderLastAttempt() : <div className="text-sm text-gray-500">Enroll to unlock assessments</div>}
        {isEnrolled && coins !== null && coins < 2 && (
          <div className="text-sm text-yellow-700 mt-2">You need at least 2 coins to use quiz or flashcards.</div>
        )}
      </div>
    </div>
  );
}
