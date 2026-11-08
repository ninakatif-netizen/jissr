// CLOE (Care Loop Orchestration Engine): phases, SLA clock, mammogram programme, 10-minute calls, protocols, closure rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cloePhase, slaClock, slaText, SLA_TIER, classifyMammo, microConsultSlots, sopsFor, escalationsFor, safeText, ownerRoleFor } from '../core/rules.mjs';
import { newCase, advance, sendReferral, closeCase, createCase, bookMicroConsult, completeMicroConsult, runSop, validateClosure, CLOSURE_RULES, RuleError } from '../core/cases.mjs';
import { buildState, STAFF } from '../core/data.mjs';
import { explanation } from '../core/templates.mjs';
import { resultText } from '../core/programmes.mjs';

const TODAY = '2026-11-10';
const at = (day, hh = '12') => Date.parse(`${day}T${hh}:00:00Z`);
const nurse = { type: 'staff', role: 'nurse', name: 'Nurse Huda Al Ali', id: 'n1', org: 'Screening programme' };
const coord = { type: 'staff', role: 'coordinator', name: 'Coord', id: 'c1', org: 'Screening programme' };
const doc = { type: 'staff', role: 'clinician', name: 'Dr D', id: 'd1', org: 'Primary care clinic' };
const patient = { type: 'patient', name: 'Patient' };
const ai = { type: 'ai', name: 'AI' };
const system = { type: 'system', name: 'system' };
const codeOf = (code) => (e) => e instanceof RuleError && e.code === code;
const one = (opts = {}) => ({ today: TODAY, staff: STAFF, cases: [newCase({ id: 'C-1', patient: { id: 'P' }, value: 8.1, resultDay: TODAY, owner: 'n1', ...opts })] });

test('CLOE phases follow the detailed journey', () => {
  const s = one(), c = s.cases[0];
  assert.equal(cloePhase(c), 'ISSUED');
  advance(s, 'C-1', 'notified', system);
  assert.equal(cloePhase(c), 'NOTIFIED');
  bookMicroConsult(s, 'C-1', patient, microConsultSlots(s.staff, s.cases, TODAY)[0]);
  assert.equal(cloePhase(c), 'MICRO_CONSULT_BOOKED');
  advance(s, 'C-1', 'understood', patient);
  advance(s, 'C-1', 'booked', patient);
  assert.equal(cloePhase(c), 'REFERRED');
});

test('SLA clock: on track, then warning, then breached, in hours', () => {
  const c = one().cases[0]; // HbA1c 8.1 = priority: notify within 1 day of the result
  const a = slaClock(c, at(TODAY, '00'));
  assert.equal(a.step, 'notified');
  assert.equal(a.tier, SLA_TIER.ON_TRACK);
  assert.equal(a.hoursLeft, 48);
  assert.equal(slaClock(c, at('2026-11-11', '06')).tier, SLA_TIER.WARNING); // 18 h left
  const late = slaClock(c, at('2026-11-12', '05'));
  assert.equal(late.tier, SLA_TIER.BREACHED);
  assert.equal(slaText(late), 'Breached 5 h ago');
});

test('SLA clock follows the referral reply while a referral is waiting, and stops when closed', () => {
  const s = one(), c = s.cases[0];
  for (const [st, who] of [['notified', system], ['understood', patient], ['booked', patient], ['attended', nurse], ['confirmed', doc]]) advance(s, 'C-1', st, who);
  sendReferral(s, 'C-1', doc, { to: 'Hospital endocrinology', reason: 'Specialist review please' });
  assert.equal(slaClock(c, Date.now()).step, 'referral_reply');
  c.stage = 'closed';
  assert.equal(slaClock(c), null);
});

test('mammogram: BI-RADS 4 and 5 open a case with a nurse navigator; 1 and 2 do not; 3 is refused, not guessed', () => {
  assert.equal(classifyMammo(4).band, 'birads4');
  assert.equal(classifyMammo(5).urgency, 'urgent');
  assert.equal(classifyMammo(2).inProgramme, false);
  assert.equal(classifyMammo(3).unsupported, true);
  assert.equal(classifyMammo(9).band, 'invalid');
  assert.equal(ownerRoleFor('birads4'), 'nurse');
  const s = { today: TODAY, staff: STAFF.map((x) => ({ ...x })), cases: [] };
  const c = createCase(s, coord, { name: 'Test Patient', age: 52, language: 'ar', programme: 'mammo', birads: 4, today: TODAY });
  assert.equal(c.band, 'birads4');
  assert.equal(c.due, '2026-11-24');
  assert.equal(s.staff.find((x) => x.id === c.owner).role, 'nurse');
  assert.equal(resultText(c), 'BI-RADS 4');
  assert.throws(() => createCase(s, coord, { name: 'Test Patient', age: 52, language: 'ar', programme: 'mammo', birads: 2, today: TODAY }), codeOf('not_actionable'));
  assert.throws(() => createCase(s, coord, { name: 'Test Patient', age: 52, language: 'ar', programme: 'mammo', birads: 3, today: TODAY }), codeOf('not_supported'));
});

