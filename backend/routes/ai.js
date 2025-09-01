const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { applyRewards } = require('./gamification');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const https = require('node:https');
const { URL } = require('node:url');

async function simpleFetch(url, options = {}) {
  if (typeof fetch === 'function') {
    return fetch(url, options);
  }
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const reqOptions = {
        method: options.method || 'GET',
        hostname: u.hostname,
        path: u.pathname + u.search,
        port: u.port || 443,
        headers: options.headers || {}
      };
      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: async () => data,
            json: async () => { try { return JSON.parse(data || '{}'); } catch { return {}; } }
          });
        });
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

function isYouTubeUrl(u='') { return /https?:\/\/(?:www\.)?(youtube\.com\/.+v=|youtu\.be\/)/i.test(u); }

function buildPrompt({ mode, title, description, type, url, question, fileIncluded, fileInfo }) {
  const youTube = isYouTubeUrl(url || '');
  const baseContext = `You are an academic study assistant. PRIMARY SOURCE ORDER: (1) Attached file content if present (2) For YouTube links, the actual video at its URL (the model may internally access it) (3) Provided metadata.\nMetadata:\nTitle: ${title || 'Untitled'}\nType: ${type || 'unknown'}\nURL: ${url || 'N/A'}\nDescription: ${description || 'No description'}${fileIncluded ? `\nAttached File: ${fileInfo}` : ''}${youTube ? '\nSource is a YouTube video – incorporate its spoken & visual content.' : ''}`;
  if (mode === 'summary') {
    if (youTube) {
      return baseContext + `\nTask: Watch the YouTube video and produce a structured summary:\n1. Duration (approx)\n2. Sectioned outline with timestamps (mm:ss) – 5-10 key segments\n3. Bullet key concepts (5-8)\n4. Practical takeaways (3-5)\n5. One bold Key Takeaway line. If content not fully accessible, clearly state limitations.`;
    }
    return baseContext + '\nTask: Produce 5-8 bullet points capturing key concepts, structure, and important details found directly in the primary source. Then add a single bold Key Takeaway line. If parts are unreadable, note limitations briefly.';
  }
  // QA mode
  if (youTube) {
    return baseContext + `\nUser Question: ${question}\nIf possible reference approximate timestamps (mm:ss) when citing video segments. If answer not covered in the video or attached file, say so and offer a concise related insight.`;
  }
  return baseContext + `\nUser Question: ${question}\nAnswer using file content verbatim for factual details. If answer not in file, say so and give high-level guidance.`;
}

function buildConversationPrompt({ title, description, type, url, history = [], question, fileIncluded, fileInfo }) {
  const youTube = isYouTubeUrl(url || '');
  const baseContext = `You are an academic study assistant in a multi-turn chat. Ground truth priority: (1) Attached file content (2) If YouTube URL, the video itself (3) Metadata.\nMetadata:\nTitle: ${title || 'Untitled'}\nType: ${type || 'unknown'}\nURL: ${url || 'N/A'}\nDescription: ${description || 'No description'}${fileIncluded ? `\nAttached File: ${fileInfo}` : ''}${youTube ? '\nSource is a YouTube video – incorporate its timeline, narration, and visuals.' : ''}`;
  const trimmed = history.slice(-20).filter(m => m && typeof m.content === 'string');
  const convo = trimmed.map(m => `${m.role === 'assistant' ? 'Assistant' : 'Student'}: ${m.content.replace(/\s+/g,' ').trim()}`).join('\n');
  const finalQuestion = question.replace(/\s+/g,' ').trim();
  const instructions = youTube
    ? 'When answering reference approximate timestamps (mm:ss) if directly tied to a segment. If unsure or video portion inaccessible, state that limitation.'
    : 'Cite file-derived facts succinctly. If uncertain, state limits.';
  return `${baseContext}\nConversation (latest last):\n${convo || '[No previous turns]'}\nStudent: ${finalQuestion}\nInstructions: ${instructions}`;
}

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

const MAX_INLINE_BYTES = Number(process.env.GEMINI_MAX_FILE_BYTES || 12*1024*1024); // 12MB default

