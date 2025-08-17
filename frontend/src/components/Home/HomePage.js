import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  BookOpenIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  StarIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  ChatBubbleLeftRightIcon,
  DocumentCheckIcon,
  BellIcon,
  LockClosedIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    satisfactionRate: 0,
    uptime: 99.9,
    supportAvailability: '24/7',
    totalEnrollments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    try {
      const response = await axios.get('/api/analytics/public');
      setPlatformStats(response.data);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      // Keep default values if fetch fails
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
      description: 'Create, manage, and organize courses with ease. Upload materials, set schedules, and track progress.',
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: UserGroupIcon,
      title: 'User Management',
      description: 'Manage students and administrators with role-based access control.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
  // Removed Assignment, Attendance, extensive Analytics features
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Communication Hub',
      description: 'Built-in messaging system for seamless communication between all stakeholders.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
  // Verification feature retired
    {
      icon: BellIcon,
      title: 'Smart Notifications',
      description: 'Stay updated with real-time notifications for deadlines, grades, and announcements.',
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }
  ];

  const benefits = [
    'Streamlined course enrollment and management',
  // Removed attendance and grading system benefits
  'Robust document handling for course materials',
    'Interactive messaging and communication tools',
    'Mobile-responsive design for any device',
    'Advanced analytics and performance insights',
    'Automated notification system',
    'Multi-role access control and permissions',
    'Cloud-based storage and backup'
  ];

  const pricingPlans = [
    {
      name: 'Student',
      price: 'Free',
      description: 'Perfect for individual students',
      features: [
        'Course enrollment',
  // Removed assignments/grades/attendance from student plan
  'Direct messaging with admins',
        'Mobile access'
      ],
      cta: 'Get Started',
      popular: false
    },
  // Legacy plan removed
    {
      name: 'Institution',
      price: 'Contact Us',
      description: 'For schools and universities',
      features: [
        'Unlimited users',
        'Advanced analytics',
        'User management dashboard',
        'Course approval workflow',
        'System administration',
        'Custom training'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const testimonials = [
  // Removed testimonials referencing assignments/grades/attendance
  ];

  const securityFeatures = [
    {
      icon: ShieldCheckIcon,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption and security protocols'
    },
    {
      icon: CloudIcon,
      title: 'Cloud Infrastructure',
      description: '99.9% uptime with automatic backups'
    },
    {
      icon: LockClosedIcon,
      title: 'Data Privacy',
      description: 'GDPR compliant with role-based access control'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile Ready',
      description: 'Fully responsive design for all devices'
    }
  ];

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
              <a href="#pricing" className="text-gray-700 hover:text-primary-600">Pricing</a>
              <a href="#testimonials" className="text-gray-700 hover:text-primary-600">Reviews</a>
              <a href="#security" className="text-gray-700 hover:text-primary-600">Security</a>
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
                Streamlined Course Platform
                <span className="block text-gray-300">Focused & Modern</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-400 leading-relaxed">
                Manage courses, enrollments, resources and collaborate via real-time chat in a clean, distraction-free interface.
              </p>
              
              {!user && (
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link to="/register" className="btn bg-white text-black hover:bg-gray-100 text-lg px-8 py-4 shadow-lg flex items-center justify-center">
                    Start Free Account
                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                  </Link>
                  <button className="btn border border-white text-white hover:bg-white hover:text-black text-lg px-8 py-4 flex items-center justify-center">
                    <PlayIcon className="h-5 w-5 mr-2" />
                    View Demo
                  </button>
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

      {/* Security & Trust Section */}
      <section id="security" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built with Security & Trust in Mind
            </h2>
            <p className="text-xl text-gray-600">
              Your data is protected with enterprise-grade security measures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-md">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section with Statistics */}
      <section className="bg-white py-20">
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
                <div className="text-center">
      <div className="text-4xl font-bold text-black mb-2">
                    {loading ? '...' : `${platformStats.satisfactionRate}%`}
                  </div>
                  <div className="text-gray-600">Satisfaction Rate</div>
                </div>
                <div className="text-center">
      <div className="text-4xl font-bold text-black mb-2">
                    {platformStats.supportAvailability}
                  </div>
                  <div className="text-gray-600">Support</div>
                </div>
                <div className="text-center">
      <div className="text-4xl font-bold text-black mb-2">
                    {platformStats.uptime}%
                  </div>
                  <div className="text-gray-600">Uptime</div>
                </div>
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

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-lg p-8 relative ${plan.popular ? 'border-2 border-primary-500 transform scale-105' : 'border border-gray-200'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.price !== 'Free' && <span className="text-gray-600">/month</span>}
                  </div>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.popular 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied educators and students worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-primary-600">{testimonial.institution}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our Course Management System.
            </p>
          </div>

          <div className="space-y-6">
            {[{
              question: "Is the platform really free for students?",
              answer: "Yes! Students can register, enroll in courses, submit assignments, and track their progress completely free."
            },
            {
              question: "Who can create courses?",
              answer: "Only administrators can create and manage courses to ensure quality and consistency."
            },
            {
              question: "Can I track my attendance?",
              answer: "Yes! Students can view their attendance records, and the system automatically calculates attendance percentages."
            },
            {
              question: "How secure is student data?",
              answer: "We use enterprise-grade security with encryption, role-based access control, and comply with data protection regulations to keep all information safe."
            },
            {
              question: "Can I integrate existing course materials?",
              answer: "Yes, admins can upload PDFs, videos, and other course materials. The system supports multiple file formats for comprehensive course content."
            }].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span>Secure & reliable</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <BookOpenIcon className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">CourseMate</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Modern course management platform designed for the future of education. 
                Empowering educators and students worldwide.
              </p>
              <div className="flex space-x-4">
                {/* Social media icons would go here */}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><Link to="/security" className="hover:text-white">Security</Link></li>
                <li><Link to="/integrations" className="hover:text-white">Integrations</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/documentation" className="hover:text-white">Documentation</Link></li>
                <li><Link to="/community" className="hover:text-white">Community</Link></li>
                <li><Link to="/status" className="hover:text-white">System Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">&copy; {currentYear} CourseMate. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm">Terms of Service</Link>
              <Link to="/cookies" className="text-gray-400 hover:text-white text-sm">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
