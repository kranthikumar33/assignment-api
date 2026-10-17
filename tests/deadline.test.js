process.env.JWT_SECRET = 'test_secret';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const Attempt = require('../src/models/Attempt');
const { connectTestDb, closeTestDb } = require('./helpers/db');

let adminToken, assignmentId;

async function makeUser(name, role) {
  const email = `${name}@test.com`;
  await request(app).post('/register').send({ name, email, password: 'secret123', role });
  const res = await request(app).post('/login').send({ email, password: 'secret123' });
  return res.body.token;
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function startAttempt(token) {
  const res = await request(app).post(`/assignments/${assignmentId}/start`).set(auth(token));
  return res.body;
}

const GOOD_ANSWER = 'SELECT name, COUNT(*) FROM orders GROUP BY name HAVING COUNT(*) > 1;';
const GOOD_LINK = 'https://github.com/ravi/work';

before(async () => {
  await connectTestDb();
  adminToken = await makeUser('admin', 'admin');
  const res = await request(app).post('/assignments').set(auth(adminToken))
    .send({ title: 'Write a SQL query', description: 'Find duplicate orders', timeLimitMinutes: 30 });
  assignmentId = res.body._id;
});
after(closeTestDb);

test('start sets deadline = start + time limit', async () => {
  const t = await makeUser('s_start', 'student');
  const a = await startAttempt(t);
  assert.equal(new Date(a.deadlineAt) - new Date(a.startedAt), 30 * 60 * 1000);
  assert.equal(a.status, 'in_progress');
});

test('submit before deadline scores 3/3', async () => {
  const t = await makeUser('s_good', 'student');
  const a = await startAttempt(t);
  const res = await request(app).post(`/attempts/${a._id}/submit`).set(auth(t))
    .send({ answer: GOOD_ANSWER, link: GOOD_LINK });
  assert.equal(res.status, 200);
  assert.equal(res.body.score, 3);
  assert.equal(res.body.status, 'reviewed');
});

test('short answer and bad link scores 1/3', async () => {
  const t = await makeUser('s_bad', 'student');
  const a = await startAttempt(t);
  const res = await request(app).post(`/attempts/${a._id}/submit`).set(auth(t))
    .send({ answer: 'hi', link: 'not a url' });
  assert.equal(res.status, 200);
  assert.equal(res.body.score, 1);
});

test('submit after deadline is rejected and marked timed_out', async () => {
  const t = await makeUser('s_late', 'student');
  const a = await startAttempt(t);
  await Attempt.updateOne({ _id: a._id }, { deadlineAt: new Date(Date.now() - 60 * 1000) });

  const res = await request(app).post(`/attempts/${a._id}/submit`).set(auth(t))
    .send({ answer: GOOD_ANSWER, link: GOOD_LINK });
  assert.equal(res.status, 403);
  assert.equal(res.body.status, 'timed_out');

  const check = await request(app).get(`/attempts/${a._id}`).set(auth(t));
  assert.equal(check.body.status, 'timed_out');
});

test('cannot submit twice', async () => {
  const t = await makeUser('s_twice', 'student');
  const a = await startAttempt(t);
  const body = { answer: GOOD_ANSWER, link: GOOD_LINK };
  await request(app).post(`/attempts/${a._id}/submit`).set(auth(t)).send(body);
  const res = await request(app).post(`/attempts/${a._id}/submit`).set(auth(t)).send(body);
  assert.equal(res.status, 409);
});

test('student cannot see another student attempt, admin can', async () => {
  const owner = await makeUser('s_owner', 'student');
  const other = await makeUser('s_other', 'student');
  const a = await startAttempt(owner);

  const denied = await request(app).get(`/attempts/${a._id}`).set(auth(other));
  assert.equal(denied.status, 404);

  const ok = await request(app).get(`/attempts/${a._id}`).set(auth(adminToken));
  assert.equal(ok.status, 200);
});