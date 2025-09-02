// Frontend helper to apply rewards/penalties and broadcast updates.
// Usage: await reward({ expPercent: 0.1, coins: 10 }) where expPercent is fraction of current level requirement.
import axios from 'axios';

// Simple GIF queue so popups don't overlap; they run sequentially
let gifQueue = Promise.resolve();

function showGifToastPromise(assetPath, durationMs = 6000, message) {
  return new Promise(resolve => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '9999';
    container.style.background = 'rgba(0,0,0,0.85)';
    container.style.border = '1px solid rgba(255,255,255,0.15)';
    container.style.borderRadius = '12px';
    container.style.padding = '8px';
    container.style.boxShadow = '0 8px 28px rgba(0,0,0,0.35)';
    container.style.pointerEvents = 'none';
  const img = document.createElement('img');
    img.src = assetPath;
    img.alt = 'notification';
    img.style.width = '200px';
    img.style.height = '150px';
    img.style.objectFit = 'contain';
    container.appendChild(img);

  // Caption/message
  const caption = document.createElement('div');
  caption.textContent = message || defaultMessageFor(assetPath);
  caption.style.color = 'white';
  caption.style.fontSize = '12px';
  caption.style.marginTop = '6px';
  caption.style.textAlign = 'center';
  caption.style.maxWidth = '240px';
  container.appendChild(caption);
    document.body.appendChild(container);
    setTimeout(() => { container.remove(); resolve(); }, durationMs);
  });
}

export async function reward({ expPercent = 0, coins = 0 } = {}) {
  try {
    // Fetch current to compute delta EXP
    const me = await axios.get('/api/gamification/me');
    const needed = me.data?.neededForNext || 200;
    const expDelta = Math.round(needed * expPercent);
    const res = await axios.post('/api/gamification/me/reward', { expDelta, coinsDelta: coins });
    // Broadcast update so Sidebar and others can refresh
    window.dispatchEvent(new CustomEvent('gamification:update', { detail: { state: res.data } }));
    if (res.data?.leveledUp) {
      // Queue level-up for 10s after any current success GIFs finish
  enqueueGif('/assets/levelup.webp', 6000, 'Level up! Keep it going.');
      window.dispatchEvent(new CustomEvent('gamification:levelup', { detail: { state: res.data } }));
    }
    return res.data;
  } catch (e) {
    // Silent fail; callers may toast separately
    return null;
  }
}

export function showGifToast(assetPath, durationMs = 6000, message) {
  // Fire-and-forget centered popup
  showGifToastPromise(assetPath, durationMs, message);
}

// Sticky top-right GIF shown until manually hidden (used for paused focus mode)
export function showStickyGifTopRight(assetPath, message) {
  const existing = document.getElementById('sticky-gif-toast');
  if (existing) { existing.remove(); }
  const container = document.createElement('div');
  container.id = 'sticky-gif-toast';
  container.style.position = 'fixed';
  container.style.top = '16px';
  container.style.right = '16px';
  container.style.zIndex = '9999';
  container.style.background = 'rgba(0,0,0,0.85)';
  container.style.border = '1px solid rgba(255,255,255,0.15)';
  container.style.borderRadius = '12px';
  container.style.padding = '8px';
  container.style.boxShadow = '0 8px 28px rgba(0,0,0,0.35)';
  const img = document.createElement('img');
  img.src = assetPath;
  img.alt = 'notification';
  img.style.width = '160px';
  img.style.height = '120px';
  img.style.objectFit = 'contain';
  container.appendChild(img);
  const caption = document.createElement('div');
  caption.textContent = message || defaultMessageFor(assetPath);
  caption.style.color = 'white';
  caption.style.fontSize = '12px';
  caption.style.marginTop = '6px';
  caption.style.textAlign = 'center';
  caption.style.maxWidth = '200px';
  container.appendChild(caption);
  document.body.appendChild(container);
}

export function hideStickyGif() {
  const existing = document.getElementById('sticky-gif-toast');
  if (existing) existing.remove();
}

export function enqueueGif(assetPath, durationMs = 7000, message) {
  gifQueue = gifQueue.then(() => showGifToastPromise(assetPath, durationMs, message));
  return gifQueue;
}

function defaultMessageFor(assetPath = '') {
  const p = assetPath.toLowerCase();
  if (p.includes('perfectscore')) return 'Perfect score! +10 coins, +20% EXP';
  if (p.includes('levelup')) return 'Level up! Keep it going.';
  if (p.includes('todolistsuccess')) return 'Daily list complete! +10 coins, +10% EXP';
  if (p.includes('failure')) return 'Action interrupted. Try again.';
  if (p.includes('focusfailed')) return 'Focus paused — resume to continue';
  return 'Notification';
}

// Small, subtle coin-loss toast to accompany coin deductions
export function showCoinLossToast(message = 'Coins deducted', durationMs = 2200) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.position = 'fixed';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.zIndex = '9999';
  container.style.background = 'rgba(0,0,0,0.85)';
  container.style.border = '1px solid rgba(255,255,255,0.15)';
  container.style.borderRadius = '12px';
  container.style.padding = '8px 14px 8px 8px';
  container.style.boxShadow = '0 8px 28px rgba(0,0,0,0.35)';
  container.style.pointerEvents = 'none';

  const img = document.createElement('img');
  img.src = '/assets/losing%20coin.gif';
  img.alt = 'coins lost';
  img.style.width = '48px';
  img.style.height = '48px';
  img.style.objectFit = 'contain';
  img.style.marginRight = '10px';
  container.appendChild(img);

  const caption = document.createElement('div');
  caption.textContent = message;
  caption.style.color = 'white';
  caption.style.fontSize = '13px';
  caption.style.textAlign = 'center';
  caption.style.maxWidth = '200px';
  container.appendChild(caption);

  document.body.appendChild(container);
  setTimeout(() => { container.remove(); }, durationMs);
}
