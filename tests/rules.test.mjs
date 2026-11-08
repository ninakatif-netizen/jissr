// Run with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, dueDate, isOverdue, statusOf, slotsFor, safeText, withDisclaimer, addDays, escalationsFor, maxLevel, slaDeadline, STAGES } from '../core/rules.mjs';
import {
  advance, skipStage, closeCase, newCase, RuleError, setBarrier, requestNurse, assignOwner,
  sendReferral, respondReferral, completeReferral, requestConsult, answerConsult, recordConfidence, setChannel, createCase,
} from '../core/cases.mjs';
import { buildState, STAFF } from '../core/data.mjs';
import { explanation } from '../core/templates.mjs';
import { caseToFhirBundle } from '../core/fhir.mjs';

const TODAY = '2026-11-10';
const nurse = { type: 'staff', role: 'nurse', name: 'Nurse N', id: 'n1', org: 'Screening programme' };
const coord = { type: 'staff', role: 'coordinator', name: 'Coord C', id: 'c1', org: 'Screening programme' };
const doc = { type: 'staff', role: 'clinician', name: 'Dr D', id: 'd1', org: 'Primary care clinic' };
const endo = { type: 'staff', role: 'clinician', name: 'Dr E', id: 'e1', org: 'Hospital endocrinology' };
const other = { type: 'staff', role: 'clinician', name: 'Dr X', id: 'e2', org: 'Diabetes centre' };
const patient = { type: 'patient', name: 'Patient' };
const ai = { type: 'ai', name: 'AI' };
const system = { type: 'system', name: 'system' };
const codeOf = (code) => (e) => e instanceof RuleError && e.code === code;

test('HbA1c bands and boundaries', () => {
  assert.equal(classify(5.6).band, 'normal');
  assert.equal(classify(5.7).band, 'prediabetes');
  assert.equal(classify(6.4).band, 'prediabetes');
  assert.equal(classify(6.5).band, 'diabetes');
  assert.equal(classify(9.9).band, 'diabetes');
  assert.equal(classify(10).band, 'urgent');
  assert.equal(classify(14.2).band, 'urgent');
  assert.equal(classify(6.44).band, 'prediabetes'); // rounds to 6.4
  assert.equal(classify(6.45).band, 'diabetes');    // rounds to 6.5
  assert.equal(classify('abc').band, 'invalid');
  assert.equal(classify(1).band, 'invalid');
});

test('due dates follow the band', () => {
  assert.equal(dueDate('2026-11-01', 6.0), '2026-12-01');
  assert.equal(dueDate('2026-11-01', 8.0), '2026-11-15');
  assert.equal(dueDate('2026-11-01', 11), '2026-11-03');
  assert.equal(dueDate('2026-11-01', 5.0), null);
});

test('overdue only when open and past due', () => {
  const c = newCase({ id: 'C-1', patient: {}, value: 11, resultDay: '2026-11-01', owner: 'n1' });
  assert.equal(isOverdue(c, '2026-11-03'), false); // due today is not overdue
  assert.equal(isOverdue(c, '2026-11-04'), true);
  assert.equal(statusOf(c, '2026-11-04'), 'overdue');
  c.stage = 'closed';
  assert.equal(isOverdue(c, '2026-11-30'), false);
  assert.equal(statusOf(c, '2026-11-30'), 'closed');
});

test('urgent slots are only in the next two days; shift workers get early/evening times', () => {
  const urgent = slotsFor({ band: 'urgent', barrier: 'none' }, TODAY);
  assert.ok(urgent.length > 0 && urgent.every((s) => s.day <= addDays(TODAY, 2)));
  const shift = slotsFor({ band: 'diabetes', barrier: 'time_shift' }, TODAY);
  assert.ok(shift.every((s) => ['07:30', '18:30', '19:30'].includes(s.time)));
});

