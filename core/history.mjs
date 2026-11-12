// CARE HISTORY ACROSS HOSPITALS, and the patient's Falaj Health ID.
// SYNTHETIC ONLY: every facility, visit and finding below is invented for the demo. Facility names are
// letters on purpose (Family Clinic A, General Hospital C...) so that no real hospital is represented.
// In a pilot, this history would come from the emirate's health information exchange, not from Falaj.
import { addDays } from './rules.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (d) => (d ? new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

// ---- the Falaj Health ID: not the national ID, a number that only means something inside Falaj ----
export const healthId = (c) => `FLJ-${String(c.resultDay || '').slice(0, 4) || '2026'}-${String(c.id).replace(/\D/g, '').padStart(4, '0')}`;
export function parseHealthId(text) {
  const m = String(text || '').toUpperCase().replace(/\s+/g, '').match(/^(?:FLJ-?)?(\d{4})-?(\d{1,4})$/);
  return m ? { year: m[1], n: Number(m[2]) } : null;
}
// The link a QR code holds: it opens the doctor's lookup with the ID filled in. The name is still needed.
export const lookupLink = (origin, c) => `${origin}/app.html#find=${healthId(c)}`;

const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
// A doctor needs BOTH the ID and the patient's name. Every name typed must be in the patient's name,
// and at least two names (first and family name) must be given. One message for every failure, so a
// wrong guess does not tell anyone which part was right.
export function findPatient(state, id, name) {
  const p = parseHealthId(id), typed = words(name);
  if (!p) return { error: 'id', message: 'Type the Health ID as it is on the card, for example FLJ-2026-0040.' };
  if (typed.length < 2) return { error: 'name', message: 'Type the first name and the family name.' };
  const c = state.cases.find((x) => healthId(x) === `FLJ-${p.year}-${String(p.n).padStart(4, '0')}`);
  const real = c ? words(c.patient.name) : [];
  if (!c || !typed.every((w) => real.includes(w))) return { error: 'nomatch', message: 'No patient matches this Health ID and name. Check both with the patient.' };
  return { case: c };
}

// Every time a clinician opens the file, the patient can see it.
export function logAccess(c, staff, at = new Date().toISOString()) {
  c.access = c.access || [];
  c.access.unshift({ at, staffId: staff.id, by: staff.name, org: staff.org });
  c.access = c.access.slice(0, 30);
  return c;
}

// ---- facilities (invented) and where they sit on a simple drawing of the Emirates (not to scale) ----
const PLACES = { ad: 'Abu Dhabi', ain: 'Al Ain', dxb: 'Dubai', shj: 'Sharjah' };
export const FACILITIES = {
  fcA: { name: 'Family Clinic A', kind: 'Family doctor', place: 'ad', x: 96, y: 150, side: 't' },
  suB: { name: 'Screening Unit B', kind: 'Screening programme', place: 'ad', x: 132, y: 204, side: 'b' },
  ghC: { name: 'General Hospital C', kind: 'Hospital', place: 'ain', x: 262, y: 214, side: 'b' },
  imD: { name: 'Imaging Centre D', kind: 'Imaging', place: 'dxb', x: 214, y: 96, side: 'b' },
  edE: { name: 'Emergency Department E', kind: 'Hospital', place: 'shj', x: 290, y: 46, side: 'l' },
  phF: { name: 'Pharmacy F', kind: 'Pharmacy', place: 'ad', x: 42, y: 196, side: 'b' },
};
const ORG_FAC = { 'Screening programme': 'suB', 'Primary care clinic': 'fcA', 'Breast clinic': 'ghC', 'Hospital endocrinology': 'ghC', 'Diabetes centre': 'ghC', 'Colorectal clinic': 'ghC', 'Hospital oncology': 'ghC' };
export const facilityXY = (id) => [FACILITIES[id].x, FACILITIES[id].y];
export const placeName = (id) => PLACES[FACILITIES[id].place] || '';

