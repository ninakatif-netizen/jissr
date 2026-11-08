// CASE RULES: how a case moves forward, who is allowed to do what, and how it can be closed.
// These rules are enforced here in code (not just by greying out buttons in the page).
// The AI is never an actor: any attempt by it to change a case is refused.

import { STAGES, classify, dueDate, addDays, isoDay, BARRIERS } from './rules.mjs';

export class RuleError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export const ROLES = ['nurse', 'coordinator', 'clinician'];
export const CLOSE_TYPES = {
  care_plan_agreed: 'Care plan agreed and started',
  documented_refusal: 'Patient declined follow-up (informed refusal documented)',
  transferred_care: 'Care transferred to another provider',
};
export const MIN_EVIDENCE = 15; // characters

// Who may record each step. 'patient' means the patient did it themselves in the app.
const WHO_CAN = {
  notified:   ['system', 'nurse', 'coordinator', 'clinician'],
  understood: ['patient', 'nurse', 'clinician'],
  booked:     ['patient', 'nurse', 'coordinator', 'clinician'],
  attended:   ['nurse', 'coordinator', 'clinician'],
  care_plan:  ['clinician'],
};

const who = (actor) => (actor.type === 'staff' ? actor.role : actor.type);

// Used by the staff screen to show or lock a button. The real check still happens inside advance().
export const canRecord = (stage, actor) => !!WHO_CAN[stage] && actor.type !== 'ai' && WHO_CAN[stage].includes(who(actor));

function refuseAI(actor) {
  if (!actor || actor.type === 'ai') throw new RuleError('ai_not_allowed', 'The AI cannot change or close cases.');
}

export function findCase(state, id) {
  const c = state.cases.find((x) => x.id === id);
  if (!c) throw new RuleError('not_found', 'Case not found.');
  return c;
}

export function logEvent(c, type, actor, note, at) {
  c.events.push({ type, at: at || new Date().toISOString(), by: actor.name || actor.type, role: who(actor), note: note || '' });
}

// Move a case to its NEXT stage. Steps cannot be skipped. "closed" can only be reached through closeCase.
export function advance(state, id, stage, actor, note, at) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (stage === 'closed') throw new RuleError('use_close', 'Cases are closed only with closeCase().');
  const i = STAGES.indexOf(stage);
  if (i < 1) throw new RuleError('bad_stage', 'Unknown stage.');
  if (c.stage === 'closed') throw new RuleError('already_closed', 'This case is already closed.');
  if (STAGES.indexOf(c.stage) !== i - 1) throw new RuleError('out_of_order', `Next step is "${STAGES[STAGES.indexOf(c.stage) + 1]}".`);
  if (!WHO_CAN[stage].includes(who(actor))) throw new RuleError('not_allowed', `A ${who(actor)} cannot record "${stage}".`);
  c.stage = stage;
  logEvent(c, stage, actor, note, at);
  return c;
}

// Closing: clinician only, with a written evidence note, and a valid reason.
export function closeCase(state, id, actor, { type, evidence } = {}) {
  refuseAI(actor);
  const c = findCase(state, id);
  if (c.stage === 'closed') throw new RuleError('already_closed', 'This case is already closed.');
  if (actor.type !== 'staff' || actor.role !== 'clinician') throw new RuleError('clinician_only', 'Only a clinician can close a case.');
  if (!CLOSE_TYPES[type]) throw new RuleError('bad_type', 'Choose why the case is being closed.');
  const ev = (evidence || '').trim();
  if (ev.length < MIN_EVIDENCE) throw new RuleError('evidence_required', `Write the evidence (at least ${MIN_EVIDENCE} characters).`);
  if (type === 'care_plan_agreed' && c.stage !== 'care_plan') throw new RuleError('no_care_plan', 'A care plan must be recorded before closing as "care plan agreed".');
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
  if (barrier !== 'none') c.dropReason = c.dropReason || null; // staff record real drop-outs separately
  logEvent(c, 'barrier', actor, barrier);
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

export function newCase({ id, patient, value, resultDay, owner }) {
  const k = classify(value);
  return {
    id, patient, value: k.value, band: k.band, urgency: k.urgency,
    resultDay, due: dueDate(resultDay, value), owner,
    stage: 'result', barrier: 'none', dropReason: null, nurseRequest: null, aiText: null, closed: null, familyHelper: null,
    events: [{ type: 'result', at: resultDay + 'T08:00:00.000Z', by: 'Lab system', role: 'system', note: `HbA1c ${k.value}%` }],
  };
}

export { addDays, isoDay };