const fresh = (value = 8.1, day = TODAY) => ({ staff: STAFF, cases: [newCase({ id: 'C-1', patient: { id: 'P' }, value, resultDay: day, owner: 'n1' })] });
const toAttended = (s) => {
  advance(s, 'C-1', 'notified', system);
  advance(s, 'C-1', 'understood', patient);
  advance(s, 'C-1', 'booked', patient);
  advance(s, 'C-1', 'attended', nurse);
  return s;
};
const toConfirmed = (s) => { toAttended(s); advance(s, 'C-1', 'confirmed', doc, 'Repeat HbA1c confirms'); return s; };
const toCarePlan = (s) => { toConfirmed(s); skipStage(s, 'C-1', 'referred', doc, 'Managed in primary care'); advance(s, 'C-1', 'care_plan', doc, 'Plan agreed', undefined, { planKind: 'treatment' }); return s; };

test('steps cannot be skipped or done by the wrong person', () => {
  const s = fresh();
  assert.throws(() => advance(s, 'C-1', 'booked', patient), codeOf('out_of_order'));
  advance(s, 'C-1', 'notified', system);
  advance(s, 'C-1', 'understood', patient);
  advance(s, 'C-1', 'booked', patient);
  assert.throws(() => advance(s, 'C-1', 'attended', patient), codeOf('not_allowed'));
  advance(s, 'C-1', 'attended', nurse);
  assert.throws(() => advance(s, 'C-1', 'care_plan', doc), codeOf('out_of_order')); // confirmation comes first
  assert.throws(() => advance(s, 'C-1', 'confirmed', coord), codeOf('not_allowed'));
  advance(s, 'C-1', 'confirmed', nurse);
  assert.equal(s.cases[0].stage, 'confirmed');
});

test('advance cannot close or refer', () => {
  const s = toConfirmed(fresh());
  assert.throws(() => advance(s, 'C-1', 'closed', doc), codeOf('use_close'));
  assert.throws(() => advance(s, 'C-1', 'referred', doc), codeOf('use_referral'));
});

test('optional steps can be marked "not required" only by a clinician, with a reason', () => {
  const s = toAttended(fresh());
  assert.throws(() => skipStage(s, 'C-1', 'confirmed', nurse, 'Not needed here at all'), codeOf('clinician_only'));
  assert.throws(() => skipStage(s, 'C-1', 'confirmed', doc, 'no'), codeOf('reason_required'));
  assert.throws(() => skipStage(s, 'C-1', 'care_plan', doc, 'Trying to skip the plan'), codeOf('not_optional'));
  skipStage(s, 'C-1', 'confirmed', doc, 'Urgent and symptomatic, treated directly');
  assert.equal(s.cases[0].stage, 'confirmed');
  assert.equal(s.cases[0].events.at(-1).skipped, true);
});

test('only a clinician can close, and only with evidence', () => {
  const s = toCarePlan(fresh());
  const ev = 'Seen in clinic, plan agreed, review in 3 months.';
  for (const a of [nurse, coord, patient]) assert.throws(() => closeCase(s, 'C-1', a, { type: 'care_plan_agreed', evidence: ev }), codeOf('clinician_only'));
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: '' }), codeOf('evidence_required'));
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: 'ok' }), codeOf('evidence_required'));
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'nonsense', evidence: ev }), codeOf('bad_type'));
  assert.equal(s.cases[0].stage, 'care_plan'); // nothing changed by the failed attempts
  closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: ev });
  assert.equal(s.cases[0].stage, 'closed');
  assert.equal(s.cases[0].closed.evidence, ev);
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: ev }), codeOf('already_closed'));
});

test('"plan agreed" needs a recorded plan first; an informed refusal can close with evidence', () => {
  const s = fresh();
  advance(s, 'C-1', 'notified', system);
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: 'A long enough evidence note.' }), codeOf('no_care_plan'));
  closeCase(s, 'C-1', doc, { type: 'documented_refusal', evidence: 'Spoke with patient, understands risks, declined follow-up.' });
  assert.equal(s.cases[0].stage, 'closed');
});

test('treatment or surveillance must be chosen', () => {
  const s = toConfirmed(fresh());
  skipStage(s, 'C-1', 'referred', doc, 'Managed in primary care');
  assert.throws(() => advance(s, 'C-1', 'care_plan', doc, 'x', undefined, { planKind: 'magic' }), codeOf('bad_plan'));
  advance(s, 'C-1', 'care_plan', doc, 'Lifestyle plan', undefined, { planKind: 'surveillance' });
  assert.equal(s.cases[0].plan.kind, 'surveillance');
});

