import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  BookOpenIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

const MyEnrollments = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await axios.get(`/api/enrollments/student/${user._id}`);
        if (active) setEnrollments(response.data);
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user._id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'enrolled':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="mt-2 text-gray-600">
          Track your enrolled courses and academic progress
        </p>
      </div>

  {/* Summary Stats (simplified) */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center">
            <BookOpenIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-2xl font-semibold text-gray-900">{enrollments.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {enrollments.filter(e => e.status === 'enrolled').length}
              </p>
            </div>
          </div>
        </div>
  {/* Removed Completed and Dropped statistics */}
      </div>

      {/* Course List */}
      {enrollments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses enrolled</h3>
          <p className="text-gray-600 mb-4">Start learning by enrolling in your first course</p>
          <Link to="/courses" className="btn btn-primary">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {enrollments.map((enrollment) => (
            <div key={enrollment._id} className="card hover:shadow-md transition-shadow">
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                  {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  {enrollment.course.credits} credits
                </span>
              </div>

              {/* Course Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {enrollment.course.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{enrollment.course.courseCode}</p>
                
                <div className="flex items-center text-sm text-gray-600">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {enrollment.course.owner?.firstName} {enrollment.course.owner?.lastName}
                </div>
              </div>

              {/* Removed attendance and grade metrics */}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Link
                  to={`/courses/${enrollment.course._id}`}
                  className="flex-1 btn btn-secondary text-center"
                >
                  View Course
                </Link>
                {/* Removed assignments link */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEnrollments;
