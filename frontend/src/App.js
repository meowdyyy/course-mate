import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

//Layout Components
import Layout from './components/Layout/Layout';
import PublicLayout from './components/Layout/PublicLayout';

//Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

//Dashboard Components
import StudentDashboard from './components/Dashboard/StudentDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';

//Feature Components
import CourseList from './components/Courses/CourseList';
import CourseDetail from './components/Courses/CourseDetail';
import CourseMaterials from './components/Courses/CourseMaterials';
import CreateCourse from './components/Courses/CreateCourse';
import CoursePerformance from './components/Courses/CoursePerformance';
import ResourceBrowser from './components/Courses/ResourceBrowser';
import Flashcards from './components/Courses/Flashcards';
import MCQQuiz from './components/Courses/MCQQuiz';
import MCQResults from './components/Courses/MCQResults';
import MyEnrollments from './components/Enrollments/MyEnrollments';
import Chat from './components/Messages/Chat';
import Profile from './components/Profile/Profile';
import UserManagement from './components/Admin/UserManagement';
import HomePage from './components/Home/HomePage';
import TodoList from './components/Todo/TodoList';
import CompletedTimeline from './components/Todo/CompletedTimeline';
import FocusMode from './components/Focus/FocusMode';
import GamificationTest from './components/Dev/GamificationTest';

//Loading Component
import LoadingSpinner from './components/Common/LoadingSpinner';
import { NotificationProvider } from './context/NotificationContext';
import { FocusTimerProvider } from './context/FocusTimerContext';
import TimerNotificationStrip from './components/Focus/TimerNotificationStrip';

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
    //Prevent update loop: only redirect if not loading and user exists
    if (!loading && user) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  const getDashboard = () => {
    switch (user?.role) {
      case 'student':
        return <StudentDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <NotificationProvider>
      <FocusTimerProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <TimerNotificationStrip />
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

          <Route path="/courses/:id/flashcards" element={
            <ProtectedRoute allowedRoles={['student','admin']}>
              <Layout>
                <Flashcards />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/courses/:id/quiz" element={
            <ProtectedRoute allowedRoles={['student','admin']}>
              <Layout>
                <MCQQuiz />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/courses/:id/quiz/results" element={
            <ProtectedRoute allowedRoles={['student','admin']}>
              <Layout>
                <MCQResults />
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

          <Route path="/create-course" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <CreateCourse />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/my-courses" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Layout>
                <MyEnrollments />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Removed routes: /assignments, /assignments/:id, /assignments/:id/submissions, /attendance, /grades */}

          <Route path="/chat" element={
            <ProtectedRoute>
              <Layout>
                <Chat />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/resources" element={
            <ProtectedRoute>
              <Layout>
                <ResourceBrowser />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/todos" element={
            <ProtectedRoute>
              <Layout>
                <TodoList />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/todos/completed" element={
            <ProtectedRoute>
              <Layout>
                <CompletedTimeline />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/focus" element={
            <ProtectedRoute>
              <Layout>
                <FocusMode />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Dev/Test Route: Gamification Tester */}
          <Route path="/dev/gamification" element={
            <ProtectedRoute>
              <Layout>
                <GamificationTest />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Legacy verification/document upload routes removed */}

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
    </FocusTimerProvider>
    </NotificationProvider>
  );
}

export default App;
