import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentIcon,
  LockClosedIcon,
  LockOpenIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseCode: '',
    credits: 3,
    category: '',
    level: 'Beginner',
    prerequisites: [''],
    materials: []
  });

  const [uploadingFiles, setUploadingFiles] = useState([]);

  const categories = [
    'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 
    'Biology', 'English', 'History', 'Arts', 'Business', 'Other'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handlePrerequisiteChange = (index, value) => {
    const newPrerequisites = [...formData.prerequisites];
    newPrerequisites[index] = value;
    setFormData(prev => ({ ...prev, prerequisites: newPrerequisites }));
  };

  const addPrerequisite = () => {
    setFormData(prev => ({
      ...prev,
      prerequisites: [...prev.prerequisites, '']
    }));
  };

  const removePrerequisite = (index) => {
    const newPrerequisites = formData.prerequisites.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, prerequisites: newPrerequisites }));
  };

  //Material handling functions
  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, {
        title: '',
        type: 'document',
        description: '',
        isFree: false,
        file: null,
        url: ''
      }]
    }));
  };

  const removeMaterial = (index) => {
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, materials: newMaterials }));
  };

  const updateMaterial = (index, field, value) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setFormData(prev => ({ ...prev, materials: newMaterials }));
    
    //Log the update for debugging
    console.log(`Updated material ${index} field ${field} to:`, value);
    console.log('Full material after update:', newMaterials[index]);
  };

  const handleFileUpload = async (index, file) => {
    if (!file) return;
    
    //Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    try {
      setUploadingFiles(prev => [...prev, index]);
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'course-material');

      console.log('Uploading file:', file.name, 'for material index:', index);

      const response = await axios.post('/api/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Full upload response:', response.data);
      console.log('Response URL field:', response.data.url);
      console.log('Response filePath field:', response.data.filePath);

      //Update material with the uploaded file URL
      const fileUrl = response.data.url || response.data.filePath;
      console.log('Using URL:', fileUrl);
      
      //Update material with all the file information at once
      const updates = {
        url: fileUrl,
        filename: response.data.filename
      };
      
      //Auto-fill title if empty
      if (!formData.materials[index].title) {
        updates.title = file.name.split('.')[0];
      }
      
      //Apply all updates at once
      const newMaterials = [...formData.materials];
      newMaterials[index] = { ...newMaterials[index], ...updates };
      setFormData(prev => ({ ...prev, materials: newMaterials }));
      
      console.log('Material updated with all data:', newMaterials[index]);
      
      //Wait and check if the state was updated
      setTimeout(() => {
        console.log('State check after upload - material', index + 1, ':', formData.materials[index]);
        console.log('URL in state:', formData.materials[index]?.url);
      }, 100);
      
      toast.success('File uploaded successfully');
      console.log('Material should now have URL:', fileUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFiles(prev => prev.filter(i => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      //Validate materials - must have files uploaded
      for (let i = 0; i < formData.materials.length; i++) {
        const material = formData.materials[i];
        console.log(`Validating material ${i + 1}:`, material);
        
        if (!material.title.trim()) {
          toast.error(`Material ${i + 1}: Title is required`);
          setLoading(false);
          return;
        }
        if (material.type === 'link') {
          if (!material.url.trim()) {
            toast.error(`Material ${i + 1}: URL is required for link type`);
            setLoading(false);
            return;
          }
        } else {
          //For file materials, upload is required
          if (!material.url) {
            console.log(`Material ${i + 1} missing URL:`, material.url);
            toast.error(`Material ${i + 1}: Please upload a file`);
            setLoading(false);
            return;
          }
          //Check if file is still uploading
          if (uploadingFiles.includes(i)) {
            toast.error(`Material ${i + 1}: File is still uploading, please wait`);
            setLoading(false);
            return;
          }
        }
      }

      //Clean up prerequisites and prepare materials
      const cleanedData = {
        ...formData,
        prerequisites: formData.prerequisites.filter(p => p.trim() !== ''),
        materials: formData.materials.map(material => ({
          title: material.title,
          type: material.type,
          url: material.url,
          filename: material.filename || '',
          description: material.description || '',
          isFree: material.isFree
        }))
      };

      const response = await axios.post('/api/courses', cleanedData);
      
      toast.success('Course created successfully! Pending admin approval.');
      
      navigate(`/courses/${response.data.course._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="mt-2 text-gray-600">
          Fill in the details below to create a new course
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input"
                placeholder="Introduction to Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Code *
              </label>
              <input
                type="text"
                name="courseCode"
                required
                value={formData.courseCode}
                onChange={handleChange}
                className="input"
                placeholder="CS101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level *
              </label>
              <select
                name="level"
                required
                value={formData.level}
                onChange={handleChange}
                className="input"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credits *
              </label>
              <input
                type="number"
                name="credits"
                required
                min="1"
                max="10"
                value={formData.credits}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Max Students removed: unlimited enrollment */}

            {/* Fees removed: courses are free */}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="input"
              placeholder="Describe what students will learn in this course..."
            />
          </div>
        </div>

        {/* Prerequisites */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Prerequisites</h2>
            <button
              type="button"
              onClick={addPrerequisite}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.prerequisites.map((prereq, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={prereq}
                  onChange={(e) => handlePrerequisiteChange(index, e.target.value)}
                  className="input flex-1"
                  placeholder="Enter prerequisite"
                />
                <button
                  type="button"
                  onClick={() => removePrerequisite(index)}
                  className="btn btn-danger btn-sm"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Course Materials */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Course Materials</h2>
              <button
                type="button"
                onClick={addMaterial}
                className="btn btn-secondary btn-sm flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Material
              </button>
            </div>
          
          <div className="space-y-6">
            {formData.materials.map((material, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-gray-900">Material {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="btn btn-danger btn-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={material.title}
                      onChange={(e) => updateMaterial(index, 'title', e.target.value)}
                      className="input"
                      placeholder="Material title"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={material.type}
                      onChange={(e) => updateMaterial(index, 'type', e.target.value)}
                      className="input"
                    >
                      <option value="document">Document/PDF</option>
                      <option value="video">Video</option>
                      <option value="note">Study Notes</option>
                      <option value="link">External Link</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={material.description}
                      onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                      className="input"
                      rows="2"
                      placeholder="Brief description of the material"
                    />
                  </div>

                  {/* File Upload / URL */}
                  {material.type === 'link' ? (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL *
                      </label>
                      <input
                        type="url"
                        value={material.url}
                        onChange={(e) => updateMaterial(index, 'url', e.target.value)}
                        className="input"
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload File *
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept={material.type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg'}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    updateMaterial(index, 'file', file);
                                    handleFileUpload(index, file);
                                  }
                                }}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {material.type === 'video' ? 'Video files up to 100MB' : 'PDF, DOC, TXT, Images up to 100MB'}
                          </p>
                          {uploadingFiles.includes(index) && (
                            <div className="text-sm text-blue-600">
                              <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                              Uploading...
                            </div>
                          )}
                          {material.url && (
                            <p className="text-sm text-green-600 font-medium">✓ File uploaded successfully</p>
                          )}
                          {!material.url && !uploadingFiles.includes(index) && (
                            <p className="text-sm text-red-500">⚠️ File upload required</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Access Control */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Control
                    </label>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`material-${index}-access`}
                          checked={!material.isFree}
                          onChange={() => updateMaterial(index, 'isFree', false)}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex items-center">
                          <LockClosedIcon className="h-4 w-4 mr-1" />
                          Verified (Enrolled students only)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`material-${index}-access`}
                          checked={material.isFree}
                          onChange={() => updateMaterial(index, 'isFree', true)}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex items-center">
                          <LockOpenIcon className="h-4 w-4 mr-1" />
                          Free (Available to everyone)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {formData.materials.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No materials added yet. Click "Add Material" to get started.</p>
                <p className="text-sm mt-2">Materials must have files uploaded to be included in the course.</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;
