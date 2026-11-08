// Run with:  npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, dueDate, isOverdue, statusOf, slotsFor, safeText, withDisclaimer, addDays } from '../core/rules.mjs';
import { advance, closeCase, newCase, RuleError, setBarrier, requestNurse, assignOwner } from '../core/cases.mjs';
import { buildState, STAFF } from '../core/data.mjs';
import { explanation } from '../core/templates.mjs';

const TODAY = '2026-11-10';
const nurse = { type: 'staff', role: 'nurse', name: 'Nurse N' };
const coord = { type: 'staff', role: 'coordinator', name: 'Coord C' };
const doc = { type: 'staff', role: 'clinician', name: 'Dr D' };
const patient = { type: 'patient', name: 'Patient' };
const ai = { type: 'ai', name: 'AI' };

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

function fresh(value = 8.1) {
  const state = { staff: STAFF, cases: [newCase({ id: 'C-1', patient: { id: 'P' }, value, resultDay: TODAY, owner: 'n1' })] };
  return state;
}

test('steps cannot be skipped or done by the wrong person', () => {
  const s = fresh();
  assert.throws(() => advance(s, 'C-1', 'booked', patient), (e) => e.code === 'out_of_order');
  advance(s, 'C-1', 'notified', { type: 'system', name: 'system' });
  advance(s, 'C-1', 'understood', patient);
  advance(s, 'C-1', 'booked', patient);
  assert.throws(() => advance(s, 'C-1', 'attended', patient), (e) => e.code === 'not_allowed');
  advance(s, 'C-1', 'attended', nurse);
  assert.throws(() => advance(s, 'C-1', 'care_plan', nurse), (e) => e.code === 'not_allowed'); // clinician only
  advance(s, 'C-1', 'care_plan', doc, 'Plan agreed');
  assert.equal(s.cases[0].stage, 'care_plan');
});

test('advance cannot close a case', () => {
  const s = fresh();
  assert.throws(() => advance(s, 'C-1', 'closed', doc), (e) => e.code === 'use_close');
});

function atCarePlan() {
  const s = fresh();
  advance(s, 'C-1', 'notified', { type: 'system', name: 'system' });
  advance(s, 'C-1', 'understood', patient);
  advance(s, 'C-1', 'booked', patient);
  advance(s, 'C-1', 'attended', nurse);
  advance(s, 'C-1', 'care_plan', doc);
  return s;
}

test('only a clinician can close, and only with evidence', () => {
  const s = atCarePlan();
  const ev = 'Seen in clinic, plan agreed, review in 3 months.';
  assert.throws(() => closeCase(s, 'C-1', nurse, { type: 'care_plan_agreed', evidence: ev }), (e) => e.code === 'clinician_only');
  assert.throws(() => closeCase(s, 'C-1', coord, { type: 'care_plan_agreed', evidence: ev }), (e) => e.code === 'clinician_only');
  assert.throws(() => closeCase(s, 'C-1', patient, { type: 'care_plan_agreed', evidence: ev }), (e) => e.code === 'clinician_only');
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: '' }), (e) => e.code === 'evidence_required');
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: 'ok' }), (e) => e.code === 'evidence_required');
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'nonsense', evidence: ev }), (e) => e.code === 'bad_type');
  assert.equal(s.cases[0].stage, 'care_plan'); // nothing changed by the failed attempts
  closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: ev });
  assert.equal(s.cases[0].stage, 'closed');
  assert.equal(s.cases[0].closed.evidence, ev);
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: ev }), (e) => e.code === 'already_closed');
});

test('"care plan agreed" needs a recorded care plan first', () => {
  const s = fresh();
  advance(s, 'C-1', 'notified', { type: 'system', name: 'system' });
  assert.throws(() => closeCase(s, 'C-1', doc, { type: 'care_plan_agreed', evidence: 'A long enough evidence note.' }), (e) => e.code === 'no_care_plan');
  // an informed refusal can be closed by a clinician with evidence
  closeCase(s, 'C-1', doc, { type: 'documented_refusal', evidence: 'Spoke with patient, understands risks, declined follow-up.' });
  assert.equal(s.cases[0].stage, 'closed');
});

test('the AI can never change or close a case', () => {
  const s = atCarePlan();
  for (const fn of [
    () => closeCase(s, 'C-1', ai, { type: 'care_plan_agreed', evidence: 'long enough evidence here' }),
    () => advance(s, 'C-1', 'closed', ai),
    () => setBarrier(s, 'C-1', 'fear', ai),
    () => requestNurse(s, 'C-1', ai),
    () => assignOwner(s, 'C-1', 'n2', ai),
  ]) assert.throws(fn, (e) => e instanceof RuleError && e.code === 'ai_not_allowed');
  assert.equal(s.cases[0].stage, 'care_plan');
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

test('synthetic data: 30 patients, every band, some overdue, some closed, all rules consistent', () => {
  const st = buildState(TODAY);
  assert.equal(st.cases.length, 30);
  const bands = new Set(st.cases.map((c) => c.band));
  assert.deepEqual([...bands].sort(), ['diabetes', 'prediabetes', 'urgent']);
  assert.ok(st.cases.filter((c) => isOverdue(c, TODAY)).length >= 5);
  assert.equal(st.cases.filter((c) => c.stage === 'closed').length, 3);
  for (const c of st.cases) {
    assert.equal(c.band, classify(c.value).band);
    assert.equal(c.due, dueDate(c.resultDay, c.value));
    assert.ok(st.staff.some((s) => s.id === c.owner), 'every case has a named owner');
    assert.ok(c.events.every((e) => e.at.slice(0, 10) <= TODAY), 'no events in the future');
    if (c.stage === 'closed') assert.ok(c.closed.evidence.length >= 15);
    if (c.band === 'urgent') assert.equal(st.staff.find((s) => s.id === c.owner).role, 'nurse');
  }
});
