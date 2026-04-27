// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StudentRoute, AdminRoute } from './components/ProtectedRoute';
import AuthPage        from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminLogin      from './pages/AdminLogin';
import AdminDashboard  from './pages/admin/AdminDashboard';

// Decides where to send the user when they hit "/"
function RootRedirect() {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <AuthPage />;
  if (userProfile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                element={<RootRedirect />} />
          <Route path="/dashboard"       element={<StudentRoute><StudentDashboard /></StudentRoute>} />
          <Route path="/admin"           element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
