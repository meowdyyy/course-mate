import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { showCoinLossToast } from '../../utils/gamification';

function isYouTube(url='') {
  return /youtube\.com\/.+v=|youtu\.be\//i.test(url);
}
function getYouTubeId(url='') {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export default function ResourcePreviewModal({ resource, onClose }) {
  // Hooks must always run , declare before any conditional returns
  const [tab, setTab] = useState('preview');
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [question, setQuestion] = useState('');
  const [, setSummaryFileMeta] = useState(null); // { included, info }
  const [, setLastAnswerFileMeta] = useState(null); // { included, info }
  const [conversation, setConversation] = useState([]); // { role, content }
  const convoEndRef = useRef(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState('');
  const [outline, setOutline] = useState([]); // [{timestamp, seconds, title, expanded}]
  const [expandingAll, setExpandingAll] = useState(false);
  const iframeRef = useRef(null);

  // Auto-scroll conversation panel 
  useEffect(()=>{
    if (convoEndRef.current) {
      convoEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, loadingAnswer]);

  // Parse outline from summary when it changes (YouTube only).
  useEffect(()=>{
    if (!resource || !summary) { setOutline([]); return; }
    const rUrl = resource.url || '';
    if (!isYouTube(rUrl)) { setOutline([]); return; }
    const lines = summary.split(/\n+/);
    const items = [];
    const tsRegex = /^\s*(\d{1,2}):(\d{2})\s+(.{3,})/; // mm:ss Title
    for (const line of lines) {
      const m = line.match(tsRegex);
      if (m) {
        const mm = parseInt(m[1],10); const ss = parseInt(m[2],10);
        const seconds = mm*60+ss;
        items.push({ id: `${mm}:${m[2]}-${items.length}`, timestamp: `${m[1]}:${m[2]}`, seconds, title: m[3].trim(), expandedContent: null, loading: false, error: null });
      }
    }
    setOutline(items);
  }, [resource, summary]);

  // If no resource provided, nothing to render
  if (!resource) return null;

  const { type, url, title, description } = resource;
  const ytId = isYouTube(url) ? getYouTubeId(url) : null;
  const ext = (url || '').split('.').pop().toLowerCase();
  const isPDF = type === 'pdf' || ext === 'pdf';
  const isImage = ['png','jpg','jpeg','gif','webp','svg'].includes(ext);
  const isVideo = type === 'video' || ['mp4','webm','ogg','mov','mkv'].includes(ext);

  const fetchSummary = async () => {
    if (summary || loadingSummary) { setTab('ai'); return; }
    setLoadingSummary(true); setError(''); setTab('ai');
    try {
  const res = await axios.post('/api/ai/summarize', { title, description, type, url });
  setSummary(res.data.summary);
  if (res.data.file) setSummaryFileMeta(res.data.file);
  if (res.data.video?.isYouTube) {
   
  }
  try { showCoinLossToast('−2 coins (AI Summarize)'); } catch {}
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to get summary');
    } finally { setLoadingSummary(false); }
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim() || loadingAnswer) return;
    const userMsg = { role: 'user', content: question.trim() };
    const history = [...conversation, userMsg];
    setConversation(history);
    setQuestion('');
    setLoadingAnswer(true); setError('');
    try {
  const res = await axios.post('/api/ai/ask', { title, description, type, url, question: userMsg.content, history });
  const assistantMsg = { role: 'assistant', content: res.data.answer || '(No answer)' };
  if (res.data.file) setLastAnswerFileMeta(res.data.file);
      setConversation(h => [...h, assistantMsg]);
      try { showCoinLossToast('−2 coins (AI Ask)'); } catch {}
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to get answer';
      setError(msg);
      // Attach an error assistant message for continuity
      setConversation(h => [...h, { role: 'assistant', content: `(Error) ${msg}` }]);
    } finally { setLoadingAnswer(false); }
  };


  function seekTo(seconds){
    if (!iframeRef.current || !ytId) return;
    const base = `https://www.youtube.com/embed/${ytId}`;
    iframeRef.current.src = `${base}?start=${seconds}&autoplay=1`;
  }

  async function refineSection(section){
    if (section.loading || loadingAnswer) return;
    // Mark loading
    setOutline(o=>o.map(it=>it.id===section.id?{...it, loading:true, error:null}:it));
    const userQ = `Provide a deeper explanation for the video section starting at ${section.timestamp} titled "${section.title}". Include key points, definitions, examples, and any formulas. Reference approximate timestamps if helpful. Avoid repeating earlier sections.`;
    const userMsg = { role:'user', content: userQ };
    const history = [...conversation, userMsg];
    setConversation(history);
    try {
  const res = await axios.post('/api/ai/ask', { title, description, type, url, question: userQ, history });
      const answer = res.data.answer || '(No answer)';
      setConversation(h=>[...h, { role:'assistant', content: answer }]);
      setOutline(o=>o.map(it=>it.id===section.id?{...it, expandedContent: answer, loading:false}:it));
      if (res.data.file) setLastAnswerFileMeta(res.data.file);
  try { showCoinLossToast('−2 coins (AI Ask)'); } catch {}
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to refine section';
      setConversation(h=>[...h, { role:'assistant', content:`(Error) ${msg}` }]);
      setOutline(o=>o.map(it=>it.id===section.id?{...it, loading:false, error: msg}:it));
    }
  }

  async function expandAll(){
    if (expandingAll || outline.length===0) return;
    setExpandingAll(true);
    for (const section of outline) {
      // eslint-disable-next-line no-await-in-loop
      await refineSection(section);
    }
    setExpandingAll(false);
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-1 max-w-lg line-clamp-2">{description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><XMarkIcon className="h-6 w-6" /></button>
        </div>
        <div className="flex border-b text-xs">
          <button onClick={()=>setTab('preview')} className={`px-4 py-2 border-b-2 ${tab==='preview'?'border-black text-black':'border-transparent text-gray-500 hover:text-gray-700'}`}>Preview</button>
          <button onClick={fetchSummary} className={`px-4 py-2 border-b-2 ${tab==='ai'?'border-black text-black':'border-transparent text-gray-500 hover:text-gray-700'}`}>AI Assistance</button>
        </div>
        {tab==='preview' && (
          <div className="flex-1 overflow-auto p-4">
          {ytId && (
            <div className="aspect-video">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${ytId}`}
                title={title}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {!ytId && isPDF && (
            <iframe src={url} title={title} className="w-full h-[70vh] rounded border" />
          )}
          {!ytId && isImage && (
            <img src={url} alt={title} className="max-h-[70vh] mx-auto rounded shadow" />
          )}
          {!ytId && isVideo && (
            <video src={url} controls className="w-full max-h-[70vh] rounded" />
          )}
          {!ytId && !isPDF && !isImage && !isVideo && type === 'note' && (
            <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded border">
              {url.startsWith('data:text') ? decodeURIComponent(url.split(',')[1] || '') : description || 'Note'}
            </div>
          )}
          {!ytId && !isPDF && !isImage && !isVideo && type !== 'note' && (
            <div className="text-sm space-y-2">
              <p>This resource can't be previewed here.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition" title="Open in new tab">
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Open
                </a>
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-gray-500 break-all underline">{url}</a>
              </div>
            </div>
          )}
          </div>
        )}
        {tab==='ai' && (
          <div className="flex-1 overflow-auto p-4 grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 text-sm">AI Summary</h4>
              {loadingSummary && <p className="text-xs text-gray-500">Generating summary...</p>}
              {!loadingSummary && summary && (
                <div className="bg-gray-50 border rounded p-3 text-xs leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    code({inline, className, children, ...props}) {
                      return !inline ? (
                        <pre className="bg-gray-900 text-gray-100 p-2 rounded overflow-auto text-[10px]" {...props}>
                          <code>{children}</code>
                        </pre>
                      ) : (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]" {...props}>{children}</code>
                      );
                    },
                    a({href, children}) { return <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{children}</a>; }
                  }}>
                    {summary}
                  </ReactMarkdown>
                </div>
              )}
              {ytId && outline.length>0 && (
                <div className="mt-3 border-t pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-gray-700">Video Outline</h5>
                    <div className="flex gap-2">
                      <button type="button" onClick={expandAll} disabled={expandingAll} className="btn btn-ghost btn-[10px] text-[10px] disabled:opacity-50">{expandingAll? 'Expanding...' : 'Expand All'}</button>
                    </div>
                  </div>
                  <ul className="space-y-1 max-h-48 overflow-auto pr-1 text-[11px]">
                    {outline.map(sec => (
                      <li key={sec.id} className="group border rounded px-2 py-1 bg-white hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <button type="button" onClick={()=>seekTo(sec.seconds)} className="font-mono text-blue-600 hover:underline mr-2">{sec.timestamp}</button>
                            <span className="text-gray-700">{sec.title}</span>
                          </div>
                          <div className="flex gap-1">
                            <button type="button" onClick={()=>refineSection(sec)} disabled={sec.loading} className="btn btn-ghost btn-[10px] text-[10px] disabled:opacity-50">{sec.loading?'...':'Refine'}</button>
                          </div>
                        </div>
                        {sec.error && <p className="text-[10px] text-red-600 mt-1">{sec.error}</p>}
                        {sec.expandedContent && (
                          <div className="mt-1 border-l-2 border-blue-200 pl-2 text-[10px] prose prose-[10px] max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.expandedContent}</ReactMarkdown>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!loadingSummary && !summary && !error && (
                <p className="text-xs text-gray-500">Click AI Assistance to fetch a summary.</p>
              )}
            </div>
            <div className="space-y-3 flex flex-col h-full">
              <h4 className="font-semibold text-gray-800 text-sm">Chat with AI</h4>
              <div className="flex-1 overflow-auto border rounded p-2 bg-white space-y-2 text-xs">
                {conversation.length === 0 && !loadingAnswer && (
                  <p className="text-gray-400 text-[11px]">Start asking questions about this resource. Context will be remembered in this session.</p>
                )}
                {conversation.map((m, idx) => (
                  <div key={idx} className={`rounded px-2 py-1 leading-relaxed border ${m.role==='assistant' ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'} `}>
                    <span className="font-semibold mr-1 align-top block text-[11px]">{m.role==='assistant'?'AI':'You'}:</span>
                    {m.role==='assistant' ? (
                      <div className="prose prose-xs max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          code({inline, className, children, ...props}) {
                            return !inline ? (
                              <pre className="bg-gray-900 text-gray-100 p-2 rounded overflow-auto text-[10px]" {...props}>
                                <code>{children}</code>
                              </pre>
                            ) : (
                              <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]" {...props}>{children}</code>
                            );
                          },
                          a({href, children}) { return <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{children}</a>; }
                        }}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap text-xs">{m.content}</span>
                    )}
                  </div>
                ))}
                {loadingAnswer && (
                  <div className="rounded px-2 py-1 border bg-gray-50 border-gray-200 animate-pulse text-gray-500 text-[11px]">AI is thinking...</div>
                )}
                <div ref={convoEndRef} />
              </div>
              <form onSubmit={ask} className="space-y-2">
                <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about this resource..." className="input w-full h-20 text-xs" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button disabled={loadingAnswer || !question.trim()} className="btn btn-primary btn-xs disabled:opacity-50">{loadingAnswer?'Sending...':'Send'}</button>
                    {conversation.length>0 && (
                      <button type="button" onClick={()=>setConversation([])} className="btn btn-ghost btn-xs">Reset</button>
                    )}
                  </div>
          {/* Removed context length display per request */}
                </div>
              </form>
              {error && <p className="text-[11px] text-red-600">{error}</p>}
        {/* Removed file usage + size cap informational block per request */}
            </div>
          </div>
        )}
        <div className="p-3 border-t flex justify-end">
          <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
