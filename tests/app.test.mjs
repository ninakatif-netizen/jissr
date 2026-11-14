// The app: Health ID lookup, care history, the assistant's safety rules, and the Cartesia voice endpoint.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildState } from '../core/data.mjs';
import { healthId, parseHealthId, findPatient, logAccess, careHistory, careMapHtml, routeOf } from '../core/history.mjs';
import { contextOf, cleanContext, reply, intentOf, callTurn, assistantSafe, nextStep } from '../core/assistant.mjs';

const state = buildState('2026-11-11');
const priya = state.cases.find((c) => c.id === 'C-040');

test('the Health ID is a Falaj number and parses back', () => {
  assert.match(healthId(priya), /^FLJ-\d{4}-0040$/);
  assert.deepEqual(parseHealthId(' flj-2026-0040 '), { year: '2026', n: 40 });
  assert.equal(parseHealthId('784-1990-1234567-1'), null);
});

test('a doctor needs the ID AND the name; one message for every wrong guess', () => {
  const id = healthId(priya);
  assert.equal(findPatient(state, id, 'Priya Raman').case.id, 'C-040');
  assert.equal(findPatient(state, id.toLowerCase(), '  raman PRIYA ').case.id, 'C-040');
  assert.equal(findPatient(state, id, 'Priya').error, 'name');
  const a = findPatient(state, id, 'Priya Nair'), b = findPatient(state, 'FLJ-2026-0999', 'Priya Raman');
  assert.equal(a.error, 'nomatch'); assert.equal(b.error, 'nomatch'); assert.equal(a.message, b.message);
  assert.equal(findPatient(state, 'hello', 'Priya Raman').error, 'id');
});

test('opening a file is recorded for the patient to see', () => {
  const c = structuredClone(priya);
  logAccess(c, state.staff.find((s) => s.id === 'd1'), '2026-11-11T09:00:00.000Z');
  assert.equal(c.access[0].by, 'Dr Mariam Al Hosani');
  assert.equal(c.access[0].org, 'Primary care clinic');
});

test('care history spans several places, in date order, and ends where care is now', () => {
  const h = careHistory(priya, state.staff);
  assert.ok(new Set(h.map((x) => x.fac)).size >= 4);
  assert.deepEqual(h.map((x) => x.day), h.map((x) => x.day).slice().sort());
  assert.equal(routeOf(h).at(-1), 'suB');
  assert.ok(h.some((x) => x.now && /BI-RADS 4/.test(x.detail)));
  const html = careMapHtml(h);
  assert.match(html, /care is here now/);
  assert.match(html, /cm-palm/);
});

test('the assistant only sees a small context: no name, no ID, no result value', () => {
  const ctx = contextOf(priya);
  const s = JSON.stringify(ctx);
  assert.doesNotMatch(s, /Priya|Raman|FLJ|C-040|BI-RADS|"value"/);
  assert.equal(ctx.waitingForPerson, true);
  const dirty = cleanContext({ ...ctx, name: 'Priya Raman', value: 4, stage: 'drop table', referralTo: '<b>x</b>' });
  assert.equal(dirty.name, undefined); assert.equal(dirty.value, undefined); assert.equal(dirty.stage, 'notified');
  assert.doesNotMatch(JSON.stringify(dirty), /</);
});

test('the assistant never gives a result, sends worry to a nurse and danger to 998', () => {
  const ctx = contextOf(priya);
  for (const q of ['What does my result mean?', 'Is it cancer?', 'what is BI-RADS 4', 'نتيجتي؟']) {
    const r = reply(q, ctx);
    assert.equal(r.intent, 'result', q);
    assert.match(r.text, /cannot tell you about results/);
    assert.ok(r.actions.some((a) => a.type === 'nurse'));
  }
  assert.equal(reply('I am so scared', ctx).actions[0].type, 'nurse');
  const d = reply('I have chest pain', ctx);
  assert.equal(d.intent, 'danger'); assert.equal(d.actions[0].href, 'tel:998');
  assert.equal(intentOf('remind me please'), 'remind');
  assert.match(nextStep(ctx), /nurse .* will call you/);
});