// Earlier care, before this result: a few ordinary visits in other places, so a doctor sees the whole person.
const PAST = {
  mammo: [
    [-1900, 'fcA', 'Registered with a family doctor', 'Family doctor: Dr Mariam Al Hosani.'],
    [-760, 'imD', 'Screening mammogram', 'BI-RADS 1 (normal). Routine recall in 2 years.'],
    [-420, 'fcA', 'Yearly check-up', 'Blood pressure 124/78. No regular medicines.'],
    [-240, 'edE', 'Emergency visit: twisted ankle', 'X-ray: no fracture. Strapping, rest.'],
    [-238, 'phF', 'Medicine collected', 'Paracetamol, 5 days.'],
  ],
  hba1c: [
    [-1500, 'fcA', 'Registered with a family doctor', 'Family doctor: Dr Mariam Al Hosani.'],
    [-1100, 'suB', 'HbA1c screening', 'HbA1c 5.6%: in the usual range.'],
    [-400, 'fcA', 'Yearly check-up', 'Blood pressure 132/84. Weight advice given.'],
    [-180, 'edE', 'Emergency visit: chest infection', 'Treated and sent home the same day.'],
    [-178, 'phF', 'Medicine collected', 'Antibiotics, 7 days.'],
  ],
  fit: [
    [-1600, 'fcA', 'Registered with a family doctor', 'Family doctor: Dr Mariam Al Hosani.'],
    [-730, 'suB', 'Bowel screening (FIT)', 'FIT negative. Next test in 2 years.'],
    [-300, 'fcA', 'Yearly check-up', 'Blood pressure 128/80. No regular medicines.'],
    [-150, 'ghC', 'Day surgery: hernia repair', 'Uneventful. Discharged the same day.'],
  ],
};
const TITLE = {
  result: (c) => (c.programme === 'mammo' ? 'Screening mammogram' : c.programme === 'fit' ? 'Bowel screening (FIT)' : 'HbA1c screening'),
  notified: () => 'Result shared with the care team', understood: () => 'Patient confirmed understanding', booked: () => 'Visit booked',
  attended: () => 'Seen by the family doctor', confirmed: () => 'Confirmatory test', referred: () => 'Referral sent', referral_accepted: () => 'Referral accepted', referral_completed: () => 'Specialist report sent back',
  care_plan: () => 'Care plan agreed', closed: () => 'Loop closed', lab_added: () => 'Lab added', consult_note: () => 'Consultation note', contact: () => 'Call with the patient',
};
const RESULT_DETAIL = (c) => (c.programme === 'mammo' ? `BI-RADS ${c.value}: needs further tests.` : c.programme === 'fit' ? 'FIT positive: needs a colonoscopy.' : `HbA1c ${c.value}%: above the usual range.`);

