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
