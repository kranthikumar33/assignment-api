const { Schema, model } = require('mongoose');

module.exports = model('User', new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['student', 'admin'], required: true },
}, { timestamps: true }));