import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  BookOpenIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import CourseContentViewer from './CourseContentViewer';
import toast from 'react-hot-toast';
import StarRating from './StarRating';
import ResourcePreviewModal from './ResourcePreviewModal';
import { EyeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import CommentThread from './CommentThread';
import SelfAssessment from './SelfAssessment';

const CourseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [studentResources, setStudentResources] = useState([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourcePage, setResourcePage] = useState(1);
  const [resourcePagination, setResourcePagination] = useState({ page: 1, pages: 1, total: 0 });
  const [newResource, setNewResource] = useState({ title: '', type: 'document', url: '', description: '', semester: '' });
  const [uploadingResource, setUploadingResource] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  //Rating & preview state
  const [previewResource, setPreviewResource] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(null); //resourceId when submitting
  const [userRatings, setUserRatings] = useState({}); //resourceId -> value
  const [avgRatings, setAvgRatings] = useState({}); //resourceId -> { avg, count }
  const [ratingHistory, setRatingHistory] = useState({}); //resourceId -> prior {user, agg}

  useEffect(() => {
    fetchCourseDetails();
    if (user?.role === 'student') {
      checkEnrollmentStatus();
    }
    if (user) {
      fetchStudentResources();
    }

  }, [id, user]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(`/api/courses/${id}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Course not found');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      const response = await axios.get(`/api/enrollments/student/${user._id}`);
      const enrolled = response.data.some(enrollment =>
        enrollment.course._id === id && enrollment.status === 'enrolled'
      );
      setIsEnrolled(enrolled);
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrollmentLoading(true);
      console.log('Enrolling in course:', id); //Debug log
      const response = await axios.post('/api/enrollments', { courseId: id });
      console.log('Enrollment response:', response.data); //Debug log
      setIsEnrolled(true);
      toast.success('Successfully enrolled in course!');
      fetchCourseDetails(); //Refresh to update enrollment count
    } catch (error) {
      console.error('Enrollment error:', error); //Debug log
      const message = error.response?.data?.message || 'Failed to enroll';
      toast.error(message);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleUnenroll = async () => {
    try {
      //Find enrollment ID and delete
      const enrollments = await axios.get(`/api/enrollments/student/${user._id}`);
      const enrollment = enrollments.data.find(e => e.course._id === id);

      if (enrollment) {
        await axios.delete(`/api/enrollments/${enrollment._id}`);
        setIsEnrolled(false);
        toast.success('Successfully unenrolled from course');
        fetchCourseDetails();
      }
    } catch (error) {
      toast.error('Failed to unenroll from course');
    }
  };

  const handleApproveCourse = async () => {
    try {
      await axios.put(`/api/courses/${id}/approve`);
      toast.success('Course approved successfully!');
      fetchCourseDetails(); //Refresh course data
    } catch (error) {
      toast.error('Failed to approve course');
    }
  };

  const fetchStudentResources = async (page = 1) => {
    try {
      setResourceLoading(true);
      const res = await axios.get(`/api/courses/${id}/student-resources?page=${page}&limit=10`);
      const resources = res.data.resources || [];
  setStudentResources(resources);
      //Initialize rating aggregates and user ratings from backend
      const initUser = {}; const initAgg = {};
      resources.forEach(r => {
        if (r.currentUserRating) initUser[r._id] = r.currentUserRating;
        if (r.averageRating !== undefined) initAgg[r._id] = { avg: r.averageRating, count: r.ratingsCount };
      });
      setUserRatings(initUser);
      setAvgRatings(initAgg);
      if (res.data.pagination) {
        setResourcePagination(res.data.pagination);
        setResourcePage(res.data.pagination.page);
      }
    } catch (error) {
      //silent if not authorized (not enrolled)
    } finally {
      setResourceLoading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newResource.title.trim() || !newResource.url.trim()) return toast.error('Title and URL required');
    try {
      setUploadingResource(true);
      await axios.post(`/api/courses/${id}/student-resources`, newResource);
      toast.success('Resource added');
  setNewResource({ title: '', type: 'document', url: '', description: '', semester: '' });
  fetchStudentResources(resourcePage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add resource');
    } finally {
      setUploadingResource(false);
    }
  };

  const handleDeleteResource = async (rid) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await axios.delete(`/api/courses/${id}/student-resources/${rid}`);
      toast.success('Resource deleted');
      setStudentResources(prev => prev.filter(r => r._id !== rid));
      fetchStudentResources(resourcePage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete resource');
    }
  };

  const handleRate = async (resourceId, value) => {
    //optimistic update
    const prevUser = userRatings[resourceId] || null;
    const prevAgg = avgRatings[resourceId] || { avg: null, count: 0 };
    setRatingHistory(h => ({ ...h, [resourceId]: { prevUser, prevAgg } }));
    //compute new optimistic aggregate
    let newCount = prevAgg.count;
    let total = prevAgg.avg ? prevAgg.avg * prevAgg.count : 0;
    if (prevUser) {
      //replace existing rating
      total = total - prevUser + value;
    } else {
      total += value;
      newCount += 1;
    }
    const newAvg = newCount ? (total / newCount).toFixed(2) : null;
    setUserRatings(prev => ({ ...prev, [resourceId]: value }));
    setAvgRatings(prev => ({ ...prev, [resourceId]: { avg: newAvg, count: newCount } }));
    setRatingSubmitting(resourceId);
    try {
      const res = await axios.post(`/api/courses/${id}/student-resources/${resourceId}/rate`, { value });
      setAvgRatings(prev => ({ ...prev, [resourceId]: { avg: res.data.averageRating, count: res.data.ratingsCount } }));
      toast.success('Rating saved');
    } catch (e) {
      //rollback
      const hist = ratingHistory[resourceId];
      if (hist) {
        setUserRatings(prev => ({ ...prev, [resourceId]: hist.prevUser }));
        setAvgRatings(prev => ({ ...prev, [resourceId]: hist.prevAgg }));
      }
      toast.error(e.response?.data?.message || 'Failed to rate');
    } finally {
      setRatingSubmitting(null);
    }
  };

  const handleEditResource = (resObj) => {
    setEditingResource(resObj._id);
  setNewResource({ title: resObj.title, type: resObj.type, url: resObj.url, description: resObj.description || '', semester: resObj.semester || '' });
    const el = document.getElementById('add-student-resource');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateResource = async (e) => {
    e.preventDefault();
    if (!editingResource) return;
    try {
      setUploadingResource(true);
      await axios.patch(`/api/courses/${id}/student-resources/${editingResource}`, newResource);
      toast.success('Resource updated');
      setEditingResource(null);
  setNewResource({ title: '', type: 'document', url: '', description: '', semester: '' });
      fetchStudentResources(resourcePage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update resource');
    } finally {
      setUploadingResource(false);
    }
  };

  const handleApproveResource = async (rid) => {
    try {
      await axios.post(`/api/courses/${id}/student-resources/${rid}/approve`);
      toast.success('Resource approved');
      fetchStudentResources(resourcePage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectResource = async (rid) => {
    if (!window.confirm('Reject and remove this resource?')) return;
    try {
      await axios.post(`/api/courses/${id}/student-resources/${rid}/reject`);
      toast.success('Resource rejected');
      fetchStudentResources(resourcePage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const handleUploadResourceFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', newResource.type === 'video' ? 'video' : 'document');
      const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fileUrl = res.data.url || res.data.filePath;
      setNewResource(prev => ({ ...prev, url: fileUrl, filename: res.data.filename }));
      toast.success('File uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
      </div>
    );
  }

  const canEdit = user?.role === 'admin';
  const canApprove = user?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Course Header */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-16 w-16 bg-black rounded-lg flex items-center justify-center">
                <BookOpenIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-lg text-gray-600">{course.courseCode}</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">{course.description}</p>

            {/* Course Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <UserIcon className="h-5 w-5 mr-3" />
                <span>Course Owner: {course.owner?.firstName} {course.owner?.lastName}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <CalendarIcon className="h-5 w-5 mr-3" />
                <span>{course.credits} Credits • {course.level}</span>
              </div>
            

              <div className="flex items-center text-gray-600">
                <ClockIcon className="h-5 w-5 mr-3" />
                <span>{course.currentEnrollment} enrolled</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 lg:mt-0 lg:ml-6 flex flex-col space-y-3">
            {canEdit && (
              <>
                <button
                  onClick={() => navigate(`/courses/${id}/edit`)}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Edit Course
                </button>
                <button
                  onClick={() => navigate(`/courses/${id}/materials`)}
                  className="btn btn-primary flex items-center justify-center"
                >
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  Manage Materials
                </button>
              </>
            )}

            {canApprove && !course.isApproved && (
              <button
                onClick={handleApproveCourse}
                className="btn btn-primary flex items-center justify-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Approve Course
              </button>
            )}

            {canApprove && (
              <button
                className="btn btn-danger flex items-center justify-center"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Deactivate Course
              </button>
            )}

            {user?.role === 'student' && (
              <>
                {!isEnrolled ? (
                  <button
                    onClick={handleEnroll}
                    disabled={enrollmentLoading || !course.isApproved}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {enrollmentLoading ? 'Enrolling...' :
                      !course.isApproved ? 'Pending Approval' :
                        'Enroll Now'}
                  </button>
                ) : (
                  <button
                    onClick={handleUnenroll}
                    className="btn btn-danger"
                  >
                    Unenroll
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Course Materials - Now visible to all users */}
      <CourseContentViewer
        materials={course.materials || []}
        isEnrolled={isEnrolled}
        canEdit={canEdit}
        onEnroll={handleEnroll}
        enrollmentLoading={enrollmentLoading}
      />

  {/* Self Assessment Section */}
  <SelfAssessment isEnrolled={isEnrolled} />

  {/* Student Resources Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Student Resources</h2>
          {isEnrolled && user?.role === 'student' && (
            <button
              onClick={() => {
                const el = document.getElementById('add-student-resource');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-primary btn-sm"
            >
              Add Resource
            </button>
          )}
        </div>
        {resourceLoading ? (
          <p className="text-gray-500">Loading resources...</p>
        ) : studentResources.length === 0 ? (
          <p className="text-gray-600">No student resources yet.</p>
        ) : (
          <ul className="space-y-3">
            {studentResources.map(r => {
              const canDelete = user?.role === 'admin' || user?._id === r.uploadedBy?._id;
              const canEditResource = (user?._id === r.uploadedBy?._id && user?.role === 'student' && !r.isApproved) || user?.role === 'admin';
              const canModerate = user?.role === 'admin';
              const canRate = r.isApproved && (user?.role === 'admin' || isEnrolled);
              const canComment = canRate; 
              const agg = avgRatings[r._id];
              return (
                <li key={r._id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="pr-4">
                      <p className="font-medium text-gray-900 flex items-center flex-wrap gap-2">
                        {r.title}
                        <span className="text-xs text-gray-500 uppercase">{r.type}</span>
                        {r.isApproved ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Approved</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <button onClick={() => setPreviewResource(r)} className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                          <EyeIcon className="w-4 h-4" />
                          Preview
                        </button>
                        <a href={r.url} target="_blank" rel="noreferrer" title="Open in new tab" className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          Open
                        </a>
                      </div>
                      {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(r.uploadDate).toLocaleDateString()} by {r.uploadedBy?.firstName} {r.uploadedBy?.lastName}</p>
                      {/* Rating */}
                      {canRate && (
                        <div className="mt-2">
                          <StarRating
                            average={agg?.avg || null}
                            count={agg?.count}
                            userRating={userRatings[r._id] || null}
                            onRate={(v) => handleRate(r._id, v)}
                            disabled={!!ratingSubmitting}
                          />
                        </div>
                      )}
                      {/* Comments */}
                      {canComment && (
                        <div className="mt-2">
                          <CommentThread courseId={id} resource={r} canComment={canComment} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-1 items-end">
                      {canEditResource && <button onClick={() => handleEditResource(r)} className="text-blue-600 text-xs">Edit</button>}
                      {canDelete && <button onClick={() => handleDeleteResource(r._id)} className="text-red-600 text-xs">Delete</button>}
                      {canModerate && !r.isApproved && (
                        <>
                          <button onClick={() => handleApproveResource(r._id)} className="text-green-600 text-xs">Approve</button>
                          <button onClick={() => handleRejectResource(r._id)} className="text-yellow-600 text-xs">Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination controls */}
        {resourcePagination.pages > 1 && (
          <div className="flex justify-center items-center space-x-3 mt-4">
            <button
              disabled={resourcePage === 1}
              onClick={() => fetchStudentResources(resourcePage - 1)}
              className="btn btn-secondary btn-sm disabled:opacity-40"
            >Prev</button>
            <span className="text-sm text-gray-600">Page {resourcePagination.page} of {resourcePagination.pages}</span>
            <button
              disabled={resourcePage === resourcePagination.pages}
              onClick={() => fetchStudentResources(resourcePage + 1)}
              className="btn btn-secondary btn-sm disabled:opacity-40"
            >Next</button>
          </div>
        )}

        {isEnrolled && user?.role === 'student' && (
          <form id="add-student-resource" onSubmit={editingResource ? handleUpdateResource : handleAddResource} className="mt-6 space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900">{editingResource ? 'Edit Resource' : 'Add a Resource'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={newResource.title} onChange={e => setNewResource(prev => ({ ...prev, title: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={newResource.type} onChange={e => setNewResource(prev => ({ ...prev, type: e.target.value }))} className="input">
                  <option value="document">Document</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="link">Link</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input type="url" value={newResource.url} onChange={e => setNewResource(prev => ({ ...prev, url: e.target.value }))} className="input mb-2" required placeholder="https://... or upload a file below" />
                <div>
                  <input type="file" onChange={handleUploadResourceFile} className="text-sm" />
                  {uploadingFile && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  {newResource.filename && <p className="text-xs text-green-600 mt-1">File: {newResource.filename}</p>}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={newResource.description} onChange={e => setNewResource(prev => ({ ...prev, description: e.target.value }))} className="input" rows={3} placeholder="Why is this resource helpful?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                <div className="flex gap-2">
                  <select value={newResource.semester.split(' ')[0] || ''} onChange={e => {
                    const term = e.target.value;
                    const year = newResource.semester.split(' ')[1] || new Date().getFullYear();
                    setNewResource(prev => ({ ...prev, semester: term ? `${term} ${year}` : '' }));
                  }} className="input w-1/2">
                    <option value="">Term</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                  </select>
                  <input type="number" min="2000" max="2100" value={newResource.semester.split(' ')[1] || new Date().getFullYear()} onChange={e => {
                    const year = e.target.value;
                    const term = newResource.semester.split(' ')[0] || '';
                    setNewResource(prev => ({ ...prev, semester: term && year ? `${term} ${year}` : '' }));
                  }} className="input w-1/2" required />
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: Spring|Summer|Fall YYYY</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button disabled={uploadingResource} className="btn btn-primary disabled:opacity-50">{uploadingResource ? (editingResource ? 'Updating...' : 'Adding...') : (editingResource ? 'Update Resource' : 'Submit Resource')}</button>
              {editingResource && <button type="button" onClick={() => { setEditingResource(null); setNewResource({ title: '', type: 'document', url: '', description: '', semester: '' }); }} className="btn btn-secondary">Cancel</button>}
            </div>
          </form>
        )}
      </div>

      {/* Prerequisites */}
      {course.prerequisites?.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-1">
            {course.prerequisites.map((prereq, index) => (
              <li key={index} className="text-gray-700">{prereq}</li>
            ))}
          </ul>
        </div>
      )}
  {/* Preview Modal */}
  <ResourcePreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />
    </div>
  );
};

export default CourseDetail;
