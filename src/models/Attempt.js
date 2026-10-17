const { Schema, model } = require('mongoose');

const schema = new Schema({
  assignment:  { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'reviewed', 'timed_out'],
    default: 'in_progress',
  },
  startedAt:   { type: Date, default: Date.now },
  deadlineAt:  { type: Date, required: true },
  submittedAt: Date,
  answerText:  String,
  link:        String,
  score:       Number,
  checks:      [{ _id: false, key: String, passed: Boolean }],
});

// one attempt per student per assignment
schema.index({ assignment: 1, user: 1 }, { unique: true });
schema.index({ user: 1 });

module.exports = model('Attempt', schema);