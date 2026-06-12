import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import StudentLogin from './pages/candidate/StudentLogin';
import ExamLobby from './pages/candidate/ExamLobby';
import ExamRoom from './pages/candidate/ExamRoom';
import ExamSubmitted from './pages/candidate/ExamSubmitted';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminMonitor from './pages/admin/AdminMonitor';
import AdminResults from './pages/admin/AdminResults';
import AdminSubjects from './pages/admin/AdminSubjects';

const AdminRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  return admin ? children : <Navigate to="/admin/login" replace />;
};

const StudentRoute = ({ children }) => {
  const { student, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  return student ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<StudentLogin />} />
      <Route path="/exam/lobby" element={<StudentRoute><ExamLobby /></StudentRoute>} />
      <Route path="/exam/room" element={<StudentRoute><ExamRoom /></StudentRoute>} />
      <Route path="/exam/submitted" element={<StudentRoute><ExamSubmitted /></StudentRoute>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
      <Route path="/admin/subjects" element={<AdminRoute><AdminSubjects /></AdminRoute>} />
      <Route path="/admin/questions" element={<AdminRoute><AdminQuestions /></AdminRoute>} />
      <Route path="/admin/monitor" element={<AdminRoute><AdminMonitor /></AdminRoute>} />
      <Route path="/admin/results" element={<AdminRoute><AdminResults /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}