import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout Components
import Layout from './components/Layout/Layout';
import PublicLayout from './components/Layout/PublicLayout';

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';


// Feature Components
import CourseList from './components/Courses/CourseList';
import CourseDetail from './components/Courses/CourseDetail';
import CourseMaterials from './components/Courses/CourseMaterials';


// Loading Component
import LoadingSpinner from './components/Common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  const PublicRoute = ({ children }) => {
    // Prevent update loop: only redirect if not loading and user exists
    if (!loading && user) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={
            <PublicRoute>
              <PublicLayout>
                <Login />
              </PublicLayout>
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <PublicLayout>
                <Register />
              </PublicLayout>
            </PublicRoute>
          } />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                {getDashboard()}
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/courses" element={
            <ProtectedRoute>
              <Layout>
                <CourseList />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/courses/:id" element={
            <ProtectedRoute>
              <Layout>
                <CourseDetail />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/courses/:id/materials" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <CourseMaterials />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/courses/:id/performance" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <CoursePerformance />
              </Layout>
            </ProtectedRoute>
          } />

          
          {/* Default Route */}
          <Route path="/" element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } />

          {/* 404 Route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">404</h1>
                <p className="text-gray-600 mt-2">Page not found</p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
