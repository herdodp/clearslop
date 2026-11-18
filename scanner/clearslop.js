#!/usr/bin/env node
'use strict';
// clearslop scanner: deterministic slop detector. Zero dependencies.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rulesModule = require('./rules');

const RULES = rulesModule.RULES;
const EXT = rulesModule.EXT;
const GROUP_EXT = rulesModule.GROUP_EXT;
const RULE_DOC = rulesModule.RULE_DOC;

const VERSION = '0.2.0';
const MAX_BYTES = 1048576;
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.clearslop', '.snapgent', '__pycache__', '.venv', 'venv', 'vendor']);
const WEIGHT = { block: 5, warn: 2, hint: 0.5 };
const ORDER = { block: 0, warn: 1, hint: 2 };

class UsageError extends Error {}

function relPath(root, f) { return path.relative(root, f).split(path.sep).join('/'); }

function hasLineIgnore(l) { return /clearslop-ignore:\s*\S+/.test(l || ''); }
function isCommentOnly(l) { return /^\s*(\/\/|#|\/\*|\*|<!--|--)/.test(l || ''); }
// A finding is suppressed by an ignore comment on its own line, or by a comment-only line directly above it.
function suppressed(lines, ln) {
  if (hasLineIgnore(lines[ln - 1])) return true;
  const prev = lines[ln - 2];
  return hasLineIgnore(prev) && isCommentOnly(prev);
}

function walk(dir, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  ents.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  ents.forEach(function (e) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name)) walk(full, acc); }
    else if (e.isFile()) acc.push(full);
  });
  return acc;
}

function loadAllow(root) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(root, '.clearslop', 'allow.json'), 'utf8'));
    return (j.allow || []).filter(function (a) { return a && a.rule && typeof a.reason === 'string' && a.reason.trim(); });
  } catch (e) { return []; }
}

// An allow path matches a file or a whole directory, never a mere name prefix.
function isAllowed(allow, id, rel) {
  return allow.some(function (a) {
    if (a.rule !== id) return false;
    if (!a.path) return true;
    const p = String(a.path).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
    return rel === p || rel.indexOf(p + '/') === 0;
  });
}

function evalRule(rule, text, lines, rel) {
  const hits = [];
  const ctx = { rel: rel };
  if (rule.kind === 'line') {
    for (let i = 0; i < lines.length; i++) if (rule.test(lines[i], lines, i, ctx)) hits.push(i + 1);
  } else if (rule.kind === 'phrases') {
    for (let i = 0; i < lines.length; i++) if (rule.re.test(lines[i])) hits.push(i + 1);
    if (hits.length < rule.min) return [];
  } else if (rule.kind === 'count') {
    for (let i = 0; i < lines.length; i++) if (rule.re.test(lines[i])) hits.push(i + 1);
    if (hits.length < rule.min) return [];
    return [hits[0]];
  } else if (rule.kind === 'file') {
    return rule.run(text, lines, ctx);
  }
  return hits;
}

function ruleApplies(rule, ext, only) {
  if (only && !only.has(rule.group)) return false;
  return (rule.exts || EXT[GROUP_EXT[rule.group]]).indexOf(ext) !== -1;
}

function fingerprint(rule, file, lineText, seen) {
  const base = rule + '|' + file + '|' + String(lineText || '').trim().slice(0, 160);
  const n = seen[base] = (seen[base] || 0) + 1;
  return crypto.createHash('sha1').update(base + '|' + n).digest('hex').slice(0, 12);
}

