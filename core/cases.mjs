// CASE RULES: how a case moves forward, who is allowed to do what, how it is handed between providers,
// and how it can be closed. These rules are enforced here in code (not just by greying out buttons).
// The AI is never an actor: any attempt by it to change a case is refused.

import { STAGES, OPTIONAL_STAGES, classify, dueDate, addDays, isoDay, BARRIERS, CHANNELS, CONSULT_REPLY_DAYS, ownerRoleFor } from './rules.mjs';

export class RuleError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export const ROLES = ['nurse', 'coordinator', 'clinician'];
export const ORGS = ['Screening programme', 'Primary care clinic', 'Hospital endocrinology', 'Diabetes centre'];
export const REFERRAL_TARGETS = ['Hospital endocrinology', 'Diabetes centre'];
export const PLAN_KINDS = { treatment: 'Treatment started', surveillance: 'Surveillance (lifestyle plan and re-testing)' };
export const CLOSE_TYPES = {
  care_plan_agreed: 'Treatment or surveillance plan agreed and started',
  documented_refusal: 'Patient declined follow-up (informed refusal documented)',
  transferred_care: 'Care transferred to another provider',
};
export const MIN_EVIDENCE = 15; // characters
const MIN_REASON = 10;

// Who may record each step. 'patient' means the patient did it themselves in the app.
// "referred" is only reachable through sendReferral(); optional steps can be skipped with skipStage().
const WHO_CAN = {
  notified:   ['system', 'nurse', 'coordinator', 'clinician'],
  understood: ['patient', 'nurse', 'clinician'],
  booked:     ['patient', 'nurse', 'coordinator', 'clinician'],
  attended:   ['nurse', 'coordinator', 'clinician'],
  confirmed:  ['nurse', 'clinician'],
  care_plan:  ['clinician'],
};

const who = (actor) => (actor.type === 'staff' ? actor.role : actor.type);
const isClinician = (a) => !!a && a.type === 'staff' && a.role === 'clinician';

// Used by the staff screen to show or lock a button. The real check still happens inside advance().
export const canRecord = (stage, actor) => !!WHO_CAN[stage] && actor.type !== 'ai' && WHO_CAN[stage].includes(who(actor));

function refuseAI(actor) {
  if (!actor || actor.type === 'ai') throw new RuleError('ai_not_allowed', 'The AI cannot change or close cases.');
}
const needText = (t, n, code, msg) => { const v = (t || '').trim(); if (v.length < n) throw new RuleError(code, msg); return v; };

export function findCase(state, id) {
  const c = state.cases.find((x) => x.id === id);
  if (!c) throw new RuleError('not_found', 'Case not found.');
  return c;
}

export function logEvent(c, type, actor, note, at, extra) {
  c.events.push({ type, at: at || new Date().toISOString(), by: actor.name || actor.type, role: who(actor), note: note || '', ...(extra || {}) });
}

export const nextStageOf = (c) => STAGES[STAGES.indexOf(c.stage) + 1];

// Move a case to its NEXT stage. Steps cannot be skipped here. "closed" only through closeCase,
// "referred" only through sendReferral, optional steps through skipStage.
export function advance(state, id, stage, actor, note, at, opts = {}) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (stage === 'closed') throw new RuleError('use_close', 'Cases are closed only with closeCase().');
  if (stage === 'referred') throw new RuleError('use_referral', 'Use sendReferral() to refer a patient.');
  const i = STAGES.indexOf(stage);
  if (i < 1) throw new RuleError('bad_stage', 'Unknown stage.');
  if (c.stage === 'closed') throw new RuleError('already_closed', 'This case is already closed.');
  if (nextStageOf(c) !== stage) throw new RuleError('out_of_order', `Next step is "${nextStageOf(c)}".`);
  if (!WHO_CAN[stage].includes(who(actor))) throw new RuleError('not_allowed', `A ${who(actor)} cannot record "${stage}".`);
  if (stage === 'care_plan') {
    const r = c.referral;
    if (r && !['completed', 'cancelled'].includes(r.status)) throw new RuleError('referral_open', 'The referral is not complete yet. The specialist must report back first.');
    const kind = opts.planKind || 'treatment';
    if (!PLAN_KINDS[kind]) throw new RuleError('bad_plan', 'Choose treatment or surveillance.');
    c.plan = { kind, at: at || new Date().toISOString(), by: actor.name };
  }
  c.stage = stage;
  logEvent(c, stage, actor, note, at);
  return c;
}

