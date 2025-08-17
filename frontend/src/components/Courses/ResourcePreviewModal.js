import { XMarkIcon } from '@heroicons/react/24/outline';

function isYouTube(url='') {
  return /youtube\.com\/.+v=|youtu\.be\//i.test(url);
}
function getYouTubeId(url='') {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export default function ResourcePreviewModal({ resource, onClose }) {
  if (!resource) return null;
  const { type, url, title, description } = resource;
  const ytId = isYouTube(url) ? getYouTubeId(url) : null;
  const ext = (url || '').split('.').pop().toLowerCase();
  const isPDF = type === 'pdf' || ext === 'pdf';
  const isImage = ['png','jpg','jpeg','gif','webp','svg'].includes(ext);
  const isVideo = type === 'video' || ['mp4','webm','ogg','mov','mkv'].includes(ext);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-1 max-w-lg line-clamp-2">{description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><XMarkIcon className="h-6 w-6" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {ytId && (
            <div className="aspect-video">
              <iframe
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
            <div className="text-sm">
              <p className="mb-2">This resource can't be previewed here. Open in a new tab:</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{url}</a>
            </div>
          )}
        </div>
        <div className="p-3 border-t flex justify-end">
          <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
