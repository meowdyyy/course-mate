import { useEffect, useState } from 'react';
import axios from 'axios';
import { showGifToast, enqueueGif, showStickyGifTopRight, hideStickyGif } from '../../utils/gamification';

export default function GamificationTest() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setLoading(true);
      const res = await axios.get('/api/gamification/me');
      setState(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load gamification state');
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  // Local simulation (no DB writes): mirror backend math to preview UI behaviors
  function expRequiredForLevel(level) {
    let required = 200;
    for (let i = 0; i < level; i++) required = Math.ceil(required * 1.6);
    return required;
  }

  const applyLocal = async (expPercent = 0, coins = 0) => {
    setState(prev => {
      if (!prev) return prev;
      let coinsNew = Math.max(0, (prev.coins || 0) + coins);
      let expAdd = Math.round(expPercent * expRequiredForLevel(prev.level || 0));
      let exp = (prev.expPoints || 0) + expAdd;
      let level = prev.level || 0;
      while (exp >= expRequiredForLevel(level)) {
        exp -= expRequiredForLevel(level);
  level += 1;
      }
      const next = { level, coins: coinsNew, expPoints: Math.max(0, exp), neededForNext: expRequiredForLevel(level) };
      // Update HUD via event so Sidebar reacts, but do NOT persist to server
      window.dispatchEvent(new CustomEvent('gamification:update', { detail: { state: next } }));
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Gamification Tester</h1>
        <p className="text-gray-600">Trigger rewards, penalties, and popups to validate the HUD and UI responses.</p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Current State</h2>
          <button onClick={refresh} className="btn btn-secondary btn-sm">Refresh</button>
        </div>
        {loading ? (
          <div className="h-10 bg-gray-100 animate-pulse rounded" />
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 border rounded-lg"><div className="text-gray-600">Level</div><div className="text-lg font-bold">{state.level}</div></div>
            <div className="p-3 border rounded-lg"><div className="text-gray-600">EXP</div><div className="text-lg font-bold">{state.expPoints}/{state.neededForNext}</div></div>
            <div className="p-3 border rounded-lg"><div className="text-gray-600">Coins</div><div className="text-lg font-bold">{state.coins}</div></div>
            <div className="p-3 border rounded-lg"><div className="text-gray-600">To next lvl</div><div className="text-lg font-bold">{Math.max(0, (state.neededForNext||0) - (state.expPoints||0))}</div></div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Apply Rewards/Penalties</h3>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0.05, 0)}>+5% EXP</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0.10, 0)}>+10% EXP</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0.20, 0)}>+20% EXP</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(1.00, 0)}>+100% EXP (force level-up)</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0, 1)}>+1 coin</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0, 5)}>+5 coins</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0, 15)}>+15 coins</button>
            <button className="btn btn-secondary btn-sm" onClick={() => applyLocal(0, 30)}>+30 coins</button>
            <button className="btn btn-danger btn-sm" onClick={() => applyLocal(0, -2)}>−2 coins</button>
            <button className="btn btn-danger btn-sm" onClick={() => applyLocal(0, -5)}>−5 coins</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" onClick={async()=>{ await applyLocal(0.20, 10); await enqueueGif('/assets/perfectscore.gif', 6000, 'Perfect score! +10 coins, +20% EXP'); }}>Simulate Perfect Score</button>
            <button className="btn btn-primary btn-sm" onClick={async()=>{ await enqueueGif('/assets/perfectscore.gif', 6000, 'Perfect score!'); await enqueueGif('/assets/levelup.webp', 6000, 'Level up! Keep it going.'); }}>Queue Success → Level-up</button>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Popups</h3>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" onClick={()=> showGifToast('/assets/todolistsuccess.gif', 3000, 'Daily list complete! +10 coins, +10% EXP')}>Show Success (center)</button>
            <button className="btn btn-secondary btn-sm" onClick={()=> showGifToast('/assets/failure.gif', 6000, 'Action interrupted. Try again.')}>Show Failure (center)</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" onClick={()=> showStickyGifTopRight('/assets/failure.gif', 'Focus paused — resume to continue')}>Show Sticky (top-right)</button>
            <button className="btn btn-secondary btn-sm" onClick={hideStickyGif}>Hide Sticky</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" onClick={()=> enqueueGif('/assets/perfectscore.gif', 6000, 'Perfect!')}>Enqueue Success</button>
            <button className="btn btn-secondary btn-sm" onClick={()=> enqueueGif('/assets/levelup.webp', 6000, 'Level up! Keep it going.')}>Enqueue Level-up</button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Shortcuts</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary btn-sm" onClick={()=> applyLocal(0, -2)}>Simulate AI/Quiz Cost (−2 coins)</button>
          <button className="btn btn-secondary btn-sm" onClick={()=> applyLocal(0, 2)}>Top up (+2 coins)</button>
        </div>
      </div>
    </div>
  );
}
