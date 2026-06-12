import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';

const emptyForm = {
  subject: '',
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A',
  markAllocation: 1,
  order: '',
};

const OPTIONS = ['A', 'B', 'C', 'D'];

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState({});   // { questionImage, optionAImage, ... }
  const [previews, setPreviews] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    api.get('/subjects').then(({ data }) => {
      setSubjects(data);
      if (data.length > 0) setSelectedSubject(data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingQ(true);
    api.get(`/questions/subject/${selectedSubject}`)
      .then(({ data }) => setQuestions(data))
      .catch(() => {})
      .finally(() => setLoadingQ(false));
  }, [selectedSubject]);

  const openCreate = () => {
    setEditingQ(null);
    setForm({ ...emptyForm, subject: selectedSubject });
    setImages({});
    setPreviews({});
    setError('');
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEdit = (q) => {
    setEditingQ(q);
    setForm({
      subject: q.subject._id || q.subject,
      questionText: q.questionText || '',
      optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      markAllocation: q.markAllocation,
      order: q.order || '',
    });
    setImages({});
    setPreviews({});
    setError('');
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleImageChange = (field, file) => {
    if (!file) return;
    setImages((prev) => ({ ...prev, [field]: file }));
    const reader = new FileReader();
    reader.onload = (e) => setPreviews((prev) => ({ ...prev, [field]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.questionText && !images.questionImage && !(editingQ?.questionImage)) {
      return setError('Question must have either text or an image.');
    }
    setSaving(true);
    setError('');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    Object.entries(images).forEach(([k, v]) => fd.append(k, v));

    try {
      if (editingQ) {
        await api.put(`/questions/${editingQ._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Question updated.');
      } else {
        await api.post('/questions', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Question added.');
      }
      setShowForm(false);
      // Reload questions
      const { data } = await api.get(`/questions/subject/${selectedSubject}`);
      setQuestions(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      setSuccess('Question deleted.');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const activeSubject = subjects.find((s) => s._id === selectedSubject);

  return (
    <AdminLayout title="Questions">
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex justify-between">
          {success}
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Subject selector */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex gap-2 flex-wrap">
          {subjects.map((s) => (
            <button
              key={s._id}
              onClick={() => { setSelectedSubject(s._id); setShowForm(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedSubject === s._id
                  ? 'bg-brand-green text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {selectedSubject && (
          <button
            onClick={openCreate}
            className="ml-auto px-5 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            + Add Question
          </button>
        )}
      </div>

      {/* Subject stats */}
      {activeSubject && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">Subject:</span>
            <span className="font-semibold text-gray-800 ml-2">{activeSubject.name}</span>
          </div>
          <div>
            <span className="text-gray-500">Questions added:</span>
            <span className={`font-bold ml-2 ${questions.length >= activeSubject.questionCount ? 'text-green-600' : 'text-orange-500'}`}>
              {questions.length} / {activeSubject.questionCount}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Obtainable marks:</span>
            <span className="font-semibold text-gray-800 ml-2">{activeSubject.obtainableMarks}</span>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-5">
            {editingQ ? 'Edit Question' : 'New Question'}
          </h3>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Question text */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Question Text
                <span className="text-gray-400 font-normal ml-1">(leave blank if question is image-only)</span>
              </label>
              <textarea
                value={form.questionText}
                onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                rows={3}
                placeholder="Type the question here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
              />
            </div>

            {/* Question image */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Question Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange('questionImage', e.target.files[0])}
                className="text-sm text-gray-600"
              />
              {(previews.questionImage || editingQ?.questionImage) && (
                <img
                  src={previews.questionImage || editingQ.questionImage}
                  alt="Question preview"
                  className="mt-2 max-h-32 rounded-lg border"
                />
              )}
            </div>

            {/* Options */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Answer Options *
                <span className="text-gray-400 font-normal ml-1">(select the correct answer on the right)</span>
              </label>
              <div className="space-y-3">
                {OPTIONS.map((opt) => (
                  <div key={opt} className={`flex gap-3 items-start p-3 rounded-xl border-2 transition-colors ${
                    form.correctAnswer === opt ? 'border-green-400 bg-green-50' : 'border-gray-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, correctAnswer: opt })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                        form.correctAnswer === opt
                          ? 'bg-brand-green text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={`Mark ${opt} as correct`}
                    >
                      {opt}
                    </button>
                    <div className="flex-1 space-y-2">
                      <input
                        required
                        value={form[`option${opt}`]}
                        onChange={(e) => setForm({ ...form, [`option${opt}`]: e.target.value })}
                        placeholder={`Option ${opt} text`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(`option${opt}Image`, e.target.files[0])}
                          className="text-xs text-gray-500"
                        />
                        {(previews[`option${opt}Image`] || editingQ?.[`option${opt}Image`]) && (
                          <img
                            src={previews[`option${opt}Image`] || editingQ[`option${opt}Image`]}
                            alt={`Option ${opt}`}
                            className="h-10 rounded border"
                          />
                        )}
                      </div>
                    </div>
                    {form.correctAnswer === opt && (
                      <span className="text-green-600 text-xs font-bold self-center whitespace-nowrap">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mark allocation + order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Mark Allocation *
                </label>
                <input
                  required
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.markAllocation}
                  onChange={(e) => setForm({ ...form, markAllocation: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Display Order
                  <span className="text-gray-400 font-normal ml-1">(auto if blank)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingQ ? 'Update Question' : 'Add Question'}
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

      {/* Questions list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-700">
            {activeSubject?.name} — {questions.length} Question{questions.length !== 1 ? 's' : ''}
          </h3>
        </div>
        {loadingQ ? (
          <p className="p-6 text-gray-400">Loading questions...</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((q, idx) => (
              <div key={q._id} className="p-4 hover:bg-gray-50 flex gap-4">
                <span className="w-8 h-8 rounded-full bg-brand-light text-brand-green text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {q.questionText && (
                    <p className="text-sm text-gray-800 mb-1 line-clamp-2">{q.questionText}</p>
                  )}
                  {q.questionImage && (
                    <img src={q.questionImage} alt="Q" className="h-12 rounded border mb-1" />
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <span
                        key={opt}
                        className={`px-2 py-0.5 rounded ${
                          q.correctAnswer === opt
                            ? 'bg-green-100 text-green-700 font-bold'
                            : 'bg-gray-100'
                        }`}
                      >
                        {opt}: {q[`option${opt}`]}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                      {q.markAllocation} mark{q.markAllocation !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(q)}
                    className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(q._id)}
                    className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!questions.length && (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">❓</p>
                <p>No questions yet for this subject.</p>
                <p className="text-xs mt-1">Click "+ Add Question" to begin.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}