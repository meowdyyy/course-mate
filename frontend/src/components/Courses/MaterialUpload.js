import { useState } from 'react';
import axios from 'axios';
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  PlayIcon,
  LinkIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MaterialUpload = ({ courseId, onUploadSuccess, onCancel }) => {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'document',
    description: '',
    isFree: false,
    file: null,
    url: ''
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      //Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      
      setFormData({
        ...formData,
        file,
        title: formData.title || file.name.split('.')[0]
      });
    }
  };

  const uploadFile = async (file) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', 'course-material');

    const uploadResponse = await axios.post('/api/upload', uploadFormData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const progress = (progressEvent.loaded / progressEvent.total) * 100;
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
      }
    });

    return uploadResponse.data.filePath;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.file && !formData.url.trim()) {
      toast.error('Please either upload a file or provide a URL');
      return;
    }

    setUploading(true);

    try {
      let materialUrl = formData.url;
      let filename = '';

      //Upload file if provided
      if (formData.file) {
        materialUrl = await uploadFile(formData.file);
        filename = formData.file.name;
      }

      //Create material entry
      const materialData = {
        title: formData.title.trim(),
        type: formData.type,
        url: materialUrl,
        filename,
        description: formData.description.trim(),
        isFree: formData.isFree
      };

      await axios.post(`/api/courses/${courseId}/material`, materialData);
      
      toast.success('Material uploaded successfully!');
      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  const getPreviewIcon = () => {
    switch (formData.type) {
      case 'video': return PlayIcon;
      case 'link': return LinkIcon;
      default: return DocumentIcon;
    }
  };

  const PreviewIcon = getPreviewIcon();

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Upload Course Material</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input"
            placeholder="Enter material title"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="input"
          >
            <option value="document">Document/PDF</option>
            <option value="video">Video</option>
            <option value="note">Study Notes</option>
            <option value="link">External Link</option>
          </select>
        </div>

        {/* File Upload or URL */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Content Source
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Upload File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept={formData.type === 'video' ? 'video/*' : formData.type === 'document' ? '.pdf,.doc,.docx,.ppt,.pptx' : '*'}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {formData.file ? formData.file.name : 'Click to upload file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Max 100MB
                  </p>
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Or Enter URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input"
                placeholder="https://example.com/resource"
              />
              <p className="text-xs text-gray-500 mt-1">
                For external resources like YouTube videos, Google Drive files, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows="3"
            placeholder="Brief description of the material content"
          />
        </div>

        {/* Access Control */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Access Control</h4>
              <p className="text-sm text-gray-600">
                Choose who can access this material
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={!formData.isFree}
                  onChange={() => setFormData({ ...formData, isFree: false })}
                  className="mr-2"
                />
                <LockClosedIcon className="h-4 w-4 text-gray-500 mr-1" />
                <span className="text-sm">Enrolled Only</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={formData.isFree}
                  onChange={() => setFormData({ ...formData, isFree: true })}
                  className="mr-2"
                />
                <LockOpenIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm">Free Access</span>
              </label>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <PreviewIcon className="h-5 w-5 text-gray-500" />
              <span className="font-medium">{formData.title || 'Material Title'}</span>
              {formData.isFree ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Free
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <LockClosedIcon className="h-3 w-3 mr-1" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 capitalize">{formData.type}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={uploading}
            className="btn btn-primary flex-1 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              'Upload Material'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={uploading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialUpload;
