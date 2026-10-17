const router = require('express').Router();
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const { verifyToken, requireRole } = require('../middleware/auth');
const { runChecks } = require('../services/checks');

// Student submits
router.post('/:id/submit', verifyToken, requireRole('student'), async (req, res) => {
  const { answer, link } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });

  const attempt = await Attempt.findOne({ _id: req.params.id, user: req.user.id });
  if (!attempt) return res.status(404).json({ error: 'Not found' });

  if (attempt.status !== 'in_progress') {
    return res.status(409).json({ error: `Attempt is already ${attempt.status}` });
  }

  const now = new Date();
  if (now > attempt.deadlineAt) {
    await Attempt.updateOne({ _id: attempt._id, status: 'in_progress' }, { status: 'timed_out' });
    return res.status(403).json({ error: 'Deadline passed', status: 'timed_out' });
  }

  const checks = runChecks(answer, link);
  const score = checks.filter((c) => c.passed).length;

  // Atomic: succeeds only if still in_progress AND still before the deadline
  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress', deadlineAt: { $gt: now } },
    { $set: {
        answerText: String(answer ?? ''), link: String(link ?? ''),
        submittedAt: now, status: 'reviewed', score, checks,
    } },
    { returnDocument: 'after' }
  );
  if (!updated) return res.status(409).json({ error: 'Attempt already finalized' });

  res.json({ status: updated.status, score: updated.score, checks: updated.checks });
});

// Owner or admin views an attempt
router.get('/:id', verifyToken, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });

  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.user = req.user.id; // students: own only

  const attempt = await Attempt.findOne(filter);
  if (!attempt) return res.status(404).json({ error: 'Not found' }); // 404, not 403: don't leak existence

  // Lazy timeout: deadline passed and nothing submitted
  if (attempt.status === 'in_progress' && new Date() > attempt.deadlineAt) {
    attempt.status = 'timed_out';
    await attempt.save();
  }
  res.json(attempt);
});

module.exports = router;