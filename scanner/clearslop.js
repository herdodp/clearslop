#!/usr/bin/env node
'use strict';
// clearslop scanner: deterministic slop detector. Zero dependencies.
const fs = require('fs');
const path = require('path');

const VERSION = '0.1.0';
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.clearslop', '.snapgent', '__pycache__', '.venv', 'venv', 'vendor', 'clearslop']);
const EXT = {
  ui: ['.css', '.scss', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'],
  text: ['.md', '.txt', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'],
  code: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.php', '.go', '.rs', '.java', '.cs', '.sh', '.ps1']
};
const GROUP_EXT = { ui: 'ui', en: 'text', id: 'text', code: 'code' };
const RULE_DOC = { ui: 'rules/ui.md', en: 'rules/copy-en.md', id: 'rules/copy-id.md', code: 'rules/code.md' };
const WEIGHT = { block: 5, warn: 2, hint: 0.5 };
const ORDER = { block: 0, warn: 1, hint: 2 };
const EMOJI = /\p{Extended_Pictographic}/u;
const RULES = [];

function phr(id, group, level, title, list, min) {
  RULES.push({ id: id, group: group, level: level, title: title, kind: 'phrases', list: list, min: min || 1 });
}
function lineRule(id, group, level, title, test) {
  RULES.push({ id: id, group: group, level: level, title: title, kind: 'line', test: test });
}
function countRule(id, group, level, title, re, min) {
  RULES.push({ id: id, group: group, level: level, title: title, kind: 'count', re: re, min: min });
}
function fileRule(id, group, level, title, runFn) {
  RULES.push({ id: id, group: group, level: level, title: title, kind: 'file', run: runFn });
}

function hueOf(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.15) return -1;
  let hue;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hue;
}

function isComment(l) { return /^\s*(\/\/|#|\/\*|\*|--)/.test(l); }
function commentText(l) { return l.replace(/^\s*(\/\/+|#+|\/\*+|\*+|--)\s*/, '').trim(); }
function isCommentedCode(l) { return isComment(l) && /[;{}=)]\s*$/.test(l.trim()); }

// UI rules
lineRule('CS-UI-001', 'ui', 'warn', 'Gradien ungu ke biru/pink', function (l) {
  if (/from-(purple|violet|fuchsia)-\d+/.test(l) && /to-(blue|pink|indigo|cyan|fuchsia|rose)-\d+/.test(l)) return true;
  if (l.indexOf('gradient') === -1) return false;
  const hexes = l.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
  const purple = hexes.map(hueOf).filter(function (h) { return h >= 250 && h <= 320; });
  return hexes.length >= 2 && purple.length >= 1;
});
lineRule('CS-UI-002', 'ui', 'warn', 'Teks gradien (bg-clip-text)', function (l) {
  return (l.indexOf('bg-clip-text') !== -1 && l.indexOf('text-transparent') !== -1) || /background-clip\s*:\s*text/.test(l);
});
lineRule('CS-UI-003', 'ui', 'warn', 'Glow dekoratif', function (l) {
  if (/shadow-(purple|violet|indigo|blue|pink|fuchsia|cyan|rose)-\d+\/\d+/.test(l)) return true;
  const m = /(?:box-shadow|drop-shadow)[^;]*?-?\d+px\s+-?\d+px\s+(\d+)px\s+(?:rgba?\(|#)/.exec(l);
  return !!m && parseInt(m[1], 10) >= 24 && !/rgba\(\s*0\s*,\s*0\s*,\s*0/.test(l);
});
lineRule('CS-UI-004', 'ui', 'hint', 'Blob blur dekoratif', function (l) {
  const m = /filter\s*:\s*blur\((\d+)px\)/.exec(l);
  return l.indexOf('blur-3xl') !== -1 || (!!m && parseInt(m[1], 10) >= 60);
});
lineRule('CS-UI-006', 'ui', 'hint', 'Latar gelap slate-900 bawaan', function (l) {
  return /bg-(slate|gray)-900/.test(l) || /#0f172a\b|#111827\b/i.test(l);
});
countRule('CS-UI-012', 'ui', 'warn', 'Label uppercase tracking-wide di mana-mana', /uppercase[^\n]*tracking-(wide|wider|widest)|tracking-(wide|wider|widest)[^\n]*uppercase/, 4);
lineRule('CS-UI-020', 'ui', 'block', 'Emoji sebagai ikon fungsional', function (l) {
  return /<(li|h[1-4]|button|label)\b[^>]*>\s*\p{Extended_Pictographic}/u.test(l);
});
lineRule('CS-UI-021', 'ui', 'warn', 'Pil lencana baru/beta/AI', function (l) {
  return /rounded-full[^>]*>\s*[^<]{0,6}(new|beta|ai[- ]powered|v?2\.0|baru)\b/i.test(l);
});
lineRule('CS-UI-022', 'ui', 'warn', 'Ikon sparkle sebagai penanda AI', function (l) {
  return /<Sparkles\b|data-lucide=.sparkles|sparkles-icon|\u2728/.test(l);
});
countRule('CS-UI-030', 'ui', 'warn', 'Radius besar identik di semua elemen', /rounded-(2xl|3xl)/, 6);
countRule('CS-UI-032', 'ui', 'warn', 'Semua section rata tengah', /text-center|text-align\s*:\s*center/, 4);
countRule('CS-UI-040', 'ui', 'warn', 'Animasi masuk generik pada banyak elemen', /fade-in|fade-up|animate-fade/, 6);
lineRule('CS-UI-042', 'ui', 'hint', 'Animasi pulse/bounce dekoratif', function (l) {
  return /animate-(pulse|bounce)/.test(l) && !/skeleton|loading|spinner/i.test(l);
});
lineRule('CS-UI-050', 'ui', 'block', 'Statistik karangan pada halaman', function (l) {
  return /\b\d{1,3}(,\d{3})+\+?\s*(users|customers|pengguna|downloads|pelanggan)|99\.9+%\s*uptime|\d+(\.\d+)?\s*ms\s*latency/i.test(l);
});
phr('CS-UI-051', 'ui', 'block', 'Testimoni dengan nama karangan', ['John Doe', 'Jane Smith', 'Sarah Johnson', 'Jane Doe']);
phr('CS-UI-052', 'ui', 'block', 'Logo klien placeholder', ['Acme', 'Globex', 'Initech']);
phr('CS-UI-053', 'ui', 'warn', 'Teks isian sisa', ['lorem ipsum', 'your text here', 'your title here']);

// English copy
phr('CS-EN-001', 'en', 'warn', 'Pembuka era/dunia generik', ['fast-paced digital', 'ever-evolving', 'an era where']);
phr('CS-EN-002', 'en', 'warn', 'Penutup rangkuman kosong', ['in conclusion,', 'in summary,']);
phr('CS-EN-003', 'en', 'warn', 'Ajakan klise', ['to the next level', 'unlock the power', 'start your journey']);
phr('CS-EN-004', 'en', 'hint', 'Basa-basi pembuka', ['great question!', 'be happy to help', 'certainly!']);
phr('CS-EN-010', 'en', 'warn', 'Superlatif tanpa bukti', ['revolutionary', 'game-changing', 'game changing', 'cutting-edge', 'next-generation', 'world-class', 'best-in-class']);
phr('CS-EN-011', 'en', 'warn', 'Kata kerja berlebihan', ['leverage', 'harness the', 'unleash', 'supercharge', 'elevate your', 'empower', 'streamline', 'seamlessly']);
phr('CS-EN-012', 'en', 'hint', 'Kata favorit AI', ['delve', 'tapestry', 'testament to', 'navigate the complexities', 'multifaceted']);
phr('CS-EN-013', 'en', 'warn', 'Klaim universal', ['for everyone', 'all your needs', 'everything you need', 'one-stop']);
lineRule('CS-EN-014', 'en', 'block', 'Klaim angka tanpa sumber', function (l) {
  return /\b(10x|\d{2,3}%\s+(faster|more accurate|accuracy))|save hours\b/i.test(l);
});
phr('CS-EN-020', 'en', 'warn', 'Kontras not-just berulang', [' not just ', 'not only '], 3);
phr('CS-EN-024', 'en', 'hint', 'Kata sambung berantai', ['moreover,', 'furthermore,', 'additionally,'], 4);
lineRule('CS-EN-030', 'en', 'warn', 'Judul/tombol kapital semua dengan seru', function (l) {
  return /<(h[1-3]|button)[^>]*>\s*[A-Z0-9][A-Z0-9 ]{3,}!/.test(l);
});
lineRule('CS-EN-031', 'en', 'warn', 'Tombol CTA generik', function (l) {
  return /<button[^>]*>\s*(get started|learn more|click here|submit)\s*</i.test(l);
});
lineRule('CS-EN-032', 'en', 'warn', 'Emoji sebagai poin daftar/judul', function (l) {
  return /^\s*([-*]|#{1,4})\s*\p{Extended_Pictographic}/u.test(l);
});
phr('CS-EN-033', 'en', 'hint', 'Pesan galat dibuat-buat ramah', ['oops!', 'uh-oh!', 'whoops!']);

// Indonesian copy
phr('CS-ID-001', 'id', 'warn', 'Pembuka era/zaman generik', ['di era digital', 'di era modern', 'dalam dunia yang serba cepat', 'di tengah perkembangan teknologi']);
phr('CS-ID-002', 'id', 'warn', 'Penutup rangkuman kosong', ['kesimpulannya,', 'sebagai kesimpulan,', 'secara keseluruhan,']);
phr('CS-ID-003', 'id', 'warn', 'Ajakan klise', ['ke level berikutnya', 'mulai perjalanan anda', 'wujudkan impian anda']);
phr('CS-ID-004', 'id', 'hint', 'Basa-basi pembuka', ['pertanyaan yang bagus', 'dengan senang hati saya akan membantu', 'tentu saja!']);
phr('CS-ID-005', 'id', 'warn', 'Ajakan eksplorasi generik', ['mari kita eksplorasi', 'mari kita selami', 'mari kita bahas lebih dalam', 'kita kupas tuntas']);
phr('CS-ID-010', 'id', 'warn', 'Superlatif tanpa bukti', ['revolusioner', 'terbaik di kelasnya', 'kelas dunia', 'mutakhir', 'terdepan']);
phr('CS-ID-011', 'id', 'warn', 'Kata kerja berlebihan', ['memberdayakan', 'merevolusi', 'menghadirkan solusi', 'mengakselerasi', 'memaksimalkan']);
phr('CS-ID-012', 'id', 'warn', 'Klaim universal', ['untuk semua kebutuhan anda', 'solusi satu pintu', 'segala yang anda butuhkan', 'cocok untuk siapa saja']);
lineRule('CS-ID-013', 'id', 'block', 'Klaim angka tanpa sumber', function (l) {
  return /\b(10x|\d{2,3}%)\s*(lebih cepat|akurasi)|akurasi\s*\d{2,3}%|hemat waktu berjam/i.test(l);
});
phr('CS-ID-014', 'id', 'hint', 'Frasa pengisi', ['perlu diketahui bahwa', 'penting untuk dicatat bahwa', 'tak dapat dipungkiri', 'tidak bisa dipungkiri']);
phr('CS-ID-015', 'id', 'hint', 'Kata favorit AI berbahasa Indonesia', ['holistik', 'sinergi', 'paradigma baru', 'transformasi digital', 'komprehensif']);
phr('CS-ID-020', 'id', 'warn', 'Kontras bukan-hanya berulang', ['bukan hanya', 'tidak hanya'], 3);
phr('CS-ID-023', 'id', 'warn', 'Terjemahan harfiah idiom Inggris', ['di akhir hari', 'langkah mundur', 'bola ada di tangan', 'mengubah permainan', 'di luar kotak']);
phr('CS-ID-024', 'id', 'hint', 'Kata sambung berantai', ['selain itu,', 'lebih lanjut,', 'di samping itu,', 'oleh karena itu,'], 4);
phr('CS-ID-033', 'id', 'hint', 'Pesan galat dibuat-buat ramah', ['ups!', 'waduh!', 'aduh!']);
phr('CS-ID-034', 'id', 'hint', 'Placeholder generik', ['masukkan teks anda di sini', 'ketik sesuatu...', 'judul di sini']);
phr('CS-ID-035', 'id', 'hint', 'Pesan galat tanpa tindakan lanjut', ['terjadi kesalahan.']);

// Deteksi kode
lineRule('CS-CD-001', 'code', 'warn', 'Komentar mengulang baris di bawahnya', function (l, lines, i) {
  const m = /^\s*(?:\/\/|#)\s*([A-Za-z ]{6,40})$/.exec(l);
  if (!m || i + 1 >= lines.length) return false;
  const words = m[1].toLowerCase().match(/[a-z]{4,}/g) || [];
  if (words.length < 2 || words.length > 4) return false;
  const next = lines[i + 1].toLowerCase();
  const hit = words.filter(function (w) { return next.indexOf(w.slice(0, 4)) !== -1; }).length;
  return hit >= Math.ceil(words.length / 2);
});
lineRule('CS-CD-002', 'code', 'warn', 'Spanduk pemisah dekoratif', function (l) {
  if (!isComment(l)) return false;
  const raw = l.trim();
  if (raw.length < 10) return false;
  let run = 1;
  let best = 1;
  let bestCh = raw[0];
  for (let k = 1; k < raw.length; k++) {
    if (raw[k] === raw[k - 1]) { run++; if (run > best) { best = run; bestCh = raw[k]; } } else run = 1;
  }
  const box = (raw.match(/[\u2500-\u257f]/g) || []).length;
  return (best >= 10 && '=-*#_~'.indexOf(bestCh) !== -1) || box >= 3;
});
lineRule('CS-CD-003', 'code', 'warn', 'Emoji di komentar atau log', function (l) {
  return /(\/\/|#|console\.log|print\(|logger).*\p{Extended_Pictographic}/u.test(l);
});
lineRule('CS-CD-004', 'code', 'hint', 'Komentar penanda bagian kosong makna', function (l) {
  if (!isComment(l)) return false;
  const t = commentText(l).toLowerCase().replace(/[:.]$/, '');
  return ['imports', 'constants', 'helper functions', 'main function', 'variables', 'main', 'helpers'].indexOf(t) !== -1;
});
lineRule('CS-CD-005', 'code', 'warn', 'Komentar jejak AI', function (l) {
  if (!isComment(l)) return false;
  const t = commentText(l).toLowerCase();
  return ['as an ai', 'let me ', 'this function does the following', 'berikut adalah', 'fungsi ini melakukan', 'here is the'].some(function (p) { return t.indexOf(p) !== -1; });
});
lineRule('CS-CD-007', 'code', 'block', 'TODO/FIXME tanpa konteks', function (l) {
  return isComment(l) && /\b(TODO|FIXME)\b\s*:?\s*(\*\/)?\s*$/.test(l);
});
lineRule('CS-CD-008', 'code', 'hint', 'Kode yang dikomentari dibiarkan', function (l, lines, i) {
  const prev = i > 0 ? lines[i - 1] : '';
  return isCommentedCode(l) && i + 2 < lines.length && isCommentedCode(lines[i + 1]) && isCommentedCode(lines[i + 2]) && !isCommentedCode(prev);
});
fileRule('CS-CD-020', 'code', 'warn', 'Blok catch/except yang menelan galat', function (text) {
  const hits = [];
  const res = [/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g, /except[^\n]*:[ \t]*\r?\n[ \t]*pass\b/g];
  res.forEach(function (re) {
    let m;
    while ((m = re.exec(text)) !== null) hits.push(text.slice(0, m.index).split('\n').length);
  });
  return hits;
});
lineRule('CS-CD-026', 'code', 'block', 'Rahasia atau kunci tertanam', function (l) {
  if (/sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}/.test(l)) return true;
  return /(api[_-]?key|password|secret|token)\s*[:=]\s*[\x22\x27][^\x22\x27\s]{8,}[\x22\x27]/i.test(l) && !/process\.env|os\.environ|getenv|example|changeme|placeholder|your[_-]/i.test(l);
});
lineRule('CS-CD-027', 'code', 'hint', 'console.log debug tertinggal', function (l, lines, i, ctx) {
  if (/(test|spec|cli|bin|scripts?)/.test(ctx.rel.toLowerCase())) return false;
  if (/^#!/.test(lines[0] || '')) return false;
  return /^\s*console\.log\(/.test(l);
});

// Engine
function fail(msg) { console.error(msg); process.exit(2); }
function relPath(root, f) { return path.relative(root, f).split(path.sep).join('/'); }
function suppressed(l) { return /clearslop-ignore:\s*\S+/.test(l); }

function walk(dir, acc) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
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
    return (j.allow || []).filter(function (a) { return a && a.rule && a.reason; });
  } catch (e) { return []; }
}
function isAllowed(allow, id, rel) {
  return allow.some(function (a) { return a.rule === id && (!a.path || rel.indexOf(a.path) === 0); });
}

function evalRule(rule, text, lines, rel) {
  const hits = [];
  const ctx = { rel: rel };
  if (rule.kind === 'line') {
    for (let i = 0; i < lines.length; i++) if (rule.test(lines[i], lines, i, ctx)) hits.push(i + 1);
  } else if (rule.kind === 'phrases') {
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase();
      const raw = lines[i];
      const found = rule.list.some(function (p) { return low.indexOf(p.toLowerCase()) !== -1 || raw.indexOf(p) !== -1; });
      if (found) hits.push(i + 1);
    }
    if (hits.length < rule.min) return [];
  } else if (rule.kind === 'count') {
    for (let i = 0; i < lines.length; i++) if (rule.re.test(lines[i])) hits.push(i + 1);
    if (hits.length < rule.min) return [];
    return [hits[0]];
  } else if (rule.kind === 'file') {
    return rule.run(text, lines);
  }
  return hits;
}

function run(target, opts) {
  const root = process.cwd();
  const abs = path.resolve(root, target || '.');
  let st;
  try { st = fs.statSync(abs); } catch (e) { fail('Path tidak ditemukan: ' + target); }
  const files = st.isFile() ? [abs] : walk(abs, []);
  const allow = loadAllow(root);
  const findings = [];
  let scanned = 0;
  files.forEach(function (f) {
    const ext = path.extname(f).toLowerCase();
    const rel = relPath(root, f);
    const rules = RULES.filter(function (r) {
      return (!opts.only || opts.only.has(r.group)) && EXT[GROUP_EXT[r.group]].indexOf(ext) !== -1;
    });
    if (!rules.length) return;
    let text;
    try {
      if (fs.statSync(f).size > 1048576) return;
      text = fs.readFileSync(f, 'utf8');
    } catch (e) { return; }
    if (/clearslop-ignore-file/.test(text.slice(0, 300))) return;
    scanned++;
    const lines = text.split(/\r?\n/);
    rules.forEach(function (r) {
      if (isAllowed(allow, r.id, rel)) return;
      const seen = {};
      evalRule(r, text, lines, rel).forEach(function (ln) {
        if (seen[ln]) return;
        seen[ln] = true;
        if (suppressed(lines[ln - 1] || '') || suppressed(lines[ln - 2] || '')) return;
        findings.push({ rule: r.id, level: r.level, file: rel, line: ln, title: r.title });
      });
    });
  });
  const counts = { block: 0, warn: 0, hint: 0 };
  let penalty = 0;
  findings.forEach(function (x) { counts[x.level]++; penalty += WEIGHT[x.level]; });
  const scale = Math.max(25, scanned * 4);
  const score = Math.round(100 / (1 + penalty / scale));
  findings.sort(function (a, b) { return ORDER[a.level] - ORDER[b.level] || (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line); });
  return { version: VERSION, score: score, files: scanned, counts: counts, findings: findings };
}

function report(r, json, limit) {
  if (json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log('clearslop ' + VERSION + ': skor ' + r.score + '/100  (' + r.files + ' berkas dipindai)');
  console.log('block: ' + r.counts.block + '  warn: ' + r.counts.warn + '  hint: ' + r.counts.hint);
  r.findings.slice(0, limit || 20).forEach(function (x) {
    console.log('  [' + x.level + '] ' + x.rule + ' ' + x.file + ':' + x.line + '  ' + x.title);
  });
  if (r.findings.length > (limit || 20)) console.log('  ... ' + (r.findings.length - (limit || 20)) + ' temuan lain (gunakan --json)');
}

function baselinePath() { return path.join(process.cwd(), '.clearslop', 'baseline.json'); }

function parseArgs(argv) {
  const o = { cmd: argv[0], target: null, json: false, only: null, rest: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--only') {
      const v = argv[++i] || '';
      o.only = new Set(v.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
    } else if (a.indexOf('--') === 0) fail('Opsi tidak dikenal: ' + a);
    else o.rest.push(a);
  }
  o.target = o.rest[0] || '.';
  if (o.only) o.only.forEach(function (g) { if (!GROUP_EXT[g]) fail('Grup --only tidak valid: ' + g + ' (ui, en, id, code)'); });
  return o;
}

function usage() {
  console.log('clearslop ' + VERSION + '\nPenggunaan:\n  init\n  scan [path] [--json] [--only ui,en,id,code]\n  baseline [path]\n  ratchet [path]\n  explain <RULE_ID>');
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.cmd || o.cmd === '--help' || o.cmd === 'help') { usage(); process.exit(o.cmd ? 0 : 2); }
  if (o.cmd === 'init') {
    const dir = path.join(process.cwd(), '.clearslop');
    fs.mkdirSync(dir, { recursive: true });
    const ap = path.join(dir, 'allow.json');
    if (!fs.existsSync(ap)) fs.writeFileSync(ap, JSON.stringify({ allow: [] }, null, 2) + '\n');
    const hook = '#!/bin/sh\n# clearslop pre-commit: tolak commit jika skor memburuk\nnode .snapgent/skills/clearslop/scanner/clearslop.js ratchet || exit 1\n';
    fs.writeFileSync(path.join(dir, 'pre-commit.sample'), hook);
    console.log('Dibuat: .clearslop/allow.json dan .clearslop/pre-commit.sample');
    console.log('Hook belum dipasang. Salin pre-commit.sample ke .git/hooks/pre-commit bila setuju.');
    process.exit(0);
  }
  if (o.cmd === 'explain') {
    const id = (o.rest[0] || '').toUpperCase();
    const r = RULES.filter(function (x) { return x.id === id; })[0];
    if (!r) fail('Aturan tidak ditemukan atau belum punya detektor: ' + id);
    console.log(r.id + ' [' + r.level + '] ' + r.title + '\nPanduan lengkap: ' + RULE_DOC[r.group]);
    process.exit(0);
  }
  if (o.cmd === 'scan') {
    const r = run(o.target, o);
    report(r, o.json);
    process.exit(r.counts.block > 0 ? 1 : 0);
  }
  if (o.cmd === 'baseline') {
    const r = run(o.target, o);
    fs.mkdirSync(path.dirname(baselinePath()), { recursive: true });
    fs.writeFileSync(baselinePath(), JSON.stringify({ version: VERSION, score: r.score, counts: r.counts, files: r.files, savedAt: new Date().toISOString() }, null, 2) + '\n');
    console.log('Baseline disimpan: skor ' + r.score + ' (block ' + r.counts.block + ')');
    process.exit(0);
  }
  if (o.cmd === 'ratchet') {
    if (!fs.existsSync(baselinePath())) fail('Baseline belum ada. Jalankan: baseline');
    const b = JSON.parse(fs.readFileSync(baselinePath(), 'utf8'));
    const r = run(o.target, o);
    report(r, o.json, 10);
    const worse = r.score < b.score || r.counts.block > b.counts.block;
    console.log('Ratchet: baseline ' + b.score + ' -> sekarang ' + r.score + (worse ? '  MEMBURUK' : '  OK'));
    process.exit(worse ? 1 : 0);
  }
  usage();
  process.exit(2);
}

main();
