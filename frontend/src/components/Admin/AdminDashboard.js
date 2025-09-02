import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingCourses();
    fetchPendingUsers();
  }, []);

  const fetchPendingCourses = async () => {
    try {
      const response = await axios.get('/api/courses/pending');
      setPendingCourses(response.data);
    } catch (error) {
      console.error('Error fetching pending courses:', error);
    }
  };

  const approveCourse = async (courseId) => {
    try {
      await axios.put(`/api/courses/${courseId}/approve`);
      toast.success('Course approved successfully');
      fetchDashboardData();
      fetchPendingCourses();
    } catch (error) {
      toast.error('Failed to approve course');
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await axios.get('/api/users/pending-approval');
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  const approveUser = async (userId) => {
    try {
      await axios.put(`/api/users/${userId}/approve`);
      toast.success('User approved successfully');
      fetchDashboardData();
      fetchPendingUsers();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const fetchDashboardData = async () => {
    //Fetch dashboard data logic here
  };

  const stats = [
    {
      name: 'Pending Approvals',
      value: pendingUsers.length,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      urgent: pendingUsers.length > 0
    }
  ];

  return (
    <div className="p-6">
      {/* Removed heading 'Admin Dashboard' for minimal top bar */}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className={`card ${stat.urgent ? 'ring-2 ring-yellow-400' : ''}`}>
              <div className="flex items-center">
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  {stat.urgent && (
                    <p className="text-xs text-yellow-600 font-medium">Requires Action</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Approvals Alert */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Instructor approval removed.
                <Link to="/admin/users" className="font-medium underline ml-2">
                  Review now
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending User Approvals */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending User Approvals
            {pendingUsers.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingUsers.length}
              </span>
            )}
          </h2>
          {pendingUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending user approvals</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.slice(0, 5).map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => approveUser(user._id)}
                    className="btn btn-primary btn-sm"
                  >
                    Approve
                  </button>
                </div>
              ))}
              {pendingUsers.length > 5 && (
                <Link
                  to="/admin/users"
                  className="block text-center text-sm text-primary-600 hover:text-primary-500 pt-2"
                >
                  View all {pendingUsers.length} pending approvals
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Pending Course Approvals */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Course Approvals</h2>
          {pendingCourses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending course approvals</p>
          ) : (
            <div className="space-y-3">
              {pendingCourses.slice(0, 5).map((course) => (
                <div key={course._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{course.title}</p>
                    <p className="text-sm text-gray-600">
                      by {course.owner?.firstName} {course.owner?.lastName}
                    </p>
                  </div>
                  <button
                    onClick={() => approveCourse(course._id)}
                    className="btn btn-primary btn-sm"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Courses */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Courses</h2>
          {dashboardData?.courseStats?.slice(0, 5).map((course) => (
            <div key={course._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{course.title}</p>
                <p className="text-sm text-gray-600">
                  Enrollments: {course.enrollmentCount}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder card (reserved for future admin tooling) */}
      <Link
        to="#"
        className="card hover:shadow-md transition-shadow duration-200"
      >
        <div className="text-center">
          <DocumentCheckIcon className="h-12 w-12 mx-auto text-orange-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Course Management</h3>
          <p className="text-sm text-gray-600 mt-2">
            Create and manage courses and materials
          </p>
        </div>
      </Link>
    </div>
  );
};

export default AdminDashboard;