// Falaj: the 2-minute consult reaches the right team's inbox, and the handshake keeps one owner at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildState } from '../core/data.mjs';
import { requestConsult, answerConsult, sendReferral, respondReferral } from '../core/cases.mjs';
import { roleFilter } from '../core/roles.mjs';
import { targetsFor } from '../core/programmes.mjs';

const actorOf = (s) => ({ type: 'staff', id: s.id, role: s.role, name: s.name, org: s.org });

test('a 2-minute consult appears in the receiving team inbox until it is answered', () => {
  const state = buildState('2026-11-09');
  const gp = actorOf(state.staff.find((s) => s.role === 'clinician' && !/Hospital/.test(s.org)));
  const c = state.cases.find((x) => x.programme !== 'mammo' && x.stage !== 'closed' && !(x.consults || []).length && !x.referral);
  const to = targetsFor(c)[0];
  const spec = actorOf(state.staff.find((s) => s.role === 'clinician' && s.org === to));
  requestConsult(state, c.id, gp, { to, question: 'Treat in primary care, or does this patient need the clinic?' });
  assert.equal(roleFilter('inbox', c, spec), true);
  answerConsult(state, c.id, c.consults[0].id, spec, 'Start in primary care and repeat the test in three months.');
  assert.equal(roleFilter('inbox', c, spec), false);
  assert.ok(c.events.some((e) => e.type === 'consult_answered'));
});

test('handshake: the sender owns the case until the receiver takes it', () => {
  const state = buildState('2026-11-09');
  const c = state.cases.find((x) => x.stage === 'confirmed' && !x.referral);
  if (!c) return; // no case at that stage in this data set
  const gp = actorOf(state.staff.find((s) => s.role === 'clinician' && !/Hospital/.test(s.org)));
  const owner = c.owner;
  const to = targetsFor(c)[0];
  sendReferral(state, c.id, gp, { to, reason: 'Specialist review needed for this result.' });
  assert.equal(c.owner, owner, 'still owned by the sender while offered');
  const spec = actorOf(state.staff.find((s) => s.role === 'clinician' && s.org === to));
  respondReferral(state, c.id, spec, { accept: true });
  assert.equal(c.owner, spec.id, 'owned by the receiver once taken');
});

import { mapSummary, emirateOf, EMIRATES } from '../core/geo.mjs';
test('living map: every case sits in one emirate, and the numbers add up', () => {
  const state = buildState('2026-11-09');
  const now = Date.parse('2026-11-09T09:00:00Z');
  const ids = new Set(EMIRATES.map((e) => e.id));
  assert.ok(state.cases.every((c) => ids.has(emirateOf(c))));
  assert.equal(emirateOf(state.cases[0]), emirateOf(state.cases[0]), 'the same case always lands in the same place');
  const all = mapSummary(state, now);
  assert.equal(all.open + all.closed, state.cases.length);
  assert.equal(all.nodes.reduce((a, n) => a + n.stuck, 0), all.stuck);
  const dxb = mapSummary(state, now, 'dxb');
  assert.equal(dxb.open, all.nodes.find((n) => n.id === 'dxb').open, 'filtering shows that place only');
  assert.equal(dxb.nodes.find((n) => n.id === 'ad').open, all.nodes.find((n) => n.id === 'ad').open, 'other places keep their numbers');
});

