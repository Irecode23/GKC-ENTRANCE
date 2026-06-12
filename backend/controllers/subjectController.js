const Subject = require('../models/Subject');

const createSubject = async (req, res) => {
  try {
    const { name, code, obtainableMarks, questionCount, order } = req.body;
    if (!name || !code || !obtainableMarks || !questionCount) {
      return res.status(400).json({ message: 'name, code, obtainableMarks and questionCount are required' });
    }

    const subject = await Subject.create({ name, code: code.toUpperCase(), obtainableMarks, questionCount, order: order || 0 });
    res.status(201).json({ message: 'Subject created', subject });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Subject name or code already exists' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject updated', subject });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createSubject, getAllSubjects, updateSubject, deleteSubject };