// A clinician can mark an OPTIONAL step "not required", with a written reason.
export function skipStage(state, id, stage, actor, reason) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (c.stage === 'closed') throw new RuleError('already_closed', 'This case is already closed.');
  if (!OPTIONAL_STAGES.includes(stage)) throw new RuleError('not_optional', 'This step cannot be skipped.');
  if (nextStageOf(c) !== stage) throw new RuleError('out_of_order', `Next step is "${nextStageOf(c)}".`);
  if (!isClinician(actor)) throw new RuleError('clinician_only', 'Only a clinician can mark a step as not required.');
  const why = needText(reason, MIN_REASON, 'reason_required', `Write why it is not required (at least ${MIN_REASON} characters).`);
  c.stage = stage;
  logEvent(c, stage, actor, 'Not required: ' + why, undefined, { skipped: true });
  return c;
}

// ---- REFERRAL: send, accept or reject, report back. Ownership moves with the patient. ----
export function sendReferral(state, id, actor, { to, reason } = {}) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (c.stage === 'closed') throw new RuleError('already_closed', 'This case is already closed.');
  if (!isClinician(actor)) throw new RuleError('clinician_only', 'Only a clinician can refer a patient.');
  if (!REFERRAL_TARGETS.includes(to)) throw new RuleError('bad_target', 'Choose where to refer the patient.');
  const resend = c.stage === 'referred' && c.referral && c.referral.status === 'rejected';
  if (!resend && nextStageOf(c) !== 'referred') throw new RuleError('out_of_order', `Next step is "${nextStageOf(c)}".`);
  const why = needText(reason, MIN_REASON, 'reason_required', `Write the reason for referral (at least ${MIN_REASON} characters).`);
  const history = c.referral ? [...(c.referral.history || []), { to: c.referral.to, status: c.referral.status, note: c.referral.note || '' }] : [];
  c.referral = { to, reason: why, status: 'sent', sentAt: new Date().toISOString(), fromOwner: c.owner, history };
  c.stage = 'referred';
  logEvent(c, resend ? 'referral_resent' : 'referred', actor, `Referred to ${to}: ${why}`);
  return c;
}

const isReceiver = (c, actor) => isClinician(actor) && !!c.referral && actor.org === c.referral.to;

export function respondReferral(state, id, actor, { accept, note } = {}) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (!c.referral || c.referral.status !== 'sent') throw new RuleError('no_open_referral', 'There is no referral waiting for a reply.');
  if (!isReceiver(c, actor)) throw new RuleError('wrong_org', `Only a clinician at ${c.referral.to} can reply to this referral.`);
  if (accept) {
    c.referral.status = 'accepted';
    c.referral.note = (note || '').trim();
    c.referral.acceptedAt = new Date().toISOString();
    c.owner = actor.id; // HAND-OFF: the receiving clinician now owns the case
    logEvent(c, 'referral_accepted', actor, `Accepted by ${actor.name}. Owner is now ${actor.name}.`);
  } else {
    const why = needText(note, MIN_REASON, 'reason_required', `Say why it is rejected (at least ${MIN_REASON} characters).`);
    c.referral.status = 'rejected';
    c.referral.note = why;
    logEvent(c, 'referral_rejected', actor, `Rejected by ${c.referral.to}: ${why}`);
  }
  return c;
}

export function completeReferral(state, id, actor, report) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (!c.referral || c.referral.status !== 'accepted') throw new RuleError('not_accepted', 'The referral must be accepted first.');
  if (!isReceiver(c, actor)) throw new RuleError('wrong_org', `Only a clinician at ${c.referral.to} can complete this referral.`);
  const rep = needText(report, MIN_EVIDENCE, 'evidence_required', `Write the report back (at least ${MIN_EVIDENCE} characters).`);
  c.referral.status = 'completed';
  c.referral.report = rep;
  c.referral.completedAt = new Date().toISOString();
  if (c.referral.fromOwner) c.owner = c.referral.fromOwner; // HAND-BACK: continuity returns to the referrer
  logEvent(c, 'referral_completed', actor, `Report back: ${rep}`);
  return c;
}