test('mammogram messages are plain, never say "you have cancer", and always carry the disclaimer', () => {
  for (const band of ['birads0', 'birads4', 'birads5']) {
    for (const lang of ['en', 'ar']) {
      for (const level of ['normal', 'simple']) {
        const t = explanation({ band, lang, level });
        assert.ok(t.length > 60, `${band} ${lang} ${level}`);
        assert.ok(safeText(t, lang), `passes the safety filter (${band} ${lang} ${level})`);
      }
    }
  }
  assert.equal(safeText('Sorry to say you have breast cancer and must start treatment.', 'en'), null);
  assert.doesNotMatch(explanation({ band: 'birads5', lang: 'en' }), /harmless/); // no false reassurance for BI-RADS 5
});

test('10-minute call: one tap books a free nurse slot; clashes, AI and closed cases are refused', () => {
  const s = one();
  const slots = microConsultSlots(s.staff, s.cases, TODAY);
  assert.ok(slots.length >= 6 && slots.every((x) => x.minutes === 10 && x.day > TODAY));
  assert.throws(() => bookMicroConsult(s, 'C-1', ai, slots[0]), codeOf('ai_not_allowed'));
  bookMicroConsult(s, 'C-1', patient, slots[0]);
  assert.equal(s.cases[0].microConsult.status, 'booked');
  assert.ok(!microConsultSlots(s.staff, s.cases, TODAY).some((x) => x.day === slots[0].day && x.time === slots[0].time && x.nurseId === slots[0].nurseId), 'a taken slot is no longer offered');
  s.cases.push(newCase({ id: 'C-2', patient: { id: 'P2' }, value: 7, resultDay: TODAY, owner: 'n1' }));
  assert.throws(() => bookMicroConsult(s, 'C-2', patient, slots[0]), codeOf('slot_taken'));
  assert.throws(() => completeMicroConsult(s, 'C-1', coord), codeOf('nurse_only'));
  completeMicroConsult(s, 'C-1', nurse, 'Explained the result, patient will book');
  assert.equal(s.cases[0].microConsult.status, 'done');
});

test('a missed 10-minute call is flagged', () => {
  const s = one();
  s.cases[0].microConsult = { day: '2026-11-08', time: '10:10', nurseId: 'n1', status: 'booked' };
  assert.ok(escalationsFor(s.cases[0], TODAY).some((e) => e.code === 'micro_consult_missed'));
});

test('protocols: unread outreach climbs the channel ladder and creates a nurse task', () => {
  const s = one(), c = s.cases[0];
  advance(s, 'C-1', 'notified', system);
  assert.ok(sopsFor(c, at('2026-11-13', '12')).includes('unread_outreach'));
  assert.throws(() => runSop(s, 'C-1', patient, 'unread_outreach'), codeOf('staff_only'));
  runSop(s, 'C-1', nurse, 'unread_outreach');
  assert.equal(c.channel, 'sms');
  assert.equal(c.nurseRequest.done, false);
  assert.ok(c.events.some((e) => e.type === 'sop_unread_outreach'));
});

test('protocols: a stalled referral is chased and logged', () => {
  const s = one(), c = s.cases[0];
  assert.throws(() => runSop(s, 'C-1', coord, 'stalled_referral'), codeOf('no_stalled_referral'));
  c.referral = { to: 'Hospital endocrinology', status: 'sent', sentAt: '2026-11-01T09:00:00.000Z', history: [] };
  c.stage = 'referred';
  assert.ok(sopsFor(c, at(TODAY)).includes('stalled_referral'));
  runSop(s, 'C-1', coord, 'stalled_referral');
  assert.ok(c.referral.chasedAt);
});

test('closure rules: every broken rule is listed; informed refusal needs the refusal protocol first', () => {
  const s = one(), c = s.cases[0];
  assert.equal(CLOSURE_RULES.length, 8);
  const broken = validateClosure(c, nurse, { type: 'documented_refusal', evidence: 'short' }).map((x) => x.code);
  assert.deepEqual(broken, ['clinician_only', 'evidence_required', 'refusal_not_recorded']);
  assert.deepEqual(validateClosure(c, ai, {}).map((x) => x.code), ['ai_not_allowed']);
  assert.throws(() => runSop(s, 'C-1', nurse, 'refusal', { reason: 'no' }), codeOf('reason_required'));
  runSop(s, 'C-1', nurse, 'refusal', { reason: 'Afraid of the needle, does not want a biopsy', today: TODAY });
  assert.equal(c.refusal.recontact, '2026-02-08'.replace('2026', '2027'));
  assert.deepEqual(validateClosure(c, doc, { type: 'documented_refusal', evidence: 'Risks explained by phone; patient declines; re-contact in 90 days.' }), []);
  closeCase(s, 'C-1', doc, { type: 'documented_refusal', evidence: 'Risks explained by phone; patient declines; re-contact in 90 days.' });
  assert.equal(c.stage, 'closed');
});

test('demo data has mammogram patients, booked 10-minute calls and a refusal to manage', () => {
  const st = buildState(TODAY);
  assert.equal(st.cases.filter((c) => c.programme === 'mammo').length, 5);
  assert.ok(st.cases.some((c) => c.microConsult && c.microConsult.status === 'booked'));
  assert.ok(st.cases.some((c) => sopsFor(c, at(TODAY)).includes('refusal')));
  assert.ok(st.staff.some((x) => x.org === 'Breast clinic'));
});