// ---------- referral, hand-off, consultation ----------
const referred = () => { const s = toConfirmed(fresh()); sendReferral(s, 'C-1', doc, { to: 'Hospital endocrinology', reason: 'Needs specialist review of treatment.' }); return s; };

test('referral: only a clinician sends it, to a valid place, with a reason, in order', () => {
  const s = toConfirmed(fresh());
  assert.throws(() => sendReferral(s, 'C-1', nurse, { to: 'Hospital endocrinology', reason: 'Needs specialist review.' }), codeOf('clinician_only'));
  assert.throws(() => sendReferral(s, 'C-1', doc, { to: 'Nowhere', reason: 'Needs specialist review.' }), codeOf('bad_target'));
  assert.throws(() => sendReferral(s, 'C-1', doc, { to: 'Diabetes centre', reason: 'x' }), codeOf('reason_required'));
  const early = toAttended(fresh());
  assert.throws(() => sendReferral(early, 'C-1', doc, { to: 'Diabetes centre', reason: 'Too early to refer.' }), codeOf('out_of_order'));
  sendReferral(s, 'C-1', doc, { to: 'Diabetes centre', reason: 'Needs diabetes education programme.' });
  assert.equal(s.cases[0].stage, 'referred');
  assert.equal(s.cases[0].referral.status, 'sent');
});

test('referral hand-off: acceptance moves ownership, report back returns it, and care plan waits for the report', () => {
  const s = referred();
  const c = s.cases[0];
  assert.throws(() => respondReferral(s, 'C-1', other, { accept: true }), codeOf('wrong_org'));      // wrong provider
  assert.throws(() => respondReferral(s, 'C-1', nurse, { accept: true }), codeOf('wrong_org'));
  assert.throws(() => advance(s, 'C-1', 'care_plan', doc), codeOf('referral_open'));
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'documented_refusal', evidence: 'Long enough evidence note here.' }), codeOf('referral_open'));
  respondReferral(s, 'C-1', endo, { accept: true, note: 'Seen next Tuesday' });
  assert.equal(c.owner, 'e1');                       // owned by the receiving clinician
  assert.throws(() => completeReferral(s, 'C-1', doc, 'Patient seen, plan agreed with specialist.'), codeOf('wrong_org'));
  assert.throws(() => completeReferral(s, 'C-1', endo, 'short'), codeOf('evidence_required'));
  completeReferral(s, 'C-1', endo, 'Patient seen, started treatment, review in 3 months.');
  assert.equal(c.owner, 'n1');                       // handed back to the referring owner
  advance(s, 'C-1', 'care_plan', doc, 'Continue plan', undefined, { planKind: 'treatment' });
  assert.equal(c.stage, 'care_plan');
});

test('a rejected referral stays visible, needs a reason, and can be re-sent elsewhere', () => {
  const s = referred();
  const c = s.cases[0];
  assert.throws(() => respondReferral(s, 'C-1', endo, { accept: false, note: '' }), codeOf('reason_required'));
  respondReferral(s, 'C-1', endo, { accept: false, note: 'Please repeat HbA1c and kidney profile first.' });
  assert.equal(c.referral.status, 'rejected');
  assert.equal(c.owner, 'n1');                        // never left without an owner
  assert.ok(escalationsFor(c, TODAY).some((e) => e.code === 'referral_rejected' && e.level === 3));
  sendReferral(s, 'C-1', doc, { to: 'Diabetes centre', reason: 'Resubmitting with repeat tests completed.' });
  assert.equal(c.referral.to, 'Diabetes centre');
  assert.equal(c.referral.history[0].status, 'rejected');
});

test('clinician-to-clinician questions: only clinicians ask, only the right provider answers', () => {
  const s = toAttended(fresh());
  assert.throws(() => requestConsult(s, 'C-1', nurse, { to: 'Hospital endocrinology', question: 'Is this urgent enough?' }), codeOf('clinician_only'));
  requestConsult(s, 'C-1', doc, { to: 'Hospital endocrinology', question: 'Should this patient be seen this week?' });
  const q = s.cases[0].consults[0];
  assert.throws(() => answerConsult(s, 'C-1', q.id, other, 'Yes, see within the week please.'), codeOf('wrong_org'));
  answerConsult(s, 'C-1', q.id, endo, 'Yes, please send within the week.');
  assert.equal(q.answer.by, 'Dr E');
  assert.throws(() => answerConsult(s, 'C-1', q.id, endo, 'Answering twice should fail.'), codeOf('already_answered'));
});

