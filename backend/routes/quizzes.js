const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const { applyRewards } = require('./gamification');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Reuse helpers from ai.js via local import without circular deps
const { URL } = require('url');
const https = require('node:https');

function isYouTubeUrl(u='') { return /https?:\/\/(?:www\.)?(youtube\.com\/.+v=|youtu\.be\/)/i.test(u); }
function resolveLocalFile(resourceUrl='') {
  if (resourceUrl.startsWith('/uploads/')) return path.join(__dirname, '..', resourceUrl.replace(/^\//,''));
  const idx = resourceUrl.indexOf('/uploads/');
  if (idx !== -1) return path.join(__dirname, '..', resourceUrl.slice(idx+1));
  return null;
}
function guessMime(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return ext === 'svg' ? 'image/svg+xml' : `image/${ext==='jpg'?'jpeg':ext}`;
  if (ext === 'pdf') return 'application/pdf';
  if (['mp4','webm','mov','mkv','ogg'].includes(ext)) {
    if (ext==='mov') return 'video/quicktime';
    if (ext==='mkv') return 'video/x-matroska';
    if (ext==='ogg') return 'video/ogg';
    return 'video/'+ext;
  }
  if (['txt','md'].includes(ext)) return 'text/plain';
  return 'application/octet-stream';
}

const MAX_INLINE_BYTES = Number(process.env.GEMINI_MAX_FILE_BYTES || 12*1024*1024);

async function simpleFetch(url, options = {}) {
  if (typeof fetch === 'function') return fetch(url, options);
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const reqOptions = { method: options.method || 'GET', hostname: u.hostname, path: u.pathname + u.search, port: u.port || 443, headers: options.headers || {} };
      const req = https.request(reqOptions, (res) => {
        let data=''; res.on('data', c=>data+=c); res.on('end', ()=> resolve({ ok: res.statusCode>=200&&res.statusCode<300, status: res.statusCode, text: async()=>data, json: async()=>{ try { return JSON.parse(data||'{}'); } catch { return {}; } } }));
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    } catch (e) { reject(e); }
  });
}

async function callGemini(model, apiKey, promptOrParts) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const body = Array.isArray(promptOrParts)
    ? { contents: [ { parts: promptOrParts } ] }
    : { contents: [ { parts: [ { text: promptOrParts } ] } ] };
  const res = await simpleFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const text = await res.text(); const err = new Error(`Gemini API error ${res.status}: ${text.slice(0,400)}`); err.status = res.status; err.raw = text; throw err; }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || 'No response';
}

const REQUESTED_MODEL_ALIAS = 'googleai/gemini-2.0-flash';
const MODEL_CANDIDATES = [
  'googleai/gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest'
];

async function generateWithFallback(prompt, apiKey) {
  const errors = [];
  for (const model of MODEL_CANDIDATES) {
    try {
      const text = await callGemini(model, apiKey, prompt);
      return { text, model, fallback: model !== REQUESTED_MODEL_ALIAS };
    } catch (e) { errors.push({ model, status: e.status, message: e.message }); }
  }
  const agg = new Error('All model attempts failed'); agg.details = errors; throw agg;
}

