import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';

const emptyForm = { fullName: '', gender: 'Male', phone: '', email: '', dateOfBirth: '', classSeekingAdmission: '' };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activityStudent, setActivityStudent] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const fetchStudents = () => {
    api.get('/students')
      .then(({ data }) => setStudents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/students', form);
      setSuccess(`Student registered: ${data.student.studentId}`);
      setForm(emptyForm);
      setShowForm(false);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name} and all their exam data? This cannot be undone.`)) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleReset = async (id, name) => {
    if (!confirm(`Reset exam access for ${name}? They will be able to retake the exam.`)) return;
    try {
      await api.post(`/students/${id}/reset-exam`);
      fetchStudents();
      alert('Exam access reset successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Reset failed');
    }
  };

  const handleToggleAccess = async (id) => {
    try {
      await api.post(`/students/${id}/toggle-access`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  const showActivity = async (student) => {
    setActivityStudent(student);
    const { data } = await api.get(`/students/${student._id}/activity-log`);
    setActivityLogs(data);
  };

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Candidates">
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>}

      {/* Actions bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, ID or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
        <button
          onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
          className="px-5 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors"
        >
          + Register Candidate
        </button>
      </div>

      {/* Registration form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">New Candidate Registration</h3>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gender *</label>
              <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class Seeking Admission Into</label>
              <input value={form.classSeekingAdmission} onChange={(e) => setForm({ ...form, classSeekingAdmission: e.target.value })}
                placeholder="e.g. JSS 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-60">
                {saving ? 'Registering...' : 'Register Candidate'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">All Candidates ({filtered.length})</h3>
        </div>
        {loading ? (
          <p className="p-6 text-gray-400">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Exam No</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-green font-semibold">{s.studentId}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{s.gender}</td>
                    <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                    <td className="px-4 py-3">
                      {s.examSubmitted
                        ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Submitted</span>
                        : <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => showActivity(s)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Log</button>
                        <button onClick={() => handleReset(s._id, s.fullName)}
                          className="px-2 py-1 text-xs bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100">Reset</button>
                        <button onClick={() => handleToggleAccess(s._id)}
                          className={`px-2 py-1 text-xs rounded ${s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {s.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDelete(s._id, s.fullName)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No candidates found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity log modal */}
      {activityStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Activity Log — {activityStudent.fullName}</h3>
              <button onClick={() => setActivityStudent(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-2">
              {activityLogs.map((log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-gray-700">{log.action}</span>
                  {log.details && <span className="text-gray-400 text-xs">{log.details}</span>}
                </div>
              ))}
              {!activityLogs.length && <p className="text-gray-400 text-sm">No activity recorded yet.</p>}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}