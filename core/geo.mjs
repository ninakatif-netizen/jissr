// THE LIVING MAP: where in the Emirates the water stops.
// The demo cases carry no address, so each one is placed in an emirate by a fixed rule on its id
// (synthetic, weighted roughly by population). Everything else is computed from the same cases the
// care team works on: open cases, cases past their deadline, at which step they are stuck, who drops out.
import { slaClock, SLA_TIER } from './rules.mjs';

// Positions are a schematic of the Emirates (west to east, Gulf coast to Gulf of Oman), not a map.
export const EMIRATES = [
  { id: 'ad', name: 'Abu Dhabi', nameAr: 'أبوظبي', x: 250, y: 380, w: 26 },
  { id: 'ain', name: 'Al Ain', nameAr: 'العين', x: 470, y: 450, w: 9 },
  { id: 'dxb', name: 'Dubai', nameAr: 'دبي', x: 560, y: 255, w: 30 },
  { id: 'shj', name: 'Sharjah', nameAr: 'الشارقة', x: 610, y: 215, w: 14 },
  { id: 'ajm', name: 'Ajman', nameAr: 'عجمان', x: 632, y: 192, w: 5 },
  { id: 'uaq', name: 'Umm Al Quwain', nameAr: 'أم القيوين', x: 655, y: 165, w: 2 },
  { id: 'rak', name: 'Ras Al Khaimah', nameAr: 'رأس الخيمة', x: 720, y: 105, w: 7 },
  { id: 'fuj', name: 'Fujairah', nameAr: 'الفجيرة', x: 790, y: 240, w: 7 },
];
// The channels drawn between places (the care network, not roads).
export const CHANNELS = [
  ['ad', 'ain', 'M250 380C330 420 400 450 470 450'],
  ['ad', 'dxb', 'M250 380C380 360 470 300 560 255'],
  ['dxb', 'shj', 'M560 255C580 240 595 228 610 215'],
  ['shj', 'ajm', 'M610 215C620 205 626 198 632 192'],
  ['ajm', 'uaq', 'M632 192C640 182 648 172 655 165'],
  ['uaq', 'rak', 'M655 165C680 140 700 122 720 105'],
  ['rak', 'fuj', 'M720 105C760 150 780 200 790 240'],
  ['dxb', 'fuj', 'M560 255C650 250 720 245 790 240'],
];

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const TOTAL_W = EMIRATES.reduce((a, e) => a + e.w, 0);
export function emirateOf(c) {
  if (c.emirate) return c.emirate;
  let r = hash(c.id) % TOTAL_W;
  for (const e of EMIRATES) { if (r < e.w) return e.id; r -= e.w; }
  return EMIRATES[0].id;
}

// Where a stuck case is waiting, in words (from the step its deadline belongs to).
export const STEP_WHERE = {
  notified: 'Programme → patient: result not told',
  understood: 'Patient: understanding not confirmed',
  booked: 'Primary care: visit not booked',
  attended: 'Primary care: visit not done',
  referral_reply: 'Primary care → hospital: handshake not answered',
};
const LANG_NAME = { ar: 'Arabic', en: 'English', ur: 'Urdu', hi: 'Hindi', tl: 'Tagalog', ml: 'Malayalam', bn: 'Bengali' };

export function mapSummary(state, now = Date.now(), only = 'all') {
  const nodes = Object.fromEntries(EMIRATES.map((e) => [e.id, { ...e, open: 0, stuck: 0, closed: 0, total: 0 }]));
  const steps = {}, langs = {};
  for (const c of state.cases) {
    const em = emirateOf(c);
    const n = nodes[em]; n.total++;
    const k = c.stage === 'closed' ? null : slaClock(c, now);
    const late = !!k && k.tier === SLA_TIER.BREACHED;
    if (c.stage === 'closed') n.closed++; else n.open++;
    if (late) n.stuck++;
    // every place keeps its own numbers; the side panel only counts the place(s) chosen
    if (only !== 'all' && em !== only && !(only === 'ad' && em === 'ain')) continue;
    const lang = (c.patient && (c.patient.language || c.patient.lang)) || 'en';
    langs[lang] = langs[lang] || { total: 0, lost: 0 };
    langs[lang].total++;
    if (late) {
      steps[k.step] = (steps[k.step] || 0) + 1;
      if (['notified', 'understood', 'booked'].includes(k.step)) langs[lang].lost++;
    }
  }
  const list = Object.values(nodes);
  const pick = list.filter((n) => only === 'all' || n.id === only || (only === 'ad' && n.id === 'ain'));
  const sum = (f) => pick.reduce((a, n) => a + n[f], 0);
  const open = sum('open'), stuck = sum('stuck'), closed = sum('closed'), total = open + closed;
  const leakNode = [...list].filter((n) => n.stuck > 0).sort((a, b) => b.stuck / Math.max(1, b.open) - a.stuck / Math.max(1, a.open) || b.stuck - a.stuck)[0] || null;
  const leaks = Object.entries(steps).map(([step, n]) => ({ step, where: STEP_WHERE[step] || step, n })).sort((a, b) => b.n - a.n);
  const equity = Object.entries(langs).map(([code, v]) => ({ code, lang: LANG_NAME[code] || code, total: v.total, lost: v.lost, pct: v.total ? Math.round(v.lost / v.total * 100) : 0 })).sort((a, b) => b.total - a.total);
  return { nodes: list, open, stuck, closed, closure: total ? Math.round(closed / total * 100) : 0, leakNode, leaks, equity };
}
