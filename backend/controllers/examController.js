const ExamSession = require('../models/ExamSession');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Result = require('../models/Result');
const ActivityLog = require('../models/ActivityLog');

// Helper: shuffle array
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Helper: shuffle within sections only
const shuffleWithinSections = (questions) => {
  const sections = {};
  const sectionOrder = [];
  questions.forEach((q) => {
    const sectionKey = q.section || '__no_section__';
    if (!sections[sectionKey]) {
      sections[sectionKey] = [];
      sectionOrder.push(sectionKey);
    }
    sections[sectionKey].push(q);
  });
  const result = [];
  sectionOrder.forEach((sectionKey) => {
    const shuffled = shuffle(sections[sectionKey]);
    result.push(...shuffled);
  });
  return result;
};

// Helper: grade and save result
const gradeExam = async (studentId, studentObjectId) => {
  const subjects = await Subject.find({ isActive: true });
  const subjectResults = [];
  let totalObtainable = 0;
  let totalObtained = 0;

  for (const subject of subjects) {
    const questions = await Question.find({ subject: subject._id, isActive: true });
    const answers = await Answer.find({ student: studentObjectId, subject: subject._id });
    const answerMap = {};
    answers.forEach((a) => { answerMap[a.question.toString()] = a.selectedOption; });

    let marksObtained = 0;
    for (const q of questions) {
      if (answerMap[q._id.toString()] === q.correctAnswer) {
        marksObtained += q.markAllocation;
      }
    }

    const percentage = subject.obtainableMarks > 0
      ? parseFloat(((marksObtained / subject.obtainableMarks) * 100).toFixed(2))
      : 0;

    subjectResults.push({
      subject: subject._id,
      subjectName: subject.name,
      obtainableMarks: subject.obtainableMarks,
      marksObtained,
      percentage,
    });

    totalObtainable += subject.obtainableMarks;
    totalObtained += marksObtained;
  }

  const totalPercentage = totalObtainable > 0
    ? parseFloat(((totalObtained / totalObtainable) * 100).toFixed(2))
    : 0;

  const status = totalPercentage >= 50 ? 'ADMITTED' : 'RESIT';

  await Result.findOneAndUpdate(
    { student: studentObjectId },
    {
      student: studentObjectId,
      subjectResults,
      totalObtainable,
      totalMarksObtained: totalObtained,
      totalPercentage,
      status,
      gradedAt: new Date(),
    },
    { upsert: true, new: true }
  );
};

