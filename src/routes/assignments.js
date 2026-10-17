const router = require('express').Router();
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const Attempt = require('../models/Attempt');
const { verifyToken, requireRole } = require('../middleware/auth');

// Admin creates an assignment
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { title, description, timeLimitMinutes } = req.body || {};
  if (!title || !description || !Number.isFinite(timeLimitMinutes) || timeLimitMinutes < 1) {
    return res.status(400).json({ error: 'title, description and timeLimitMinutes (number >= 1) are required' });
  }
  const a = await Assignment.create({ title, description, timeLimitMinutes, createdBy: req.user.id });
  res.status(201).json(a);
});

// Any logged-in user lists assignments
router.get('/', verifyToken, async (req, res) => {
  const list = await Assignment.find().sort({ createdAt: -1 });
  res.json(list);
});

// Student starts an attempt
router.post('/:id/start', verifyToken, requireRole('student'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });

  const existing = await Attempt.findOne({ assignment: assignment._id, user: req.user.id });
  if (existing) return res.status(200).json(existing); // already started, return it

  const startedAt = new Date();
  const deadlineAt = new Date(startedAt.getTime() + assignment.timeLimitMinutes * 60 * 1000);
  try {
    const attempt = await Attempt.create({
      assignment: assignment._id, user: req.user.id, startedAt, deadlineAt,
    });
    res.status(201).json(attempt);
  } catch (e) {
    if (e.code === 11000) {
      // double-click race: unique index caught it
      return res.status(200).json(await Attempt.findOne({ assignment: assignment._id, user: req.user.id }));
    }
    throw e;
  }
});

module.exports = router;