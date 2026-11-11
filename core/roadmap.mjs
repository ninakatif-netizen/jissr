// THE PATIENT'S FALAJ: a patient's file drawn as a falaj. The water starts at the well (the lab result), winds
// through a shaft for every recorded step (labs, calls, visits, referrals, consultations), and is meant to reach the
// palm grove (care confirmed). Beyond the last recorded step the channel is dry, with the checkpoints still to come;
// where the patient is stuck, a rock blocks the water (amber when overdue).
// The SVG draws the channel only (decorative); every shaft is a real button with its text, for keyboards and screen readers.
import { CHANNELS, levelOf } from './flow.mjs';
import { slaDeadline, isOverdue } from './rules.mjs';

const KIND = {
  result: ['well', 'Lab result'], lab_added: ['lab', 'Lab added'], contact: ['call', 'Talked with the patient'],
  understood: ['check', 'Understood (teach-back)'], booked: ['cal', 'Visit booked'], attended: ['visit', 'Seen'],
  confirmed: ['lab', 'Confirmatory test'], referred: ['branch', 'Referred'], referral_accepted: ['hand', 'Referral accepted'],
  referral_rejected: ['rock', 'Referral declined'], referral_completed: ['doc', 'Report back'], consult_note: ['visit', 'Consultation'],
  care_plan: ['plan', 'Plan agreed'], closed: ['palm', 'Loop closed'], micro_consult_done: ['call', 'Nurse call'],
};
const GHOST = { 1: ['call', 'Reached'], 2: ['check', 'Understood'], 3: ['cal', 'Booked'], 4: ['visit', 'Seen'], 5: ['branch', 'Next step'], 6: ['palm', 'Loop closed'] };
const SLA_STEP = { 1: 'notified', 2: 'understood', 3: 'booked', 4: 'attended' };
const ICON = {
  well: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12c1.5-1.5 2.5-1.5 4 0s2.5 1.5 4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  agent: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" fill="currentColor"/>',
  check: '<path d="M5.5 12.5l4 4 9-9.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  visit: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  branch: '<path d="M6 4v8a4 4 0 0 0 4 4h8M14 12l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  hand: '<path d="M4 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  doc: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  plan: '<path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  palm: '<path d="M12 21V11M12 11C10 7 6 6 3 8M12 11c2-4 6-5 9-3M12 11c-1.5-3.5-.5-6.5 1.5-8M12 11c1.5-3.5.5-6.5-1.5-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  rock: '<path d="M4 17l3-7 4-3 5 2 4 8z" fill="currentColor"/>',
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// The shafts of this patient's falaj: one per recorded step, then the dry checkpoints still to come.
export function shaftsOf(c, { staff = [], today, resultText } = {}) {
  const who = (e) => String(e.by || '').replace(/\s*\(coordinator\)/, '');
  const out = [];
  for (const e of c.events || []) {
    let k = KIND[e.type];
    if (e.type === 'contact' && e.role === 'system') k = ['agent', 'Falaj call'];
    if (!k || e.skipped) continue;
    let label = k[1];
    if (e.type === 'result' && resultText) label = `Lab result · ${resultText}`;
    if (e.type === 'referred' && c.referral) label = `Referred to ${c.referral.to}`;
    if (e.type === 'referral_accepted' && c.referral) label = `Accepted by ${c.referral.to}`;
    if (e.type === 'lab_added' || e.type === 'consult_note') label = `${k[1]} · ${(e.note || '').split(':')[0].slice(0, 28)}`;
    out.push({ kind: k[0], label, who: who(e), day: e.at.slice(0, 10), note: e.note || '', done: true, type: e.type });
  }
  if (c.stage !== 'closed') {
    const level = levelOf(c);
    for (let i = Math.max(1, level + 1); i < CHANNELS.length; i++) {
      const g = GHOST[i]; if (!g) continue;
      const now = i === level + 1, due = now ? (SLA_STEP[i] ? slaDeadline(c, SLA_STEP[i]) : null) || c.due : null;
      const late = now && today && ((due && today > due) || isOverdue(c, today));
      const owner = staff.find((s) => s.id === c.owner);
      out.push({ kind: late ? 'rock' : g[0], label: g[1], done: false, now, late, day: due, who: now && owner ? owner.name.replace(/\s*\(coordinator\)/, '') : '', note: now ? `Next checkpoint${due ? ` by ${fmt(due)}` : ''}${late ? ' · overdue' : ''}` : 'Still dry' });
    }
  }
  return out;
}

let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.rm{position:relative;background:linear-gradient(180deg,#f3ead8,#efe3cc);border-radius:18px;overflow:hidden;border:1px solid var(--line,#e6dfd2)}
.rm svg{display:block;width:100%;height:auto}
.rm-dry{fill:none;stroke:#d9c9a3;stroke-width:16;stroke-linecap:round;stroke-linejoin:round}
.rm-bed{fill:none;stroke:#c4b18a;stroke-width:16;stroke-linecap:round;stroke-dasharray:2 12;opacity:.6}
.rm-water{fill:none;stroke:url(#rmg);stroke-width:12;stroke-linecap:round;stroke-linejoin:round}
.rm-flow{fill:none;stroke:#fff;stroke-opacity:.7;stroke-width:3;stroke-linecap:round;stroke-dasharray:4 14;animation:rmf 1.3s linear infinite}
.rm-water.grow{stroke-dasharray:var(--len);stroke-dashoffset:var(--from);animation:rmgrow 1.2s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes rmf{to{stroke-dashoffset:-36}}
@keyframes rmgrow{to{stroke-dashoffset:0}}
.rm-node{position:absolute;transform:translate(-50%,-22px);width:104px;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:0;padding:0;font:inherit;color:#0a1f2e;cursor:pointer;text-align:center}
.rm-dot{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#0b6fa8;color:#fff;box-shadow:0 0 0 4px #f3ead8,0 3px 8px rgba(10,31,46,.25)}
.rm-dot svg{width:22px;height:22px}
.rm-node.ghost .rm-dot{background:#f6efe0;color:#8a7348;border:2px dashed #b9a57a;box-shadow:0 0 0 4px #f3ead8}
.rm-node.now .rm-dot{border:3px solid #0b6fa8;background:#fff;color:#0b6fa8;animation:rmp 1.8s ease-out infinite}
.rm-node.late .rm-dot{border-color:#d98a1c;color:#a8670f;background:#fff4e0}
.rm-node.k-palm.done .rm-dot{background:#1a7f52}
.rm-node.k-well .rm-dot{background:#0a1f2e}
.rm-node.k-agent .rm-dot{background:#36b5e8;color:#0a1f2e}
.rm-node.fresh .rm-dot{animation:rmpop .6s cubic-bezier(.2,.8,.2,1) both}
.rm-node[aria-pressed=true] .rm-dot{box-shadow:0 0 0 4px #f3ead8,0 0 0 7px #0b6fa8}
.rm-l{font-size:11.5px;line-height:1.2;font-weight:600;background:rgba(255,255,255,.85);border-radius:6px;padding:2px 5px}
.rm-l small{display:block;font-weight:500;color:#56616b}
.rm-node.ghost .rm-l{color:#5c4a22;font-weight:500}
.rm-node.late .rm-l{color:#7a4a0c}
@keyframes rmp{0%{box-shadow:0 0 0 4px #f3ead8,0 0 0 4px rgba(11,111,168,.35)}100%{box-shadow:0 0 0 4px #f3ead8,0 0 0 16px rgba(11,111,168,0)}}
@keyframes rmpop{0%{transform:scale(.3)}60%{transform:scale(1.12)}100%{transform:none}}
.rm-legend{position:absolute;inset-inline-start:12px;top:10px;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#5c4a22}
@media (prefers-reduced-motion:reduce){.rm-flow,.rm-node.now .rm-dot,.rm-node.fresh .rm-dot{animation:none}.rm-water.grow{animation:none;stroke-dasharray:none}}`;
  document.head.appendChild(st);
}

// roadmapHtml(c, opts): opts.staff, opts.today, opts.resultText (staff view only), opts.selected (index), opts.fresh (index
// of a shaft just added: the water grows to it).
export function roadmapHtml(c, opts = {}) {
  css();
  const shafts = shaftsOf(c, opts);
  const W = 360, cols = [62, 180, 298], rowH = 108, top = 70;
  const pos = (i) => { const r = Math.floor(i / 3), k = i % 3; return [r % 2 === 0 ? cols[k] : cols[2 - k], top + r * rowH]; };
  const rows = Math.ceil(shafts.length / 3), H = top + (rows - 1) * rowH + 70;
  const seg = (i) => {   // from shaft i-1 to shaft i
    const [x1, y1] = pos(i - 1), [x2, y2] = pos(i);
    if (y1 === y2) return `L${x2} ${y2}`;
    const bend = x1 > 180 ? 52 : -52;
    return `C${x1 + bend} ${y1} ${x2 + bend} ${y2} ${x2} ${y2}`;
  };
  const pathTo = (n) => { let d = `M${pos(0)[0] - 40} ${pos(0)[1]} L${pos(0)[0]} ${pos(0)[1]}`; for (let i = 1; i <= n; i++) d += seg(i); return d; };
  const lastDone = shafts.reduce((m, s, i) => (s.done ? i : m), 0);
  const full = pathTo(shafts.length - 1), wet = pathTo(lastDone);
  const freshI = opts.fresh === 'last' ? lastDone : opts.fresh;
  const grow = freshI != null && freshI > 0 ? ' grow' : '';   // the page measures the path and animates the last stretch
  const decor = `<g opacity=".35" fill="#b9a57a">${[[30, H - 18], [W - 40, 28], [W - 24, H - 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="6"/>`).join('')}</g>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><defs><linearGradient id="rmg" x1="0" x2="1"><stop offset="0" stop-color="#0b6fa8"/><stop offset=".5" stop-color="#36b5e8"/><stop offset="1" stop-color="#0b6fa8"/></linearGradient></defs>
    ${decor}<path class="rm-dry" d="${full}"/><path class="rm-bed" d="${full}"/><path class="rm-water${grow}" d="${wet}"/><path class="rm-flow" d="${wet}"/></svg>`;
  const nodes = shafts.map((s, i) => {
    const [x, y] = pos(i);
    const cls = ['rm-node', `k-${s.kind}`, s.done ? 'done' : 'ghost', s.now ? 'now' : '', s.late ? 'late' : '', freshI === i ? 'fresh' : ''].filter(Boolean).join(' ');
    const sub = s.done ? fmt(s.day) : s.now ? (s.day ? `by ${fmt(s.day)}` : 'next') : '';
    return `<button class="${cls}" style="left:${(x / W) * 100}%;top:${(y / H) * 100}%" data-shaft="${i}" aria-pressed="${opts.selected === i}" aria-label="${esc(`${s.label}. ${s.done ? `${s.who}, ${fmt(s.day)}` : s.note}`)}"><span class="rm-dot"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[s.kind]}</svg></span><span class="rm-l">${esc(s.label)}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  }).join('');
  return { html: `<section class="rm" aria-label="This patient's falaj: ${shafts.filter((s) => s.done).length} steps recorded"><span class="rm-legend">${c.stage === 'closed' ? 'The water reached the palm' : 'Where the water is'}</span>${svg}${nodes}</section>`, shafts };
}