// Start exam
const startExam = async (req, res) => {
  try {
    const student = req.student;
    let session = await ExamSession.findOne({ student: student._id });

    if (!session) {
      session = new ExamSession({ student: student._id });
    }

    if (session.status === 'submitted') {
      return res.status(403).json({ message: 'Examination already submitted.' });
    }

    // Session recovery — calculate time on SERVER, never trust client clock
    if (session.status === 'active' && session.startTime) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.startTime).getTime()) / 1000
      );
      const remaining = Math.max(0, session.examDuration - elapsed);
      session.timeRemaining = remaining;
      await session.save();

      const subjects = await Subject.find({ isActive: true }).sort({ order: 1 });
      return res.json({
        session: { ...session.toObject(), timeRemaining: remaining },
        subjects,
        recovered: true,
      });
    }

    // Fresh start
    const subjects = await Subject.find({ isActive: true }).sort({ order: 1 });
    const questionOrder = [];

    for (const subject of subjects) {
      const questions = await Question.find({ subject: subject._id, isActive: true })
        .sort({ section: 1, order: 1 });

      const shuffled = shuffleWithinSections(questions);
      const shuffledIds = shuffled.map((q) => q._id);

      questionOrder.push({ subject: subject._id, questions: shuffledIds });

      for (const qId of shuffledIds) {
        await Answer.findOneAndUpdate(
          { student: student._id, question: qId },
          {
            student: student._id,
            question: qId,
            subject: subject._id,
            visitStatus: 'not_visited',
            selectedOption: null,
          },
          { upsert: true }
        );
      }
    }

    session.status = 'active';
    session.startTime = new Date();
    session.timeRemaining = session.examDuration;
    session.questionOrder = questionOrder;
    await session.save();

    await ActivityLog.create({ student: student._id, action: 'Started Examination' });

    // Send server-calculated timeRemaining — never let client calculate from startTime
    res.json({
      session: { ...session.toObject(), timeRemaining: session.examDuration },
      subjects,
      recovered: false,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get questions for a subject
const getExamQuestions = async (req, res) => {
  try {
    const student = req.student;
    const { subjectId } = req.params;

    const session = await ExamSession.findOne({ student: student._id });
    if (!session || session.status !== 'active') {
      return res.status(403).json({ message: 'No active exam session' });
    }

    const subjectOrder = session.questionOrder.find(
      (so) => so.subject.toString() === subjectId
    );

    let questions;
    if (subjectOrder && subjectOrder.questions.length > 0) {
      const orderedIds = subjectOrder.questions;

      const allQuestions = await Question.find({ subject: subjectId, isActive: true })
        .select('-correctAnswer -questionImagePublicId');

      const map = {};
      allQuestions.forEach((q) => { map[q._id.toString()] = q; });

      const orderedQuestions = orderedIds
        .map((id) => map[id.toString()])
        .filter(Boolean);

      const orderedIdSet = new Set(orderedIds.map((id) => id.toString()));
      const newQuestions = allQuestions.filter((q) => !orderedIdSet.has(q._id.toString()));

      questions = [...orderedQuestions, ...newQuestions];
    } else {
      questions = await Question.find({ subject: subjectId, isActive: true })
        .select('-correctAnswer -questionImagePublicId')
        .sort({ section: 1, order: 1 });
    }

    const answers = await Answer.find({ student: student._id, subject: subjectId });
    const answerMap = {};
    answers.forEach((a) => {
      answerMap[a.question.toString()] = {
        selectedOption: a.selectedOption,
        isFlagged: a.isFlagged,
        visitStatus: a.visitStatus,
      };
    });

    const questionsWithAnswers = questions.map((q) => ({
      ...q.toObject(),
      savedAnswer: answerMap[q._id.toString()] || {
        selectedOption: null,
        isFlagged: false,
        visitStatus: 'not_visited',
      },
    }));

    res.json(questionsWithAnswers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Auto-save answer
const saveAnswer = async (req, res) => {
  try {
    const student = req.student;
    const { questionId, selectedOption, isFlagged, visitStatus } = req.body;

    const session = await ExamSession.findOne({ student: student._id });
    if (!session || session.status !== 'active') {
      return res.status(403).json({ message: 'No active exam session' });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const answer = await Answer.findOneAndUpdate(
      { student: student._id, question: questionId },
      {
        student: student._id,
        question: questionId,
        subject: question.subject,
        selectedOption: selectedOption !== undefined ? selectedOption : null,
        isFlagged: isFlagged !== undefined ? isFlagged : false,
        visitStatus: visitStatus || 'visited',
        savedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Answer saved', answer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Submit exam
const submitExam = async (req, res) => {
  try {
    const student = req.student;
    const session = await ExamSession.findOne({ student: student._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status === 'submitted') {
      return res.status(400).json({ message: 'Examination already submitted' });
    }

    session.status = 'submitted';
    session.endTime = new Date();
    session.submittedAt = new Date();
    session.autoSubmitted = req.body.autoSubmitted || false;
    await session.save();

    await Student.findByIdAndUpdate(student._id, { examSubmitted: true });
    await gradeExam(student.studentId, student._id);

    await ActivityLog.create({
      student: student._id,
      action: session.autoSubmitted ? 'Exam Auto-Submitted (Time Elapsed)' : 'Submitted Examination',
    });

    res.json({ message: 'Your examination has been submitted successfully. Thank you for participating in the entrance examination.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Log security event
const logSecurityEvent = async (req, res) => {
  try {
    const student = req.student;
    const { event, details } = req.body;
    const session = await ExamSession.findOne({ student: student._id });
    if (session) {
      if (event === 'tab_switch') session.tabSwitches += 1;
      if (event === 'fullscreen_exit') session.fullscreenExits += 1;
      await session.save();
    }
    await ActivityLog.create({ student: student._id, action: event, details: details || '' });
    res.json({ message: 'Event logged' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { startExam, getExamQuestions, saveAnswer, submitExam, logSecurityEvent };