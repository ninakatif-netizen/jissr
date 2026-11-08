// Tests the natural-voice endpoint with a FAKE Azure (no network, no real keys).
import test from 'node:test';
import assert from 'node:assert/strict';

let sent = null;
globalThis.fetch = async (url, opts) => { sent = { url, opts }; return { ok: true, arrayBuffer: async () => new Uint8Array([73, 68, 51]).buffer }; };
const { default: handler, ssml } = await import('../api/jissr-voice.js');

function call(path, ip = '2.2.2.2') {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ code: this.statusCode, headers: this.headers, body: b }); } };
    handler({ method: 'GET', url: path, headers: { 'x-forwarded-for': ip } }, res);
  });
}

test('without keys: says the voice is off, and refuses to speak', async () => {
  delete process.env.AZURE_SPEECH_KEY; delete process.env.AZURE_SPEECH_REGION;
  const s = await call('/api/jissr-voice');
  assert.deepEqual(JSON.parse(s.body), { ok: true, voice: false });
  const r = await call('/api/jissr-voice?lang=ar&text=hello');
  assert.equal(r.code, 503);
});

test('with keys: Arabic text is spoken by the Emirati voice and returned as MP3', async () => {
  process.env.AZURE_SPEECH_KEY = 'test'; process.env.AZURE_SPEECH_REGION = 'uaenorth';
  assert.equal(JSON.parse((await call('/api/jissr-voice')).body).voice, true); // true/false only, never the key
  const r = await call('/api/jissr-voice?lang=ar&text=' + encodeURIComponent('نتيجتك أعلى من المعتاد'), '3.3.3.3');
  assert.equal(r.code, 200);
  assert.equal(r.headers['Content-Type'], 'audio/mpeg');
  assert.match(sent.url, /^https:\/\/uaenorth\.tts\.speech\.microsoft\.com\//);
  assert.match(sent.opts.body, /ar-AE-FatimaNeural/);
});

test('text is escaped, so it cannot change the voice instructions', () => {
  const x = ssml('</voice><voice name="x">hi & bye', 'en');
  assert.doesNotMatch(x, /<voice name="x">/);
  assert.match(x, /&lt;\/voice&gt;/);
  assert.match(x, /hi &amp; bye/);
});

test('very long text is refused (stops misuse as a free voice service)', async () => {
  const r = await call('/api/jissr-voice?lang=en&text=' + 'a'.repeat(1600), '4.4.4.4');
  assert.equal(r.code, 400);
});

test('only GET is allowed', async () => {
  const r = await new Promise((resolve) => {
    const res = { setHeader() { }, end(b) { resolve({ code: this.statusCode }); } };
    handler({ method: 'POST', url: '/api/jissr-voice', headers: {} }, res);
  });
  assert.equal(r.code, 405);
});
