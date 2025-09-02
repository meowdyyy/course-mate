import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  BookOpenIcon, 
  InboxIcon,
  BellIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [enrollmentsRes, notificationsRes, conversationsRes, resourcesRes] = await Promise.all([
        axios.get(`/api/enrollments/student/${user._id}`),
        axios.get('/api/notifications'),
        axios.get('/api/chat/conversations'),
        axios.get('/api/courses/resources?limit=5')
      ]);
      //Sort conversations by last activity
      const conversations = [...conversationsRes.data].sort((a,b)=> new Date(b.lastMessage?.createdAt||b.updatedAt) - new Date(a.lastMessage?.createdAt||a.updatedAt));
      setDashboardData({
        enrollments: enrollmentsRes.data,
        notifications: notificationsRes.data,
        conversations,
        resources: resourcesRes.data
      });
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
    {
      name: 'Enrolled Courses',
      value: dashboardData?.enrollments?.length || 0,
      icon: BookOpenIcon,
      color: 'text-black',
      bg: 'bg-gray-200',
      href: '/my-courses'
    },
    {
      name: 'Unread Chats',
      value: (dashboardData?.conversations || []).reduce((sum,c)=> sum + (c.unread || 0), 0),
      icon: InboxIcon,
      color: 'text-black',
      bg: 'bg-gray-200',
      href: '/chat'
    },
    {
      name: 'Unread Notifications',
      value: dashboardData?.notifications?.unreadCount || 0,
      icon: BellIcon,
      color: 'text-black',
      bg: 'bg-gray-200',
      href: '#open-notifications'
    },
    {
      name: 'Approved Resources',
      value: dashboardData?.resources?.resources?.length || 0,
      icon: RectangleStackIcon,
      color: 'text-black',
      bg: 'bg-gray-200',
      href: '/resources'
    }
  ];

  //Derive recent courses (last 5 by enrollmentDate)
  const recentCourses = (dashboardData?.enrollments || [])
    .slice() // copy
    .sort((a,b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate))
    .slice(0,5);
  const recentChats = (dashboardData?.conversations || []).slice(0,5);
  const recentNotifications = dashboardData?.notifications?.notifications || [];
  const recentResources = dashboardData?.resources?.resources || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-black rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="mt-2 text-gray-300">
          Overview of your activity and resources.
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                onClick={() => {
                  if (stat.href === '#open-notifications') {
                    window.dispatchEvent(new Event('openNotifications'));
                  } else if (stat.href.startsWith('/')) {
                    window.location.href = stat.href;
                  }
                }}
                className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
              >
                <div className="flex items-center">
                  <div className={`${stat.bg} rounded-lg p-3`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Courses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Courses</h2>
            <Link to="/my-courses" className="text-sm text-black hover:underline">View all</Link>
          </div>
          {recentCourses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No enrollments yet</p>
          ) : (
            <div className="space-y-3">
              {recentCourses.map(enr => (
                <div key={enr._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{enr.course?.title}</p>
                    <p className="text-sm text-gray-600">{enr.course?.courseCode}</p>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(enr.enrollmentDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chats & Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chats & Notifications</h2>
            <div className="flex space-x-2">
              <Link to="/chat" className="text-sm text-black hover:underline">Open Chat</Link>
              <button onClick={()=>window.dispatchEvent(new Event('openNotifications'))} className="text-sm text-black hover:underline">Notifications</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center"><InboxIcon className="h-4 w-4 mr-1"/>Recent Chats</h3>
              {recentChats.length === 0 ? (
                <p className="text-xs text-gray-500">No conversations yet</p>
              ) : (
                <ul className="space-y-2">
                  {recentChats.map(c => {
                    const otherNames = c.participants.filter(p=>p._id!==user._id).map(p=>p.firstName).join(', ') || 'Group';
                    const content = c.lastMessage?.content || 'No messages';
                    return (
                      <li key={c._id} className="text-xs text-gray-700 truncate">
                        <span className="font-medium">{otherNames}:</span> {content}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center"><BellIcon className="h-4 w-4 mr-1"/>Notifications</h3>
              {recentNotifications.length === 0 ? (
                <p className="text-xs text-gray-500">No notifications</p>
              ) : (
                <ul className="space-y-2">
                  {recentNotifications.slice(0,5).map(n => (
                    <li key={n._id} className="text-xs text-gray-700 truncate">
                      {n.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Latest Approved Resources</h2>
            <Link to="/resources" className="text-sm text-black hover:underline">Browse</Link>
          </div>
          {recentResources.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No resources yet</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentResources.slice(0,6).map(r => (
                <div key={r._id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 truncate" title={r.title}>{r.title}</p>
                  <p className="text-xs text-gray-600 truncate">{r.courseCode}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{r.type} • {r.semester || 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
