'use strict';
// clearslop-ignore-file: fixtures contain fake secrets on purpose to test the detector
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const scanner = require('../scanner/clearslop.js');
const rules = require('../scanner/rules.js');

function project(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clearslop-'));
  Object.keys(files).forEach(function (name) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, files[name]);
  });
  return dir;
}

function ids(result) { return result.findings.map(function (f) { return f.rule; }); }

function cli(args, cwd) {
  const out = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = function (s) { out.push(String(s)); };
  console.error = function (s) { out.push(String(s)); };
  let code;
  try { code = scanner.main(args, cwd); } finally { console.log = origLog; console.error = origErr; }
  return { code: code, out: out.join('\n') };
}

test('phrases match whole words only', function () {
  const dir = project({ 'a.md': 'These groups! are fine.\n', 'b.md': 'Ups! Something failed.\n' });
  const r = scanner.run('.', {}, dir);
  const hits = r.findings.filter(function (f) { return f.rule === 'CS-ID-033'; });
  assert.deepStrictEqual(hits.map(function (f) { return f.file; }), ['b.md']);
});

test('stem phrases match inflected forms', function () {
  const dir = project({ 'a.md': 'We are leveraging our synergy.\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-EN-011') !== -1);
});

test('multi-line purple gradient is detected', function () {
  const css = '.hero {\n  background: linear-gradient(\n    90deg,\n    #7c3aed,\n    #ec4899\n  );\n}\n';
  const dir = project({ 'a.css': css });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-UI-001') !== -1);
});

test('neutral gradient is not flagged', function () {
  const dir = project({ 'a.css': '.x { background: linear-gradient(#ffffff, #eeeeee); }\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-UI-001') === -1);
});

test('colored glow with rgba is detected, black shadow is not', function () {
  const glow = project({ 'a.css': '.x { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }\n' });
  assert.ok(ids(scanner.run('.', {}, glow)).indexOf('CS-UI-003') !== -1);
  const black = project({ 'a.css': '.x { box-shadow: 0 0 40px rgba(0, 0, 0, 0.4); }\n' });
  assert.ok(ids(scanner.run('.', {}, black)).indexOf('CS-UI-003') === -1);
});

test('text symbols are not treated as emoji', function () {
  const dir = project({ 'a.html': '<li>\u00a9 2026 Example</li>\n<li>\u2194 swap</li>\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-UI-020') === -1);
});

test('real emoji as a functional icon is detected', function () {
  const dir = project({ 'a.html': '<li>\ud83d\ude80 Fast</li>\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-UI-020') !== -1);
});

test('tooling path filter uses whole segments', function () {
  assert.strictEqual(rules.isToolingPath('client/app.js'), false);
  assert.strictEqual(rules.isToolingPath('src/combination.js'), false);
  assert.strictEqual(rules.isToolingPath('scripts/build.js'), true);
  assert.strictEqual(rules.isToolingPath('src/app.test.js'), true);
  const dir = project({ 'client/app.js': 'console.log(1);\n', 'scripts/x.js': 'console.log(1);\n' });
  const r = scanner.run('.', {}, dir);
  const files = r.findings.filter(function (f) { return f.rule === 'CS-CD-027'; }).map(function (f) { return f.file; });
  assert.deepStrictEqual(files, ['client/app.js']);
});

test('secrets are found in JSON config files', function () {
  const dir = project({ 'config.json': '{"api_key": "abcd1234efgh5678"}\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-CD-026') !== -1);
});

test('placeholder secrets are ignored', function () {
  const dir = project({ 'a.js': 'const password = "changeme-please";\nconst token = "your_token_here";\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-CD-026') === -1);
});

test('a real secret is still found on a line that mentions example', function () {
  const dir = project({ 'a.js': 'const k = "AKIAABCDEFGHIJKLMNOP"; // example region\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-CD-026') !== -1);
});

test('allow paths match on segment boundaries', function () {
  const allow = [{ rule: 'CS-UI-001', path: 'src/brand', reason: 'approved' }];
  assert.strictEqual(scanner.isAllowed(allow, 'CS-UI-001', 'src/brand/a.css'), true);
  assert.strictEqual(scanner.isAllowed(allow, 'CS-UI-001', 'src/brandX/a.css'), false);
});

