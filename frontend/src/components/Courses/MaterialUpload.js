import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  DocumentIcon,
  PlayIcon,
  LinkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import MaterialUpload from './MaterialUpload';
import toast from 'react-hot-toast';

const CourseMaterials = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'document',
    url: '',
    filename: '',
    description: '',
    isFree: false
  });

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(`/api/courses/${id}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingMaterial) {
        await axios.put(`/api/courses/${id}/material/${editingMaterial._id}`, formData);
        toast.success('Material updated successfully');
      } else {
        await axios.post(`/api/courses/${id}/material`, formData);
        toast.success('Material added successfully');
      }
      
      fetchCourse();
      resetForm();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error(error.response?.data?.message || 'Failed to save material');
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      await axios.delete(`/api/courses/${id}/material/${materialId}`);
      toast.success('Material deleted successfully');
      fetchCourse();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      type: material.type,
      url: material.url,
      filename: material.filename || '',
      description: material.description || '',
      isFree: material.isFree || false
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'document',
      url: '',
      filename: '',
      description: '',
      isFree: false
    });
    setEditingMaterial(null);
    setShowAddForm(false);
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'video': return PlayIcon;
      case 'link': return LinkIcon;
      default: return DocumentIcon;
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!course) {
    return <div className="text-center py-12">Course not found</div>;
  }

  const canEdit = user?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Materials</h1>
          <p className="text-gray-600">{course.title} ({course.courseCode})</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Material
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && !editingMaterial && (
        <MaterialUpload
          courseId={id}
          onUploadSuccess={() => {
            fetchCourse();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Form */}
      {showAddForm && editingMaterial && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Edit Material</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                  required
                >
                  <option value="document">Document</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="note">Note</option>
                  <option value="link">Link</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input"
                placeholder="https://..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filename
              </label>
              <input
                type="text"
                value={formData.filename}
                onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                className="input"
                placeholder="Optional filename"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows="3"
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFree"
                checked={formData.isFree}
                onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isFree" className="text-sm font-medium text-gray-700">
                Make this material free for non-enrolled students
              </label>
            </div>

            <div className="flex space-x-2">
              <button type="submit" className="btn btn-primary">
                Update Material
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Materials ({course.materials?.length || 0})</h2>
        
        {!course.materials?.length ? (
          <div className="text-center py-8 text-gray-500">
            No materials uploaded yet
          </div>
        ) : (
          <div className="space-y-3">
            {course.materials.map((material) => {
              const Icon = getIconForType(material.type);
              return (
                <div key={material._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6 text-gray-500" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{material.title}</h3>
                        {material.isFree ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <LockOpenIcon className="h-3 w-3 mr-1" />
                            Free
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <LockClosedIcon className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{material.type}</p>
                      {material.description && (
                        <p className="text-sm text-gray-500 mt-1">{material.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      Open
                    </a>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleEdit(material)}
                          className="btn btn-secondary btn-sm"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material._id)}
                          className="btn btn-danger btn-sm"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default CourseMaterials;