function run(target, opts, cwd) {
  opts = opts || {};
  const root = cwd || process.cwd();
  const abs = path.resolve(root, target || '.');
  let st;
  try { st = fs.statSync(abs); } catch (e) { throw new UsageError('Path not found: ' + target); }
  const files = st.isFile() ? [abs] : walk(abs, []);
  const allow = loadAllow(root);
  const findings = [];
  const skipped = [];
  const fpSeen = {};
  let scanned = 0;
  files.forEach(function (f) {
    const ext = path.extname(f).toLowerCase();
    const rel = relPath(root, f);
    const rules = RULES.filter(function (r) { return ruleApplies(r, ext, opts.only); });
    if (!rules.length) return;
    let text;
    try {
      if (fs.statSync(f).size > MAX_BYTES) { skipped.push({ file: rel, reason: 'larger than 1 MB' }); return; }
      text = fs.readFileSync(f, 'utf8');
    } catch (e) { skipped.push({ file: rel, reason: 'unreadable' }); return; }
    if (/clearslop-ignore-file:\s*\S+/.test(text.slice(0, 300))) return;
    scanned++;
    const lines = text.split(/\r?\n/);
    rules.forEach(function (r) {
      if (isAllowed(allow, r.id, rel)) return;
      const seen = {};
      evalRule(r, text, lines, rel).forEach(function (ln) {
        if (seen[ln]) return;
        seen[ln] = true;
        if (suppressed(lines, ln)) return;
        findings.push({ rule: r.id, level: r.level, file: rel, line: ln, title: r.title, fp: fingerprint(r.id, rel, lines[ln - 1], fpSeen) });
      });
    });
  });
  const counts = { block: 0, warn: 0, hint: 0 };
  let penalty = 0;
  findings.forEach(function (x) { counts[x.level]++; penalty += WEIGHT[x.level]; });
  const scale = Math.max(25, scanned * 4);
  const score = Math.round(100 / (1 + penalty / scale));
  findings.sort(function (a, b) {
    return ORDER[a.level] - ORDER[b.level] || (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || (a.rule < b.rule ? -1 : 1));
  });
  return { version: VERSION, target: relPath(root, abs) || '.', only: opts.only ? Array.from(opts.only).sort() : null, score: score, files: scanned, skipped: skipped, counts: counts, findings: findings };
}

function report(r, json, limit, out) {
  const log = out || console.log;
  if (json) { log(JSON.stringify(r, null, 2)); return; }
  const max = limit || 20;
  log('clearslop ' + VERSION + ': score ' + r.score + '/100  (' + r.files + ' files scanned)');
  log('block: ' + r.counts.block + '  warn: ' + r.counts.warn + '  hint: ' + r.counts.hint);
  r.findings.slice(0, max).forEach(function (x) {
    log('  [' + x.level + '] ' + x.rule + ' ' + x.file + ':' + x.line + '  ' + x.title);
  });
  if (r.findings.length > max) log('  ... ' + (r.findings.length - max) + ' more findings (use --json)');
  if (r.skipped.length) log('skipped: ' + r.skipped.length + ' file(s): ' + r.skipped.slice(0, 5).map(function (s) { return s.file + ' (' + s.reason + ')'; }).join(', '));
}

function baselinePath(root) { return path.join(root || process.cwd(), '.clearslop', 'baseline.json'); }

function makeBaseline(r) {
  return {
    version: VERSION,
    target: r.target,
    only: r.only,
    score: r.score,
    counts: r.counts,
    files: r.files,
    findings: r.findings.map(function (x) { return x.fp; }).sort(),
    savedAt: new Date().toISOString()
  };
}

// Compares a fresh scan with a stored baseline. Returns { ok, reasons, newFindings }.
function compare(base, r) {
  const reasons = [];
  if ((base.target || '.') !== r.target) throw new UsageError('Baseline was saved for target "' + base.target + '" but this scan targets "' + r.target + '". Run baseline again or scan the same target.');
  const bo = (base.only || []).join(',');
  const ro = (r.only || []).join(',');
  if (bo !== ro) throw new UsageError('Baseline was saved with --only "' + bo + '" but this scan uses "' + ro + '". Use the same options.');
  if (r.score < base.score) reasons.push('score dropped from ' + base.score + ' to ' + r.score);
  if (r.counts.block > base.counts.block) reasons.push('block findings increased from ' + base.counts.block + ' to ' + r.counts.block);
  const known = new Set(base.findings || []);
  const added = r.findings.filter(function (x) { return x.level !== 'hint' && !known.has(x.fp); });
  if (Array.isArray(base.findings) && added.length) reasons.push(added.length + ' new block or warn finding(s) not in the baseline');
  return { ok: reasons.length === 0, reasons: reasons, newFindings: added };
}

