import { useEffect, useState } from 'react';
import axios from 'axios';
import { StarIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ResourceBrowser(){
  const [filters, setFilters] = useState({ q:'', semester:'', sort:'recent' });
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [semesters, setSemesters] = useState([]);

  const fetchData = async (pageOverride) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries({ ...filters, page: pageOverride||page }).forEach(([k,v])=> { if(v) params.append(k,v); });
      const res = await axios.get(`/api/courses/resources?${params.toString()}`);
  setResources(res.data.resources);
  if (Array.isArray(res.data.semesters)) setSemesters(res.data.semesters);
      setPagination(res.data.pagination);
      if (pageOverride) setPage(pageOverride);
    } catch(e){ /* noop */ } finally { setLoading(false); }
  };

  useEffect(()=> { fetchData(1); /* eslint-disable-next-line */ }, [filters.sort]);

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
      </div>

      <div className="min-h-[200px]">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && resources.length===0 && <p className="text-sm text-gray-500">No resources found.</p>}
        <ul className="grid md:grid-cols-3 gap-4">
          {resources.map(r => (
            <li key={r._id} className="bg-white border rounded-md p-3 shadow-sm flex flex-col">
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
                <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline">Open</a>
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
