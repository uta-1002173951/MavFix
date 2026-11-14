const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('./passwords');

test('hashes passwords with distinct salts and verifies the original password', async () => {
  const firstHash = await hashPassword('mavfix-password');
  const secondHash = await hashPassword('mavfix-password');

  assert.notEqual(firstHash, secondHash);
  assert.notEqual(firstHash, 'mavfix-password');
  assert.deepEqual(await verifyPassword('mavfix-password', firstHash), {
    valid: true,
    needsRehash: false
  });
  assert.deepEqual(await verifyPassword('incorrect', firstHash), {
    valid: false,
    needsRehash: false
  });
});

test('accepts a legacy plaintext password only to trigger a rehash', async () => {
  assert.deepEqual(await verifyPassword('legacy-password', 'legacy-password'), {
    valid: true,
    needsRehash: true
  });
  assert.deepEqual(await verifyPassword('incorrect', 'legacy-password'), {
    valid: false,
    needsRehash: false
  });
});

test('rejects malformed scrypt hashes', async () => {
  assert.deepEqual(await verifyPassword('password', 'scrypt$bad$hash'), {
    valid: false,
    needsRehash: false
  });
});
