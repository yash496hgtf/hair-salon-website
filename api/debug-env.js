module.exports = async function handler(req, res) {
  const relevantKeys = Object.keys(process.env).filter(
    (k) => /POSTGRES|DATABASE|NEON/i.test(k)
  );
  res.status(200).json({ keys: relevantKeys });
};
