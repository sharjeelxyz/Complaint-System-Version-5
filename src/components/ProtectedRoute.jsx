// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function StudentRoute({ children }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  if (userProfile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/admin" replace />;
  if (userProfile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
