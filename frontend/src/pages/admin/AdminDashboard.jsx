import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';

const StatCard = ({ label, value, color }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color}`}>
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/results/analytics')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">2025/2026 Entrance Examination</h2>
        <p className="text-gray-500 text-sm">Great Khilafat College — CBT System Overview</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading statistics...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Registered" value={stats?.totalRegistered} color="border-blue-400" />
          <StatCard label="Total Present" value={stats?.totalPresent} color="border-green-400" />
          <StatCard label="Submitted" value={stats?.totalSubmitted} color="border-brand-green" />
          <StatCard label="Still Active" value={stats?.totalActive} color="border-yellow-400" />
          <StatCard label="Absent" value={stats?.totalAbsent} color="border-red-400" />
          <StatCard label="Highest Score" value={stats?.highestScore != null ? `${stats.highestScore}%` : null} color="border-purple-400" />
          <StatCard label="Lowest Score" value={stats?.lowestScore != null ? `${stats.lowestScore}%` : null} color="border-orange-400" />
          <StatCard label="Average Score" value={stats?.averageScore != null ? `${stats.averageScore}%` : null} color="border-teal-400" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Quick Links</h3>
          <div className="space-y-2">
            {[
              { href: '/admin/students', label: '👥 Register / Manage Candidates' },
              { href: '/admin/subjects', label: '📚 Manage Subjects' },
              { href: '/admin/questions', label: '❓ Add / Edit Questions' },
              { href: '/admin/monitor', label: '🔴 Live Exam Monitor' },
              { href: '/admin/results', label: '📋 View & Export Results' },
            ].map((l) => (
              <a key={l.href} href={l.href} className="block px-4 py-3 rounded-xl bg-gray-50 hover:bg-brand-light text-sm text-gray-700 font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-brand-dark text-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">System Info</h3>
          <div className="space-y-2 text-sm text-green-200">
            <p>🏫 Great Khilafat College</p>
            <p>📍 81B, Simpson Street, Yaba, Lagos</p>
            <p>📞 09068842565, 08023339691</p>
            <p>✉️ greatkhilafatcollege@gmail.com</p>
            <p>📅 Examination Year: 2025/2026</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}