import { mustCall, radarFor } from '../core/rules.mjs';
import { firstMessage, FIRST_MESSAGE } from '../core/templates.mjs';
test('safety: suspicious mammograms and urgent HbA1c must be told by a person', () => {
  const state = buildState('2026-11-10');
  const b4 = state.cases.find((c) => c.programme === 'mammo' && c.band === 'birads4' && c.stage !== 'closed');
  assert.ok(mustCall(b4));
  const routine = state.cases.find((c) => (!c.programme || c.programme === 'hba1c') && c.urgency === 'routine' && c.stage !== 'closed');
  assert.equal(mustCall(routine), null);
});
test('dropout radar: signals are listed in words, two or more put a case on the radar', () => {
  const state = buildState('2026-11-10');
  const c = state.cases.find((x) => x.stage !== 'closed');
  const before = radarFor(c, '2026-11-10').signals.length;
  c.patient = { ...c.patient, language: 'ur', shifts: true };
  const r = radarFor(c, '2026-11-10');
  assert.ok(r.signals.length >= before + 1 && r.on);
  assert.ok(r.signals.every((x) => typeof x === 'string' && !/_/.test(x)));
});
test('first messages never carry the result, and fall back to English', () => {
  for (const m of Object.values(FIRST_MESSAGE)) assert.ok(!/\d/.test(m.text), 'no number in a first message');
  assert.equal(firstMessage('xx').text, FIRST_MESSAGE.en.text);
});
test('insurance pre-approval is requested with the referral and approved when the hospital accepts (simulated)', () => {
  const state = buildState('2026-11-10');
  const c = state.cases.find((x) => x.stage === 'confirmed' && !x.referral);
  if (!c) return;
  const gp = actorOf(state.staff.find((s) => s.role === 'clinician' && !/Hospital/.test(s.org)));
  const to = targetsFor(c)[0];
  sendReferral(state, c.id, gp, { to, reason: 'Specialist review needed for this result.' });
  assert.equal(c.referral.preauth.status, 'requested');
  respondReferral(state, c.id, actorOf(state.staff.find((s) => s.role === 'clinician' && s.org === to)), { accept: true });
  assert.equal(c.referral.preauth.status, 'approved');
});

import { proofCode, verifyProof } from '../core/proof.mjs';
import { qrMatrix } from '../core/qr.mjs';
test('proof of care: the code is stable, checks out for a closed case, and shows no result', () => {
  const s1 = buildState('2026-11-10'), s2 = buildState('2026-12-01');
  const c = s1.cases.find((x) => x.stage === 'closed');
  assert.equal(proofCode(c), proofCode(s2.cases.find((x) => x.id === c.id)), 'same receipt, same code, whatever the day');
  const ok = verifyProof(s1, c.id, proofCode(c));
  assert.equal(ok.ok, true);
  assert.ok(!JSON.stringify(ok).includes(String(c.value)), 'the result value is never shown');
  assert.equal(verifyProof(s1, c.id, 'FLJ-0000-0000').ok, false);
  const open = s1.cases.find((x) => x.stage !== 'closed');
  assert.equal(verifyProof(s1, open.id, proofCode(open)).ok, false, 'an open case has no valid proof');
});
test('QR codes: right size for the text and the three finder patterns in place', () => {
  for (const [text, size] of [['FLJ-7Q4M-2026', 21], ['https://jissr-three.vercel.app/verify.html?c=C-012&code=FLJ-7Q4M-2026', 37]]) {
    const m = qrMatrix(text);
    assert.equal(m.length, size);
    for (const [x, y] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      assert.ok(m[y][x] && m[y][x + 6] && m[y + 6][x] && m[y + 3][x + 3], 'finder corners and centre are dark');
      assert.ok(!m[y + 1][x + 1], 'finder ring is light');
    }
  }
});

import { normaliseUaeMobile, familyToken, familyUrl, familyStatus, inviteText } from '../core/family.mjs';
test('family helper: UAE mobiles only, a link without the number, and never the result', () => {
  assert.equal(normaliseUaeMobile('050 123 4567'), '+971501234567');
  assert.equal(normaliseUaeMobile('+971 55 765 4321'), '+971557654321');
  assert.equal(normaliseUaeMobile('12345'), null);
  assert.equal(normaliseUaeMobile('04 123 4567'), null, 'a landline is not accepted');
  const state = buildState('2026-11-10');
  const c = state.cases.find((x) => x.stage !== 'closed');
  const helper = { name: 'Aisha', phone: '+971501234567' };
  const url = familyUrl(c.id, helper, 'https://x.test');
  assert.ok(!/971|501234567/.test(url), 'the phone number is not in the link');
  const st = familyStatus(state, c.id, 'Aisha', familyToken(c.id, helper));
  assert.equal(st.ok, true);
  assert.ok(!('value' in st) && !JSON.stringify(st).includes(String(c.value)), 'the helper never gets the result');
  assert.equal(familyStatus(state, c.id, 'Aisha', 'WRONG1').ok, false);
  assert.ok(!/\d+(\.\d+)?%/.test(inviteText('en', 'Fatima', 'Aisha', url)), 'the invitation has no result');
  c.familyHelper = { ...helper, token: familyToken(c.id, helper), revoked: true };
  assert.equal(familyStatus(state, c.id, 'Aisha', c.familyHelper.token).ok, false, 'stopped sharing means no access');
});

