process.env.JWT_SECRET = 'test_secret';
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDb, closeTestDb } = require('./helpers/db');

before(connectTestDb);
after(closeTestDb);

describe('auth', () => {
  const user = { name: 'Ravi', email: 'ravi@test.com', password: 'secret123', role: 'student' };

  test('register then login returns a token', async () => {
    const reg = await request(app).post('/register').send(user);
    assert.equal(reg.status, 201);

    const res = await request(app).post('/login').send({ email: user.email, password: user.password });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  test('wrong password returns 401', async () => {
    const res = await request(app).post('/login').send({ email: user.email, password: 'wrongpass' });
    assert.equal(res.status, 401);
  });

  test('duplicate email returns 409', async () => {
    const res = await request(app).post('/register').send(user);
    assert.equal(res.status, 409);
  });

  test('protected route without token returns 401', async () => {
    const res = await request(app).get('/assignments');
    assert.equal(res.status, 401);
  });

  test('student cannot create assignment (403)', async () => {
    const login = await request(app).post('/login').send({ email: user.email, password: user.password });
    const res = await request(app)
      .post('/assignments')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ title: 'x', description: 'y', timeLimitMinutes: 10 });
    assert.equal(res.status, 403);
  });
});