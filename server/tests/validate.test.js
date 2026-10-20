/** Unit tests for server/utils/validate.js — run with: npm test */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validate, rules } = require('../utils/validate');

test('validate: returns null when all fields pass', () => {
  const result = validate(
    {
      name: 'Ada Lovelace',
      username: 'ada_1815',
      email: 'ada@example.com',
      password: 'secret123',
    },
    { name: 'name', username: 'username', email: 'email', password: 'password' }
  );
  assert.equal(result, null);
});

test('validate: collects one error per invalid field', () => {
  const result = validate(
    { name: '', username: 'a!', email: 'nope', password: '123' },
    { name: 'name', username: 'username', email: 'email', password: 'password' }
  );
  assert.ok(result);
  assert.equal(Object.keys(result.errors).length, 4);
  assert.ok(typeof result.firstMessage === 'string');
});

test('name rule: trims and enforces length 2–50', () => {
  assert.equal(rules.name('Al'), null);
  assert.equal(rules.name('  Al  '), null);
  assert.ok(rules.name('A'));
  assert.ok(rules.name('x'.repeat(51)));
  assert.ok(rules.name('   '));
});

test('username rule: 3–30 chars, letters/numbers/underscore', () => {
  assert.equal(rules.username('ada_1'), null);
  assert.ok(rules.username('ab'));
  assert.ok(rules.username('a'.repeat(31)));
  assert.ok(rules.username('bad name'));
  assert.ok(rules.username('emoji🙂'));
});

test('email rule: basic sanity check', () => {
  assert.equal(rules.email('user@example.com'), null);
  assert.ok(rules.email('user@'));
  assert.ok(rules.email('user example.com'));
  assert.ok(rules.email(''));
});

test('password rule: minimum 6 characters', () => {
  assert.equal(rules.password('abcdef'), null);
  assert.ok(rules.password('abcde'));
  assert.ok(rules.password(''));
});

test('bio rule: optional, max 160 chars', () => {
  assert.equal(rules.bio(undefined), null);
  assert.equal(rules.bio(null), null);
  assert.equal(rules.bio(''), null);
  assert.equal(rules.bio('Hello!'), null);
  assert.equal(rules.bio('y'.repeat(160)), null);
  assert.ok(rules.bio('y'.repeat(161)));
});

test('postContent rule: required, max 1000 chars', () => {
  assert.equal(rules.postContent('Hi there'), null);
  assert.ok(rules.postContent('   '));
  assert.ok(rules.postContent('x'.repeat(1001)));
});

test('commentContent rule: required, max 500 chars', () => {
  assert.equal(rules.commentContent('Nice!'), null);
  assert.ok(rules.commentContent(''));
  assert.ok(rules.commentContent('x'.repeat(501)));
});
