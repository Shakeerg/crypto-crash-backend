const crypto = require('crypto');

const generateCrashPoint = (roundId) => {
  const seed = crypto.randomBytes(32).toString('hex');
  const combined = `${seed}-${roundId}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const maxCrash = 1200;
  const crashPoint = 1 + (hashNum % maxCrash) / 10;
  return { seed, hash, crashPoint };
};

const verifyCrashPoint = (seed, roundId, hash, crashPoint) => {
  const combined = `${seed}-${roundId}`;
  const computedHash = crypto.createHash('sha256').update(combined).digest('hex');
  if (computedHash !== hash) return false;
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const maxCrash = 1200;
  const expectedCrashPoint = 1 + (hashNum % maxCrash) / 10;
  return Math.abs(expectedCrashPoint - crashPoint) < 0.0001;
};

module.exports = { generateCrashPoint, verifyCrashPoint };