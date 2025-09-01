const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// EXP requirement: Level 0 -> 200; each level requires 1.6x previous
function expRequiredForLevel(level) {
  let required = 200;
  for (let i = 0; i < level; i++) required = Math.ceil(required * 1.6);
  return required;
}

async function applyRewards(userId, { expDelta = 0, coinsDelta = 0 }) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  user.coins = Math.max(0, (user.coins || 0) + coinsDelta);
  let exp = (user.expPoints || 0) + expDelta;
  let level = user.level || 0;
  let leveledUp = false;
  // Loop in case large exp grants multiple levels
  while (exp >= expRequiredForLevel(level)) {
    exp -= expRequiredForLevel(level);
    level += 1; leveledUp = true;
  }
  user.level = level;
  user.expPoints = Math.max(0, exp);
  await user.save();
  return { level: user.level, coins: user.coins, expPoints: user.expPoints, neededForNext: expRequiredForLevel(user.level), leveledUp };
}

// Get current gamification state for the logged-in user
router.get('/me', auth, async (req, res) => {
  try {
  const user = await User.findById(req.user._id).select('level coins expPoints firstName lastName');
  // Backfill defaults for existing users
  let changed = false;
  if (user.level === undefined || user.level === null) { user.level = 0; changed = true; }
  if (user.coins === undefined || user.coins === null) { user.coins = 100; changed = true; }
  if (user.expPoints === undefined || user.expPoints === null) { user.expPoints = 0; changed = true; }
  if (changed) await user.save();
  const needed = expRequiredForLevel(user.level || 0);
  res.json({ level: user.level || 0, coins: user.coins || 0, expPoints: user.expPoints || 0, neededForNext: needed });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load gamification state' });
  }
});

// Internal helper endpoint (optional) to grant rewards (can be used by other services)
router.post('/me/reward', auth, async (req, res) => {
  try {
    const { expDelta = 0, coinsDelta = 0 } = req.body || {};
    const state = await applyRewards(req.user._id, { expDelta, coinsDelta });
    res.json(state);
  } catch (e) {
    res.status(500).json({ message: 'Failed to apply rewards' });
  }
});

module.exports = { router, expRequiredForLevel, applyRewards };