test('the AI can never change or close a case', () => {
  const s = referred();
  for (const fn of [
    () => closeCase(s, 'C-1', ai, { type: 'care_plan_agreed', evidence: 'long enough evidence here' }),
    () => advance(s, 'C-1', 'closed', ai),
    () => skipStage(s, 'C-1', 'confirmed', ai, 'Not needed at all here'),
    () => sendReferral(s, 'C-1', ai, { to: 'Diabetes centre', reason: 'Because the AI said so.' }),
    () => respondReferral(s, 'C-1', ai, { accept: true }),
    () => completeReferral(s, 'C-1', ai, 'The AI says all is complete.'),
    () => requestConsult(s, 'C-1', ai, { to: 'Diabetes centre', question: 'Question from the AI here' }),
    () => setBarrier(s, 'C-1', 'fear', ai),
    () => setChannel(s, 'C-1', 'sms', ai),
    () => recordConfidence(s, 'C-1', 5, ai),
    () => requestNurse(s, 'C-1', ai),
    () => assignOwner(s, 'C-1', 'n2', ai),
  ]) assert.throws(fn, codeOf('ai_not_allowed'));
  assert.equal(s.cases[0].stage, 'referred');
});

test('patient-only answers and valid channels', () => {
  const s = fresh();
  assert.throws(() => recordConfidence(s, 'C-1', 4, nurse), codeOf('not_allowed'));
  assert.throws(() => recordConfidence(s, 'C-1', 9, patient), codeOf('bad_score'));
  recordConfidence(s, 'C-1', 4, patient);
  assert.equal(s.cases[0].confidence.score, 4);
  assert.throws(() => setChannel(s, 'C-1', 'pigeon', patient), codeOf('bad_channel'));
  setChannel(s, 'C-1', 'whatsapp', patient);
  assert.equal(s.cases[0].channel, 'whatsapp');
});

// ---------- service levels and escalation ----------
test('service levels follow urgency', () => {
  const u = newCase({ id: 'U', patient: {}, value: 11, resultDay: '2026-11-01', owner: 'n1' });
  const r = newCase({ id: 'R', patient: {}, value: 6.0, resultDay: '2026-11-01', owner: 'c1' });
  assert.equal(slaDeadline(u, 'notified'), '2026-11-01');
  assert.equal(slaDeadline(u, 'attended'), '2026-11-03');
  assert.equal(slaDeadline(r, 'notified'), '2026-11-04');
  assert.equal(slaDeadline(r, 'attended'), '2026-12-01');
});

test('escalation rules: unassigned, overdue, urgent not notified, late nurse call, late referral', () => {
  const urgent = newCase({ id: 'U', patient: {}, value: 11, resultDay: '2026-11-08', owner: null });
  const codes = (c, day) => escalationsFor(c, day).map((e) => e.code);
  assert.ok(codes(urgent, '2026-11-08').includes('unassigned'));
  assert.ok(!codes(urgent, '2026-11-08').includes('urgent_not_notified'));    // same day: not yet
  assert.ok(codes(urgent, '2026-11-09').includes('urgent_not_notified'));
  assert.equal(maxLevel(escalationsFor(urgent, '2026-11-09')), 3);

  const c = newCase({ id: 'C', patient: {}, value: 8, resultDay: '2026-11-01', owner: 'n1' });  // due 2026-11-15
  assert.deepEqual(codes(c, '2026-11-15').filter((x) => x.startsWith('overdue')), []);
  assert.ok(codes(c, '2026-11-18').includes('overdue_3d'));
  assert.ok(codes(c, '2026-11-22').includes('overdue_7d') && !codes(c, '2026-11-22').includes('overdue_3d'));

  c.nurseRequest = { at: '2026-11-09T10:00:00.000Z', done: false };
  assert.ok(codes(c, '2026-11-10').includes('nurse_callback_late'));
  c.nurseRequest.done = true;
  assert.ok(!codes(c, '2026-11-10').includes('nurse_callback_late'));

  c.referral = { to: 'Diabetes centre', status: 'sent', sentAt: '2026-11-07T10:00:00.000Z' };
  assert.ok(codes(c, '2026-11-09').includes('referral_unanswered'));
  c.consults = [{ id: 'Q1', to: 'Diabetes centre', due: '2026-11-08', answer: null }];
  assert.ok(codes(c, '2026-11-10').includes('consult_late'));

  c.stage = 'closed';
  assert.deepEqual(escalationsFor(c, '2026-12-30'), []); // closed cases never escalate
});

