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
