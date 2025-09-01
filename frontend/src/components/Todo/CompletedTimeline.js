import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  FunnelIcon,
  ArrowLeftIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

const TASK_TYPES = ['Midterm', 'Final', 'Quiz', 'Assignment', 'Personal', 'Study', 'Project', 'Other'];

export default function CompletedTimeline() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskType, setTaskType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30; // reasonable default for timeline chunks

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
        const newItems = res.data?.todos || [];
        setItems(prev => page === 1 ? newItems : [...prev, ...newItems]);
        setTotalPages(res.data?.totalPages || 1);
        setTotal(res.data?.total || newItems.length);
      } catch (e) {
        if (ignore) return;
        setError(e.response?.data?.message || 'Failed to load completed tasks');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCompleted();
    return () => { ignore = true; };
  }, [taskType, page]);

  // Group items by YYYY-MM-DD for timeline sections
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const dt = item.completedAt ? new Date(item.completedAt) : (item.updatedAt ? new Date(item.updatedAt) : new Date(item.createdAt));
      const key = dt.toISOString().slice(0,10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ item, dt });
    });
    // Keep insertion order from items which is already sorted desc by completedAt
    return Array.from(map.entries());
  }, [items]);

  const onChangeType = (e) => {
    setTaskType(e.target.value);
    setPage(1);
  };

  if (loading && page === 1) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={()=>navigate('/todos')} className="btn btn-secondary inline-flex items-center">
            <ArrowLeftIcon className="h-4 w-4 mr-1"/>Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Completed Task History</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500"/>
            <select value={taskType} onChange={onChangeType} className="border rounded px-2 py-1 text-sm">
              <option value="all">All Types</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {items.length} of {total} completed tasks
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 mb-4">{error}</div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />

        <ul className="space-y-8">
          {groups.length === 0 && (
            <li className="text-gray-600">No completed tasks yet.</li>
          )}
          {groups.map(([dateKey, group]) => (
            <li key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDaysIcon className="h-5 w-5 text-gray-500"/>
                <div className="text-gray-800 font-medium">{new Date(dateKey).toLocaleDateString()}</div>
                <div className="text-gray-400 text-sm">({group.length})</div>
              </div>

              <ul className="space-y-4">
                {group.map(({ item, dt }) => (
                  <li key={item._id} className="relative pl-10">
                    {/* Dot */}
                    <span className="absolute left-4 top-2 inline-flex h-3 w-3 rounded-full bg-green-600 ring-4 ring-white shadow" />
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-600"/>
                          <div className="font-semibold text-gray-900">{item.title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Badges */}
                          {item.taskType && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 border border-blue-200 text-blue-700">{item.taskType}</span>
                          )}
                          {item.priority && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-50 border text-gray-700">{item.priority}</span>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{item.description}</div>
                      )}
                      <div className="mt-3 text-xs text-gray-500">Completed at {dt.toLocaleTimeString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {/* Pagination */}
      {page < totalPages && (
        <div className="mt-6 flex justify-center">
          <button onClick={()=>setPage(p=>p+1)} className="btn btn-secondary">Load more</button>
        </div>
      )}
    </div>
  );
}