test('AI output safety filter', () => {
  assert.equal(safeText('You have diabetes and should start metformin now.', 'en'), null);
  assert.equal(safeText('You are diabetic. Please see a doctor soon about it.', 'en'), null);
  assert.equal(safeText('Take metformin every morning with food please.', 'en'), null);
  assert.equal(safeText('x', 'en'), null);
  assert.equal(safeText('أنت مصاب بالسكري ويجب أن تبدأ العلاج الآن.', 'ar'), null);
  assert.equal(safeText('This message is in English but we asked for Arabic', 'ar'), null);
  assert.ok(safeText('Your result is higher than usual. A nurse will help you book a visit.', 'en'));
  assert.ok(safeText('نتيجتك أعلى من المعتاد. ستساعدك ممرضة على حجز موعد.', 'ar'));
});

test('every patient message always says "not a diagnosis" (English and Arabic)', () => {
  for (const band of ['prediabetes', 'diabetes', 'urgent']) {
    for (const level of ['normal', 'simple']) {
      assert.match(explanation({ band, value: 8, lang: 'en', level }), /This is not a diagnosis\.$/);
      assert.match(explanation({ band, value: 8, lang: 'ar', level }), /هذا ليس تشخيصاً\.$/);
    }
  }
  assert.equal(withDisclaimer('A note. This is not a diagnosis.', 'en'), 'A note. This is not a diagnosis.'); // not doubled
});

test('synthetic data: 30 patients, every band, consistent rules, visible exceptions', () => {
  const st = buildState(TODAY);
  assert.equal(st.cases.length, 30);
  assert.deepEqual([...new Set(st.cases.map((c) => c.band))].sort(), ['diabetes', 'prediabetes', 'urgent']);
  assert.ok(st.cases.filter((c) => isOverdue(c, TODAY)).length >= 5);
  assert.equal(st.cases.filter((c) => c.stage === 'closed').length, 3);
  for (const c of st.cases) {
    assert.equal(c.band, classify(c.value).band);
    assert.equal(c.due, dueDate(c.resultDay, c.value));
    assert.ok(c.events.every((e) => e.at.slice(0, 10) <= TODAY), `no events in the future (${c.id})`);
    // events appear in journey order
    const order = c.events.map((e) => STAGES.indexOf(e.type)).filter((i) => i >= 0);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `journey order (${c.id})`);
    if (c.owner) assert.ok(st.staff.some((s) => s.id === c.owner), 'owner exists');
    if (c.stage === 'closed') { assert.ok(c.closed.evidence.length >= 15); assert.ok(c.plan); }
    if (c.referral && c.referral.status === 'accepted') assert.notEqual(c.owner, c.referral.fromOwner); // hand-off happened
  }
  // exceptions are present AND flagged by the rules
  const flagged = (code) => st.cases.filter((c) => escalationsFor(c, TODAY).some((e) => e.code === code)).length;
  assert.equal(st.cases.filter((c) => !c.owner).length, 2);
  assert.equal(flagged('unassigned'), 2);
  assert.ok(flagged('referral_rejected') >= 1 && flagged('referral_unanswered') >= 1 && flagged('consult_late') >= 1 && flagged('nurse_callback_late') >= 1);
  assert.ok(st.cases.some((c) => c.referral && c.referral.status === 'accepted'));
  // at least one clinician-ready case, at the care plan stage
  assert.ok(st.cases.some((c) => c.stage === 'care_plan'));
});