// ---- CLINICIAN-TO-CLINICIAN QUESTION (e-consult), with a reply deadline ----
export function requestConsult(state, id, actor, { to, question } = {}) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (!isClinician(actor)) throw new RuleError('clinician_only', 'Only a clinician can ask a colleague for advice.');
  if (!REFERRAL_TARGETS.includes(to)) throw new RuleError('bad_target', 'Choose who to ask.');
  const q = needText(question, MIN_REASON, 'reason_required', `Write the question (at least ${MIN_REASON} characters).`);
  const item = { id: 'Q' + ((c.consults || []).length + 1), to, question: q, askedBy: actor.name, askedAt: new Date().toISOString(), due: addDays(isoDay(Date.now()), CONSULT_REPLY_DAYS), answer: null };
  c.consults = [...(c.consults || []), item];
  logEvent(c, 'consult_asked', actor, `Asked ${to}: ${q}`);
  return c;
}

export function answerConsult(state, id, consultId, actor, answer) {
  refuseAI(actor);
  const c = findCase(state, id);
  const q = (c.consults || []).find((x) => x.id === consultId);
  if (!q) throw new RuleError('not_found', 'Question not found.');
  if (!isClinician(actor) || actor.org !== q.to) throw new RuleError('wrong_org', `Only a clinician at ${q.to} can answer this.`);
  if (q.answer) throw new RuleError('already_answered', 'Already answered.');
  const a = needText(answer, MIN_REASON, 'reason_required', `Write the answer (at least ${MIN_REASON} characters).`);
  q.answer = { text: a, by: actor.name, at: new Date().toISOString() };
  logEvent(c, 'consult_answered', actor, `${q.to}: ${a}`);
  return c;
}

// Closing: clinician only, with a written evidence note, and a valid reason.
export function closeCase(state, id, actor, { type, evidence } = {}) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (c.stage === 'closed') throw new RuleError('already_closed', 'This case is already closed.');
  if (!isClinician(actor)) throw new RuleError('clinician_only', 'Only a clinician can close a case.');
  if (!CLOSE_TYPES[type]) throw new RuleError('bad_type', 'Choose why the case is being closed.');
  const ev = (evidence || '').trim();
  if (ev.length < MIN_EVIDENCE) throw new RuleError('evidence_required', `Write the evidence (at least ${MIN_EVIDENCE} characters).`);
  if (type === 'care_plan_agreed' && c.stage !== 'care_plan') throw new RuleError('no_care_plan', 'A treatment or surveillance plan must be recorded before closing as "plan agreed".');
  if (c.referral && ['sent', 'accepted'].includes(c.referral.status) && type !== 'transferred_care') throw new RuleError('referral_open', 'The referral is still open. Wait for the report back, or close as "care transferred".');
  c.stage = 'closed';
  c.closed = { type, evidence: ev, by: actor.name, at: new Date().toISOString() };
  logEvent(c, 'closed', actor, `${CLOSE_TYPES[type]}: ${ev}`);
  return c;
}

export function setBarrier(state, id, barrier, actor) {
  refuseAI(actor);
  if (!BARRIERS.includes(barrier)) throw new RuleError('bad_barrier', 'Unknown barrier.');
  const c = findCase(state, id);
  c.barrier = barrier;
  logEvent(c, 'barrier', actor, barrier);
  return c;
}

export function setChannel(state, id, channel, actor) {
  refuseAI(actor);
  if (!CHANNELS.includes(channel)) throw new RuleError('bad_channel', 'Unknown channel.');
  const c = findCase(state, id);
  c.channel = channel;
  logEvent(c, 'channel', actor, channel);
  return c;
}

// The patient says how confident they feel about the next step (1 to 5). Feeds the impact measures.
export function recordConfidence(state, id, score, actor) {
  refuseAI(actor);
  if (actor.type !== 'patient') throw new RuleError('not_allowed', 'Only the patient can answer this.');
  if (![1, 2, 3, 4, 5].includes(score)) throw new RuleError('bad_score', 'Score must be 1 to 5.');
  const c = findCase(state, id);
  c.confidence = { score, at: new Date().toISOString() };
  logEvent(c, 'confidence', actor, `Confidence ${score}/5`);
  return c;
}

export function requestNurse(state, id, actor, note) {
  refuseAI(actor);
  const c = findCase(state, id);
  c.nurseRequest = { at: new Date().toISOString(), note: note || '', done: false };
  logEvent(c, 'nurse_requested', actor, note || 'Patient asked to talk to a nurse');
  return c;
}

