import { useEffect, useState } from 'react';
import axios from 'axios';
import { StarIcon, FunnelIcon, ArrowPathIcon, EyeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import ResourcePreviewModal from './ResourcePreviewModal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ResourceBrowser(){
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q:'', semester:'', sort:'recent' });
  const [resources, setResources] = useState([]);
  const [verified, setVerified] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [showAddVerified, setShowAddVerified] = useState(false);
  const [courses, setCourses] = useState([]);
  const [savingVerified, setSavingVerified] = useState(false);
  const [verifiedForm, setVerifiedForm] = useState({ courseId:'', title:'', type:'document', description:'', isFree:false, file:null, url:'' });
  const [previewItem, setPreviewItem] = useState(null);

  const fetchData = async (pageOverride) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries({ ...filters, page: pageOverride||page }).forEach(([k,v])=> { if(v) params.append(k,v); });
  const res = await axios.get(`/api/courses/resources?${params.toString()}`);
  setVerified(res.data.verifiedResources || []);
  setResources(res.data.resources);
  if (Array.isArray(res.data.semesters)) setSemesters(res.data.semesters);
      setPagination(res.data.pagination);
      if (pageOverride) setPage(pageOverride);
    } catch(e){ /* noop */ } finally { setLoading(false); }
  };

  useEffect(()=> { fetchData(1); /* eslint-disable-next-line */ }, [filters.sort]);
  useEffect(()=> { if (user?.role==='admin') loadCourses(); }, [user]);

  const loadCourses = async () => {
    try {
      const res = await axios.get('/api/courses?limit=100');
      setCourses(res.data.courses || []);
    } catch(e) { /* ignore */ }
  };

  const handleVerifiedFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifiedForm(f => ({ ...f, file, title: f.title || file.name.split('.')[0] }));
  };

  const uploadVerifiedFile = async (file) => {
    const fd = new FormData(); fd.append('file', file); fd.append('type', 'course-material');
    const res = await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return { url: res.data.url || res.data.filePath, filename: res.data.filename };
  };

  const submitVerified = async (e) => {
    e.preventDefault();
    if (!verifiedForm.courseId || !verifiedForm.title.trim()) return toast.error('Course and title required');
    if (!verifiedForm.file && !verifiedForm.url.trim()) return toast.error('File or URL required');
    setSavingVerified(true);
    try {
      let url = verifiedForm.url.trim(); let filename='';
      if (verifiedForm.file) { const up = await uploadVerifiedFile(verifiedForm.file); url = up.url; filename = up.filename; }
      await axios.post(`/api/courses/${verifiedForm.courseId}/material`, { title: verifiedForm.title.trim(), type: verifiedForm.type, url, filename, description: verifiedForm.description.trim(), isFree: verifiedForm.isFree });
      toast.success('Verified resource added');
      setShowAddVerified(false);
      setVerifiedForm({ courseId:'', title:'', type:'document', description:'', isFree:false, file:null, url:'' });
      fetchData(page);
    } catch(err) {
      toast.error(err.response?.data?.message || 'Failed to add resource');
    } finally { setSavingVerified(false); }
  };

  const apply = (e) => { e.preventDefault(); fetchData(1); };
  const reset = () => { setFilters({ q:'', semester:'', sort:'recent' }); fetchData(1); };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-4 rounded-md border shadow-sm">
        <form onSubmit={apply} className="grid md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="label-text">Search (Title or Code)</label>
            <input value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))} className="input input-sm w-full" placeholder="e.g. Algorithms or CSE471" />
          </div>
          <div>
            <label className="label-text">Semester</label>
            <select value={filters.semester} onChange={e=>setFilters(f=>({...f,semester:e.target.value}))} className="select select-sm w-full">
              <option value="">All</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Sort</label>
            <select value={filters.sort} onChange={e=>setFilters(f=>({...f,sort:e.target.value}))} className="select select-sm w-full">
              <option value="recent">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="rating">Rating</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm flex-1"><FunnelIcon className="h-4"/>Apply</button>
            <button type="button" onClick={reset} className="btn btn-ghost btn-sm"><ArrowPathIcon className="h-4"/>Reset</button>
          </div>
        </form>
        {user?.role==='admin' && (
          <div className="mt-4">
            <button onClick={()=>setShowAddVerified(true)} className="btn btn-secondary btn-sm">Add Verified Resource</button>
          </div>
        )}
      </div>

      {showAddVerified && user?.role==='admin' && (
        <div className="bg-white p-4 rounded-md border shadow-sm relative">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">New Verified Resource</h3>
            <button onClick={()=>setShowAddVerified(false)} className="text-xs text-gray-500">Close</button>
          </div>
          <form onSubmit={submitVerified} className="grid md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block mb-1">Course *</label>
              <select value={verifiedForm.courseId} onChange={e=>setVerifiedForm(f=>({...f,courseId:e.target.value}))} className="select select-sm w-full" required>
                <option value="">Select course</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.courseCode} — {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Title *</label>
              <input value={verifiedForm.title} onChange={e=>setVerifiedForm(f=>({...f,title:e.target.value}))} className="input input-sm w-full" required />
            </div>
            <div>
              <label className="block mb-1">Type *</label>
              <select value={verifiedForm.type} onChange={e=>setVerifiedForm(f=>({...f,type:e.target.value}))} className="select select-sm w-full">
                <option value="document">Document</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1">File (or URL below)</label>
              <input type="file" onChange={handleVerifiedFile} className="w-full text-xs" />
              {verifiedForm.file && <p className="text-[10px] mt-1 text-green-700">{verifiedForm.file.name}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1">URL</label>
              <input value={verifiedForm.url} onChange={e=>setVerifiedForm(f=>({...f,url:e.target.value}))} className="input input-sm w-full" placeholder="https://..." />
            </div>
            <div className="md:col-span-4">
              <label className="block mb-1">Description</label>
              <textarea value={verifiedForm.description} onChange={e=>setVerifiedForm(f=>({...f,description:e.target.value}))} className="input w-full h-16" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input id="vf-free" type="checkbox" checked={verifiedForm.isFree} onChange={e=>setVerifiedForm(f=>({...f,isFree:e.target.checked}))} />
              <label htmlFor="vf-free">Free Access</label>
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={()=>setShowAddVerified(false)} className="btn btn-ghost btn-xs">Cancel</button>
              <button disabled={savingVerified} className="btn btn-primary btn-xs disabled:opacity-50">{savingVerified?'Saving...':'Save Verified Resource'}</button>
            </div>
          </form>
        </div>
      )}

      {verified.length>0 && (
        <div className="bg-white p-4 rounded-md border shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] uppercase tracking-wide">Verified Resources</span>
            <span className="text-xs text-gray-500">(Admin Uploaded)</span>
          </h3>
          <ul className="grid md:grid-cols-4 gap-3">
            {verified.map(v => (
              <li key={v._id} className="border rounded p-2 text-xs bg-gray-50 hover:bg-gray-100 transition relative">
                <p className="font-medium truncate pr-8" title={v.title}>{v.title}</p>
                <p className="text-[10px] text-gray-500 truncate">{v.courseCode}</p>
                {v.description && <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{v.description}</p>}
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button onClick={()=>setPreviewItem(v)} className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 rounded text-[10px] font-medium text-gray-700 hover:bg-gray-50 transition h-6">
                      <EyeIcon className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <a href={v.url} target="_blank" rel="noreferrer" title="Open in new tab" className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 rounded text-[10px] font-medium text-gray-700 hover:bg-gray-50 transition h-6">
                      <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      Open
                    </a>
                  </div>
                  <span className="text-[9px] px-1 rounded bg-green-200 text-green-800">Verified</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-[200px]">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && resources.length===0 && <p className="text-sm text-gray-500">No resources found.</p>}
        <ul className="grid md:grid-cols-3 gap-4">
          {resources.map(r => (
            <li key={r._id} className="bg-white border rounded-md p-3 shadow-sm flex flex-col relative">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm truncate" title={r.title}>{r.title}</h4>
                <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded" title={`${r.courseCode}`}>{r.courseCode}</span>
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-2 mb-2" title={r.description}>{r.description || 'No description'}</p>
              <div className="flex items-center gap-2 text-[11px] mb-2">
                <RatingDisplay value={r.averageRating} count={r.ratingsCount} />
                <span className="text-gray-400">· {r.semester || 'Semester N/A'}</span>
              </div>
              <div className="mt-auto flex gap-2">
                <button onClick={()=>setPreviewItem(r)} className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 rounded text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition">
                  <EyeIcon className="w-4 h-4" />
                  Preview
                </button>
                <a href={r.url} target="_blank" rel="noreferrer" title="Open in new tab" className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 rounded text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition">
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Open
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page===1} onClick={()=>fetchData(page-1)} className="btn btn-xs">Prev</button>
          <span className="text-xs mt-1">Page {page} / {pagination.pages}</span>
          <button disabled={page===pagination.pages} onClick={()=>fetchData(page+1)} className="btn btn-xs">Next</button>
        </div>
      )}

      {previewItem && (
        <ResourcePreviewModal resource={previewItem} onClose={()=>setPreviewItem(null)} />
      )}
    </div>
  );
}

function RatingDisplay({ value, count }) {
  if (!value) return <span className="text-gray-400">No ratings</span>;
  return (
    <span className="flex items-center gap-1 text-yellow-600">
      <StarIcon className="h-4" />
      <span className="text-[11px] font-medium">{value} ({count})</span>
    </span>
  );
}