import { milestones, passportHtml, passportId } from '../core/passport.mjs';
import { advance, logEvent, closeCase } from '../core/cases.mjs';
test('Care Passport: stamps only for recorded steps, by the right person, never the result', () => {
  const state = buildState('2026-11-11');
  const c = state.cases.find((x) => x.id === 'C-040');
  assert.equal(passportId(c), 'FLJ-2026-0040');
  assert.deepEqual(milestones(c).map(([s]) => s), ['todo', 'todo', 'todo', 'todo', 'todo'], 'a message sent is not "result communicated"');
  logEvent(c, 'contact', { type: 'system', name: 'Falaj care line' }, 'AI call');
  assert.equal(milestones(c)[0][0], 'todo', 'the AI call alone does not stamp "result communicated"');
  const nurse = { type: 'staff', ...state.staff.find((x) => x.id === 'n2') };
  logEvent(c, 'contact', nurse, 'Result explained by phone');
  advance(state, 'C-040', 'understood', nurse, 'Teach-back done');
  const m = milestones(c);
  assert.equal(m[0][0], 'done'); assert.equal(m[1][0], 'done'); assert.equal(m[1][1].by, nurse.name);
  advance(state, 'C-040', 'booked', { type: 'patient', name: 'Priya' }, 'Booked');
  assert.equal(milestones(c)[3][0], 'todo', 'a booking is not care delivered');
  const html = passportHtml(c, { staff: state.staff });
  assert.ok(!/BI-RADS|suspicious|biopsy advised/i.test(html), 'the passport never shows the result');
  const closed = state.cases.find((x) => x.stage === 'closed');
  assert.equal(milestones(closed)[4][0], 'done');
});

import { runAgents, agentSummary } from '../core/agents.mjs';
test('Falaj agents move things forward but never take a clinical decision', () => {
  const state = buildState('2026-11-11');
  const before = new Map(state.cases.map((c) => [c.id, c.stage]));
  const out = runAgents(state, '2026-11-11');
  assert.ok(out.length > 0, 'the agents did something');
  for (const c of state.cases) {
    const was = before.get(c.id);
    // the only stage an agent run may change: understood -> booked, and only by the patient's own YES
    if (c.stage !== was) {
      assert.equal(was, 'understood'); assert.equal(c.stage, 'booked');
      assert.equal(c.events.filter((e) => e.type === 'booked').pop().role, 'patient');
    }
    for (const e of c.events.filter((x) => (x.by || '').startsWith('Falaj agent'))) {
      assert.equal(e.role, 'system');
      assert.ok(!['understood', 'attended', 'confirmed', 'care_plan', 'closed', 'referral_accepted', 'referral_rejected'].includes(e.type), `an agent recorded ${e.type}`);
      assert.ok(!/BI-RADS|biopsy|HbA1c \d|%/.test(e.note), 'an agent never mentions the result');
    }
  }
  const again = runAgents(state, '2026-11-11');
  assert.ok(again.filter((a) => a.kind === 'call').length === 0, 'a second run the same day does not call again');
  const s = agentSummary(state.cases, '2026-11-11');
  assert.ok(s.calls > 0 && s.items.length >= s.calls);
});

import { readDocument } from '../core/agents.mjs';
test('Intake agent reads a document and leaves anything it cannot find for a person', () => {
  const f = readDocument('Screening mammogram report\nPatient: Test Person\nAge: 50\nImpression: BI-RADS 4');
  assert.equal(f.programme, 'mammo'); assert.equal(f.birads, '4'); assert.equal(f.name, 'Test Person');
  assert.ok(f.missing.includes('language') && f.missing.includes('from'), 'missing fields are listed, not guessed');
  const g = readDocument('HbA1c result for Patient: Someone\nAge: 40');
  assert.ok(g.missing.includes('value'), 'no number is invented when the result is not in the document');
});