export function assignOwner(state, id, ownerId, actor) {
  refuseAI(actor);
  if (actor.type !== 'staff') throw new RuleError('not_allowed', 'Only staff can assign owners.');
  const c = findCase(state, id);
  const s = state.staff.find((x) => x.id === ownerId);
  if (!s) throw new RuleError('bad_owner', 'Unknown staff member.');
  c.owner = ownerId;
  logEvent(c, 'owner', actor, `Owner: ${s.name}`);
  return c;
}

export function setDropReason(state, id, reason, actor) {
  refuseAI(actor);
  if (actor.type !== 'staff') throw new RuleError('not_allowed', 'Only staff can record a drop-out reason.');
  const c = findCase(state, id);
  c.dropReason = reason.trim() || null;
  logEvent(c, 'drop_reason', actor, c.dropReason || 'cleared');
  return c;
}

export function logContact(state, id, actor, note) {
  refuseAI(actor);
  if (actor.type !== 'staff') throw new RuleError('not_allowed', 'Only staff can log contact.');
  const c = findCase(state, id);
  if (c.nurseRequest) c.nurseRequest.done = true;
  logEvent(c, 'contact', actor, note || 'Contact attempt');
  return c;
}

// AI text is stored as a suggestion only. It never changes the stage, owner or urgency.
export function recordAiText(state, id, text, source) {
  const c = findCase(state, id);
  c.aiText = { text, source, at: new Date().toISOString() };
  return c;
}

export const LANGUAGES = ['ar', 'en', 'ur', 'hi', 'tl', 'bn', 'ml'];

// A NEW RESULT ARRIVES (from the lab, or typed in by staff). The rules decide everything:
// urgency and due date from the HbA1c, and the owner (urgent -> the least busy nurse, otherwise the least busy coordinator).
// Results below 5.7% are not actionable, so no case is opened.
export function createCase(state, actor, { name, age, language, value, today } = {}) {
  refuseAI(actor);
  if (!actor || !['staff', 'system'].includes(actor.type)) throw new RuleError('not_allowed', 'Only staff or the lab system can add a result.');
  const nm = (name || '').trim();
  if (nm.length < 2 || nm.length > 60) throw new RuleError('bad_name', 'Enter the patient name.');
  const ag = Number(age);
  if (!Number.isInteger(ag) || ag < 18 || ag > 110) throw new RuleError('bad_age', 'Enter an age between 18 and 110.');
  if (!LANGUAGES.includes(language)) throw new RuleError('bad_language', 'Choose a language.');
  const k = classify(value);
  if (k.band === 'invalid') throw new RuleError('bad_value', 'Enter an HbA1c between 3 and 20%.');
  if (!k.inProgramme) throw new RuleError('not_actionable', 'Below 5.7%: not an actionable result, so no case is opened.');
  const day = today || isoDay(Date.now());
  const n = state.cases.reduce((m, c) => Math.max(m, parseInt(c.id.slice(2), 10) || 0), 0) + 1;
  const role = ownerRoleFor(k.band);
  const open = (sid) => state.cases.filter((c) => c.owner === sid && c.stage !== 'closed').length;
  const pool = state.staff.filter((s) => s.role === role && s.org === 'Screening programme').sort((a, b) => open(a.id) - open(b.id) || a.id.localeCompare(b.id));
  const owner = pool[0] ? pool[0].id : null;
  const c = newCase({
    id: 'C-' + String(n).padStart(3, '0'), value: k.value, resultDay: day, owner,
    patient: { id: 'P-' + String(n).padStart(3, '0'), name: nm, age: ag, language, shifts: false },
  });
  c.events[0].at = new Date().toISOString();
  c.events[0].by = actor.type === 'system' ? 'Lab system' : `Lab result entered by ${actor.name}`;
  if (owner) logEvent(c, 'owner', { type: 'system', name: 'Jissr rules' }, `Assigned by rule to ${pool[0].name} (least busy ${role})`);
  state.cases.push(c);
  return c;
}

export function newCase({ id, patient, value, resultDay, owner }) {
  const k = classify(value);
  return {
    id, patient, value: k.value, band: k.band, urgency: k.urgency,
    resultDay, due: dueDate(resultDay, value), owner,
    stage: 'result', barrier: 'none', dropReason: null, nurseRequest: null, aiText: null, closed: null, familyHelper: null,
    referral: null, consults: [], plan: null, channel: 'app', confidence: null,
    events: [{ type: 'result', at: resultDay + 'T08:00:00.000Z', by: 'Lab system', role: 'system', note: `HbA1c ${k.value}%` }],
  };
}

export { addDays, isoDay };
