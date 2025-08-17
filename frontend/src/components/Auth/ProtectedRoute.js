import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../UI/LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Redirect to home page instead of login for better UX
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if the user's role is allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;