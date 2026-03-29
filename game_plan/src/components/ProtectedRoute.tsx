import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, guestUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Allow access if either authenticated or guest
  if (!user && !guestUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
