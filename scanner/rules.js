'use strict';
// Rule definitions for the clearslop scanner. Each rule is plain data plus a small matcher.

const CODE_EXT = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.php', '.go', '.rs', '.java', '.cs', '.sh', '.ps1'];
const CONFIG_EXT = ['.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.properties'];
const EXT = {
  ui: ['.css', '.scss', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'],
  text: ['.md', '.txt', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'],
  code: CODE_EXT
};
const GROUP_EXT = { ui: 'ui', en: 'text', id: 'text', code: 'code' };
const RULE_DOC = { ui: 'rules/ui.md', en: 'rules/copy-en.md', id: 'rules/copy-id.md', code: 'rules/code.md' };

const WORD_BEFORE = /(?<![\p{L}\p{N}])/u.source;
const WORD_AFTER = /(?![\p{L}\p{N}])/u.source;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Phrases match case-insensitively on word boundaries.
// A trailing * allows any suffix, so 'leverag*' matches leverage, leveraged and leveraging.
function phraseRegex(list) {
  const parts = list.map(function (p) {
    let s = p.trim();
    const stem = s.charAt(s.length - 1) === '*';
    if (stem) s = s.slice(0, -1);
    let src = escapeRe(s);
    if (/^[\p{L}\p{N}]/u.test(s)) src = WORD_BEFORE + src;
    if (!stem && /[\p{L}\p{N}]$/u.test(s)) src += WORD_AFTER;
    return src;
  });
  return new RegExp(parts.join('|'), 'iu');
}

const RULES = [];
function add(id, group, level, title, kind, extra) {
  RULES.push(Object.assign({ id: id, group: group, level: level, title: title, kind: kind }, extra));
}
function phr(id, group, level, title, list, min) {
  add(id, group, level, title, 'phrases', { re: phraseRegex(list), min: min || 1 });
}
function lineRule(id, group, level, title, test, extra) {
  add(id, group, level, title, 'line', Object.assign({ test: test }, extra));
}
function countRule(id, group, level, title, re, min) {
  add(id, group, level, title, 'count', { re: re, min: min });
}
function fileRule(id, group, level, title, run, extra) {
  add(id, group, level, title, 'file', Object.assign({ run: run }, extra));
}

function lineAt(text, index) { return text.slice(0, index).split('\n').length; }

// Real emoji only. Text-style symbols such as the copyright sign or arrows are not matched.
const EMOJI_TAG_RE = /<(?:li|h[1-4]|button|label)\b[^>]*>\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)/u;
const EMOJI_LIST_RE = /^\s*(?:[-*]|#{1,4})\s*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)/u;
const EMOJI_LOG_RE = /(?:\/\/|#|console\.log|print\(|logger).*(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)/u;
const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

function rgbInfo(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { hue: -1, chroma: 0 };
  let hue;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return { hue: hue, chroma: d };
}

// Returns { hue, chroma } for a hex, rgb() or hsl() color, or null when it cannot be read.
function colorInfo(tok) {
  let m;
  tok = String(tok).trim();
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(tok))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(function (c) { return c + c; }).join('');
    else if (h.length === 8) h = h.slice(0, 6);
    else if (h.length !== 6) return null;
    return rgbInfo(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
  }
  if ((m = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/i.exec(tok))) {
    const ch = [m[1], m[2], m[3]].map(function (v) { return v.slice(-1) === '%' ? parseFloat(v) * 2.55 : parseFloat(v); });
    return rgbInfo(ch[0], ch[1], ch[2]);
  }
  if ((m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(tok))) {
    const s = parseFloat(m[2]) / 100;
    const l = parseFloat(m[3]) / 100;
    return { hue: ((parseFloat(m[1]) % 360) + 360) % 360, chroma: (1 - Math.abs(2 * l - 1)) * s };
  }
  return null;
}

function isComment(l) { return /^\s*(\/\/|#|\/\*|\*|--)/.test(l); }
function commentText(l) { return l.replace(/^\s*(\/\/+|#+|\/\*+|\*+|--)\s*/, '').trim(); }
function isCommentedCode(l) { return isComment(l) && /[;{}=)]\s*$/.test(l.trim()); }

// Test files, scripts and CLI entry points are allowed to print. Matches whole path segments only.
function isToolingPath(rel) {
  const parts = rel.toLowerCase().split('/');
  const file = parts.pop();
  const dirs = ['test', 'tests', '__tests__', 'spec', 'specs', 'cli', 'bin', 'script', 'scripts'];
  if (parts.some(function (p) { return dirs.indexOf(p) !== -1; })) return true;
  return /(^|[._-])(test|tests|spec|cli)([._-]|$)/.test(file);
}

// UI rules
fileRule('CS-UI-001', 'ui', 'warn', 'Purple-to-blue or purple-to-pink gradient', function (text) {
  const hits = [];
  let m;
  const tw = /from-(?:purple|violet|fuchsia)-\d+[^\x22\x27\x60<>]{0,200}?\bto-(?:blue|pink|indigo|cyan|fuchsia|rose)-\d+/g;
  while ((m = tw.exec(text)) !== null) hits.push(lineAt(text, m.index));
  const css = /(?:linear|radial|conic)-gradient\s*\(([^;{}]{0,400})/g;
  while ((m = css.exec(text)) !== null) {
    const colors = m[1].match(COLOR_RE) || [];
    const purple = colors.map(colorInfo).filter(function (c) { return c && c.chroma >= 0.15 && c.hue >= 250 && c.hue <= 320; });
    if (colors.length >= 2 && purple.length >= 1) hits.push(lineAt(text, m.index));
  }
  return hits;
});
lineRule('CS-UI-002', 'ui', 'warn', 'Gradient text (bg-clip-text)', function (l) {
  return (l.indexOf('bg-clip-text') !== -1 && l.indexOf('text-transparent') !== -1) || /background-clip\s*:\s*text/.test(l);
});
fileRule('CS-UI-003', 'ui', 'warn', 'Decorative colored glow', function (text, lines) {
  const hits = [];
  lines.forEach(function (l, i) {
    if (/shadow-(purple|violet|indigo|blue|pink|fuchsia|cyan|rose)-\d+\/\d+/.test(l)) hits.push(i + 1);
  });
  const decl = /(?:box-shadow|drop-shadow)\s*[:(]([^;{}]*)/gi;
  let m;
  while ((m = decl.exec(text)) !== null) {
    const shadow = /-?[\d.]+(?:px)?\s+-?[\d.]+(?:px)?\s+([\d.]+)px(?:\s+-?[\d.]+px)?\s+(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/g;
    let s;
    while ((s = shadow.exec(m[1])) !== null) {
      const info = colorInfo(s[2]);
      if (parseFloat(s[1]) >= 24 && info && info.chroma >= 0.25) { hits.push(lineAt(text, m.index)); break; }
    }
  }
  return hits;
});
lineRule('CS-UI-004', 'ui', 'hint', 'Decorative blurred blob', function (l) {
  const m = /filter\s*:\s*blur\((\d+)px\)/.exec(l);
  return l.indexOf('blur-3xl') !== -1 || (!!m && parseInt(m[1], 10) >= 60);
});
lineRule('CS-UI-006', 'ui', 'hint', 'Default dark slate-900 background', function (l) {
  return /bg-(slate|gray)-900/.test(l) || /#0f172a\b|#111827\b/i.test(l);
});
countRule('CS-UI-012', 'ui', 'warn', 'Uppercase wide-tracking labels everywhere', /uppercase[^\n]*tracking-(wide|wider|widest)|tracking-(wide|wider|widest)[^\n]*uppercase/, 4);
lineRule('CS-UI-020', 'ui', 'warn', 'Emoji used as a functional icon', function (l) {
  return EMOJI_TAG_RE.test(l);
});
lineRule('CS-UI-021', 'ui', 'warn', 'New, beta or AI badge pill', function (l) {
  return /rounded-full[^>]*>\s*[^<]{0,6}(new|beta|ai[- ]powered|v?2\.0|baru)\b/i.test(l);
});
lineRule('CS-UI-022', 'ui', 'warn', 'Sparkle icon as an AI marker', function (l) {
  return /<Sparkles\b|data-lucide=.sparkles|sparkles-icon|\u2728/.test(l);
});
countRule('CS-UI-030', 'ui', 'warn', 'Identical large radius on every element', /rounded-(2xl|3xl)/, 6);
countRule('CS-UI-032', 'ui', 'warn', 'Every section centered', /text-center|text-align\s*:\s*center/, 4);
countRule('CS-UI-040', 'ui', 'warn', 'Generic entrance animation on many elements', /fade-in|fade-up|animate-fade/, 6);
lineRule('CS-UI-042', 'ui', 'hint', 'Decorative pulse or bounce animation', function (l) {
  return /animate-(pulse|bounce)/.test(l) && !/skeleton|loading|spinner/i.test(l);
});
lineRule('CS-UI-050', 'ui', 'warn', 'Invented statistics on the page', function (l) {
  return /\b\d{1,3}(,\d{3})+\+?\s*(users|customers|pengguna|downloads|pelanggan)|99\.9+%\s*uptime|\d+(\.\d+)?\s*ms\s*latency/i.test(l);
});
phr('CS-UI-051', 'ui', 'block', 'Testimonial with an invented name', ['John Doe', 'Jane Smith', 'Sarah Johnson', 'Jane Doe']);
phr('CS-UI-052', 'ui', 'warn', 'Placeholder client logo', ['Acme', 'Globex', 'Initech']);
phr('CS-UI-053', 'ui', 'warn', 'Leftover placeholder text', ['lorem ipsum', 'your text here', 'your title here']);

// English copy
phr('CS-EN-001', 'en', 'warn', 'Generic era or world opener', ['fast-paced digital', 'ever-evolving', 'an era where']);
phr('CS-EN-002', 'en', 'warn', 'Empty summary closer', ['in conclusion,', 'in summary,']);
phr('CS-EN-003', 'en', 'warn', 'Cliche call to action', ['to the next level', 'unlock the power', 'start your journey']);
phr('CS-EN-004', 'en', 'hint', 'Pleasantry opener', ['great question!', 'be happy to help', 'certainly!', 'absolutely!']);
phr('CS-EN-010', 'en', 'warn', 'Superlative without evidence', ['revolutionar*', 'game-changing', 'game changing', 'cutting-edge', 'next-generation', 'world-class', 'best-in-class']);
phr('CS-EN-011', 'en', 'warn', 'Inflated verb', ['leverag*', 'harness the', 'unleash*', 'supercharg*', 'elevate your', 'empower*', 'streamlin*', 'seamless*']);
phr('CS-EN-012', 'en', 'hint', 'Favorite AI word', ['delv*', 'tapestry', 'testament to', 'realm of', 'navigate the complexities', 'multifaceted']);
phr('CS-EN-013', 'en', 'warn', 'Universal claim', ['for everyone', 'all your needs', 'everything you need', 'one-stop']);
lineRule('CS-EN-014', 'en', 'warn', 'Unsourced numeric claim', function (l) {
  return /\b(10x|\d{2,3}%\s+(faster|more accurate|accuracy))|save hours\b/i.test(l);
});
phr('CS-EN-020', 'en', 'warn', 'Repeated not-just contrast', ['not just', 'not only'], 3);
phr('CS-EN-024', 'en', 'hint', 'Chained transition words', ['moreover,', 'furthermore,', 'additionally,'], 4);
phr('CS-EN-025', 'en', 'warn', 'Self-explaining sentence', ['simply put,', 'this means that', 'in other words,'], 3);
lineRule('CS-EN-030', 'en', 'warn', 'All-caps heading or button with exclamation mark', function (l) {
  return /<(h[1-3]|button)[^>]*>\s*[A-Z0-9][A-Z0-9 ]{3,}!/.test(l);
});
lineRule('CS-EN-031', 'en', 'warn', 'Generic CTA button', function (l) {
  return /<button[^>]*>\s*(get started|learn more|click here|submit)\s*</i.test(l);
});
lineRule('CS-EN-032', 'en', 'warn', 'Emoji as list bullet or heading prefix', function (l) {
  return EMOJI_LIST_RE.test(l);
});
phr('CS-EN-033', 'en', 'hint', 'Artificially friendly error message', ['oops!', 'uh-oh!', 'whoops!']);
phr('CS-EN-034', 'en', 'hint', 'Generic placeholder text', ['enter your text here', 'type something...']);

// Indonesian copy. The trigger phrases are Indonesian on purpose: they are the data being detected.
phr('CS-ID-001', 'id', 'warn', 'Generic era opener', ['di era digital', 'di era modern', 'dalam dunia yang serba cepat', 'di tengah perkembangan teknologi']);
phr('CS-ID-002', 'id', 'warn', 'Empty summary closer', ['kesimpulannya,', 'sebagai kesimpulan,', 'secara keseluruhan,']);
phr('CS-ID-003', 'id', 'warn', 'Cliche call to action', ['ke level berikutnya', 'mulai perjalanan anda', 'wujudkan impian anda']);
phr('CS-ID-004', 'id', 'hint', 'Pleasantry opener', ['pertanyaan yang bagus', 'dengan senang hati saya akan membantu', 'tentu saja!']);
phr('CS-ID-005', 'id', 'warn', 'Generic exploration invitation', ['mari kita eksplorasi', 'mari kita selami', 'mari kita bahas lebih dalam', 'kita kupas tuntas']);
phr('CS-ID-010', 'id', 'warn', 'Superlative without evidence', ['revolusioner', 'terbaik di kelasnya', 'kelas dunia', 'mutakhir', 'terdepan']);
phr('CS-ID-011', 'id', 'warn', 'Inflated verb', ['memberdayakan', 'merevolusi', 'menghadirkan solusi', 'mengakselerasi', 'memaksimalkan', 'mengoptimalkan']);
phr('CS-ID-012', 'id', 'warn', 'Universal claim', ['untuk semua kebutuhan anda', 'solusi satu pintu', 'segala yang anda butuhkan', 'cocok untuk siapa saja']);
lineRule('CS-ID-013', 'id', 'warn', 'Unsourced numeric claim', function (l) {
  return /\b(10x|\d{2,3}%)\s*(lebih cepat|akurasi)|akurasi\s*\d{2,3}%|hemat waktu berjam/i.test(l);
});
phr('CS-ID-014', 'id', 'hint', 'Filler phrase', ['perlu diketahui bahwa', 'penting untuk dicatat bahwa', 'tak dapat dipungkiri', 'tidak bisa dipungkiri']);
phr('CS-ID-015', 'id', 'hint', 'Favorite AI word in Indonesian', ['holistik', 'sinergi', 'paradigma baru', 'transformasi digital', 'komprehensif']);
phr('CS-ID-020', 'id', 'warn', 'Repeated not-only contrast', ['bukan hanya', 'tidak hanya'], 3);
phr('CS-ID-023', 'id', 'warn', 'Literal translation of an English idiom', ['di akhir hari', 'langkah mundur', 'bola ada di tangan', 'mengubah permainan', 'di luar kotak']);
phr('CS-ID-024', 'id', 'hint', 'Chained transition words', ['selain itu,', 'lebih lanjut,', 'di samping itu,', 'oleh karena itu,'], 4);
phr('CS-ID-025', 'id', 'hint', 'Self-explaining sentence', ['artinya,', 'dengan kata lain,', 'singkatnya,'], 3);
lineRule('CS-ID-031', 'id', 'warn', 'Generic CTA button', function (l) {
  return /<button[^>]*>\s*(mulai sekarang|pelajari lebih lanjut|klik di sini|kirim)\s*</i.test(l);
});
phr('CS-ID-033', 'id', 'hint', 'Artificially friendly error message', ['ups!', 'waduh!', 'aduh!']);
phr('CS-ID-034', 'id', 'hint', 'Generic placeholder', ['masukkan teks anda di sini', 'ketik sesuatu...', 'judul di sini']);
phr('CS-ID-035', 'id', 'hint', 'Error message without a next step', ['terjadi kesalahan.']);

// Detectors below only read source text and never execute it, so they stay safe on untrusted files.
lineRule('CS-CD-001', 'code', 'warn', 'Comment repeats the next line', function (l, lines, i) {
  const m = /^\s*(?:\/\/|#)\s*([A-Za-z ]{6,40})$/.exec(l);
  if (!m || i + 1 >= lines.length) return false;
  const words = m[1].toLowerCase().match(/[a-z]{4,}/g) || [];
  if (words.length < 2 || words.length > 4) return false;
  const next = lines[i + 1].toLowerCase();
  const hit = words.filter(function (w) { return next.indexOf(w.slice(0, 4)) !== -1; }).length;
  return hit >= Math.ceil(words.length / 2);
});
lineRule('CS-CD-002', 'code', 'warn', 'Decorative divider banner', function (l) {
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
lineRule('CS-CD-003', 'code', 'warn', 'Emoji in a comment or log', function (l) {
  return EMOJI_LOG_RE.test(l);
});
lineRule('CS-CD-004', 'code', 'hint', 'Section marker comment with no meaning', function (l) {
  if (!isComment(l)) return false;
  const t = commentText(l).toLowerCase().replace(/[:.]$/, '');
  return ['imports', 'constants', 'helper functions', 'main function', 'variables', 'main', 'helpers'].indexOf(t) !== -1;
});
lineRule('CS-CD-005', 'code', 'warn', 'AI trace comment', function (l) {
  if (!isComment(l)) return false;
  const t = commentText(l).toLowerCase();
  return ['as an ai', 'let me ', 'this function does the following', 'berikut adalah', 'fungsi ini melakukan', 'here is the'].some(function (p) { return t.indexOf(p) !== -1; });
});
lineRule('CS-CD-007', 'code', 'warn', 'TODO or FIXME without context', function (l) {
  return isComment(l) && /\b(TODO|FIXME)\b\s*:?\s*(\*\/)?\s*$/.test(l);
});
lineRule('CS-CD-008', 'code', 'hint', 'Commented-out code left behind', function (l, lines, i) {
  const prev = i > 0 ? lines[i - 1] : '';
  return isCommentedCode(l) && i + 2 < lines.length && isCommentedCode(lines[i + 1]) && isCommentedCode(lines[i + 2]) && !isCommentedCode(prev);
});
fileRule('CS-CD-020', 'code', 'warn', 'Catch or except block that swallows errors', function (text) {
  const hits = [];
  const res = [
    /catch\s*(?:\([^)]*\))?\s*\{\s*(?:console\.log\([^)]*\);?\s*)?\}/g,
    /except[^\n]*:[ \t]*\r?\n[ \t]*(?:pass|print\([^)]*\))[ \t]*(?:\r?\n|$)/g
  ];
  res.forEach(function (re) {
    let m;
    while ((m = re.exec(text)) !== null) hits.push(lineAt(text, m.index));
  });
  return hits;
});

const SECRET_TOKEN_RE = /(?<![A-Za-z0-9])sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/;
const SECRET_ASSIGN_RE = /(api[_-]?key|password|passwd|secret|token)[\x22\x27]?\s*[:=]\s*[\x22\x27]([^\x22\x27\s]{8,})[\x22\x27]/i;
const PLACEHOLDER_VALUE_RE = /^(?:your|example|changeme|change-me|placeholder|dummy|sample|x{3,}|\*{3,}|<.*>|\$\{.*\}|\{\{.*\}\}|%.*%)/i;
lineRule('CS-CD-026', 'code', 'block', 'Hardcoded secret or key', function (l) {
  if (SECRET_TOKEN_RE.test(l)) return true;
  const m = SECRET_ASSIGN_RE.exec(l);
  if (!m) return false;
  if (m[2].toLowerCase() === m[1].toLowerCase()) return false;
  return !PLACEHOLDER_VALUE_RE.test(m[2]);
}, { exts: CODE_EXT.concat(CONFIG_EXT) });
lineRule('CS-CD-027', 'code', 'hint', 'Leftover debug console.log', function (l, lines, i, ctx) {
  if (isToolingPath(ctx.rel)) return false;
  if (/^#!/.test(lines[0] || '')) return false;
  return /^\s*console\.log\(/.test(l);
});

module.exports = {
  RULES: RULES,
  EXT: EXT,
  GROUP_EXT: GROUP_EXT,
  RULE_DOC: RULE_DOC,
  colorInfo: colorInfo,
  isToolingPath: isToolingPath,
  phraseRegex: phraseRegex
};