test('FHIR export: standard resources, correct codes, owner, referral, closure, and nothing AI-written', () => {
  const st = buildState(TODAY);
  const get = (b, type) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === type);
  // an open referred case
  const chen = st.cases.find((c) => c.id === 'C-027');
  const b = caseToFhirBundle(chen, st.staff);
  assert.equal(b.resourceType, 'Bundle');
  const obs = get(b, 'Observation')[0];
  assert.equal(obs.code.coding[0].code, '4548-4');
  assert.equal(obs.valueQuantity.value, 9.8);
  const sr = get(b, 'ServiceRequest')[0];
  assert.equal(sr.status, 'active');
  assert.equal(sr.performer[0].reference, 'Organization/org-diabetes-centre');
  const task = get(b, 'Task')[0];
  assert.equal(task.status, 'in-progress');
  assert.equal(task.owner.reference, 'Practitioner/prac-e2'); // hand-off owner
  assert.equal(task.restriction.period.end, chen.due);
  // rejected referral is revoked; unassigned case is flagged; closed case completes with evidence
  assert.equal(get(caseToFhirBundle(st.cases.find((c) => c.id === 'C-015'), st.staff), 'ServiceRequest')[0].status, 'revoked');
  const un = get(caseToFhirBundle(st.cases.find((c) => c.id === 'C-025'), st.staff), 'Task')[0];
  assert.ok(!un.owner && un.extension.some((e) => e.valueBoolean === true));
  const closed = get(caseToFhirBundle(st.cases.find((c) => c.stage === 'closed'), st.staff), 'Task')[0];
  assert.equal(closed.status, 'completed');
  assert.ok(closed.statusReason.text.length >= 15);
  // every resource is tagged synthetic, and the AI message text is never exported
  for (const e of b.entry) assert.equal(e.resource.meta.tag[0].code, 'SYNTHETIC');
  const withAi = { ...chen, aiText: { text: 'AI WORDING SHOULD NOT LEAK', source: 'ai' } };
  assert.ok(!JSON.stringify(caseToFhirBundle(withAi, st.staff)).includes('AI WORDING'));
});

test('a new result: rules set urgency, due date and the least busy owner; non-actionable and bad input are refused', () => {
  const st = buildState(TODAY);
  const lab = { type: 'staff', role: 'coordinator', name: 'Coord C', id: 'c1' };
  const base = { name: 'Test Patient', age: 50, sex: 'F', nationality: 'Emirati', language: 'ar', today: TODAY };
  const before = st.cases.length;
  const u = createCase(st, lab, { ...base, value: 11.4 });
  assert.equal(st.cases.length, before + 1);
  assert.equal(u.id, 'C-031');
  assert.equal(u.band, 'urgent');
  assert.equal(u.due, addDays(TODAY, 2));
  assert.equal(st.staff.find((s) => s.id === u.owner).role, 'nurse');
  const openFor = (sid) => st.cases.filter((c) => c.owner === sid && c.stage !== 'closed').length;
  const nurses = st.staff.filter((s) => s.role === 'nurse' && s.id !== u.owner);
  assert.ok(nurses.every((n) => openFor(n.id) >= openFor(u.owner) - 1), 'picked the least busy nurse');
  const r = createCase(st, lab, { ...base, value: 6.0 });
  assert.equal(r.band, 'prediabetes');
  assert.equal(st.staff.find((s) => s.id === r.owner).role, 'coordinator');
  assert.equal(r.stage, 'result');
  assert.throws(() => createCase(st, lab, { ...base, value: 5.4 }), codeOf('not_actionable'));
  assert.throws(() => createCase(st, lab, { ...base, value: 'abc' }), codeOf('bad_value'));
  assert.throws(() => createCase(st, lab, { ...base, value: 8, age: 7 }), codeOf('bad_age'));
  assert.throws(() => createCase(st, lab, { ...base, value: 8, name: '' }), codeOf('bad_name'));
  assert.throws(() => createCase(st, { type: 'patient', name: 'P' }, { ...base, value: 8 }), codeOf('not_allowed'));
  assert.throws(() => createCase(st, ai, { ...base, value: 8 }), codeOf('ai_not_allowed'));
  assert.equal(st.cases.length, before + 2);
});
