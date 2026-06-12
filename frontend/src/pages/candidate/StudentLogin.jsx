import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function StudentLogin() {
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { studentLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) return setError('Please enter your Student ID');

    setLoading(true);
    setError('');
    try {
      const data = await studentLogin(studentId.trim());
      if (data.session.status === 'active' || data.session.status === 'disconnected') {
        navigate('/exam/room');
      } else {
        navigate('/exam/lobby');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-brand-green to-green-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-green flex items-center justify-center">
            <span className="text-white font-bold text-xl">GKC</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Candidate Login</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your Student ID to access the examination</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              placeholder="GKC/EE/26/0001"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Proceed to Examination'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Forgot your Student ID? Contact the examination administrator.
        </p>
      </div>
    </div>
  );
}