test('a model answer that talks about results is thrown away', () => {
  assert.equal(assistantSafe('Your result is normal, nothing to worry about.'), false);
  assert.equal(assistantSafe('Good news, the BI-RADS score is low.'), false);
  assert.equal(assistantSafe('It is not cancer.'), false);
  assert.equal(assistantSafe('Your visit is on Tuesday at 10:00. I can remind you the day before.'), true);
});

test('the call is short, polite, offers a nurse and never mentions the result', () => {
  const ctx = contextOf(priya);
  const all = ['hello', 'next', 'remind', 'question', 'bye'].map((s) => callTurn(s, ctx, 'en'));
  assert.match(all[0].say, /automated voice, not a nurse/);
  assert.equal(all[3].action, 'nurse');
  for (const t of all) assert.ok(assistantSafe(t.say), t.say);
  assert.match(callTurn('hello', ctx, 'ar').say, /[؀-ۿ]/);
});

test('Cartesia voice: off without keys, sends only the sentence, refuses other sites', async () => {
  const { default: handler, cartesiaBody } = await import('../api/jissr-cartesia.js');
  const run = (url, headers = {}) => new Promise((resolve) => {
    const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ code: this.statusCode, headers: this.headers, body: b }); } };
    handler({ method: 'GET', url, headers: { host: 'x.test', ...headers } }, res);
  });
  delete process.env.CARTESIA_API_KEY; delete process.env.CARTESIA_VOICE_ID;
  assert.deepEqual(JSON.parse((await run('/api/jissr-cartesia')).body), { ok: true, voice: false });
  assert.equal((await run('/api/jissr-cartesia?text=hello')).code, 503);
  process.env.CARTESIA_API_KEY = 'k-test'; process.env.CARTESIA_VOICE_ID = 'voice-1';
  assert.equal((await run('/api/jissr-cartesia?text=hello', { 'sec-fetch-site': 'cross-site' })).code, 403);
  assert.equal((await run('/api/jissr-cartesia?text=' + 'a'.repeat(700))).code, 400);
  const real = globalThis.fetch; let sent;
  globalThis.fetch = async (url, opts) => { sent = { url, opts }; return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
  try {
    const r = await run('/api/jissr-cartesia?lang=ar&text=' + encodeURIComponent('مرحباً'));
    assert.equal(r.code, 200); assert.equal(r.headers['Content-Type'], 'audio/mpeg');
    assert.equal(sent.url, 'https://api.cartesia.ai/tts/bytes');
    assert.equal(sent.opts.headers['X-API-Key'], 'k-test');
    const body = JSON.parse(sent.opts.body);
    assert.deepEqual(Object.keys(body).sort(), ['language', 'model_id', 'output_format', 'transcript', 'voice']);
    assert.equal(body.language, 'ar'); assert.equal(body.voice.id, 'voice-1'); assert.equal(body.output_format.container, 'mp3');
  } finally { globalThis.fetch = real; delete process.env.CARTESIA_API_KEY; delete process.env.CARTESIA_VOICE_ID; }
  assert.equal(cartesiaBody('hi', 'en').model_id, 'sonic-3');
});

test('assistant endpoint: rules answer without AI, results always by fixed rule text', async () => {
  const { default: handler } = await import('../api/jissr-assistant.js');
  const run = (body) => new Promise((resolve) => {
    const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ code: this.statusCode, body: JSON.parse(b) }); } };
    handler({ method: 'POST', url: '/api/jissr-assistant', headers: { host: 'x.test', 'x-forwarded-for': 't' + Math.random() }, body }, res);
  });
  const r = await run({ msg: 'What does my result mean?', ctx: contextOf(priya) });
  assert.equal(r.body.source, 'rules'); assert.equal(r.body.intent, 'result');
  assert.equal((await run({ msg: '' })).code, 400);
});

