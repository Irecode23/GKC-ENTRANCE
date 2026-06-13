const Question = require('../models/Question');
const Subject = require('../models/Subject');
const { cloudinary } = require('../config/cloudinary');

const createQuestion = async (req, res) => {
  try {
    const {
      subject, section, sectionInstruction, questionText,
      optionA, optionB, optionC, optionD,
      correctAnswer, markAllocation, order,
    } = req.body;

    if (!subject || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !markAllocation) {
      return res.status(400).json({ message: 'Subject, options, correct answer and mark allocation are required' });
    }

    const plainText = questionText ? questionText.replace(/<[^>]+>/g, '').trim() : '';
    if (!plainText && !req.files?.questionImage) {
      return res.status(400).json({ message: 'Question must have either text or an image' });
    }

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) return res.status(404).json({ message: 'Subject not found' });

    // Count existing questions for this subject
    const existingCount = await Question.countDocuments({ subject, isActive: true });
    if (existingCount >= subjectDoc.questionCount) {
      return res.status(400).json({
        message: `This subject already has the maximum allowed questions (${subjectDoc.questionCount})`,
      });
    }

    const questionData = {
      subject,
      section: section || '',
      sectionInstruction: sectionInstruction || '',
      questionText: questionText || '',
      optionA, optionB, optionC, optionD,
      correctAnswer,
      markAllocation: Number(markAllocation),
      order: order ? Number(order) : existingCount + 1,
    };

    // Handle uploaded images
    if (req.files?.questionImage) {
      questionData.questionImage = req.files.questionImage[0].path;
      questionData.questionImagePublicId = req.files.questionImage[0].filename;
    }
    if (req.files?.optionAImage) questionData.optionAImage = req.files.optionAImage[0].path;
    if (req.files?.optionBImage) questionData.optionBImage = req.files.optionBImage[0].path;
    if (req.files?.optionCImage) questionData.optionCImage = req.files.optionCImage[0].path;
    if (req.files?.optionDImage) questionData.optionDImage = req.files.optionDImage[0].path;

    const question = await Question.create(questionData);
    res.status(201).json({ message: 'Question created', question });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getQuestionsBySubject = async (req, res) => {
  try {
    const questions = await Question.find({ subject: req.params.subjectId, isActive: true })
      .sort({ section: 1, order: 1, createdAt: 1 })
      .populate('subject', 'name code');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ isActive: true })
      .sort({ order: 1 })
      .populate('subject', 'name code');
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const updates = { ...req.body };

    // Handle new image uploads
    if (req.files?.questionImage) {
      if (question.questionImagePublicId) {
        await cloudinary.uploader.destroy(question.questionImagePublicId);
      }
      updates.questionImage = req.files.questionImage[0].path;
      updates.questionImagePublicId = req.files.questionImage[0].filename;
    }
    if (req.files?.optionAImage) updates.optionAImage = req.files.optionAImage[0].path;
    if (req.files?.optionBImage) updates.optionBImage = req.files.optionBImage[0].path;
    if (req.files?.optionCImage) updates.optionCImage = req.files.optionCImage[0].path;
    if (req.files?.optionDImage) updates.optionDImage = req.files.optionDImage[0].path;

    const updated = await Question.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ message: 'Question updated', question: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    if (question.questionImagePublicId) {
      await cloudinary.uploader.destroy(question.questionImagePublicId);
    }

    await question.deleteOne();
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createQuestion, getQuestionsBySubject, getAllQuestions, updateQuestion, deleteQuestion };