function parseArgs(argv) {
  const o = { cmd: argv[0], target: null, json: false, only: null, rest: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--only') {
      const v = argv[++i] || '';
      o.only = new Set(v.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
    } else if (a.indexOf('--') === 0) throw new UsageError('Unknown option: ' + a);
    else o.rest.push(a);
  }
  o.target = o.rest[0] || '.';
  if (o.only) o.only.forEach(function (g) { if (!GROUP_EXT[g]) throw new UsageError('Invalid --only group: ' + g + ' (ui, en, code)'); });
  return o;
}

const USAGE = 'clearslop ' + VERSION + '\nUsage:\n  init\n  scan [path] [--json] [--only ui,en,code]\n  baseline [path] [--only ...]\n  ratchet [path] [--only ...]\n  explain <RULE_ID>';

// Returns an exit code. All output goes through console so tests can capture it.
function main(argv, cwd) {
  const root = cwd || process.cwd();
  let o;
  try { o = parseArgs(argv); } catch (e) { if (e instanceof UsageError) { console.error(e.message); return 2; } throw e; }
  if (!o.cmd || o.cmd === '--help' || o.cmd === 'help') { console.log(USAGE); return o.cmd ? 0 : 2; }
  try {
    if (o.cmd === 'init') {
      const dir = path.join(root, '.clearslop');
      fs.mkdirSync(dir, { recursive: true });
      const ap = path.join(dir, 'allow.json');
      if (!fs.existsSync(ap)) fs.writeFileSync(ap, JSON.stringify({ allow: [] }, null, 2) + '\n');
      const hook = '#!/bin/sh\n# clearslop pre-commit: reject the commit if the slop score gets worse\nnode scanner/clearslop.js ratchet . || exit 1\n';
      fs.writeFileSync(path.join(dir, 'pre-commit.sample'), hook);
      console.log('Created: .clearslop/allow.json and .clearslop/pre-commit.sample');
      console.log('The hook is not installed. Copy pre-commit.sample to .git/hooks/pre-commit and adjust the path to the scanner if needed.');
      return 0;
    }
    if (o.cmd === 'explain') {
      const id = (o.rest[0] || '').toUpperCase();
      const r = RULES.filter(function (x) { return x.id === id; })[0];
      if (!r) throw new UsageError('Rule not found or it has no detector yet: ' + id);
      console.log(r.id + ' [' + r.level + '] ' + r.title + '\nFull guide: ' + RULE_DOC[r.group]);
      return 0;
    }
    if (o.cmd === 'scan') {
      const r = run(o.target, o, root);
      report(r, o.json);
      return r.counts.block > 0 ? 1 : 0;
    }
    if (o.cmd === 'baseline') {
      const r = run(o.target, o, root);
      fs.mkdirSync(path.dirname(baselinePath(root)), { recursive: true });
      fs.writeFileSync(baselinePath(root), JSON.stringify(makeBaseline(r), null, 2) + '\n');
      console.log('Baseline saved: score ' + r.score + ' (block ' + r.counts.block + ', target ' + r.target + ')');
      return 0;
    }
    if (o.cmd === 'ratchet') {
      if (!fs.existsSync(baselinePath(root))) throw new UsageError('No baseline yet. Run: baseline');
      let base;
      try { base = JSON.parse(fs.readFileSync(baselinePath(root), 'utf8')); } catch (e) { throw new UsageError('Baseline file is not valid JSON. Run baseline again.'); }
      const r = run(o.target, o, root);
      report(r, o.json, 10);
      const cmp = compare(base, r);
      cmp.newFindings.slice(0, 10).forEach(function (x) { console.log('  new: [' + x.level + '] ' + x.rule + ' ' + x.file + ':' + x.line + '  ' + x.title); });
      console.log('Ratchet: baseline ' + base.score + ' -> now ' + r.score + (cmp.ok ? '  OK' : '  WORSE (' + cmp.reasons.join('; ') + ')'));
      return cmp.ok ? 0 : 1;
    }
  } catch (e) {
    if (e instanceof UsageError) { console.error(e.message); return 2; }
    throw e;
  }
  console.log(USAGE);
  return 2;
}

module.exports = { run: run, main: main, compare: compare, parseArgs: parseArgs, isAllowed: isAllowed, makeBaseline: makeBaseline, VERSION: VERSION };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
