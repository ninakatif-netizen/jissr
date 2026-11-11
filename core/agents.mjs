// FALAJ AGENTS: four bounded agents, one per channel. Each one moves the next step forward on its own, logs every
// action in the case timeline (signed "Falaj agent"), and never takes a clinical decision.
//   Outreach  - calls patients nobody has reached, retries, holds a visit, passes worry or "must be told by a person"
//               to the nurse. Never talks about the result.
//   Booking   - asks the patient to confirm the held time (a YES from the patient books it), reminds the day before,
//               offers a new time after a missed visit. Never records that a visit happened.
//   Referral  - chases a referral nobody accepted in time, alerts the sender, tells the referring doctor the status.
//               Never accepts or declines for anyone.
//   Insurance - requests pre-approval when a referral leaves and follows it up. Never refuses or limits care.
// Deterministic: the same cases on the same day give the same actions. A run is idempotent: an agent does a given
// thing at most once per case per day. Patient replies are SIMULATED in the demo (a stable pick per case).
import { addDays, slotsFor, mustCall, REFERRAL_REPLY_DAYS, daysBetween } from './rules.mjs';
import { advance, logEvent, requestNurse } from './cases.mjs';

export const AGENTS = {
  outreach: { name: 'Outreach', does: 'Calls patients nobody has reached, in their language; retries outside working hours; holds a visit; passes worry to the nurse.', never: 'Talk about the result or a diagnosis.' },
  booking: { name: 'Booking', does: 'Asks the patient to confirm the held time, reminds the day before, offers a new time after a missed visit.', never: 'Record that a visit happened.' },
  referral: { name: 'Referral', does: 'Chases a referral not accepted in time, alerts the sender, tells the referring doctor the status.', never: 'Accept or decline a referral for anyone.' },
  insurance: { name: 'Insurance', does: 'Requests pre-approval as soon as a referral leaves, and follows it up.', never: 'Refuse or limit care.' },
};
// The only things an agent may change on a case. Everything clinical stays with people (checked by a test).
export const AGENT_MAY_CHANGE = ['hold', 'nurseRequest', 'referral.preauth', 'referral.chasedAt', 'referral.statusSentAt', 'events'];

