const { Schema, model } = require('mongoose');

module.exports = model('Assignment', new Schema({
  title:            { type: String, required: true, trim: true },
  description:      { type: String, required: true },
  timeLimitMinutes: { type: Number, required: true, min: 1 },
  createdBy:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }));