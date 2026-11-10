// Falaj: turns the patient's message into a natural voice (Azure AI Speech, neural voices).
//   GET  /api/jissr-voice                      -> {ok:true, voice:true|false}   (is a natural voice set up? true/false only)
//   GET  /api/jissr-voice?lang=ar&text=...     -> audio/mpeg (MP3)
//
// Set up (Vercel environment variables only, never in the repository):
//   AZURE_SPEECH_KEY     the key of an Azure "Speech" resource
//   AZURE_SPEECH_REGION  its region, for example uaenorth or westeurope
//   optional: JISSR_VOICE_AR (default ar-AE-FatimaNeural), JISSR_VOICE_EN (default en-GB-SoniaNeural)
//
// SAFETY: only the message text shown on screen is sent. No name and no patient detail.
// If the voice is not set up or fails, the app falls back to the phone's built-in voice.
// GET (not POST) on purpose: the phone can start playing straight from the tap, which iPhones require.

const env = (k) => (process.env[k] || '').trim();
export const voiceReady = () => !!(env('AZURE_SPEECH_KEY') && env('AZURE_SPEECH_REGION'));

const MAX = 1500; // characters: longer than any Falaj message, short enough to stop misuse
const hits = new Map(); // small best-effort rate limit per visitor
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 15;
}

// Only this site may use the voice: a browser sends Sec-Fetch-Site, and another website calling us gets refused.
// (A script outside a browser can still call it; the rate limit and the length limit cap that, and Azure's own quota caps cost.)
export function fromThisSite(req) {
  const site = String(req.headers['sec-fetch-site'] || '');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const ref = String(req.headers.referer || req.headers.origin || '');
  if (ref) { try { if (new URL(ref).host !== String(req.headers.host || '')) return false; } catch { return false; } }
  return true;
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function ssml(text, lang) {
  const voice = lang === 'ar' ? (env('JISSR_VOICE_AR') || 'ar-AE-FatimaNeural') : (env('JISSR_VOICE_EN') || 'en-GB-SoniaNeural');
  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB';
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${xml(voice)}"><prosody rate="-8%">${xml(text)}</prosody></voice></speak>`;
}

function query(req) {
  try { return new URL(req.url || '/', 'http://x').searchParams; } catch { return new URLSearchParams(); }
}

export default async function handler(req, res) {
  const json = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  if (req.method !== 'GET') return json(405, { ok: false });
  const q = query(req);
  const text = String(q.get('text') || '').replace(/\s+/g, ' ').trim();
  const lang = q.get('lang') === 'ar' ? 'ar' : 'en';
  if (!text) return json(200, { ok: true, voice: voiceReady() });
  if (!voiceReady()) return json(503, { ok: false, error: 'voice not set up' });
  if (text.length > MAX) return json(400, { ok: false, error: 'text too long' });
  if (!fromThisSite(req)) return json(403, { ok: false, error: 'only from the Falaj site' });
  if (limited(req)) return json(429, { ok: false, error: 'slow down' });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(`https://${encodeURIComponent(env('AZURE_SPEECH_REGION'))}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env('AZURE_SPEECH_KEY'),
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'jissr-prototype',
      },
      body: ssml(text, lang),
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
