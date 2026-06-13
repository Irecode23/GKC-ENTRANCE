import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Strip HTML to check if empty
const isEmpty = (html) => !html || html.replace(/<[^>]+>/g, '').trim() === '';

export default function ExamRoom() {
  const { student, studentLogout } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7200);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerMap, setAnswerMap] = useState({});
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // ── Security ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});

    const handleVisibilityChange = () => {
      if (document.hidden) logSecurityEvent('Tab Switched', 'Candidate switched tab or minimized');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) logSecurityEvent('Fullscreen Exit', 'Candidate exited full screen');
    };
    const prevent = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('paste', prevent);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('paste', prevent);
    };
  }, []);

  const logSecurityEvent = async (event, details) => {
    try {
      await api.post('/exam/security-event', { event, details });
      socketRef.current?.emit('candidate:security', { student, event, details });
    } catch {}
  };

  // ── Socket.IO ─────────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    return () => socketRef.current?.disconnect();
  }, []);

  // ── Load exam session ─────────────────────────────────────────
  useEffect(() => {
    const initExam = async () => {
      try {
        const { data } = await api.post('/exam/start');
        setSubjects(data.subjects);
        if (data.recovered && data.session.timeRemaining) {
          setTimeLeft(data.session.timeRemaining);
        } else {
          setTimeLeft(data.session.examDuration || 7200);
        }
        if (data.subjects.length > 0) {
          await loadSubjectQuestions(data.subjects[0]._id);
        }
      } catch (err) {
        console.error('Failed to init exam', err);
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, []);

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ── Load questions ────────────────────────────────────────────
  const loadSubjectQuestions = async (subjectId) => {
    try {
      const { data } = await api.get(`/exam/questions/${subjectId}`);
      setQuestions(data);
      setCurrentQIdx(0);
      const newMap = { ...answerMap };
      data.forEach((q) => {
        if (!newMap[q._id]) {
          newMap[q._id] = q.savedAnswer || { selectedOption: null, isFlagged: false, visitStatus: 'not_visited' };
        }
      });
      setAnswerMap(newMap);
    } catch (err) {
      console.error('Failed to load questions', err);
    }
  };

  const switchSubject = async (idx) => {
    setActiveSubjectIdx(idx);
    setCurrentQIdx(0);
    await loadSubjectQuestions(subjects[idx]._id);
  };

  // ── Answer handling ───────────────────────────────────────────
  const selectOption = (questionId, option) => {
    const updated = {
      ...answerMap,
      [questionId]: { ...answerMap[questionId], selectedOption: option, visitStatus: 'answered' },
    };
    setAnswerMap(updated);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswerToServer(questionId, option, updated[questionId]?.isFlagged, 'answered');
    }, 500);
  };

  const saveAnswerToServer = async (questionId, selectedOption, isFlagged, visitStatus) => {
    setSaving(true);
    try {
      await api.post('/exam/answer', { questionId, selectedOption, isFlagged, visitStatus });
      socketRef.current?.emit('candidate:update', {
        student,
        subjectId: subjects[activeSubjectIdx]?._id,
        currentQuestion: currentQIdx,
      });
    } catch {}
    setSaving(false);
  };

  const toggleFlag = (questionId) => {
    const current = answerMap[questionId] || {};
    const updated = { ...answerMap, [questionId]: { ...current, isFlagged: !current.isFlagged } };
    setAnswerMap(updated);
    saveAnswerToServer(questionId, current.selectedOption, !current.isFlagged, current.visitStatus);
  };

  const clearAnswer = (questionId) => {
    const current = answerMap[questionId] || {};
    const updated = { ...answerMap, [questionId]: { ...current, selectedOption: null, visitStatus: 'visited' } };
    setAnswerMap(updated);
    saveAnswerToServer(questionId, null, current.isFlagged, 'visited');
  };

  const goToQuestion = (idx) => {
    const q = questions[currentQIdx];
    if (q) {
      const current = answerMap[q._id] || {};
      if (current.visitStatus === 'not_visited') {
        const updated = { ...answerMap, [q._id]: { ...current, visitStatus: 'visited' } };
        setAnswerMap(updated);
        saveAnswerToServer(q._id, current.selectedOption, current.isFlagged, 'visited');
      }
    }
    setCurrentQIdx(idx);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/exam/submit', { autoSubmitted: false });
      socketRef.current?.emit('candidate:submit', { student });
      clearInterval(timerRef.current);
      studentLogout();
      navigate('/exam/submitted');
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    try {
      await api.post('/exam/submit', { autoSubmitted: true });
      socketRef.current?.emit('candidate:submit', { student });
      studentLogout();
      navigate('/exam/submitted');
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your examination...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIdx];
  const answeredCount = questions.filter((q) => answerMap[q._id]?.selectedOption).length;
  const timerColor = timeLeft < 600 ? 'text-red-500' : timeLeft < 1800 ? 'text-yellow-500' : 'text-green-400';

  const getPaletteStatus = (q) => {
    const ans = answerMap[q._id];
    if (!ans || ans.visitStatus === 'not_visited') return 'not-visited';
    if (ans.isFlagged) return 'flagged';
    if (ans.selectedOption) return 'answered';
    return 'visited';
  };

  // Group palette by section
  const getPaletteGroups = () => {
    const groups = [];
    let currentSection = null;
    let currentGroup = [];
    questions.forEach((q, idx) => {
      const section = q.section || '';
      if (section !== currentSection) {
        if (currentGroup.length > 0) groups.push({ section: currentSection, items: currentGroup });
        currentSection = section;
        currentGroup = [{ q, idx }];
      } else {
        currentGroup.push({ q, idx });
      }
    });
    if (currentGroup.length > 0) groups.push({ section: currentSection, items: currentGroup });
    return groups;
  };

  return (
    <div className="exam-mode min-h-screen bg-gray-100 flex flex-col select-none">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="bg-green-800 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div>
          <p className="text-xs opacity-70">Candidate</p>
          <p className="font-semibold text-sm">{student?.fullName}</p>
          <p className="text-xs font-mono opacity-80">{student?.studentId}</p>
        </div>
        <div className="text-center">
          <p className="text-xs opacity-70">Time Left</p>
          <p className={`text-2xl font-bold font-mono ${timerColor}`}>{formatTime(timeLeft)}</p>
        </div>
        <div className="text-right">
          {saving && <p className="text-xs text-green-200 animate-pulse">Saving...</p>}
          <p className="text-xs opacity-70">{answeredCount}/{questions.length} answered</p>
        </div>
      </header>

      {/* ── Subject Tabs ─────────────────────────────────────── */}
      <div className="bg-white border-b shadow-sm sticky top-16 z-20">
        <div className="flex overflow-x-auto">
          {subjects.map((s, idx) => (
            <button
              key={s._id}
              onClick={() => switchSubject(idx)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                idx === activeSubjectIdx
                  ? 'border-green-700 text-green-700 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Question Area ─────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentQuestion ? (
            <div className="max-w-3xl mx-auto">

              {/* Section name + instruction — always shown for every question in the section */}
              {currentQuestion.section && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
                  {/* Section title bar */}
                  <div className="bg-blue-600 px-5 py-3">
                    <p className="text-white font-bold text-base">{currentQuestion.section}</p>
                  </div>

                  {/* Section instruction — always visible */}
                  {!isEmpty(currentQuestion.sectionInstruction) && (
                    <div className="bg-blue-50 px-5 py-4">
                      <div
                        className="text-gray-800 text-sm leading-relaxed prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.sectionInstruction }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Question header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">
                  Question {currentQIdx + 1} of {questions.length}
                </span>
                <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium border border-green-200">
                  {currentQuestion.markAllocation} mark{currentQuestion.markAllocation !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Question card */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                {currentQuestion.questionText && (
                  <div
                    className="text-gray-800 text-base mb-5 leading-relaxed prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }}
                  />
                )}
                {currentQuestion.questionImage && (
                  <img
                    src={currentQuestion.questionImage}
                    alt="Question"
                    className="max-w-full rounded-lg mb-4 border"
                    draggable="false"
                  />
                )}

                {/* Options */}
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const optText = currentQuestion[`option${opt}`];
                    const optImg = currentQuestion[`option${opt}Image`];
                    const isSelected = answerMap[currentQuestion._id]?.selectedOption === opt;

                    return (
                      <button
                        key={opt}
                        onClick={() => selectOption(currentQuestion._id, opt)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isSelected ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {opt}
                        </span>
                        <div className="flex-1">
                          {!isEmpty(optText) && (
                            <div
                              className="text-gray-800 prose max-w-none"
                              dangerouslySetInnerHTML={{ __html: optText }}
                            />
                          )}
                          {optImg && (
                            <img src={optImg} alt={`Option ${opt}`} className="max-w-xs mt-2 rounded" draggable="false" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => goToQuestion(Math.max(0, currentQIdx - 1))}
                    disabled={currentQIdx === 0}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => goToQuestion(Math.min(questions.length - 1, currentQIdx + 1))}
                    disabled={currentQIdx === questions.length - 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFlag(currentQuestion._id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      answerMap[currentQuestion._id]?.isFlagged
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-purple-50'
                    }`}
                  >
                    🚩 {answerMap[currentQuestion._id]?.isFlagged ? 'Unflag' : 'Flag'}
                  </button>
                  <button
                    onClick={() => clearAnswer(currentQuestion._id)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
                  >
                    Submit Exam
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20">No questions loaded for this subject.</div>
          )}
        </main>

        {/* ── Question Palette ──────────────────────────────── */}
        <aside className="hidden md:block w-60 bg-white border-l p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Question Palette</h3>

          {getPaletteGroups().map((group, gIdx) => (
            <div key={gIdx} className="mb-4">
              {group.section && (
                <p className="text-xs font-semibold text-blue-600 mb-2 truncate border-b border-blue-100 pb-1">
                  {group.section}
                </p>
              )}
              <div className="grid grid-cols-5 gap-1">
                {group.items.map(({ q, idx }) => (
                  <button
                    key={q._id}
                    onClick={() => goToQuestion(idx)}
                    className={`palette-btn ${getPaletteStatus(q)} ${idx === currentQIdx ? 'current' : ''}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="mt-4 space-y-2 text-xs text-gray-500 border-t pt-3">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500"></div> Answered</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-400"></div> Visited</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-200"></div> Not Visited</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-purple-500"></div> Flagged</div>
          </div>
        </aside>
      </div>

      {/* ── Submit Confirmation Modal ─────────────────────── */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Submit Examination?</h3>
            <p className="text-gray-600 text-sm mb-4">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              Once submitted, you cannot re-enter the examination.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Continue Exam
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}