async function buildParts({ title, description, type, url, mode, question, history }) {
  const local = resolveLocalFile(url || '');
  let fileIncluded = false; let fileInfo = 'none';
  const parts = [];
  if (local && fs.existsSync(local)) {
    try {
      const st = fs.statSync(local);
      fileInfo = `${path.basename(local)} (${st.size} bytes)`;
      if (st.size <= MAX_INLINE_BYTES) {
        const data = fs.readFileSync(local).toString('base64');
        parts.push({ inline_data: { data, mime_type: guessMime(local) } });
        fileIncluded = true;
      } else {
        fileInfo += ' - too large for inline attach';
      }
    } catch (e) { fileInfo = 'read error: '+e.message; }
  }
  const prompt = mode === 'summary'
    ? buildPrompt({ mode: 'summary', title, description, type, url, fileIncluded, fileInfo })
    : history && history.length
      ? buildConversationPrompt({ title, description, type, url, history, question, fileIncluded, fileInfo })
      : buildPrompt({ mode: 'qa', title, description, type, url, question, fileIncluded, fileInfo });
  parts.unshift({ text: prompt });
  return { parts, fileIncluded, fileInfo };
}

async function callGemini(model, apiKey, promptOrParts) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const body = Array.isArray(promptOrParts)
    ? { contents: [ { parts: promptOrParts } ] }
    : { contents: [ { parts: [ { text: promptOrParts } ] } ] };
  const res = await simpleFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini API error ${res.status}: ${text.slice(0,400)}`);
    err.status = res.status;
    err.raw = text;
    throw err;
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || 'No response';
}

const REQUESTED_MODEL_ALIAS = 'googleai/gemini-2.0-flash';
// Candidate models in order
const MODEL_CANDIDATES = [
  'googleai/gemini-2.0-flash',
  'gemini-2.0-flash',          
  'gemini-1.5-flash-latest',   
  'gemini-1.5-flash',          
  'gemini-1.5-pro-latest'
];

async function generateWithFallback(prompt, apiKey) {
  const errors = [];
  for (const model of MODEL_CANDIDATES) {
    try {
      const text = await callGemini(model, apiKey, prompt);
      return { text, model, fallback: model !== REQUESTED_MODEL_ALIAS, attempts: MODEL_CANDIDATES.slice(0, MODEL_CANDIDATES.indexOf(model)+1) };
    } catch (e) {
      errors.push({ model, status: e.status, message: e.message });
      // Continue trying next model
    }
  }
  const agg = new Error('All model attempts failed');
  agg.details = errors;
  throw agg;
}

router.get('/health', auth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, message: 'Missing GEMINI_API_KEY' });
    const test = await generateWithFallback('Respond with the single word: OK', apiKey);
    res.json({ ok: true, model: test.model, fallback: test.fallback });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, details: e.details });
  }
});

router.post('/summarize', auth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'AI not configured' });
  // Require at least 2 coins to use AI assistance
  const u = await User.findById(req.user._id).select('coins level expPoints');
  if (!u || (u.coins ?? 0) < 2) return res.status(402).json({ message: 'Not enough coins for AI assistance (2 required)' });
  const { title, description, type, url } = req.body || {};
  const { parts, fileIncluded, fileInfo } = await buildParts({ title, description, type, url, mode: 'summary' });
  const start = Date.now();
  const { text, model, fallback, attempts } = await generateWithFallback(parts, apiKey);
  // Deduct 2 coins
  await applyRewards(req.user._id, { coinsDelta: -2, expDelta: 0 });
  res.json({ summary: text, model, fallback: !!fallback, ms: Date.now()-start, attempts, file: { included: fileIncluded, info: fileInfo }, video: { isYouTube: isYouTubeUrl(url||'') } });
  } catch (e) {
  console.error('AI summarize error:', e.message, e.details || '');
  res.status(500).json({ message: 'Failed to summarize', error: e.message, details: e.details });
  }
});

router.post('/ask', auth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'AI not configured' });
  const u = await User.findById(req.user._id).select('coins level expPoints');
  if (!u || (u.coins ?? 0) < 2) return res.status(402).json({ message: 'Not enough coins for AI assistance (2 required)' });
  const { title, description, type, url, question, history } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ message: 'Question required' });
  const cleaned = Array.isArray(history) ? history.map(m => ({ role: m.role==='assistant'?'assistant':'user', content: String(m.content||'').slice(0,1500) })) : [];
  const { parts, fileIncluded, fileInfo } = await buildParts({ title, description, type, url, mode: cleaned.length?'qa-convo':'qa', question, history: cleaned });
  const start = Date.now();
  const { text, model, fallback, attempts } = await generateWithFallback(parts, apiKey);
  await applyRewards(req.user._id, { coinsDelta: -2, expDelta: 0 });
  res.json({ answer: text, model, fallback: !!fallback, ms: Date.now() - start, attempts, file: { included: fileIncluded, info: fileInfo }, video: { isYouTube: isYouTubeUrl(url||'') } });
  } catch (e) {
    console.error('AI ask error:', e.message, e.details || '');
    res.status(500).json({ message: 'Failed to answer', error: e.message, details: e.details });
  }
});

module.exports = router;


//  Flashcards Generation
//  POST /api/ai/flashcards/:courseId
//  Body: { count?: number }
//  Auth: student must be enrolled (admins/instructors allowed)
//  Returns: { flashcards: [{ id, question, answer, difficulty? }], model, ms }
 
router.post('/flashcards/:courseId', auth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'AI not configured' });
  // Require 2 coins to use flashcards
  const u = await User.findById(req.user._id).select('coins');
  if (!u || (u.coins ?? 0) < 2) return res.status(402).json({ message: 'Not enough coins to use flashcards (2 required)' });

    const { courseId } = req.params;
  const desiredCount = Math.min(Math.max(parseInt(req.body?.count) || 10, 4), 20);

  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(404).json({ message: 'Course not found' });

    // Access: students must be enrolled; admins/instructors allowed
    const isAdmin = req.user.role === 'admin';
    const isInstructor = course.owner?.toString?.() === req.user._id.toString();
    if (!isAdmin && !isInstructor && req.user.role === 'student') {
      const enr = await Enrollment.findOne({ student: req.user._id, course: courseId, status: 'enrolled' }).lean();
      if (!enr) return res.status(403).json({ message: 'You must be enrolled to generate flashcards.' });
    }

    // Build materials list for this course only (instructor materials + approved student resources)
    let materials = [];
    materials = materials.concat((course.materials || []).map(m => ({
      courseTitle: course.title,
      courseCode: course.courseCode,
      title: m.title,
      type: m.type,
      url: m.url,
      description: m.description || ''
    })));
    const approvedStudent = (course.studentResources || []).filter(r => r.isApproved);
    materials = materials.concat(approvedStudent.map(m => ({
      courseTitle: course.title,
      courseCode: course.courseCode,
      title: m.title,
      type: m.type,
      url: m.url,
      description: m.description || ''
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

  const materialLines = materials.slice(0, 50).map((m, i) => `${i + 1}. [${m.type}] ${m.title} - ${m.url} ${m.courseCode ? `(${m.courseCode})` : ''}${m.description ? `\n   Note: ${m.description}` : ''}`).join('\n');
  const contextText = `You are generating study flashcards for the course "${course.title}" (${course.courseCode || ''}).\nCourse description: ${course.description || 'N/A'}\nMaterials (subset from all available course resources, including approved student uploads):\n${materialLines || '[No materials listed]'}\n\nRules:\n- Prioritize attached inline files for factual content.\n- If materials are links without accessible content here, derive conservative, foundational Q&A from the course description and titles (avoid hallucinated specifics not present).\n- Keep questions concise and answerable in 1-3 sentences.\n- Prefer concept checks, definitions, and short application prompts.\n- Return ONLY valid JSON (no markdown, no commentary).`;

    const outputSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          answer: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy','medium','hard'] }
        },
        required: ['id','question','answer']
      }
    };
    const instruction = `Task: Produce ${desiredCount} flashcards as JSON matching this schema: ${JSON.stringify(outputSchema)}. Generate unique 'id' strings.`;

    const parts = [ { text: contextText + '\n\n' + instruction }, ...inlineParts ];
    const start = Date.now();
    const { text, model, fallback } = await generateWithFallback(parts, apiKey);

    function tryParseJSON(raw) {
      try { return JSON.parse(raw); } catch {}
      const first = raw.indexOf('['); const last = raw.lastIndexOf(']');
      if (first !== -1 && last !== -1 && last > first) {
        const sliced = raw.slice(first, last + 1);
        try { return JSON.parse(sliced); } catch {}
      }
      return null;
    }
    const parsed = tryParseJSON(text);
    if (!parsed || !Array.isArray(parsed)) {
      return res.status(502).json({ message: 'AI returned an invalid format', raw: text });
    }
    // Normalize and clamp count
    const flashcards = parsed.slice(0, desiredCount).map((fc, idx) => ({
      id: String(fc.id || idx + 1),
      question: String(fc.question || '').trim().slice(0, 500),
      answer: String(fc.answer || '').trim().slice(0, 1000),
      difficulty: ['easy','medium','hard'].includes((fc.difficulty || '').toLowerCase()) ? (fc.difficulty || '').toLowerCase() : undefined
    })).filter(f => f.question && f.answer);

  // Deduct 2 coins
  await applyRewards(req.user._id, { coinsDelta: -2, expDelta: 0 });
  res.json({ flashcards, model, fallback: !!fallback, ms: Date.now() - start });
  } catch (e) {
    console.error('AI flashcards error:', e.message, e.details || '');
    res.status(500).json({ message: 'Failed to generate flashcards', error: e.message, details: e.details });
  }
});