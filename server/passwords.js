const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const saltLength = 16;
const keyLength = 32;
const hashPrefix = `scrypt$${cost}$${blockSize}$${parallelization}$`;

async function hashPassword(password) {
  const salt = crypto.randomBytes(saltLength);
  const derivedKey = await scrypt(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization
  });
  return `${hashPrefix}${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

async function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== 'string') {
    return { valid: false, needsRehash: false };
  }

  if (!storedPassword.startsWith('scrypt$')) {
    const submitted = Buffer.from(password, 'utf8');
    const stored = Buffer.from(storedPassword, 'utf8');
    const valid = submitted.length === stored.length &&
      crypto.timingSafeEqual(submitted, stored);
    return { valid, needsRehash: valid };
  }

  const parts = storedPassword.split('$');
  if (parts.length !== 6 || storedPassword.indexOf(hashPrefix) !== 0) {
    return { valid: false, needsRehash: false };
  }

  let salt;
  let expectedKey;
  try {
    salt = Buffer.from(parts[4], 'base64url');
    expectedKey = Buffer.from(parts[5], 'base64url');
  } catch {
    return { valid: false, needsRehash: false };
  }
  if (salt.length !== saltLength || expectedKey.length !== keyLength) {
    return { valid: false, needsRehash: false };
  }

  const derivedKey = await scrypt(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization
  });
  return {
    valid: crypto.timingSafeEqual(derivedKey, expectedKey),
    needsRehash: false
  };
}

module.exports = { hashPassword, verifyPassword };
