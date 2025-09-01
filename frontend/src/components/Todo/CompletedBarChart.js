import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const TYPE_COLORS = {
  Midterm: '#a855f7', // purple-500
  Final: '#ef4444',   // red-500
  Quiz: '#3b82f6',    // blue-500
  Assignment: '#6366f1', // indigo-500
  Personal: '#9ca3af',   // gray-400
  Study: '#22c55e',      // green-500
  Project: '#f59e0b',    // amber-500
  Other: '#6b7280'       // gray-500
};

function dateKey(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10); }

export default function CompletedBarChart({ days = 7, taskType = 'all' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({}); // { 'YYYY-MM-DD': { total: n, byType: { type: n } } }
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    const fetchAll = async () => {
      setLoading(true); setError('');
      try {
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        const startKey = dateKey(start);

        // Paginate over completed todos sorted by completedAt desc until we pass the startKey
        const accum = {};
        let page = 1;
        const limit = 100;
        let totalPages = 1;
        do {
          const params = new URLSearchParams();
          params.set('completed', 'true');
          params.set('sortBy', 'completedAt');
          params.set('sortOrder', 'desc');
          params.set('page', String(page));
          params.set('limit', String(limit));
          if (taskType && taskType !== 'all') params.set('taskType', taskType);
          const res = await axios.get(`/api/todos?${params.toString()}`);
          const todos = res.data?.todos || [];
          totalPages = res.data?.totalPages || 1;

          for (const t of todos) {
            const dt = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt || t.createdAt);
            const key = dateKey(dt);
            if (key < startKey) { totalPages = page - 1; break; } // we've gone beyond the needed range
            if (!accum[key]) accum[key] = { total: 0, byType: {} };
            accum[key].total += 1;
            const ty = t.taskType || 'Other';
            accum[key].byType[ty] = (accum[key].byType[ty] || 0) + 1;
          }

          page += 1;
        } while (page <= totalPages);

        if (ignore) return;
        setData(accum);
      } catch (e) {
        if (!ignore) setError(e.response?.data?.message || 'Failed to load chart data');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchAll();
    return () => { ignore = true; };
  }, [days, taskType, refreshTick]);

  // Refresh on live events from the list/timeline
  useEffect(() => {
    const bump = () => setRefreshTick(t => t + 1);
    window.addEventListener('todo:completed', bump);
    window.addEventListener('todo:uncompleted', bump);
    return () => {
      window.removeEventListener('todo:completed', bump);
      window.removeEventListener('todo:uncompleted', bump);
    };
  }, []);

  const series = useMemo(() => {
    // Build a fixed range of days
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(today.getDate() - i);
      const key = dateKey(d);
      const bucket = data[key] || { total: 0, byType: {} };
      out.push({ key, date: d, total: bucket.total, byType: bucket.byType });
    }
    const max = out.reduce((m, x) => Math.max(m, x.total), 0) || 1;
    return { points: out, max };
  }, [data, days]);

  const visibleTypes = useMemo(() => {
    const present = new Set();
    for (const p of series.points) {
      if (!p.byType) continue;
      Object.entries(p.byType).forEach(([t, v]) => { if (v > 0) present.add(t); });
    }
    const all = Object.keys(TYPE_COLORS);
    const arr = all.filter(t => present.has(t));
    return arr.length ? arr : all;
  }, [series.points]);

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-3">
        <div className="font-semibold text-gray-900">Completed — last {days} days</div>
        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
          {visibleTypes.map(t => (
            <div key={t} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: TYPE_COLORS[t] }}></span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-end gap-4 h-40 px-2">
          {series.points.map(p => {
            const total = p.total;
            const barHeight = Math.round((total / series.max) * 140); // leave some padding
            // Build stacked segments in a fixed order for consistency
            const segments = visibleTypes.map(t => ({
              type: t,
              value: (p.byType && p.byType[t]) || 0,
              color: TYPE_COLORS[t]
            })).filter(s => s.value > 0);
            const sum = segments.reduce((s, a) => s + a.value, 0) || 1;
            return (
              <div key={p.key} className="flex flex-col items-center w-10">
                <div className="relative w-7 rounded-md bg-gray-100 shadow-inner overflow-hidden" style={{ height: `${barHeight}px` }}>
                  {segments.reduce((acc, seg, idx) => {
                    const prev = acc.prev + acc.height;
                    const h = Math.max(2, Math.round((seg.value / sum) * barHeight));
                    acc.nodes.push(
                      <div key={seg.type}
                           className="absolute left-0 right-0"
                           style={{ bottom: `${prev}px`, height: `${h}px`, backgroundColor: seg.color }}
                           title={`${seg.type}: ${seg.value}`} />
                    );
                    acc.height += h;
                    return acc;
                  }, { prev: 0, height: 0, nodes: [] }).nodes}
                </div>
                <div className="mt-1 text-[10px] text-gray-600" title={p.date.toLocaleDateString()}>
                  {p.date.toLocaleDateString(undefined,{ month:'short', day:'numeric'})}
                </div>
                <div className="text-[10px] text-gray-500">{total}</div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500 mt-2">Loading chart…</div>}
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
}
