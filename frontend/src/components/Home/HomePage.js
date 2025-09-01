import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  BookOpenIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    totalEnrollments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    try {
      const response = await axios.get('/api/analytics/public');
  //Pick only implemented stats
  const { totalStudents = 0, activeCourses = 0, totalEnrollments = 0 } = response.data || {};
  setPlatformStats({ totalStudents, activeCourses, totalEnrollments });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      //Keep default values if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K+`;
    }
    return num.toString();
  };

  const features = [
    {
      icon: BookOpenIcon,
      title: 'Course Management',
      description: 'Create courses, upload materials, and view course performance.',
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: UserGroupIcon,
      title: 'User Management',
      description: 'Admin dashboard for managing students and roles.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Messaging',
      description: 'Real-time chat between users inside the platform.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
    {
      icon: BellIcon,
      title: 'Notifications',
      description: 'In-app notifications for key course events.',
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }
  ];

  const benefits = [
    'Course creation & enrollment workflow',
    'Material uploads & resource browsing',
    'Real-time chat messaging',
    'In-app notifications',
    'Role-based access (admin & student)',
    'Responsive interface'
  ];
  const pricingPlans = [];
  const testimonials = [];
  const securityFeatures = [];
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
  <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">CourseMate</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-primary-600">Features</a>
              <a href="#benefits" className="text-gray-700 hover:text-primary-600">Overview</a>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">Welcome, {user.firstName}!</span>
                  <Link to="/dashboard" className="btn btn-primary">
                    Enter App
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="text-gray-700 hover:text-gray-900">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
  <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Course & Enrollment Platform
                <span className="block text-gray-300">Focused on what works today</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-400 leading-relaxed">
                Manage courses, enroll students, share materials, chat in real-time, and receive in‑app notifications.
              </p>
              
              {!user && (
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link to="/register" className="btn bg-white text-black hover:bg-gray-100 text-lg px-8 py-4 shadow-lg flex items-center justify-center">
                    Start Free Account
                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                  </Link>
                  {/* no public demo route */}
                </div>
              )}
              <div className="flex items-center space-x-8 text-gray-400">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  <span>Free for students</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-lg shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-primary-600 rounded w-32"></div>
                    <div className="h-4 bg-green-500 rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-100 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">95%</div>
                    <div className="text-sm text-gray-600">Satisfaction</div>
                  </div>
                  <div className="bg-green-100 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">10K+</div>
                    <div className="text-sm text-gray-600">Students</div>
                  </div>
                  <div className="bg-purple-100 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">500+</div>
                    <div className="text-sm text-gray-600">Courses</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Platform
            </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful tools designed for students and administrators to enhance the learning experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
                  <div className={`${feature.bg} rounded-lg p-3 w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

  {/* Security section removed to avoid listing unimplemented guarantees */}

  {/* Benefits Section with Statistics */}
  <section id="benefits" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose CourseMate?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our platform is built by educators, for educators. We understand the challenges of modern education 
                and provide solutions that actually work.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Platform Statistics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
      <div className="text-4xl font-bold text-black mb-2">
                    {loading ? '...' : formatNumber(platformStats.activeCourses)}
                  </div>
                  <div className="text-gray-600">Active Courses</div>
                </div>
                <div className="text-center">
      <div className="text-4xl font-bold text-black mb-2">
                    {loading ? '...' : formatNumber(platformStats.totalStudents)}
                  </div>
                  <div className="text-gray-600">Students</div>
                </div>
                {/* Removed satisfaction, support availability, uptime (not explicitly implemented) */}
                <div className="text-center">
      <div className="text-4xl font-bold text-black mb-2">
                    {loading ? '...' : formatNumber(platformStats.totalEnrollments)}
                  </div>
                  <div className="text-gray-600">Total Enrollments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

  {/* Pricing section removed (no billing implementation) */}

  {/* Testimonials removed until real feedback available */}

  {/* FAQ removed (several items referenced unimplemented features) */}

      {/* CTA Section */}
  <section className="bg-primary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Educational Experience?
          </h2>
          <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
            Join educators and students using our platform to streamline course management, 
            improve learning outcomes, and enhance educational engagement.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-4 shadow-lg">
                Create Free Account
              </Link>
              <button className="btn border-white text-white hover:bg-white hover:text-primary-600 text-lg px-8 py-4">
                Contact Support
              </button>
            </div>
          )}
          
          <div className="mt-8 flex items-center justify-center space-x-8 text-primary-200">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span>Free student accounts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-6 md:mb-0">
              <BookOpenIcon className="h-8 w-8 text-primary-400" />
              <span className="ml-2 text-xl font-bold">CourseMate</span>
            </div>
            <div className="flex space-x-6 text-gray-400 text-sm">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#benefits" className="hover:text-white">Overview</a>
              <Link to="/login" className="hover:text-white">Sign In</Link>
              <Link to="/register" className="hover:text-white">Register</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
            &copy; {currentYear} CourseMate. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