test('ignore-file needs a reason', function () {
  const body = '<p>lorem ipsum</p>\n';
  const bare = project({ 'a.html': '<!-- clearslop-ignore-file -->\n' + body });
  assert.ok(ids(scanner.run('.', {}, bare)).indexOf('CS-UI-053') !== -1);
  const reasoned = project({ 'a.html': '<!-- clearslop-ignore-file: documents slop patterns -->\n' + body });
  assert.strictEqual(ids(scanner.run('.', {}, reasoned)).length, 0);
});

test('an ignore comment does not leak onto code lines two lines below', function () {
  const dir = project({ 'a.html': '<!-- clearslop-ignore: approved -->\n<p>ok</p>\n<p>lorem ipsum</p>\n' });
  assert.ok(ids(scanner.run('.', {}, dir)).indexOf('CS-UI-053') !== -1);
});

test('a trailing ignore on a code line does not hide the next line', function () {
  const dir = project({ 'a.html': '<p>lorem ipsum</p> <!-- clearslop-ignore: approved -->\n<p>lorem ipsum</p>\n' });
  const hits = scanner.run('.', {}, dir).findings.filter(function (f) { return f.rule === 'CS-UI-053'; });
  assert.deepStrictEqual(hits.map(function (f) { return f.line; }), [2]);
});

test('oversized files are reported as skipped', function () {
  const dir = project({ 'big.md': 'x'.repeat(1048577) });
  const r = scanner.run('.', {}, dir);
  assert.strictEqual(r.skipped.length, 1);
  assert.strictEqual(r.skipped[0].file, 'big.md');
});

test('ratchet passes when nothing changed', function () {
  const dir = project({ 'a.md': 'Plain, specific text about the product.\n' });
  assert.strictEqual(cli(['baseline', '.'], dir).code, 0);
  assert.strictEqual(cli(['ratchet', '.'], dir).code, 0);
});

test('ratchet fails on a new warn finding even if the score would not drop', function () {
  const dir = project({ 'a.md': 'Plain text.\n', 'b.md': 'This is a revolutionary tool.\n' });
  cli(['baseline', '.'], dir);
  fs.writeFileSync(path.join(dir, 'b.md'), 'We unleash value.\n');
  fs.writeFileSync(path.join(dir, 'c.md'), 'Plain text.\n'.repeat(5));
  const res = cli(['ratchet', '.'], dir);
  assert.strictEqual(res.code, 1);
  assert.match(res.out, /new block or warn finding/);
});

test('ratchet refuses a baseline saved for another target', function () {
  const dir = project({ 'src/a.md': 'Plain text.\n', 'b.md': 'Plain text.\n' });
  cli(['baseline', '.'], dir);
  const res = cli(['ratchet', 'src'], dir);
  assert.strictEqual(res.code, 2);
  assert.match(res.out, /target/);
});

test('ratchet refuses a baseline saved with different --only', function () {
  const dir = project({ 'a.md': 'Plain text.\n' });
  cli(['baseline', '.', '--only', 'en'], dir);
  assert.strictEqual(cli(['ratchet', '.'], dir).code, 2);
});

test('usage errors return exit code 2', function () {
  assert.strictEqual(cli(['scan', '--nope'], process.cwd()).code, 2);
  assert.strictEqual(cli(['scan', 'does-not-exist'], process.cwd()).code, 2);
  assert.strictEqual(cli(['explain', 'CS-XX-999'], process.cwd()).code, 2);
});

test('scan exits 1 only when block findings exist', function () {
  const warnOnly = project({ 'a.md': 'A revolutionary idea.\n' });
  assert.strictEqual(cli(['scan', '.'], warnOnly).code, 0);
  const blocked = project({ 'a.html': '<p>John Doe, CEO</p>\n' });
  assert.strictEqual(cli(['scan', '.'], blocked).code, 1);
});

test('output is deterministic', function () {
  const dir = project({ 'b.md': 'A revolutionary idea.\n', 'a.md': 'We unleash value.\n' });
  assert.deepStrictEqual(scanner.run('.', {}, dir), scanner.run('.', {}, dir));
});
