const express = require('express');
const app = express();

app.use(express.json());

app.use('/', require('./routes/auth'));
app.use('/assignments', require('./routes/assignments'));
app.use('/attempts', require('./routes/attempts'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;