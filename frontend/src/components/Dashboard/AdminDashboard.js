import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  UserGroupIcon, 
  BookOpenIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/analytics/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = [
    { name: 'Total Users', value: dashboardData?.totalUsers || 0, icon: UserGroupIcon },
    { name: 'Active Courses', value: dashboardData?.activeCourses || 0, icon: BookOpenIcon },
    { name: 'Total Enrollments', value: dashboardData?.totalEnrollments || 0, icon: ChartBarIcon },
    { name: 'Pending Approvals', value: dashboardData?.pendingApprovals || 0, icon: ClockIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-black rounded-lg p-6 text-white">
        <p className="text-sm text-gray-200">
          Administrative overview: users, courses, performance.
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-lg font-semibold text-green-600">Online</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Server Load</p>
              <p className="text-lg font-semibold text-blue-600">Normal</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Issues</p>
              <p className="text-lg font-semibold text-yellow-600">0 Open</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-lg p-3">
                  <Icon className="h-6 w-6 text-black" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Management Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/admin/users"
          className="card hover:shadow-md transition-shadow duration-200"
        >
          <div className="text-center">
            <UserGroupIcon className="h-12 w-12 mx-auto text-black mb-4" />
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
            <p className="text-sm text-gray-600 mt-2">
              Manage student and instructor accounts
            </p>
          </div>
        </Link>

        <Link
          to="/courses"
          className="card hover:shadow-md transition-shadow duration-200"
        >
          <div className="text-center">
            <BookOpenIcon className="h-12 w-12 mx-auto text-black mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Course Management</h3>
            <p className="text-sm text-gray-600 mt-2">
              Approve and manage all courses
            </p>
          </div>
        </Link>

        <Link
          to="/admin/analytics"
          className="card hover:shadow-md transition-shadow duration-200"
        >
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto text-black mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-600 mt-2">
              View detailed system analytics
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent User Registrations</h2>
          {dashboardData?.recentEnrollments?.slice(0, 5).map((enrollment) => (
            <div key={enrollment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
              <div>
                <p className="font-medium text-gray-900">
                  {enrollment.student?.firstName} {enrollment.student?.lastName}
                </p>
                <p className="text-sm text-gray-600">Student</p>
              </div>
              <p className="text-sm text-gray-500">
                {formatDate(enrollment.enrollmentDate)}
              </p>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Courses</h2>
          {dashboardData?.courseStats?.slice(0, 5).map((course) => (
            <div key={course._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
              <div>
                <p className="font-medium text-gray-900">{course.title}</p>
                <p className="text-sm text-gray-600">{course.currentEnrollment} enrolled</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