const nice = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const actor = (k) => ({ type: 'system', name: `Falaj agent · ${AGENTS[k].name}` });
const pick = (c, day, salt) => { let h = 7; for (const ch of `${c.id}|${day}|${salt}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 100; };
const didToday = (c, agent, kind, day) => (c.events || []).some((e) => e.type === 'agent' && e.agent === agent && e.kind === kind && e.day === day);
const humanReached = (c) => (c.events || []).some((e) => (e.type === 'contact' && e.role !== 'system') || e.type === 'understood');

export function runAgents(state, today) {
  const out = [];
  const log = (c, agent, kind, text) => { logEvent(c, 'agent', actor(agent), text, `${today}T06:00:00.000Z`, { agent, kind, day: today }); out.push({ id: c.id, agent, kind, text }); };
  for (const c of state.cases) {
    if (c.stage === 'closed') continue;
    // ---- Outreach: nobody has reached the patient yet ----
    if (['result', 'notified'].includes(c.stage) && !humanReached(c) && !didToday(c, 'outreach', 'call', today)) {
      const tries = (c.events || []).filter((e) => e.type === 'agent' && e.agent === 'outreach' && e.kind === 'call').length;
      if (pick(c, today, 'answer') < 60) {
        const hold = slotsFor({ band: c.band, barrier: c.barrier }, today)[0];
        log(c, 'outreach', 'call', `Called in the patient's language. Answered. Visit held: ${nice(hold.day)}, ${hold.time}. Did not discuss the result.`);
        c.hold = hold;
        if (!c.nurseRequest || c.nurseRequest.done) {
          requestNurse(state, c.id, actor('outreach'), mustCall(c) ? 'Agent: must be told by a person. Please call today.' : 'Agent: answered the call. Please confirm understanding.');
          out.push({ id: c.id, agent: 'outreach', kind: 'flag', text: 'Passed to the nurse.' });
        }
      } else {
        log(c, 'outreach', 'call', `Called in the patient's language. No answer (try ${tries + 1}). Will try again outside working hours.`);
        if (tries + 1 >= 2 && (!c.nurseRequest || c.nurseRequest.done)) {
          requestNurse(state, c.id, actor('outreach'), 'Agent: not reached after 2 calls. Please call in person.');
          out.push({ id: c.id, agent: 'outreach', kind: 'flag', text: 'Not reached twice: passed to the nurse.' });
        }
      }
    }
    // ---- Booking: confirm a held time; remind; recover a missed visit ----
    if (c.stage === 'understood' && c.hold && !didToday(c, 'booking', 'confirm', today)) {
      if (pick(c, today, 'yes') < 70) {
        log(c, 'booking', 'confirm', `Asked the patient to confirm ${nice(c.hold.day)}, ${c.hold.time}. The patient replied YES (simulated).`);
        advance(state, c.id, 'booked', { type: 'patient', name: `${c.patient.name} (patient, replied YES)` }, `Confirmed by reply: ${nice(c.hold.day)}, ${c.hold.time}.`, `${today}T06:01:00.000Z`);
        c.slot = c.hold; c.hold = null;
      } else log(c, 'booking', 'confirm', `Asked the patient to confirm ${nice(c.hold.day)}, ${c.hold.time}. No reply yet.`);
    }
    if (c.stage === 'booked' && c.slot) {
      if (c.slot.day === addDays(today, 1) && !didToday(c, 'booking', 'reminder', today)) log(c, 'booking', 'reminder', `Reminder sent for tomorrow, ${c.slot.time}.`);
      if (c.slot.day < today && !didToday(c, 'booking', 'missed', today)) {
        const next = slotsFor({ band: c.band, barrier: c.barrier }, today)[0];
        log(c, 'booking', 'missed', `The visit on ${nice(c.slot.day)} was not recorded. Offered a new time: ${nice(next.day)}, ${next.time}.`);
        c.hold = next;
        if (!c.nurseRequest || c.nurseRequest.done) requestNurse(state, c.id, actor('booking'), 'Agent: visit not recorded. Please check whether it happened.');
      }
    }
    // ---- Referral: chase, alert the sender, report the status back ----
    const r = c.referral;
    if (r && r.status === 'sent' && r.sentAt && daysBetween(r.sentAt.slice(0, 10), today) >= REFERRAL_REPLY_DAYS && !didToday(c, 'referral', 'chase', today)) {
      log(c, 'referral', 'chase', `No answer from ${r.to} after ${REFERRAL_REPLY_DAYS} days. Reminded them and alerted the sender, who stays responsible.`);
      r.chasedAt = today;
    }
    if (r && ['accepted', 'completed'].includes(r.status) && !r.statusSentAt) {
      log(c, 'referral', 'status', `Told the referring doctor: ${r.to} ${r.status === 'accepted' ? 'accepted the referral' : 'reported back'}.`);
      r.statusSentAt = today;
    }
    // ---- Insurance: pre-approval with the referral ----
    if (r && r.status !== 'rejected' && !r.preauth) {
      r.preauth = { status: 'requested', at: `${today}T06:02:00.000Z` };
      log(c, 'insurance', 'request', 'Requested insurance pre-approval for the referral (simulated).');
    } else if (r && r.preauth && r.preauth.status === 'requested' && !didToday(c, 'insurance', 'follow', today)) {
      log(c, 'insurance', 'follow', 'Followed up the pre-approval with the insurer (simulated).');
    }
  }
  return out;
}

// What the agents did on a day, for the care team view.
export function agentSummary(cases, day) {
  const ev = cases.flatMap((c) => (c.events || []).filter((e) => e.type === 'agent' && e.day === day).map((e) => ({ c, e })));
  const n = (agent, kind, test) => ev.filter(({ e }) => e.agent === agent && (!kind || e.kind === kind) && (!test || test(e))).length;
  return {
    calls: n('outreach', 'call'), answered: n('outreach', 'call', (e) => /Answered/.test(e.note)),
    confirmed: n('booking', 'confirm', (e) => /replied YES/.test(e.note)), reminders: n('booking', 'reminder'), missed: n('booking', 'missed'),
    chased: n('referral', 'chase'), status: n('referral', 'status'), preauth: n('insurance'),
    flagged: cases.filter((c) => c.nurseRequest && !c.nurseRequest.done && /^Agent:/.test(c.nurseRequest.note || '')).length,
    items: ev.sort((a, b) => a.e.at.localeCompare(b.e.at)),
  };
}
