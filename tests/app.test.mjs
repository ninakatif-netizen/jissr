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
