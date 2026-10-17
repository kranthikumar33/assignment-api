require('dotenv').config();
const mongoose = require('mongoose');

exports.connectTestDb = async () => {
  const uri = process.env.MONGO_URI_TEST;
  if (!uri || uri === process.env.MONGO_URI) {
    throw new Error('Set MONGO_URI_TEST in .env to a different database than MONGO_URI');
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase(); // start every run clean
};

exports.closeTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};