// Generate MCQs (uses all resources of the course by default)
router.post('/generate/:courseId', auth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'AI not configured' });
  // Require coins to take a quiz (charge 2 coins upfront)
  const u = await User.findById(req.user._id).select('coins');
  if (!u || (u.coins ?? 0) < 2) return res.status(402).json({ message: 'Not enough coins to take a quiz (2 required)' });
    const { courseId } = req.params;
    const desiredCount = Math.min(Math.max(parseInt(req.body?.count) || 8, 3), 20);

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Access control similar to flashcards
    const isAdmin = req.user.role === 'admin';
    const isInstructor = course.owner?.toString?.() === req.user._id.toString();
    if (!isAdmin && !isInstructor && req.user.role === 'student') {
      const enr = await Enrollment.findOne({ student: req.user._id, course: courseId, status: 'enrolled' }).lean();
      if (!enr) return res.status(403).json({ message: 'You must be enrolled to generate quizzes.' });
    }

    // Build materials list (instructor + approved student)
    let materials = [];
    materials = materials.concat((course.materials || []).map(m => ({
      title: m.title, type: m.type, url: m.url, description: m.description || ''
    })));
    const approvedStudent = (course.studentResources || []).filter(r => r.isApproved);
    materials = materials.concat(approvedStudent.map(m => ({
      title: m.title, type: m.type, url: m.url, description: m.description || ''
    })));

    const inlineParts = [];
    for (const m of materials) {
      const local = resolveLocalFile(m.url || '');
      if (!local) continue;
      try {
        const st = fs.statSync(local);
        if (st.size <= MAX_INLINE_BYTES && inlineParts.length < 2) {
          const data = fs.readFileSync(local).toString('base64');
          inlineParts.push({ inline_data: { data, mime_type: guessMime(local) } });
        }
      } catch {}
    }

    const materialLines = materials.slice(0, 50).map((m, i) => `${i + 1}. [${m.type}] ${m.title} - ${m.url}${m.description ? `\n   Note: ${m.description}` : ''}`).join('\n');
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
          correctIndex: { type: 'integer', minimum: 0 },
          explanation: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy','medium','hard'] }
        },
        required: ['question','options','correctIndex']
      }
    };
    const prompt = `You are generating ${desiredCount} multiple-choice questions (MCQs) for self-assessment for the course "${course.title}" (${course.courseCode || ''}).\nCourse description: ${course.description || 'N/A'}\nMaterials (subset):\n${materialLines || '[No materials]'}\n\nRules:\n- Questions must be grounded in the listed materials or course description.\n- Provide 3-5 plausible options with one correct answer (use 'correctIndex').\n- Keep questions concise; explanations should be short when included.\n- Return ONLY JSON matching schema: ${JSON.stringify(schema)}.`;

  const { text, model, fallback } = await generateWithFallback([{ text: prompt }, ...inlineParts], apiKey);

    function tryParseJSON(raw) {
      try { return JSON.parse(raw); } catch {}
      const first = raw.indexOf('['); const last = raw.lastIndexOf(']');
      if (first !== -1 && last !== -1 && last > first) { try { return JSON.parse(raw.slice(first, last+1)); } catch {} }
      return null;
    }
    const parsed = tryParseJSON(text);
    if (!Array.isArray(parsed)) return res.status(502).json({ message: 'AI returned invalid format', raw: text });
    const questions = parsed.slice(0, desiredCount).map((q, i) => ({
      id: String(q.id || i+1),
      question: String(q.question || ''),
      options: Array.isArray(q.options) ? q.options.map(String).slice(0,6) : [],
      correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0,
      explanation: q.explanation ? String(q.explanation) : undefined,
      difficulty: ['easy','medium','hard'].includes((q.difficulty||'').toLowerCase()) ? (q.difficulty||'').toLowerCase() : undefined
    })).filter(q => q.question && q.options.length >= 3 && q.correctIndex >= 0 && q.correctIndex < q.options.length);

  // Deduct 2 coins for starting a quiz
  await applyRewards(req.user._id, { coinsDelta: -2, expDelta: 0 });
  return res.json({ questions, model, fallback: !!fallback });
  } catch (e) {
    console.error('Generate MCQs error:', e.message, e.details || '');
    res.status(500).json({ message: 'Failed to generate MCQs', error: e.message, details: e.details });
  }
});

// Save a quiz attempt
router.post('/attempts/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { questions, answers, durationSeconds } = req.body || {};
    if (!Array.isArray(questions) || !Array.isArray(answers) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const total = questions.length;
    let score = 0;
    questions.forEach((q, i) => { if (Number.isInteger(answers[i]) && answers[i] === q.correctIndex) score++; });
    const attempt = await QuizAttempt.create({ user: req.user._id, course: courseId, questions, answers, score, total, durationSeconds: Number(durationSeconds)||0 });
    // Rewards: perfect quiz score => +10 coins, +20% exp
    let leveledUp = false;
    if (total > 0 && score === total) {
      const { neededForNext, leveledUp: lu } = await applyRewards(req.user._id, { coinsDelta: 10, expDelta: Math.round(0.2 * (await (async()=>{
        // compute requirement for current level at start
        const User = require('../models/User');
        const u = await User.findById(req.user._id).select('level');
        const base = require('./gamification').expRequiredForLevel(u.level || 0);
        return base;
      })())) });
      leveledUp = !!lu;
    }
    res.json({ attempt, leveledUp });
  } catch (e) {
    console.error('Save attempt error:', e.message);
    res.status(500).json({ message: 'Failed to save attempt' });
  }
});

// List quiz attempts for current user for a course
router.get('/attempts/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const attempts = await QuizAttempt.find({ user: req.user._id, course: courseId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ attempts });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch attempts' });
  }
});

// Get a single attempt by id (only owner)
router.get('/attempt/:attemptId', auth, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await QuizAttempt.findOne({ _id: attemptId, user: req.user._id }).lean();
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    res.json({ attempt });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch attempt' });
  }
});

module.exports = router;
