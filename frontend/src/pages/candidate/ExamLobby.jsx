import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ExamLobby() {
  const { student } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/exam/start');
      navigate('/exam/room');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        <div className="bg-green-700 text-white rounded-xl p-4 mb-6">
          <p className="text-sm opacity-80">Candidate</p>
          <p className="text-xl font-bold">{student?.fullName}</p>
          <p className="text-sm font-mono opacity-90">{student?.studentId}</p>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-4">Examination Instructions</h2>
        <div className="space-y-3 text-sm text-gray-600 mb-8">
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">1.</span>
            <p>This examination consists of <strong>3 subjects</strong>. You may navigate between subjects freely.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">2.</span>
            <p>The duration is <strong>2 hours</strong>. The timer starts when you click START EXAM.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">3.</span>
            <p>Your answers are <strong>saved automatically</strong> after every selection.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">4.</span>
            <p>The exam will submit automatically when the timer reaches zero.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">5.</span>
            <p>Do <strong>NOT</strong> switch tabs or exit full screen. These activities are monitored.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">6.</span>
            <p>You can <strong>flag questions</strong> you are unsure about and return to them later.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-700 font-bold">7.</span>
            <p>Once submitted, you <strong>cannot</strong> re-enter the examination.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-8 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-green-500"></div> Answered</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-yellow-400"></div> Visited</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-gray-200"></div> Not Visited</div>
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-purple-500"></div> Flagged</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 bg-green-700 text-white text-lg font-bold rounded-xl hover:bg-green-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? 'Loading Examination...' : '▶  START EXAM'}
        </button>
      </div>
    </div>
  );
}