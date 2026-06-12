import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    submitted: 'bg-blue-100 text-blue-700',
    registered: 'bg-gray-100 text-gray-600',
    disconnected: 'bg-red-100 text-red-700',
    absent: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.registered}`}>
      {status}
    </span>
  );
};

export default function AdminMonitor() {
  const [students, setStudents] = useState([]);
  const [liveUpdates, setLiveUpdates] = useState({});  // studentId -> live data
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const socketRef = useRef(null);
  const alertsEndRef = useRef(null);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/students');
      setStudents(data);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 30000); // auto-refresh every 30s

    // Socket.IO
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current.emit('admin:join');

    socketRef.current.on('candidate:status', (data) => {
      setLiveUpdates((prev) => ({
        ...prev,
        [data.student?.studentId]: { ...data, timestamp: new Date() },
      }));
    });

    socketRef.current.on('candidate:submitted', (data) => {
      setAlerts((prev) => [
        { type: 'submit', message: `${data.student?.fullName} (${data.student?.studentId}) submitted their exam`, time: new Date() },
        ...prev.slice(0, 49),
      ]);
      fetchStudents();
    });

    socketRef.current.on('candidate:security-alert', (data) => {
      setAlerts((prev) => [
        { type: 'security', message: `⚠️ ${data.student?.fullName}: ${data.event} — ${data.details || ''}`, time: new Date() },
        ...prev.slice(0, 49),
      ]);
    });

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    alertsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [alerts]);

  const totalRegistered = students.length;
  const totalSubmitted = students.filter((s) => s.examSubmitted).length;
  const totalPending = totalRegistered - totalSubmitted;

  return (
    <AdminLayout title="Live Monitor">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-blue-400 text-center">
          <p className="text-xs text-gray-400 mb-1">Registered</p>
          <p className="text-3xl font-bold text-gray-800">{totalRegistered}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-400 text-center">
          <p className="text-xs text-gray-400 mb-1">Submitted</p>
          <p className="text-3xl font-bold text-green-700">{totalSubmitted}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-yellow-400 text-center">
          <p className="text-xs text-gray-400 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{totalPending}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Candidate table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">All Candidates</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchStudents}
                className="px-3 py-1 text-xs bg-brand-light text-brand-green rounded-lg hover:bg-green-100 font-medium"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
          {loading ? (
            <p className="p-6 text-gray-400">Loading candidates...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Exam No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Live</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s) => {
                    const live = liveUpdates[s.studentId];
                    const status = s.examSubmitted ? 'submitted' : s.isActive ? 'registered' : 'absent';
                    return (
                      <tr key={s._id} className={`hover:bg-gray-50 ${live ? 'bg-green-50/30' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-brand-green font-semibold">
                          {s.studentId}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{s.fullName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {live ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {!students.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        No candidates registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live alerts feed */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="font-semibold text-gray-700">Live Activity Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-96 p-4 space-y-2">
            {alerts.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-4">
                Waiting for live events...<br />
                Events will appear here as candidates log in and take the exam.
              </p>
            )}
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-xs ${
                  alert.type === 'security'
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-green-50 text-green-700 border border-green-100'
                }`}
              >
                <p className="leading-relaxed">{alert.message}</p>
                <p className="text-gray-400 mt-1">{alert.time.toLocaleTimeString()}</p>
              </div>
            ))}
            <div ref={alertsEndRef} />
          </div>
          {alerts.length > 0 && (
            <div className="p-3 border-t">
              <button
                onClick={() => setAlerts([])}
                className="w-full py-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear feed
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}