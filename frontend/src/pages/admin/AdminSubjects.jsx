import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';

const emptyForm = { name: '', code: '', obtainableMarks: 50, questionCount: 50, order: 0 };

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSubjects = () => {
    api.get('/subjects')
      .then(({ data }) => setSubjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openCreate = () => {
    setEditingSubject(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code,
      obtainableMarks: subject.obtainableMarks,
      questionCount: subject.questionCount,
      order: subject.order,
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, form);
        setSuccess('Subject updated successfully.');
      } else {
        await api.post('/subjects', form);
        setSuccess('Subject created successfully.');
      }
      setShowForm(false);
      fetchSubjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete subject "${name}"? All questions under it will also be deleted.`)) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSuccess('Subject deleted.');
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <AdminLayout title="Subjects">
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-500">
          Manage the subjects for this examination. Each subject has its own question pool and mark allocation.
        </p>
        <button
          onClick={openCreate}
          className="px-5 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors whitespace-nowrap ml-4"
        >
          + Add Subject
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">
            {editingSubject ? `Edit: ${editingSubject.name}` : 'New Subject'}
          </h3>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. English Studies & Verbal Aptitude"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject Code *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. ENG"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Number of Questions *
                <span className="text-gray-400 font-normal ml-1">(total questions in this subject)</span>
              </label>
              <input
                required
                type="number"
                min="1"
                value={form.questionCount}
                onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Obtainable Marks *
                <span className="text-gray-400 font-normal ml-1">(max score for this subject)</span>
              </label>
              <input
                required
                type="number"
                min="1"
                value={form.obtainableMarks}
                onChange={(e) => setForm({ ...form, obtainableMarks: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Display Order
                <span className="text-gray-400 font-normal ml-1">(1 = first tab in exam)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects list */}
      {loading ? (
        <p className="text-gray-400">Loading subjects...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-brand-light text-brand-green text-xs font-bold rounded mb-2">
                    {s.code}
                  </span>
                  <h3 className="font-semibold text-gray-800 text-sm leading-snug">{s.name}</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs text-gray-400">Questions</p>
                  <p className="text-lg font-bold text-gray-700">{s.questionCount}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs text-gray-400">Total Marks</p>
                  <p className="text-lg font-bold text-gray-700">{s.obtainableMarks}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s._id, s.name)}
                  className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!subjects.length && (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📚</p>
              <p>No subjects yet. Click "Add Subject" to create the first one.</p>
              <p className="text-xs mt-2">Tip: You can also run <code className="bg-gray-100 px-1 rounded">node utils/seedSubjects.js</code> to seed the 3 default GKC subjects.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}