'use strict';
// Rule definitions for the clearslop scanner. Each rule is plain data plus a small matcher.

const CODE_EXT = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.php', '.go', '.rs', '.java', '.cs', '.sh', '.ps1'];
const CONFIG_EXT = ['.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.properties'];
const EXT = {
  ui: ['.css', '.scss', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'],
  text: ['.md', '.txt', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'],
  code: CODE_EXT
};
const GROUP_EXT = { ui: 'ui', en: 'text', code: 'code' };
const RULE_DOC = { ui: 'rules/ui.md', en: 'rules/copy-en.md', code: 'rules/code.md' };

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
  return /\b\d{1,3}(,\d{3})+\+?\s*(users|customers|downloads)|99\.9+%\s*uptime|\d+(\.\d+)?\s*ms\s*latency/i.test(l);
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
  return ['as an ai', 'let me ', 'this function does the following', 'here is the'].some(function (p) { return t.indexOf(p) !== -1; });
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

// Rules ported from the antislop rulebook, plus checks that only a machine can repeat exactly.
const HTML_EXT = ['.html', '.htm'];
const MARKUP_EXT = ['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte'];
const STYLE_EXT = ['.css', '.scss', '.html', '.htm', '.vue', '.svelte'];

function hexRgb(tok) {
  const t = String(tok).trim().toLowerCase();
  if (t === 'white') return [255, 255, 255];
  if (t === 'black') return [0, 0, 0];
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lum(rgb) {
  const c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(a, b) {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// WCAG AA check for one declaration block that sets both a text color and a background color.
function declContrast(decl) {
  const fg = /(?:^|[;\s{\x22\x27])color\s*:\s*(#[0-9a-fA-F]{3,6}\b|white\b|black\b)/i.exec(decl);
  const bg = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6}\b|white\b|black\b)/i.exec(decl);
  if (!fg || !bg) return null;
  const a = hexRgb(fg[1]);
  const b = hexRgb(bg[1]);
  if (!a || !b) return null;
  const size = /font-size\s*:\s*(\d+(?:\.\d+)?)px/i.exec(decl);
  return { ratio: contrastRatio(a, b), need: size && parseFloat(size[1]) >= 24 ? 3 : 4.5 };
}

fileRule('CS-UI-060', 'ui', 'warn', 'Text contrast below WCAG AA', function (text) {
  const hits = [];
  let m;
  const block = /\{([^{}]*)\}/g;
  while ((m = block.exec(text)) !== null) {
    const r = declContrast(m[1]);
    if (r && r.ratio < r.need) hits.push(lineAt(text, m.index));
  }
  const inline = /style\s*=\s*\x22([^\x22]*)\x22/g;
  while ((m = inline.exec(text)) !== null) {
    const r = declContrast(m[1]);
    if (r && r.ratio < r.need) hits.push(lineAt(text, m.index));
  }
  return hits;
}, { exts: STYLE_EXT });
lineRule('CS-UI-061', 'ui', 'warn', 'Image, video or iframe without width and height', function (l) {
  const m = /<(img|video|iframe)\b[^>]*>/i.exec(l);
  if (!m) return false;
  const t = m[0];
  if (/aspect-ratio|\bw-|\bh-|\bsize-/.test(t)) return false;
  return !(/\bwidth\s*=/.test(t) && /\bheight\s*=/.test(t));
}, { exts: MARKUP_EXT });
lineRule('CS-UI-062', 'ui', 'warn', 'Image without alt text', function (l) {
  const m = /<img\b[^>]*>/i.exec(l);
  return !!m && !/\balt\s*=|\{\.\.\./.test(m[0]);
}, { exts: MARKUP_EXT });
lineRule('CS-UI-063', 'ui', 'warn', 'Hero image loaded lazily', function (l) {
  return /<img\b[^>]*loading\s*=\s*[\x22\x27]lazy[\x22\x27]/i.test(l) && /hero|banner|above-the-fold|lcp/i.test(l);
}, { exts: MARKUP_EXT });
fileRule('CS-UI-064', 'ui', 'warn', 'Render-blocking script in head', function (text) {
  const hits = [];
  const head = /<head\b[\s\S]*?<\/head>/i.exec(text);
  if (!head) return hits;
  const re = /<script\b[^>]*\bsrc\s*=[^>]*>/gi;
  let m;
  while ((m = re.exec(head[0])) !== null) {
    if (!/\b(defer|async)\b|type\s*=\s*[\x22\x27]module/i.test(m[0])) hits.push(lineAt(text, head.index + m.index));
  }
  return hits;
}, { exts: HTML_EXT });
lineRule('CS-UI-065', 'ui', 'warn', 'Focus outline removed with no replacement', function (l, lines, i) {
  if (!/outline\s*:\s*(none|0)\b|outline-none/.test(l)) return false;
  const near = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
  return !/box-shadow|ring-|border|outline\s*:\s*[1-9]/.test(near);
});
lineRule('CS-UI-066', 'ui', 'warn', 'Clickable div or span instead of a button', function (l) {
  return /<(div|span|li)\b[^>]*\b(onClick|onclick|@click|v-on:click)\s*=/.test(l) && !/role\s*=\s*[\x22\x27]button/.test(l);
}, { exts: MARKUP_EXT });
lineRule('CS-UI-067', 'ui', 'warn', 'Link that goes nowhere', function (l) {
  return /<a\b[^>]*href\s*=\s*[\x22\x27](#|javascript:[^\x22\x27]*)[\x22\x27]/i.test(l);
}, { exts: MARKUP_EXT });
fileRule('CS-UI-068', 'ui', 'warn', 'Link to a section that does not exist', function (text) {
  const ids = new Set();
  let m;
  const idRe = /\b(?:id|name)\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]/g;
  while ((m = idRe.exec(text)) !== null) ids.add(m[1]);
  const hits = [];
  const hrefRe = /href\s*=\s*[\x22\x27]#([A-Za-z][\w:.-]*)[\x22\x27]/g;
  while ((m = hrefRe.exec(text)) !== null) if (!ids.has(m[1])) hits.push(lineAt(text, m.index));
  return hits;
}, { exts: HTML_EXT });
lineRule('CS-UI-069', 'ui', 'warn', 'Icon-only button without an accessible name', function (l) {
  return /<button\b(?![^>]*(?:aria-label|aria-labelledby|title)\s*=)[^>]*>\s*(?:<svg\b[\s\S]*?<\/svg>|<i\b[^>]*>\s*<\/i>)\s*<\/button>/i.test(l);
}, { exts: MARKUP_EXT });
lineRule('CS-UI-070', 'ui', 'warn', 'Viewport blocks zooming', function (l) {
  return /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(l);
}, { exts: HTML_EXT });
fileRule('CS-UI-071', 'ui', 'warn', 'Page without a lang attribute', function (text) {
  const m = /<html\b[^>]*>/i.exec(text);
  return m && !/\blang\s*=/i.test(m[0]) ? [lineAt(text, m.index)] : [];
}, { exts: HTML_EXT });
fileRule('CS-UI-072', 'ui', 'warn', 'Animation without prefers-reduced-motion', function (text) {
  if (/prefers-reduced-motion/.test(text)) return [];
  const m = /@keyframes\b|animation(?:-name)?\s*:/.exec(text);
  return m ? [lineAt(text, m.index)] : [];
}, { exts: STYLE_EXT });
lineRule('CS-UI-073', 'ui', 'hint', 'Full-viewport section height', function (l) {
  return /(?:^|[\s:;])(?:min-)?height\s*:\s*100vh\b|\bmin-h-screen\b|\bh-screen\b/.test(l);
});
lineRule('CS-UI-074', 'ui', 'hint', 'Grid with fixed pixel columns', function (l) {
  return /grid-template-columns\s*:[^;]*\b\d{3,4}px/.test(l) && !/minmax|auto-fit|auto-fill|\d+fr/.test(l);
});
lineRule('CS-UI-075', 'ui', 'hint', 'Decorative background grid or dot pattern', function (l) {
  return /\bbg-grid\b|grid-pattern|bg-\[size:|background-size\s*:\s*\d+px\s+\d+px/i.test(l);
});
fileRule('CS-UI-076', 'ui', 'hint', 'Fake terminal window', function (text) {
  const m = /traffic-?lights?|window-controls|terminal-dots|bg-red-[45]00[\s\S]{0,160}bg-yellow-[45]00[\s\S]{0,160}bg-green-[45]00/i.exec(text);
  return m ? [lineAt(text, m.index)] : [];
});
lineRule('CS-UI-077', 'ui', 'hint', 'Colored left stripe on a card', function (l) {
  return /border-l-[2-8]\s+border-(?:blue|purple|indigo|violet|pink|emerald|green|red|amber|cyan)-\d+/.test(l) || /border-left\s*:\s*[3-8]px\s+solid/i.test(l);
});
fileRule('CS-UI-078', 'ui', 'hint', 'Eyebrow badge above the headline', function (text) {
  const m = /<(?:span|div|p)\b[^>]*rounded-full[^>]*>[^<]{1,40}<\/(?:span|div|p)>\s*<h1\b/i.exec(text);
  return m ? [lineAt(text, m.index)] : [];
}, { exts: MARKUP_EXT });
countRule('CS-UI-079', 'ui', 'warn', 'Blur or glass effect on many elements', /backdrop-filter|backdrop-blur/, 4);
countRule('CS-UI-080', 'ui', 'hint', 'Decorative arrow on many buttons', /(?:\u2192|\u2197|&rarr;)\s*<\/(?:button|a)>|<(?:button|a)\b[^>]*>[^<]*(?:\u2192|\u2197)/, 4);
fileRule('CS-UI-081', 'ui', 'hint', 'Form field without a label', function (text) {
  const hits = [];
  const labelFor = new Set();
  let m;
  const lf = /<label\b[^>]*\b(?:for|htmlFor)\s*=\s*[\x22\x27{]+([^\x22\x27}]+)/g;
  while ((m = lf.exec(text)) !== null) labelFor.add(m[1]);
  const re = /<(input|textarea|select)\b[^>]*>/gi;
  while ((m = re.exec(text)) !== null) {
    const tag = m[0];
    if (/type\s*=\s*[\x22\x27](hidden|submit|button|reset|image)/i.test(tag)) continue;
    if (/aria-label|aria-labelledby|title\s*=|\{\.\.\./i.test(tag)) continue;
    const id = /\bid\s*=\s*[\x22\x27]([^\x22\x27]+)/.exec(tag);
    if (id && labelFor.has(id[1])) continue;
    const before = text.slice(Math.max(0, m.index - 200), m.index);
    if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) continue;
    hits.push(lineAt(text, m.index));
  }
  return hits;
}, { exts: MARKUP_EXT });

// Copy rules from the antislop copywriting skill.
lineRule('CS-EN-040', 'en', 'warn', 'Em dash in text', function (l) {
  return l.indexOf('\u2014') !== -1;
});
phr('CS-EN-041', 'en', 'warn', 'Chatbot closer', ['i hope this helps', 'let me know if you', 'would you like me to', 'feel free to ask']);
phr('CS-EN-042', 'en', 'hint', 'Fake-candid opener', ['honestly?', 'let\'s be honest', 'here\'s the thing', 'real talk']);
phr('CS-EN-043', 'en', 'warn', 'Signposting announcement', ['let\'s dive', 'here\'s what you need to know', 'without further ado', 'in this article we\'ll']);
phr('CS-EN-044', 'en', 'warn', 'Temporal runway cliche', ['in today\'s fast-paced', 'in today\'s digital', 'in today\'s world', 'in an increasingly']);
phr('CS-EN-045', 'en', 'hint', 'Weasel attribution', ['experts say', 'industry observers', 'leading analysts', 'many believe']);
phr('CS-EN-046', 'en', 'hint', 'Persuasive authority trope', ['at its core', 'the real question is', 'what really matters', 'the heart of the matter', 'the deeper issue']);
phr('CS-EN-047', 'en', 'warn', 'Theatrical takeaway', ['read that again', 'let that sink in', 'the takeaway is simple', 'here\'s the bottom line', 'the message is clear']);
phr('CS-EN-048', 'en', 'hint', 'Generic positive conclusion', ['the future looks bright', 'exciting times', 'step in the right direction']);
phr('CS-EN-049', 'en', 'hint', 'Filler phrase', ['in order to', 'due to the fact that', 'at this point in time', 'it is important to note that']);
lineRule('CS-EN-050', 'en', 'hint', 'Stacked hedging', function (l) {
  return /\b(could potentially|may perhaps|might possibly|possibly maybe)\b/i.test(l);
});

// Comment and script hygiene from the antislop code skill.
lineRule('CS-CD-009', 'code', 'warn', 'Workflow narration comment', function (l) {
  return isComment(l) && /^(?:step\s*\d+\s*[:.)-]|(?:first|next|then|finally)\s*[,:.])/i.test(commentText(l));
});
lineRule('CS-CD-010', 'code', 'hint', 'End-of-block marker comment', function (l) {
  if (/\}\s*(?:\/\/|#)\s*end\b/i.test(l)) return true;
  return isComment(l) && /^end (?:of )?(?:function|class|file|if|for|loop|module|block)\b|^end [A-Za-z_]+$/i.test(commentText(l));
});
lineRule('CS-CD-011', 'code', 'hint', 'Empty label comment', function (l) {
  return isComment(l) && /^(?:main|core|business) logic\.?$|^helper function\.?$|^entry point\.?$|^error handling\.?$|^note: this is important\.?$|^important: please read\.?$/i.test(commentText(l));
});
lineRule('CS-CD-012', 'code', 'hint', 'Vague TODO or placeholder comment', function (l) {
  return isComment(l) && /\b(?:todo|fixme)\b:?\s*(?:improve this|add more[a-z ]*|optimi[sz]e(?: this)?|clean up|fix this)\.?\s*$|future improvements|can be added here/i.test(l);
});
lineRule('CS-CD-013', 'code', 'hint', 'Doc comment that only echoes the signature', function (l) {
  return /@param\s+(?:\{[^}]*\}\s*)?(\w+)\s+(?:the\s+)?\1\.?\s*$/i.test(l);
});
lineRule('CS-CD-014', 'code', 'warn', 'Style file rewritten by a script', function (l) {
  return /\.s?css[\x22\x27][^\n]*(?:\.replace\(|re\.sub\()|(?:\.replace\(|re\.sub\()[^\n]*\.s?css[\x22\x27]/.test(l);
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
