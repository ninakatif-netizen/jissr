// Falaj: the assistant's natural voice, with Cartesia (Sonic text-to-speech).
//   GET /api/jissr-cartesia                    -> {ok:true, voice:true|false}   (true/false only)
//   GET /api/jissr-cartesia?lang=en&text=...   -> audio/mpeg (MP3)
//
// Set up (Vercel environment variables only, never in the repository or in a chat):
//   CARTESIA_API_KEY       your Cartesia API key
//   CARTESIA_VOICE_ID      the id of the voice to use (from the Cartesia voice library)
//   optional: CARTESIA_VOICE_ID_AR (an Arabic voice), CARTESIA_MODEL (default sonic-3),
//             CARTESIA_VERSION (the API version header, default 2025-04-16)
//
// SAFETY: only the sentence the assistant says is sent: no name, no ID, no result. Limited in length and rate,
// and only this site may call it. If it is not set up or fails, the app uses the phone's own voice instead.
// GET on purpose: an iPhone only plays sound started straight from a tap.
import { fromThisSite } from './jissr-voice.js';

const env = (k) => (process.env[k] || '').trim();
export const cartesiaReady = () => !!(env('CARTESIA_API_KEY') && env('CARTESIA_VOICE_ID'));
const MAX = 600;
const hits = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

export function cartesiaBody(text, lang) {
  return {
    model_id: env('CARTESIA_MODEL') || 'sonic-3',
    transcript: text,
    voice: { mode: 'id', id: (lang === 'ar' && env('CARTESIA_VOICE_ID_AR')) || env('CARTESIA_VOICE_ID') },
    output_format: { container: 'mp3', sample_rate: 44100, bit_rate: 128000 },
    language: lang === 'ar' ? 'ar' : 'en',
  };
}

export default async function handler(req, res) {
  const json = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  if (req.method !== 'GET') return json(405, { ok: false });
  let q; try { q = new URL(req.url || '/', 'http://x').searchParams; } catch { q = new URLSearchParams(); }
  const text = String(q.get('text') || '').replace(/\s+/g, ' ').trim();
  const lang = q.get('lang') === 'ar' ? 'ar' : 'en';
  if (!text) return json(200, { ok: true, voice: cartesiaReady() });
  if (!cartesiaReady()) return json(503, { ok: false, error: 'voice not set up' });
  if (text.length > MAX) return json(400, { ok: false, error: 'text too long' });
  if (!fromThisSite(req)) return json(403, { ok: false, error: 'only from the Falaj site' });
  if (limited(req)) return json(429, { ok: false, error: 'slow down' });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: { 'X-API-Key': env('CARTESIA_API_KEY'), 'Cartesia-Version': env('CARTESIA_VERSION') || '2025-04-16', 'Content-Type': 'application/json' },
      body: JSON.stringify(cartesiaBody(text, lang)),
      signal: ctl.signal,
    });
    if (!r.ok) return json(502, { ok: false, error: 'voice service status ' + r.status });
    const audio = Buffer.from(await r.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(audio.length));
    res.end(audio);
  } catch {
    return json(502, { ok: false, error: 'voice service unavailable' });
  } finally { clearTimeout(timer); }
}