export function careHistory(c, staff = []) {
  const byName = Object.fromEntries(staff.map((s) => [s.name, s]));
  const facOf = (e) => {
    if (['referral_accepted', 'referral_completed', 'consult_note'].includes(e.type)) return 'ghC';
    const s = byName[e.by]; if (s) return ORG_FAC[s.org] || 'fcA';
    return e.role === 'patient' ? 'fcA' : 'suB';
  };
  const out = (PAST[c.programme] || PAST.hba1c).map(([d, fac, title, detail]) => ({ day: addDays(c.resultDay, d), fac, title, detail, past: true }));
  for (const e of c.events || []) {
    const t = TITLE[e.type]; if (!t || e.skipped) continue;
    const detail = e.type === 'result' ? RESULT_DETAIL(c) : e.note || '';
    out.push({ day: e.at.slice(0, 10), fac: e.type === 'result' ? 'suB' : facOf(e), title: t(c), detail, by: String(e.by || '').replace(/\s*\(coordinator\)/, ''), now: true });
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

// The places, in the order the person went through them (a place visited again counts again).
export function routeOf(history) {
  const r = [];
  for (const h of history) if (r[r.length - 1] !== h.fac) r.push(h.fac);
  return r;
}

// ---- the care map: the Emirates as a schematic, each place a station, the water runs from place to place
// in the order the person went, and ends at the palm: where their care is now. ----
export function careMapHtml(history, { selected = '' } = {}) {
  const route = routeOf(history), used = [...new Set(route)];
  const W = 340, H = 250;
  let d = '';
  route.forEach((id, i) => {
    const [x, y] = facilityXY(id);
    if (!i) { d = `M${x} ${y}`; return; }
    const [px, py] = facilityXY(route[i - 1]);
    const k = (i % 2 ? 1 : -1) * 0.22, mx = (px + x) / 2 - (y - py) * k, my = (py + y) / 2 + (x - px) * k;
    d += ` Q${mx.toFixed(0)} ${my.toFixed(0)} ${x} ${y}`;
  });
  const last = route[route.length - 1], [lx, ly] = facilityXY(last);
  const region = (x, y, t) => `<text x="${x}" y="${y}" class="cm-place">${t}</text>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <path class="cm-land" d="M0 172C40 160 70 150 110 128S180 84 222 66 282 26 306 0H340V250H0Z"/>
    <path class="cm-coast" d="M0 172C40 160 70 150 110 128S180 84 222 66 282 26 306 0"/>
    <text x="40" y="70" class="cm-sea">Arabian Gulf</text>
    ${region(200, 244, 'Abu Dhabi')}${region(300, 180, 'Al Ain')}${region(196, 74, 'Dubai')}${region(300, 86, 'Sharjah')}
    <path class="cm-route" d="${d}"/><path class="cm-water" d="${d}" pathLength="100"/><path class="cm-shine" d="${d}"/>
    <g class="cm-palm" transform="translate(${lx} ${ly - 6})"><path d="M0 0C1-7 1-13-1-19" stroke="#b07a43" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-1-19C-9-23-15-21-19-16M-1-19C-6-27-14-28-18-26M-1-19C3-27 11-28 15-24M-1-19C7-22 14-19 16-14" stroke="#2fae6e" stroke-width="3" fill="none" stroke-linecap="round"/></g></svg>`;
  const dots = used.map((id) => {
    const [x, y] = facilityXY(id), f = FACILITIES[id], n = history.filter((h) => h.fac === id).length, now = id === last;
    return `<button class="cm-dot s-${f.side}${now ? ' now' : ''}" data-fac="${id}" aria-pressed="${selected === id}" style="left:${(x / W) * 100}%;top:${(y / H) * 100}%" aria-label="${esc(`${f.name}, ${placeName(id)}: ${n} ${n === 1 ? 'record' : 'records'}${now ? ', care is here now' : ''}`)}"><i></i><span>${esc(f.name)}</span></button>`;
  }).join('');
  return `<div class="cm" role="region" aria-label="Care map: the places this patient was cared for, in order"><div class="cm-c" style="aspect-ratio:${W} / ${H}">${svg}${dots}</div></div>`;
}

export function historyHtml(history, { only = '' } = {}) {
  const list = history.filter((h) => !only || h.fac === only).slice().reverse();
  if (!list.length) return '<p class="muted">No records.</p>';
  return `<ol class="hist">${list.map((h) => { const f = FACILITIES[h.fac]; return `<li class="${h.now ? 'now' : ''}"><span class="hd">${esc(fmt(h.day))}</span><span class="hb"><b>${esc(h.title)}</b>${h.detail ? `<span>${esc(h.detail)}</span>` : ''}<small>${esc(f.name)} · ${esc(placeName(h.fac))}${h.by ? ` · ${esc(h.by)}` : ''}</small></span></li>`; }).join('')}</ol>`;
}

// css for the care map (kept with the module so every page that draws the map gets it)
export const CARE_MAP_CSS = `
.cm{background:#0e3550;border-radius:18px;overflow:hidden}
.cm-c{position:relative;width:100%}
.cm-c svg{position:absolute;inset:0;width:100%;height:100%}
.cm-land{fill:#0a1f2e}
.cm-coast{fill:none;stroke:#2c6a8e;stroke-width:2}
.cm-sea{fill:#6fa3c2;font-size:11px;font-style:italic;font-family:inherit}
.cm-place{fill:#8fa6b5;font-size:10px;text-anchor:middle;font-family:inherit;letter-spacing:.5px;text-transform:uppercase}
.cm-route{fill:none;stroke:#18435e;stroke-width:9;stroke-linecap:round;stroke-linejoin:round}
.cm-water{fill:none;stroke:#36b5e8;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100;animation:cmfill 2.4s .2s ease-in-out forwards}
.cm-shine{fill:none;stroke:#d6f3fc;stroke-width:1.5;stroke-dasharray:2 8;stroke-linecap:round;opacity:0;animation:cmshine 1.2s 2.6s linear infinite}
.cm-palm{opacity:0;animation:cmpop .5s 2.5s ease-out forwards}
@keyframes cmfill{to{stroke-dashoffset:0}}
@keyframes cmshine{from{opacity:1;stroke-dashoffset:0}to{opacity:1;stroke-dashoffset:-20}}
@keyframes cmpop{from{opacity:0}to{opacity:1}}
.cm-dot{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;display:grid;place-items:center;background:none;border:0;padding:0;cursor:pointer;font:inherit;color:#f3efe6}
.cm-dot i{width:14px;height:14px;border-radius:50%;background:#f3efe6;border:3px solid #36b5e8;display:block}
.cm-dot.now i{background:#2fae6e;border-color:#d6f3fc}
.cm-dot span{position:absolute;font-size:11px;font-weight:700;white-space:nowrap;background:rgba(10,31,46,.85);padding:2px 6px;border-radius:6px;pointer-events:none}
.cm-dot.s-b span{top:36px;left:50%;transform:translateX(-50%)}
.cm-dot.s-t span{bottom:36px;left:50%;transform:translateX(-50%)}
.cm-dot.s-l span{right:36px;top:50%;transform:translateY(-50%)}
.cm-dot.s-r span{left:36px;top:50%;transform:translateY(-50%)}
.cm-dot[aria-pressed=true] i{box-shadow:0 0 0 4px #f7e08a}
.cm-dot[aria-pressed=true] span{background:#f7e08a;color:#0a1f2e}
.cm-dot:focus-visible{outline:3px solid #f7e08a;outline-offset:-2px;border-radius:50%}
.hist{list-style:none;margin:0;padding:0;background:var(--card);border-radius:14px;overflow:hidden}
.hist li{display:grid;grid-template-columns:92px 1fr;gap:10px;padding:12px 14px;border-top:1px solid var(--line)}
.hist li:first-child{border-top:0}
.hist li.now{box-shadow:inset 4px 0 0 #0b6fa8}
.hist .hd{font-size:13px;color:var(--muted);padding-top:2px}
.hist .hb{display:flex;flex-direction:column;gap:2px;min-width:0}
.hist .hb b{font-size:16px}.hist .hb span{font-size:15px;color:var(--ink2);line-height:1.4}.hist .hb small{font-size:13px;color:var(--muted)}
@media (prefers-reduced-motion:reduce){.cm-water{animation:none;stroke-dashoffset:0}.cm-palm{animation:none;opacity:1}.cm-shine{animation:none}}`;

// ---- THE PATIENT HOLDS THE KEY: a code that changes every minute, approval, access that expires ----
// DEMO-GRADE: the code is derived in the browser from a per-patient secret and the current minute, and
// checked against the same demo data. A real service would verify a signed, single-use token on a server,
// with the clinician signed in through their hospital account.
export const PASS_SECONDS = 60, GRANT_HOURS = 24;
const fnv = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
export function passSecret(c) { if (!c.passSecret) c.passSecret = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); return c.passSecret; }
const win = (t) => Math.floor(t / (PASS_SECONDS * 1000));
export function passCode(c, t = Date.now()) { return String(fnv(`${passSecret(c)}:${win(t)}`) % 1000000).padStart(6, '0'); }
export const passSecondsLeft = (t = Date.now()) => PASS_SECONDS - Math.floor((t / 1000) % PASS_SECONDS);
// The current code or the one just before it (so a code read at second 59 still works).
export function checkPass(c, code, t = Date.now()) {
  const x = String(code || '').replace(/\D/g, '');
  return x.length === 6 && !!c.passSecret && (x === passCode(c, t) || x === passCode(c, t - PASS_SECONDS * 1000));
}
export const lookupLinkWithCode = (origin, c, t = Date.now()) => `${origin}/app.html#find=${healthId(c)}.${passCode(c, t)}`;

// Access: asked (no live code), allowed (live code, or the patient said yes), declined, removed, expired.
export function activeGrant(c, staffId, t = Date.now()) {
  return (c.grants || []).find((g) => g.staffId === staffId && g.status === 'allowed' && Date.parse(g.until) > t) || null;
}
export function grantAccess(c, staff, how, t = Date.now()) {
  c.grants = (c.grants || []).filter((g) => !(g.staffId === staff.id && ['asked', 'allowed'].includes(g.status)));
  const g = { staffId: staff.id, by: staff.name, org: staff.org, status: 'allowed', how, at: new Date(t).toISOString(), until: new Date(t + GRANT_HOURS * 3600e3).toISOString() };
  c.grants.unshift(g); logAccess(c, staff, g.at);
  return g;
}
export function askAccess(c, staff, t = Date.now()) {
  c.grants = (c.grants || []).filter((g) => !(g.staffId === staff.id && g.status === 'asked'));
  c.grants.unshift({ staffId: staff.id, by: staff.name, org: staff.org, status: 'asked', at: new Date(t).toISOString() });
  return c.grants[0];
}
export const pendingAsk = (c) => (c.grants || []).find((g) => g.status === 'asked') || null;
export function answerAsk(c, staffId, allow, staffList = [], t = Date.now()) {
  const g = (c.grants || []).find((x) => x.staffId === staffId && x.status === 'asked'); if (!g) return null;
  if (!allow) { g.status = 'declined'; g.answeredAt = new Date(t).toISOString(); return g; }
  const s = staffList.find((x) => x.id === staffId) || { id: staffId, name: g.by, org: g.org };
  return grantAccess(c, s, 'approved by the patient', t);
}
export function removeGrant(c, staffId, t = Date.now()) {
  for (const g of c.grants || []) if (g.staffId === staffId && g.status === 'allowed') { g.status = 'removed'; g.removedAt = new Date(t).toISOString(); }
  return c;
}
