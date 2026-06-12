import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
    }

    const studentData = sessionStorage.getItem('studentData');
    if (studentData) {
      setStudent(JSON.parse(studentData));
    }

    setLoading(false);
  }, []);

  const adminLogin = async (email, password) => {
    const { data } = await api.post('/auth/admin/login', { email, password });
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminData', JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data;
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setAdmin(null);
  };

  const studentLogin = async (studentId) => {
    const { data } = await api.post('/auth/student/login', { studentId });
    sessionStorage.setItem('studentId', studentId);
    sessionStorage.setItem('studentData', JSON.stringify(data.student));
    setStudent(data.student);
    return data;
  };

  const studentLogout = () => {
    sessionStorage.removeItem('studentId');
    sessionStorage.removeItem('studentData');
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{ admin, student, loading, adminLogin, adminLogout, studentLogin, studentLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);