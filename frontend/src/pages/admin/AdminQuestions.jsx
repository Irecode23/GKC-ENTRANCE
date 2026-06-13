import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const emptyQuestion = {
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A',
  markAllocation: 1,
  order: '',
};

const OPTIONS = ['A', 'B', 'C', 'D'];

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['image'],
    ['clean'],
  ],
};

const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet', 'image'];

const isEmpty = (html) => !html || html.replace(/<[^>]+>/g, '').trim() === '';

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null); // group being edited
  const [activeSection, setActiveSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ name: '', instruction: '' });

  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [images, setImages] = useState({});
  const [previews, setPreviews] = useState({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef(null);
  const sectionFormRef = useRef(null);

  useEffect(() => {
    api.get('/subjects').then(({ data }) => {
      setSubjects(data);
      if (data.length > 0) setSelectedSubject(data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingQ(true);
    setActiveSection(null);
    setShowQuestionForm(false);
    setShowSectionForm(false);
    api.get(`/questions/subject/${selectedSubject}`)
      .then(({ data }) => setQuestions(data))
      .catch(() => {})
      .finally(() => setLoadingQ(false));
  }, [selectedSubject]);

  const reloadQuestions = async () => {
    const { data } = await api.get(`/questions/subject/${selectedSubject}`);
    setQuestions(data);
  };

  const groupedQuestions = () => {
    const groups = [];
    let currentSection = null;
    let currentGroup = [];
    questions.forEach((q) => {
      const section = q.section || '__none__';
      if (section !== currentSection) {
        if (currentGroup.length > 0) {
          groups.push({
            section: currentSection,
            instruction: currentGroup[0]?.sectionInstruction || '',
            questions: currentGroup,
          });
        }
        currentSection = section;
        currentGroup = [q];
      } else {
        currentGroup.push(q);
      }
    });
    if (currentGroup.length > 0) {
      groups.push({
        section: currentSection,
        instruction: currentGroup[0]?.sectionInstruction || '',
        questions: currentGroup,
      });
    }
    return groups;
  };

  const handleImageChange = (field, file) => {
    if (!file) return;
    setImages((prev) => ({ ...prev, [field]: file }));
    const reader = new FileReader();
    reader.onload = (e) => setPreviews((prev) => ({ ...prev, [field]: e.target.result }));
    reader.readAsDataURL(file);
  };

  // Open section form for NEW section
  const openSectionForm = () => {
    setEditingSection(null);
    setSectionForm({ name: '', instruction: '' });
    setShowSectionForm(true);
    setShowQuestionForm(false);
    setTimeout(() => sectionFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Open section form for EDITING existing section
  const openEditSection = (group) => {
    setEditingSection(group);
    setSectionForm({ name: group.section === '__none__' ? '' : group.section, instruction: group.instruction });
    setShowSectionForm(true);
    setShowQuestionForm(false);
    setTimeout(() => sectionFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Confirm section (new or edit)
  const confirmSection = async () => {
    if (!sectionForm.name.trim()) return setError('Section name is required');

    if (editingSection) {
      // Update all questions in this section with new name and instruction
      setSaving(true);
      try {
        const qIds = editingSection.questions.map((q) => q._id);
        await Promise.all(
          qIds.map((id) =>
            api.put(`/questions/${id}`, {
              section: sectionForm.name.trim(),
              sectionInstruction: sectionForm.instruction,
            })
          )
        );
        setSuccess('Section updated successfully.');
        await reloadQuestions();
      } catch {
        setError('Failed to update section.');
      } finally {
        setSaving(false);
      }
      setEditingSection(null);
    }

    setActiveSection({ name: sectionForm.name.trim(), instruction: sectionForm.instruction });
    setShowSectionForm(false);
    setShowQuestionForm(!editingSection); // only open question form for new section
    setQuestionForm(emptyQuestion);
    setImages({});
    setPreviews({});
    setError('');
    if (!editingSection) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Delete entire section and all its questions
  const handleDeleteSection = async (group) => {
    const count = group.questions.length;
    if (!confirm(`Delete "${group.section}" and all ${count} question(s) in it? This cannot be undone.`)) return;
    try {
      await Promise.all(group.questions.map((q) => api.delete(`/questions/${q._id}`)));
      setSuccess(`Section "${group.section}" and ${count} question(s) deleted.`);
      await reloadQuestions();
    } catch {
      setError('Failed to delete section.');
    }
  };

  const openEdit = (q) => {
    setEditingQ(q);
    setActiveSection({ name: q.section || '', instruction: q.sectionInstruction || '' });
    setQuestionForm({
      questionText: q.questionText || '',
      optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      markAllocation: q.markAllocation,
      order: q.order || '',
    });
    setImages({});
    setPreviews({});
    setError('');
    setShowQuestionForm(true);
    setShowSectionForm(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (isEmpty(questionForm.questionText) && !images.questionImage && !(editingQ?.questionImage)) {
      return setError('Question must have either text or an image.');
    }
    if (isEmpty(questionForm.optionA) || isEmpty(questionForm.optionB) ||
        isEmpty(questionForm.optionC) || isEmpty(questionForm.optionD)) {
      return setError('All four options are required.');
    }

    setSaving(true);
    setError('');

    const fd = new FormData();
    fd.append('subject', selectedSubject);
    fd.append('section', activeSection?.name || '');
    fd.append('sectionInstruction', activeSection?.instruction || '');
    fd.append('questionText', questionForm.questionText);
    fd.append('optionA', questionForm.optionA);
    fd.append('optionB', questionForm.optionB);
    fd.append('optionC', questionForm.optionC);
    fd.append('optionD', questionForm.optionD);
    fd.append('correctAnswer', questionForm.correctAnswer);
    fd.append('markAllocation', questionForm.markAllocation);
    if (questionForm.order) fd.append('order', questionForm.order);
    Object.entries(images).forEach(([k, v]) => fd.append(k, v));

    try {
      if (editingQ) {
        await api.put(`/questions/${editingQ._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSuccess('Question updated.');
        setEditingQ(null);
      } else {
        await api.post('/questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSuccess('Question added.');
      }
      setQuestionForm(emptyQuestion);
      setImages({});
      setPreviews({});
      await reloadQuestions();
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
  const groups = groupedQuestions();

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
              onClick={() => { setSelectedSubject(s._id); setShowSectionForm(false); setShowQuestionForm(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedSubject === s._id
                  ? 'bg-green-700 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={openSectionForm}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Add Section
          </button>
          <button
            onClick={() => {
              if (!activeSection) return setError('Please add a section first before adding questions.');
              setEditingQ(null);
              setQuestionForm(emptyQuestion);
              setImages({});
              setPreviews({});
              setError('');
              setShowQuestionForm(true);
              setShowSectionForm(false);
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }}
            className="px-5 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Subject stats */}
      {activeSubject && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 text-sm">
          <div><span className="text-gray-500">Subject:</span><span className="font-semibold text-gray-800 ml-2">{activeSubject.name}</span></div>
          <div>
            <span className="text-gray-500">Questions added:</span>
            <span className={`font-bold ml-2 ${questions.length >= activeSubject.questionCount ? 'text-green-600' : 'text-orange-500'}`}>
              {questions.length} / {activeSubject.questionCount}
            </span>
          </div>
          <div><span className="text-gray-500">Obtainable marks:</span><span className="font-semibold text-gray-800 ml-2">{activeSubject.obtainableMarks}</span></div>
          {activeSection && <div><span className="text-gray-500">Active section:</span><span className="font-semibold text-blue-700 ml-2">{activeSection.name}</span></div>}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between">
          {error}<button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Section form */}
      {showSectionForm && (
        <div ref={sectionFormRef} className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-blue-800 mb-4 text-base">
            {editingSection ? `Edit Section: ${editingSection.section}` : 'New Section'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Section Name *
              </label>
              <input
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                placeholder="e.g. Section A — Comprehension"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Section Instruction
                <span className="text-gray-400 font-normal ml-1">(optional — supports bold, italic, underline, and images)</span>
              </label>
              <ReactQuill
                theme="snow"
                value={sectionForm.instruction}
                onChange={(value) => setSectionForm({ ...sectionForm, instruction: value })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="e.g. Read the following passage carefully and answer the questions on it..."
                className="bg-white rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={confirmSection}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingSection ? 'Update Section' : 'Confirm Section → Add Questions'}
              </button>
              <button
                onClick={() => { setShowSectionForm(false); setEditingSection(null); }}
                className="px-6 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question form */}
      {showQuestionForm && (
        <div ref={formRef} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          {activeSection && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-500 font-medium">Adding question under:</p>
              <p className="text-blue-800 font-bold">{activeSection.name}</p>
              {!isEmpty(activeSection.instruction) && (
                <div className="text-blue-600 text-xs mt-1 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeSection.instruction }} />
              )}
            </div>
          )}

          <h3 className="font-bold text-gray-800 mb-5">{editingQ ? 'Edit Question' : 'New Question'}</h3>

          <form onSubmit={handleSubmitQuestion} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Question Text <span className="text-gray-400 font-normal">(supports bold, italic, underline)</span>
              </label>
              <ReactQuill theme="snow" value={questionForm.questionText}
                onChange={(value) => setQuestionForm({ ...questionForm, questionText: value })}
                modules={quillModules} formats={quillFormats}
                placeholder="Type the question here..." className="bg-white rounded-xl" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Question Image (optional)</label>
              <input type="file" accept="image/*"
                onChange={(e) => handleImageChange('questionImage', e.target.files[0])}
                className="text-sm text-gray-600" />
              {(previews.questionImage || editingQ?.questionImage) && (
                <img src={previews.questionImage || editingQ.questionImage} alt="Q preview"
                  className="mt-2 max-h-32 rounded-lg border" />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Answer Options * <span className="text-gray-400 font-normal">(click letter to mark correct)</span>
              </label>
              <div className="space-y-3">
                {OPTIONS.map((opt) => (
                  <div key={opt} className={`flex gap-3 items-start p-3 rounded-xl border-2 transition-colors ${
                    questionForm.correctAnswer === opt ? 'border-green-400 bg-green-50' : 'border-gray-200'
                  }`}>
                    <button type="button"
                      onClick={() => setQuestionForm({ ...questionForm, correctAnswer: opt })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        questionForm.correctAnswer === opt ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>{opt}</button>
                    <div className="flex-1 space-y-2">
                      <ReactQuill theme="snow" value={questionForm[`option${opt}`]}
                        onChange={(value) => setQuestionForm({ ...questionForm, [`option${opt}`]: value })}
                        modules={quillModules} formats={quillFormats}
                        placeholder={`Option ${opt} text`} className="bg-white rounded-lg" />
                      <div className="flex items-center gap-2 mt-1">
                        <input type="file" accept="image/*"
                          onChange={(e) => handleImageChange(`option${opt}Image`, e.target.files[0])}
                          className="text-xs text-gray-500" />
                        {(previews[`option${opt}Image`] || editingQ?.[`option${opt}Image`]) && (
                          <img src={previews[`option${opt}Image`] || editingQ[`option${opt}Image`]}
                            alt={`Option ${opt}`} className="h-10 rounded border" />
                        )}
                      </div>
                    </div>
                    {questionForm.correctAnswer === opt && (
                      <span className="text-green-600 text-xs font-bold self-center whitespace-nowrap">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mark Allocation *</label>
                <input required type="number" min="0.5" step="0.5" value={questionForm.markAllocation}
                  onChange={(e) => setQuestionForm({ ...questionForm, markAllocation: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Order <span className="text-gray-400 font-normal">(auto if blank)</span></label>
                <input type="number" min="1" value={questionForm.order}
                  onChange={(e) => setQuestionForm({ ...questionForm, order: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                {saving ? 'Saving...' : editingQ ? 'Update Question' : 'Save Question'}
              </button>
              {!editingQ && (
                <button type="button" onClick={openSectionForm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  + New Section
                </button>
              )}
              <button type="button" onClick={() => { setShowQuestionForm(false); setEditingQ(null); }}
                className="px-6 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions list grouped by section */}
      <div className="space-y-6">
        {loadingQ ? (
          <p className="text-gray-400">Loading questions...</p>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">❓</p>
            <p className="font-medium">No questions yet for this subject.</p>
            <p className="text-xs mt-1">Click "+ Add Section" to begin.</p>
          </div>
        ) : (
          groups.map((group, gIdx) => (
            <div key={gIdx} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Section header with edit and delete */}
              {group.section !== '__none__' && (
                <div className="bg-blue-600 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold">{group.section}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditSection(group)}
                        className="px-3 py-1 text-xs bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium"
                      >
                        ✏️ Edit Section
                      </button>
                      <button
                        onClick={() => handleDeleteSection(group)}
                        className="px-3 py-1 text-xs bg-red-500/80 text-white rounded-lg hover:bg-red-600 font-medium"
                      >
                        🗑 Delete Section
                      </button>
                    </div>
                  </div>
                  {!isEmpty(group.instruction) && (
                    <div className="text-blue-100 text-sm mt-2 prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: group.instruction }} />
                  )}
                </div>
              )}

              {/* Questions */}
              <div className="divide-y divide-gray-100">
                {group.questions.map((q) => {
                  const globalIdx = questions.findIndex((qq) => qq._id === q._id);
                  return (
                    <div key={q._id} className="p-4 hover:bg-gray-50 flex gap-4">
                      <span className="w-8 h-8 rounded-full bg-green-50 text-green-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {globalIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {q.questionText && (
                          <div className="text-sm text-gray-800 mb-1 line-clamp-2 prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: q.questionText }} />
                        )}
                        {q.questionImage && (
                          <img src={q.questionImage} alt="Q" className="h-12 rounded border mb-1" />
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <span key={opt} className={`px-2 py-0.5 rounded ${
                              q.correctAnswer === opt ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-100'
                            }`}>
                              {opt}:&nbsp;
                              <span dangerouslySetInnerHTML={{ __html: q[`option${opt}`]?.replace(/<[^>]+>/g, '') }} />
                            </span>
                          ))}
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                            {q.markAllocation} mark{q.markAllocation !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEdit(q)}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Edit</button>
                        <button onClick={() => handleDelete(q._id)}
                          className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add question to this section */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <button
                  onClick={() => {
                    setActiveSection({ name: group.section === '__none__' ? '' : group.section, instruction: group.instruction });
                    setEditingQ(null);
                    setQuestionForm(emptyQuestion);
                    setImages({});
                    setPreviews({});
                    setShowQuestionForm(true);
                    setShowSectionForm(false);
                    setError('');
                    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  className="text-xs text-green-700 font-semibold hover:underline"
                >
                  + Add question to {group.section === '__none__' ? 'this section' : group.section}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}