import { promiseOf, careTeamOf, nudgeNote } from '../core/assistant.mjs';
import { passCode, checkPass, passSecret, activeGrant, grantAccess, askAccess, answerAsk, removeGrant, pendingAsk, PASS_SECONDS, GRANT_HOURS } from '../core/history.mjs';

test('the patient sees who is responsible, by when, and when it is late', () => {
  const st = buildState('2026-11-12'), c = st.cases.find((x) => x.id === 'C-040');
  const p = promiseOf(c, st.staff, '2026-11-12');
  assert.equal(p.keeper.name, 'Nurse Peter Dsouza'); assert.equal(p.keeper.role, 'Your nurse');
  assert.match(p.what, /will call you/); assert.ok(p.by); assert.equal(p.late, true); assert.ok(p.daysLate >= 1);
  assert.equal(promiseOf(c, st.staff, p.by).late, false, 'on the due day it is not late yet');
  assert.match(nudgeNote(p), /^Patient: still waiting/);
  assert.equal(careTeamOf(c, st.staff)[0].now, true);
  const closed = st.cases.find((x) => x.stage === 'closed');
  assert.equal(promiseOf(closed, st.staff, '2026-11-12'), null);
});

test('the key: the code changes every minute, an old code stops working', () => {
  const st = buildState('2026-11-12'), c = st.cases.find((x) => x.id === 'C-040');
  passSecret(c);
  const t = Date.UTC(2026, 10, 12, 9, 0, 10), code = passCode(c, t);
  assert.match(code, /^\d{6}$/);
  assert.equal(checkPass(c, code, t), true);
  assert.equal(checkPass(c, code, t + PASS_SECONDS * 1000), true, 'still accepted one minute later (read at the last second)');
  assert.equal(checkPass(c, code, t + 3 * PASS_SECONDS * 1000), false, 'a photo of the code is useless later');
  assert.equal(checkPass(c, '', t), false);
  const other = st.cases.find((x) => x.id === 'C-001'); passSecret(other);
  assert.notEqual(passCode(other, t), undefined);
});

test('access: asked until the patient answers, ends after 24 hours, and can be removed', () => {
  const st = buildState('2026-11-12'), c = st.cases.find((x) => x.id === 'C-040'), dr = st.staff.find((s) => s.id === 'd1');
  const t = Date.UTC(2026, 10, 12, 9, 0, 0);
  askAccess(c, dr, t);
  assert.equal(pendingAsk(c).staffId, 'd1'); assert.equal(activeGrant(c, 'd1', t), null, 'asking opens nothing');
  answerAsk(c, 'd1', false, st.staff, t); assert.equal(activeGrant(c, 'd1', t), null); assert.equal((c.access || []).length, 0, 'a declined request is not an opening');
  askAccess(c, dr, t); answerAsk(c, 'd1', true, st.staff, t);
  assert.ok(activeGrant(c, 'd1', t)); assert.equal(c.access[0].by, 'Dr Mariam Al Hosani');
  assert.equal(activeGrant(c, 'd1', t + (GRANT_HOURS + 1) * 3600e3), null, 'it ends by itself');
  assert.equal(activeGrant(c, 'e4', t), null, 'one doctor\'s access is not another\'s');
  grantAccess(c, dr, 'live code', t); removeGrant(c, 'd1', t); assert.equal(activeGrant(c, 'd1', t), null);
});

import { checkpointFor, doCheckpoint, missingResults, askLab, EXPECTED_DAYS } from '../core/checkpoint.mjs';
import { happenedNote } from '../core/assistant.mjs';

