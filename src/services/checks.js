function runChecks(answer, link) {
  const text = String(answer ?? '').trim();

  let linkOk = false;
  try {
    const u = new URL(String(link ?? ''));
    linkOk = u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    linkOk = false;
  }

  return [
    { key: 'answer_not_empty',   passed: text.length > 0 },
    { key: 'link_valid',         passed: linkOk },
    { key: 'answer_long_enough', passed: text.length >= 50 },
  ];
}

module.exports = { runChecks };