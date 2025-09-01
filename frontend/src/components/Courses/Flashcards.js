import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, EyeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { reward, showGifToast } from '../../utils/gamification';

const DEFAULT_COUNT = 10;
const PER_CARD_SECONDS = 30;

function CounterPopup({ seconds, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border border-gray-700">
        <ClockIcon className="h-5 w-5" />
        <span className="font-mono text-sm">{seconds}s</span>
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white"><XMarkIcon className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

const Flashcards = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  // Counter popup is always visible here; can be extended to toggle via context if needed
  const [secondsLeft, setSecondsLeft] = useState(PER_CARD_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [desiredCount, setDesiredCount] = useState(DEFAULT_COUNT);
  const timerRef = useRef(null);
  const rewardedRef = useRef(false);

  const current = cards[index] || null;
  const progress = useMemo(() => ({
    total: cards.length,
    current: Math.min(index + 1, cards.length),
  }), [cards.length, index]);
  const timeProgress = useMemo(() => {
    const pct = Math.min(100, Math.max(0, ((PER_CARD_SECONDS - secondsLeft) / PER_CARD_SECONDS) * 100));
    return Math.round(pct);
  }, [secondsLeft]);

  useEffect(() => {
    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reset timer whenever index changes
    clearInterval(timerRef.current);
    setSecondsLeft(PER_CARD_SECONDS);
    setShowAnswer(false);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto reveal and move next shortly
          setShowAnswer(true);
          setTimeout(() => handleNext('time'), 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const fetchCards = async () => {
    setLoading(true);
    setError('');
    try {
  const res = await axios.post(`/api/ai/flashcards/${id}`, { count: desiredCount });
      setCards(res.data.flashcards || []);
      setIndex(0);
      setCorrect(0);
      setIncorrect(0);
      setShowAnswer(false);
  rewardedRef.current = false;
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load flashcards';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = () => setShowAnswer(true);
  const handlePrev = () => setIndex(i => Math.max(0, i - 1));
  const handleNext = (reason) => {
    if (reason === 'correct') setCorrect(c => c + 1);
    else if (reason === 'incorrect') setIncorrect(c => c + 1);
    setIndex(i => {
      const next = i + 1;
      if (next >= cards.length) {
        // Completed session: reward +5% EXP and +3 coins
        if (!rewardedRef.current) {
          rewardedRef.current = true;
          (async () => {
            const state = await reward({ expPercent: 0.05, coins: 3 });
            if (state?.leveledUp) {
              showGifToast('/assets/levelup.webp', 6000, 'Level up! Keep it going.');
            }
          })();
        }
        return i; // stay on last card
      }
      return Math.min(cards.length - 1, next);
    });
  };

  const handleRestart = () => {
    setIndex(0);
    setCorrect(0);
    setIncorrect(0);
    setShowAnswer(false);
    setSecondsLeft(PER_CARD_SECONDS);
  rewardedRef.current = false;
  };

  const handleStop = () => {
    // Clear any active timer and navigate back to the course page
    clearInterval(timerRef.current);
  // Show failure gif on quitting (no penalty)
  try { showGifToast('/assets/failure.gif', 3000, 'Flashcards stopped — session ended.'); } catch {}
    navigate(`/courses/${id}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="h-40 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to={`/courses/${id}`} className="btn btn-secondary inline-flex items-center"><ArrowLeftIcon className="h-4 w-4 mr-1"/>Back to Course</Link>
        </div>
        <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <CounterPopup seconds={secondsLeft} onClose={() => { /* hide noop */ }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to={`/courses/${id}`} className="btn btn-secondary inline-flex items-center"><ArrowLeftIcon className="h-4 w-4 mr-1"/>Back</Link>
          <h1 className="text-xl font-semibold">Flashcards</h1>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 border">Card {progress.current} / {progress.total}</span>
            <span className="px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">Correct {correct}</span>
            <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">Wrong {incorrect}</span>
          </div>
          <button onClick={handleStop} className="btn btn-danger btn-sm inline-flex items-center ml-2"><XMarkIcon className="h-4 w-4 mr-1"/>Stop</button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border p-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            <span className="font-mono text-sm">{secondsLeft}s</span>
            <span className="text-gray-400">(per card)</span>
          </div>
          <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-2 bg-black transition-all duration-300" style={{ width: `${timeProgress}%` }} />
          </div>
        </div>
  <div className="flex items-center space-x-2">
          <input type="number" min={4} max={20} value={desiredCount} onChange={e=>setDesiredCount(Number(e.target.value)||DEFAULT_COUNT)} className="w-20 border rounded px-2 py-1 text-sm" />
          <button onClick={fetchCards} className="btn btn-secondary">Regenerate</button>
        </div>
      </div>

      {/* Card */}
      {current ? (
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* subtle stacked shadow */}
            <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl bg-gray-200 opacity-60" aria-hidden="true" />
            <div className="relative bg-white border rounded-2xl p-8 shadow-xl animate-fade-in-up">
              {/* Difficulty badge */}
              <div className="absolute top-4 right-4">
                <span className="px-2 py-0.5 text-xs rounded-full border bg-gray-50 text-gray-700">
                  {(current.difficulty ? current.difficulty : 'question').toUpperCase()}
                </span>
              </div>

              <div className="text-lg md:text-xl font-medium leading-relaxed whitespace-pre-wrap">
                {current.question}
              </div>

              {!showAnswer ? (
                <div className="mt-6">
                  <button onClick={handleReveal} className="btn btn-primary inline-flex items-center">
                    <EyeIcon className="h-4 w-4 mr-1"/>Show Answer
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-gray-800 whitespace-pre-wrap">
                    {current.answer}
                  </div>
                  <div className="mt-4 flex items-center flex-wrap gap-2">
                    <button onClick={() => handleNext('correct')} className="btn bg-green-600 text-white hover:bg-green-700 inline-flex items-center"><CheckIcon className="h-4 w-4 mr-1"/>I was Correct</button>
                    <button onClick={() => handleNext('incorrect')} className="btn btn-danger inline-flex items-center"><XMarkIcon className="h-4 w-4 mr-1"/>I was Wrong</button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <button className="btn btn-secondary inline-flex items-center" disabled={index===0} onClick={handlePrev}><ChevronLeftIcon className="h-4 w-4 mr-1"/>Prev</button>
                <button className="btn btn-secondary" onClick={handleRestart}>Restart</button>
                <button className="btn btn-secondary inline-flex items-center" disabled={index>=cards.length-1} onClick={()=>handleNext('skip')}>Next<ChevronRightIcon className="h-4 w-4 ml-1"/></button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-yellow-50 rounded border border-yellow-200 text-yellow-800">No flashcards generated.</div>
      )}
    </div>
  );
};

export default Flashcards;
