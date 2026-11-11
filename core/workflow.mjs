// THE PATIENT'S FALAJ AS A WORKFLOW: one patient's file drawn as a branching workflow, like an automation map.
// A trigger (the result) splits into three channels that run in parallel:
//   the patient (calls, understanding, booking, reminders), the care team (keeper, doctor, referral, consultation,
//   loop closed) and the systems (the record, the lab, insurance, the report back).
// Box colours say what kind of step it is: trigger, action, wait (a deadline from the rules), system.
// Water fills the arrows as steps are done; steps still to come are dashed; an overdue wait turns amber.
// The arrows are drawn in SVG (decorative); every box is a real button with its text.
import { slaDeadline, mustCall, REFERRAL_REPLY_DAYS, addDays } from './rules.mjs';

const LANG = { ar: 'Arabic', en: 'English', ur: 'Urdu', hi: 'Hindi', tl: 'Tagalog', bn: 'Bengali', ml: 'Malayalam' };
const STAGES = ['result', 'notified', 'understood', 'booked', 'attended', 'confirmed', 'referred', 'care_plan', 'closed'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (d) => (d ? new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const LANES = ['The patient', 'The care team', 'Systems'];

export function workflowOf(c, { staff = [], today, resultText = '' } = {}) {
  const i = STAGES.indexOf(c.stage), r = c.referral, ev = (t, f = () => true) => (c.events || []).find((e) => e.type === t && f(e));
  const person = (e) => e && e.role !== 'system';
  const human = ev('contact', person) || ev('understood');
  const aiCall = ev('contact', (e) => e.role === 'system');
  const owner = staff.find((s) => s.id === c.owner), keeper = owner ? owner.name.replace(/\s*\(coordinator\)/, '') : 'the care team';
  const lang = LANG[c.patient.language] || c.patient.language;
  const tellBy = slaDeadline(c, 'notified') || c.due, acceptBy = r && r.sentAt ? addDays(r.sentAt.slice(0, 10), REFERRAL_REPLY_DAYS) : null;
  const N = [];
  const node = (id, lane, row, kind, label, done, extra = {}) => N.push({ id, lane, row, kind, label, done: !!done, ...extra });
  const at = (e) => (e ? { who: String(e.by || '').replace(/\s*\(coordinator\)/, ''), day: e.at } : {});
  node('t', 1, 0, 'trigger', 'Result arrives', true, at(c.events[0]), { meta: resultText });
  node('p1', 0, 1, 'action', 'Falaj call', aiCall || human, at(aiCall), { meta: `in ${lang}`,  rule: 'The Outreach agent calls, holds a visit, never talks about the result.' });
  node('k1', 1, 1, 'action', 'Keeper set', true, { meta: keeper.replace(/^(Nurse|Dr)\s+(\S+).*/, '$1 $2'), who: 'Falaj rules', day: c.events[0].at, rule: 'The owner is set by rule: a nurse for urgent or suspicious results.' });
  node('s1', 2, 1, 'system', 'Patient record', true, { day: c.events[0].at, rule: 'Simulated: in a pilot, written to Malaffi.' });
  node('p2', 0, 2, 'wait', 'Told by a person', human, { meta: `by ${fmt(tellBy)}`, due: tellBy, rule: mustCall(c) || 'The first contact must happen before this date.' });
  node('k2', 1, 2, 'action', 'Nurse alerted', human || (c.nurseRequest), at(ev('nurse_requested')));
  node('s2', 2, 2, 'system', 'Lab told: received', true, { day: c.events[0].at, rule: 'Simulated: the sender knows the result was received and who owns it.' });
  node('p3', 0, 3, 'action', 'Teach-back call', ev('understood'), at(ev('understood')), { rule: 'Only a nurse or doctor confirms understanding, in the patient\'s own words.' });
  node('p4', 0, 4, 'action', 'Visit booked', i >= 3, at(ev('booked')), { meta: c.slot ? `${fmt(c.slot.day)} ${c.slot.time}` : '' });
  node('k4', 1, 4, 'wait', 'Wait: 24 h before', i >= 4 || ev('agent', (e) => e.kind === 'reminder'), { meta: c.slot ? fmt(addDays(c.slot.day, -1)) : '' });
  node('p5', 0, 5, 'action', 'Reminder SMS', i >= 4 || ev('agent', (e) => e.kind === 'reminder'), at(ev('agent', (e) => e.kind === 'reminder')));
  node('k6', 1, 6, 'action', 'Seen by the GP', i >= 4, at(ev('attended')));
  node('k7', 1, 7, 'action', r ? 'Referral sent' : 'Referral or plan', i >= 6, at(ev('referred') || ev('care_plan')), { meta: r ? r.to : '' });
  node('s7', 2, 7, 'system', 'Shared info sent', !!r, at(ev('referred')), { rule: r && r.shared ? `Shared: ${r.shared.join(', ')}. Never more than the patient chose.` : '' });
  node('k8', 1, 8, 'wait', `Accept in ${REFERRAL_REPLY_DAYS} days`, r && ['accepted', 'completed'].includes(r.status), { meta: acceptBy ? `by ${fmt(acceptBy)}` : '', due: acceptBy, rule: 'The sender stays responsible until the receiving team accepts.' });
  node('s8', 2, 8, 'system', 'Insurance approval', r && r.preauth && r.preauth.status === 'approved', { rule: 'Simulated: requested with the referral.' });
  node('k9', 1, 9, 'action', 'Accepted: new keeper', r && ['accepted', 'completed'].includes(r.status), at(ev('referral_accepted')));
  node('k10', 1, 10, 'action', 'Consultation', c.stage === 'closed' || (r && r.status === 'completed'), at(ev('closed') || ev('referral_completed')));
  node('k11', 1, 11, 'end', 'Loop closed', c.stage === 'closed', at(ev('closed')), { rule: 'Only a clinician closes the loop, with written evidence.' });
  node('s11', 2, 11, 'system', 'Report to the GP', (r && r.statusSentAt) || (r && r.status === 'completed') || c.stage === 'closed', {});
  // labs and consultation notes added by the team: extra boxes in the systems channel, in the order they came
  const added = (c.events || []).filter((e) => e.type === 'lab_added' || e.type === 'consult_note');
  const freeRows = [3, 4, 5, 6, 9, 10, 12, 13, 14];
  added.forEach((e, k) => node(`a${k}`, 2, freeRows[k] ?? 15 + k, e.type === 'lab_added' ? 'lab' : 'note', e.type === 'lab_added' ? 'Lab added' : 'Note added', true, { ...at(e), meta: (e.note || '').split(':')[0].slice(0, 22), note: e.note, added: true }));
  // the first box not done in the patient and care team channels is "now"; a wait past its date is late
  const order = ['p1', 'p2', 'p3', 'p4', 'k4', 'p5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11'];
  if (c.stage !== 'closed') { const nowId = order.find((id) => !N.find((n) => n.id === id).done); const n = N.find((x) => x.id === nowId); if (n) n.now = true; }
  for (const n of N) if (n.kind === 'wait' && !n.done && n.due && today && today > n.due.slice(0, 10)) n.late = true;
  const E = [['t', 'p1'], ['t', 'k1'], ['t', 's1'], ['p1', 'p2'], ['k1', 'k2'], ['s1', 's2'], ['p2', 'p3'], ['k2', 'p3'], ['p3', 'p4'], ['p4', 'k4'], ['k4', 'p5'], ['p5', 'k6'], ['k6', 'k7'], ['k7', 's7'], ['k7', 'k8'], ['s7', 's8'], ['k8', 'k9'], ['k9', 'k10'], ['k10', 'k11'], ['k11', 's11']];
  added.forEach((_, k) => E.push([k === 0 ? 's2' : `a${k - 1}`, `a${k}`]));
  return { nodes: N, edges: E };
}

let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.wf-wrap{background:#fffdf8;border:1.5px solid #0a1f2e;border-radius:16px;overflow:hidden;position:relative}
.wf{position:relative;width:100%}
.wf svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wf-lane{position:absolute;top:8px;font:700 10px -apple-system,system-ui,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#56616b;transform:translateX(-50%);white-space:nowrap}
.wf-n{position:absolute;width:30%;max-width:150px;min-height:48px;transform:translateX(-50%);display:flex;flex-direction:column;justify-content:center;gap:1px;padding:6px 5px;border:1.5px solid #0a1f2e;border-radius:4px;box-shadow:2px 2px 0 #0a1f2e;font:700 11.5px/1.2 -apple-system,"SF Pro Text",system-ui,sans-serif;color:#0a1f2e;text-align:center;cursor:pointer}
.wf-n small{font-weight:500;font-size:10px;color:#2c3e4c;line-height:1.2}
.wf-n.k-trigger{background:#f6a597}.wf-n.k-action{background:#f7e08a}.wf-n.k-wait{background:#9fd8e3}.wf-n.k-system{background:#1f2d38;color:#fff}.wf-n.k-system small{color:#d7d0c3}
.wf-n.k-end{background:#8fd6a8}.wf-n.k-lab,.wf-n.k-note{background:#f3d3a6}
.wf-n.todo{background:#fff;border-style:dashed;box-shadow:none;color:#56616b;font-weight:500}
.wf-n.todo small{color:#6b7680}
.wf-n.now{background:#fff;border:2.5px solid #0b6fa8;box-shadow:2px 2px 0 #0b6fa8;color:#0a1f2e;font-weight:700;animation:wfp 1.8s ease-out infinite}
.wf-n.late{border-color:#d98a1c;box-shadow:2px 2px 0 #d98a1c;background:#fff4e0}
.wf-n.late small{color:#7a4a0c;font-weight:700}
.wf-n[aria-pressed=true]{outline:3px solid #0b6fa8;outline-offset:3px}
.wf-n.added{animation:wfpop .6s cubic-bezier(.2,.8,.2,1) both}
.wf-e{fill:none;stroke:#b9b2a4;stroke-width:1.8;stroke-dasharray:5 5}
.wf-e.done{stroke:#0b6fa8;stroke-width:5;stroke-linecap:round;stroke-dasharray:none}
.wf-e.toward{stroke:#7fbfe0;stroke-width:4;stroke-linecap:round;stroke-dasharray:none;opacity:.8}
.wf-w{fill:none;stroke:#d6f3fc;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:4 10;animation:wff 1.1s linear infinite}
.wf-w.slow{stroke:#fff;stroke-width:2;animation-duration:2.2s}
@keyframes wff{to{stroke-dashoffset:-26}}
@keyframes wfp{0%{box-shadow:2px 2px 0 #0b6fa8,0 0 0 0 rgba(11,111,168,.35)}100%{box-shadow:2px 2px 0 #0b6fa8,0 0 0 10px rgba(11,111,168,0)}}
@keyframes wfpop{0%{transform:translateX(-50%) scale(.4)}60%{transform:translateX(-50%) scale(1.06)}100%{transform:translateX(-50%)}}
.wf-key{display:flex;flex-wrap:wrap;gap:10px;font:500 12px -apple-system,system-ui,sans-serif;color:#2c3e4c;padding:8px 2px 0}
.wf-key span{display:inline-flex;align-items:center;gap:5px}
.wf-key i{width:14px;height:10px;border:1.4px solid #0a1f2e;border-radius:2px;display:inline-block}
@media (prefers-reduced-motion:reduce){.wf-w,.wf-n.now,.wf-n.added{animation:none}}`;
  document.head.appendChild(st);
}

// workflowHtml(c, opts): opts.staff, opts.today, opts.resultText, opts.selected (node id).
export function workflowHtml(c, opts = {}) {
  css();
  const { nodes, edges } = workflowOf(c, opts);
  // a 360-wide canvas scaled to the screen: three channels side by side, always all visible
  const W = 360, LX = [60, 180, 300], RH = 78, TOP = 30, BH = 48;
  const rows = Math.max(...nodes.map((n) => n.row)) + 1, H = TOP + rows * RH;
  const P = (n) => [LX[n.lane], TOP + n.row * RH];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  let paths = '';
  for (const [a, b] of edges) {
    const A = byId[a], B = byId[b]; if (!A || !B) continue;
    const [x1, y1] = P(A), [x2, y2] = P(B), sy = y1 + BH, ey = y2 - 1;
    const d = A.row === B.row ? `M${x1 + (x2 > x1 ? 54 : -54)} ${y1 + BH / 2}H${x2 + (x2 > x1 ? -56 : 56)}` : `M${x1} ${sy}C${x1} ${(sy + ey) / 2} ${x2} ${(sy + ey) / 2} ${x2} ${ey}`;
    const done = A.done && B.done, toward = A.done && !B.done && B.now;   // water flows in finished channels and runs toward the next step
    paths += `<path class="wf-e${done ? ' done' : toward ? ' toward' : ''}" d="${d}" marker-end="url(#wfa${done || toward ? 'd' : ''})"/>${done ? `<path class="wf-w" d="${d}"/>` : toward ? `<path class="wf-w slow" d="${d}"/>` : ''}`;
  }
  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>
    <marker id="wfa" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0L10 5L0 10z" fill="#b9b2a4"/></marker>
    <marker id="wfad" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0b6fa8"/></marker></defs>${paths}</svg>`;
  const boxes = nodes.map((n) => {
    const [x, y] = P(n), state = n.done ? 'done' : n.now ? 'now' : 'todo';
    const sub = n.late ? `${n.meta ? n.meta + ' · ' : ''}overdue` : n.meta || (n.done ? fmt(n.day) : n.now ? 'now' : '');
    return `<button class="wf-n k-${n.kind} ${state}${n.late ? ' late' : ''}${n.added ? ' added' : ''}" style="left:${(x / W) * 100}%;top:${(y / H) * 100}%" aria-label="${esc(`${n.label}${sub ? ', ' + sub : ''}. ${n.done ? 'Done' : n.now ? 'Now' : 'To come'}`)}" data-node="${n.id}" aria-pressed="${opts.selected === n.id}">${esc(n.label)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  }).join('');
  const lanes = LANES.map((l, k) => `<span class="wf-lane" style="left:${(LX[k] / W) * 100}%">${l}</span>`).join('');
  const key = `<div class="wf-key" aria-hidden="true"><span><i style="background:#f6a597"></i>Trigger</span><span><i style="background:#f7e08a"></i>Action</span><span><i style="background:#9fd8e3"></i>Wait (deadline)</span><span><i style="background:#1f2d38"></i>System</span><span><i style="background:#fff;border-style:dashed"></i>To come</span></div>`;
  return { html: `<div class="wf-wrap" role="region" aria-label="This patient's falaj as a workflow, in three channels"><div class="wf" style="aspect-ratio:${W} / ${H}">${svg}${lanes}${boxes}</div></div>${key}`, nodes };
}
