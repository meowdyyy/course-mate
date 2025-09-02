import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TrophyIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';

const CoursePerformance = () => {
  const { id } = useParams();
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPerformanceData();
  }, [id]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/courses/${id}/performance`);
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setError(error.response?.data?.message || 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (value, thresholds = { good: 80, fair: 60 }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.fair) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceColorBg = (value, thresholds = { good: 80, fair: 60 }) => {
    if (value >= thresholds.good) return 'bg-green-100';
    if (value >= thresholds.fair) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">
          No performance data available for this course.
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Students',
      value: performanceData.totalStudents,
      icon: UserGroupIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      name: 'Completion Rate',
      value: `${performanceData.completionRate}%`,
      icon: TrophyIcon,
      color: getPerformanceColor(performanceData.completionRate),
      bg: getPerformanceColorBg(performanceData.completionRate)
    },
    {
      name: 'Submission Rate', 
      value: `${performanceData.submissionRate}%`,
      icon: DocumentTextIcon,
      color: getPerformanceColor(performanceData.submissionRate),
      bg: getPerformanceColorBg(performanceData.submissionRate)
    },
    {
      name: 'Average Grade',
      value: `${performanceData.averageGrade}%`,
      icon: ChartBarIcon,
      color: getPerformanceColor(performanceData.averageGrade),
      bg: getPerformanceColorBg(performanceData.averageGrade)
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            to="/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Course Performance</h1>
        <p className="mt-2 text-xl text-gray-600">{performanceData.courseTitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assignment Performance */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Performance</h2>
          {performanceData.assignmentStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No assignments available</p>
          ) : (
            <div className="space-y-4">
              {performanceData.assignmentStats.map((assignment) => (
                <div key={assignment.assignmentId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                    <span className="text-sm text-gray-500">
                      {assignment.totalSubmissions} submissions
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Submission Rate</span>
                        <span className={`font-medium ${getPerformanceColor(assignment.submissionRate)}`}>
                          {assignment.submissionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getPerformanceColor(assignment.submissionRate) === 'text-green-600' ? 'bg-green-500' :
                            getPerformanceColor(assignment.submissionRate) === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${assignment.submissionRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Avg Grade</span>
                        <span className={`font-medium ${getPerformanceColor(assignment.averageGrade)}`}>
                          {assignment.averageGrade.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getPerformanceColor(assignment.averageGrade) === 'text-green-600' ? 'bg-green-500' :
                            getPerformanceColor(assignment.averageGrade) === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${assignment.averageGrade}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h2>
          <div className="space-y-4">
            {Object.entries(performanceData.gradeDistribution).map(([grade, count]) => {
              const total = Object.values(performanceData.gradeDistribution).reduce((sum, c) => sum + c, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={grade} className="flex items-center">
                  <div className="w-8 text-sm font-medium text-gray-900">{grade}</div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full ${
                          grade === 'A' ? 'bg-green-500' :
                          grade === 'B' ? 'bg-blue-500' :
                          grade === 'C' ? 'bg-yellow-500' :
                          grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 w-16 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {performanceData.recentActivity.recentSubmissions}
            </div>
            <div className="text-sm text-gray-600">New Submissions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {performanceData.recentActivity.newEnrollments}
            </div>
            <div className="text-sm text-gray-600">New Enrollments</div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="mt-8 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h2>
        <div className="space-y-3">
          {performanceData.completionRate < 60 && (
            <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>Low Completion Rate:</strong> Consider reviewing assignment difficulty or providing additional support materials.
                </p>
              </div>
            </div>
          )}
          
          {performanceData.submissionRate < 70 && (
            <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Low Submission Rate:</strong> Students may need reminders about deadlines or clearer assignment instructions.
                </p>
              </div>
            </div>
          )}
          
          {performanceData.averageSatisfaction >= 4.0 && (
            <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>Excellent Performance:</strong> Students are performing well and showing high satisfaction with the course.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePerformance;