test('opening a file is a checkpoint: the right clinician can record the visit in one tap, others cannot', () => {
  const st = buildState('2026-11-12'), gp = st.staff.find((s) => s.id === 'd1');
  const booked = st.cases.find((c) => c.stage === 'booked'), waiting = st.cases.find((c) => c.id === 'C-040');
  assert.equal(checkpointFor(waiting, gp), null, 'nothing to record before a visit is booked');
  const cp = checkpointFor(booked, gp);
  assert.equal(cp.kind, 'attended'); assert.match(cp.button, /Record this visit/);
  doCheckpoint(st, booked, gp);
  assert.equal(booked.stage, 'attended');
  assert.match(booked.events.at(-1).note, /Health ID/);
  assert.equal(booked.events.at(-1).role, 'clinician', 'a person recorded it, never the scan itself');
  assert.equal(checkpointFor(booked, gp), null, 'it cannot be recorded twice');
});

test('a referral shows as a checkpoint only to the clinic it was sent to', () => {
  const st = buildState('2026-11-12');
  const c = st.cases.find((x) => x.referral && x.referral.status === 'sent');
  const there = st.staff.find((s) => s.role === 'clinician' && s.org === c.referral.to), other = st.staff.find((s) => s.role === 'clinician' && s.org !== c.referral.to);
  assert.equal(checkpointFor(c, other), null);
  assert.equal(checkpointFor(c, there).kind, 'accept');
  doCheckpoint(st, c, there);
  assert.equal(c.referral.status, 'accepted'); assert.equal(c.owner, there.id);
});

test('tests done with no result yet are flagged, and asking the lab is recorded', () => {
  const st = buildState('2026-11-12'), m = missingResults('2026-11-12');
  assert.ok(m.length >= 2);
  assert.ok(m.every((x) => x.ago > EXPECTED_DAYS[x.programme]), 'only tests past their expected time');
  assert.ok(!m.some((x) => x.id === 'T-103'), 'a test still within its time is not flagged');
  askLab(st, m[0].id, st.staff[0]);
  assert.ok(missingResults('2026-11-12', st.labAsks)[0].asked);
});

test('"it already happened" asks the keeper to confirm; it never moves the falaj', () => {
  const st = buildState('2026-11-12'), c = st.cases.find((x) => x.id === 'C-040'), before = c.stage;
  const note = happenedNote(promiseOf(c, st.staff, '2026-11-12'));
  assert.match(note, /^Patient: says this already happened\. Please confirm/);
  assert.equal(c.stage, before);
});

import { handoverOf, timelineOf } from '../core/handover.mjs';

test('the clinician handover is SBAR, built from the file and the rules, in a clinician\'s words', () => {
  const st = buildState('2026-11-13'), c = st.cases.find((x) => x.id === 'C-040');
  const h = handoverOf(c, st.staff, '2026-11-13');
  assert.match(h.s, /^Screening mammogram, .*BI-RADS 4/);
  assert.match(h.b, /Last screening \(.*Imaging Centre D, Dubai\): BI-RADS 1/);
  assert.match(h.a, /^Priority by rule\. .*Must be told in person or by phone\. Late by \d+ day/);
  assert.match(h.r, /^Nurse Peter Dsouza to call the patient about the result \(was due /);
  assert.doesNotMatch(h.r + h.a + h.s + h.b, /\byou\b|\byour\b/i, 'never the words written for the patient');
  assert.equal(h.late, true);
  const closed = st.cases.find((x) => x.stage === 'closed');
  assert.match(handoverOf(closed, st.staff, '2026-11-13').r, /Nothing open/);
  for (const x of st.cases) { const o = handoverOf(x, st.staff, '2026-11-13'); for (const k of ['s', 'b', 'a', 'r']) assert.ok(o[k] && !/undefined|NaN|null/.test(o[k]), `${x.id} ${k}: ${o[k]}`); }
});

test('the care timeline is every record in date order, and knows when each place first appears', () => {
  const st = buildState('2026-11-13'), c = st.cases.find((x) => x.id === 'C-040');
  const t = timelineOf(c, st.staff);
  assert.ok(t.items.length >= 6);
  assert.deepEqual(t.items.map((i) => i.day), t.items.map((i) => i.day).slice().sort());
  assert.equal(t.firstAt[t.items[0].fac], 0);
  assert.ok(t.items.at(-1).now);
});
