import CompletedBarChart from './CompletedBarChart';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FunnelIcon, CalendarDaysIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TASK_TYPES = ['Midterm', 'Final', 'Quiz', 'Assignment', 'Personal', 'Study', 'Project', 'Other'];

export default function CompletedTimelineInline() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskType, setTaskType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 30;

  // Initial fetch + on filter/page changes
  useEffect(() => {
    let ignore = false;
    const fetchCompleted = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('completed', 'true');
        params.set('sortBy', 'completedAt');
        params.set('sortOrder', 'desc');
        params.set('page', String(page));
        params.set('limit', String(LIMIT));
        if (taskType && taskType !== 'all') params.set('taskType', taskType);
        const res = await axios.get(`/api/todos?${params.toString()}`);
        if (ignore) return;
        const list = res.data?.todos || [];
        setItems(prev => page === 1 ? list : [...prev, ...list]);
        setTotalPages(res.data?.totalPages || 1);
      } catch (e) {
        if (!ignore) setError(e.response?.data?.message || 'Failed to load completed tasks');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCompleted();
    return () => { ignore = true; };
  }, [taskType, page]);

  // Live update on completion
  useEffect(() => {
    const onCompleted = (e) => {
      const todo = e.detail?.todo;
      if (!todo) return;
      setItems(prev => [{ ...todo }, ...prev]);
    };
    const onUncompleted = (e) => {
      const id = e.detail?.todoId;
      if (!id) return;
      setItems(prev => prev.filter(x => x._id !== id));
    };
    window.addEventListener('todo:completed', onCompleted);
    window.addEventListener('todo:uncompleted', onUncompleted);
    return () => {
      window.removeEventListener('todo:completed', onCompleted);
      window.removeEventListener('todo:uncompleted', onUncompleted);
    };
  }, []);

  // Group by date for horizontal columns
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const dt = item.completedAt ? new Date(item.completedAt) : new Date(item.updatedAt || item.createdAt);
      const key = dt.toISOString().slice(0,10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ item, dt });
    });
    // keep insertion order
    return Array.from(map.entries());
  }, [items]);

  const handleRevert = async (todoId) => {
    try {
      const res = await axios.put(`/api/todos/${todoId}/toggle`);
      setItems(prev => prev.filter(x => x._id !== todoId));
      window.dispatchEvent(new CustomEvent('todo:uncompleted', { detail: { todoId } }));
      window.dispatchEvent(new CustomEvent('todo:reverted', { detail: { todo: res.data } }));
      toast('Moved back to pending');
    } catch (e) {
      toast.error('Failed to revert');
    }
  };

  return (
    <div className="mt-10 space-y-6">
      {/* Box 1: Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-500"/>
            Completed — last 7 days
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500"/>
            <select value={taskType} onChange={(e)=>{ setTaskType(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-sm">
              <option value="all">All Types</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="px-4 pt-3 pb-4">
          <CompletedBarChart taskType={taskType} days={7} />
        </div>
      </div>

      {/* Box 2: Vertical Completed History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-gray-900">Completed History</div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500"/>
            <select value={taskType} onChange={(e)=>{ setTaskType(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-sm">
              <option value="all">All Types</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="mx-4 mt-3 p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="px-4 py-4">
          {groups.length === 0 && !loading && (
            <div className="text-gray-600">No completed tasks yet.</div>
          )}

          <div className="space-y-8">
            {groups.map(([dateKey, group]) => (
              <div key={dateKey}>
                <div className="text-sm text-gray-700 font-medium mb-3">{new Date(dateKey).toLocaleDateString()}</div>
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-300" aria-hidden="true" />
                  <div className="flex flex-col gap-4">
                    {group.map(({ item, dt }) => (
                      <div key={item._id} className="relative">
                        {/* Node dot (centered on the vertical line and item) */}
                        <span className="absolute left-2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-3 w-3 rounded-full bg-green-600 ring-4 ring-white shadow" />
                        <div className="ml-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-600"/>
                                <div className="font-semibold text-gray-900 truncate" title={item.title}>{item.title}</div>
                                {item.taskType && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 border border-blue-200 text-blue-700">{item.taskType}</span>
                                )}
                              </div>
                              {item.description && (
                                <div className="mt-1 text-xs text-gray-700 line-clamp-3">{item.description}</div>
                              )}
                              <div className="mt-1 text-xs text-gray-500">{dt.toLocaleTimeString()}</div>
                            </div>
                            {/* Revert small cross */}
                            <button
                              title="Revert to pending"
                              onClick={() => handleRevert(item._id)}
                              className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 border border-transparent hover:border-gray-200"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {page < totalPages && (
            <div className="mt-4 flex justify-center">
              <button onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50">Load more</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
