import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // =========================
  // Show Loading While Checking Auth
  // =========================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1>Loading...</h1>
      </div>
    );
  }

  // =========================
  // Redirect if User Not Logged In
  // =========================
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // =========================
  // Allow Access
  // =========================
  return children;
};

export default ProtectedRoute;