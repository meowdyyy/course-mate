import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function CommentThread({ courseId, resource, canComment }) {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const limit = 10;

  const load = async (p=1) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/courses/${courseId}/student-resources/${resource._id}/comments?page=${p}&limit=${limit}`);
      setComments(p === 1 ? res.data.comments : [...comments, ...res.data.comments]);
      setPage(res.data.pagination.page);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (e) {
      //silent
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (resource?._id) load(1);
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?._id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      setAdding(true);
      const res = await axios.post(`/api/courses/${courseId}/student-resources/${resource._id}/comments`, { text });
      setComments(res.data.comments);
      setText('');
      toast.success('Comment added');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add comment');
    } finally { setAdding(false); }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800">Comments ({total})</h4>
        {page < pages && (
          <button disabled={loading} onClick={() => load(page+1)} className="text-xs text-blue-600 hover:underline disabled:opacity-50">Load more</button>
        )}
      </div>
      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {comments.length === 0 && !loading && <p className="text-xs text-gray-500">No comments yet.</p>}
        {comments.map(c => (
          <div key={c._id} className="bg-gray-50 p-2 rounded border">
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{c.text}</p>
            <p className="text-[10px] text-gray-400 mt-1">{c.user?.firstName} {c.user?.lastName} • {new Date(c.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {loading && <p className="text-xs text-gray-400">Loading...</p>}
      </div>
      {canComment && (
        <form onSubmit={submit} className="mt-2 space-y-2">
          <textarea value={text} onChange={e=>setText(e.target.value)} className="input text-xs" rows={2} placeholder="Add a comment" />
          <div className="flex justify-end">
            <button disabled={adding} className="btn btn-primary btn-sm disabled:opacity-50">{adding? 'Posting...' : 'Post'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
