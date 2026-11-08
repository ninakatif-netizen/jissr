// Jissr: writes the patient's plain-language explanation, or rewords a rule-chosen next step.
// POST {task:'explain'|'barrier', band, value, lang:'en'|'ar', level:'normal'|'simple', barrier}
//  -> {ok:true, text, source:'ai'|'template', provider?}
//
// SAFETY: this endpoint only receives a band, a number and a barrier. Never a name or any patient detail.
// The AI only writes words. Urgency, deadlines and case changes are decided by rules elsewhere.
// If the AI is not set up, fails, or says something that does not pass the safety filter, a pre-written
// template is returned instead, so the demo never breaks.
import { jissrComplete, pickJissrProvider } from './_jissr-ai.js';
import { explanation, barrierText } from '../core/templates.mjs';
import { safeText, withDisclaimer, classify, BARRIERS } from '../core/rules.mjs';

const hits = new Map(); // tiny best-effort rate limit per visitor (resets when the function restarts)
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

const SYSTEM = (lang) => `You write short messages for patients in Abu Dhabi who received an abnormal HbA1c blood test.
Rules you must follow:
- Write in ${lang === 'ar' ? 'Modern Standard Arabic' : 'plain English'}, warm and calm, about a 12-year-old reading level, under 110 words.
- NEVER diagnose. Never say "you have diabetes" or "you are diabetic". Say the result is "higher than usual" or "in a range that needs a check".
- Never recommend, start, stop or change any medicine.
- Do not promise outcomes. Do not use scary words. Do not blame the patient.
- Use only the facts given. Do not invent costs, insurance rules, phone numbers or opening hours.
- Do not write the sentence "this is not a diagnosis"; the app adds it.
- Output only the message text.`;

function userPrompt({ task, band, value, level, barrier }) {
  if (task === 'barrier') {
    return `The patient told us their main difficulty about seeing a doctor is: ${barrier}. The service will respond as follows (decided by rules): ${barrierText(barrier, 'en')}\nReword this as a kind message to the patient, keeping the same offer.`;
  }
  return `HbA1c result: ${value}%. Range: ${band}. ${level === 'simple' ? 'Use very simple words and short sentences; the patient said they did not understand.' : ''}\nExplain in plain language what HbA1c is, that this result is ${band === 'urgent' ? 'much higher than usual and a nurse will call within a day or two' : band === 'diabetes' ? 'higher than usual and a doctor should check them within two weeks' : 'a little higher than usual and worth a check-up'}, and that a clinician will talk it through.${band === 'urgent' ? ' Mention emergency help (ambulance 998) if they feel very unwell.' : ''}`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (code, body) => { res.statusCode = code; res.end(JSON.stringify(body)); };
  if (req.method === 'GET') return send(200, { ok: true, ai: !!pickJissrProvider() }); // true/false only
  if (req.method !== 'POST') return send(405, { ok: false });
  if (limited(req)) return send(429, { ok: false, error: 'slow down' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  b = b || {};
  const task = b.task === 'barrier' ? 'barrier' : 'explain';
  const lang = b.lang === 'ar' ? 'ar' : 'en';
  const level = b.level === 'simple' ? 'simple' : 'normal';
  const k = classify(b.value);
  const barrier = BARRIERS.includes(b.barrier) ? b.barrier : 'none';
  if (!k.inProgramme) return send(400, { ok: false, error: 'value is not in the programme range' });

  const template = task === 'barrier' ? withDisclaimer(barrierText(barrier, lang), lang) : explanation({ band: k.band, value: k.value, lang, level });
  if (task === 'barrier' && barrier === 'none') return send(200, { ok: true, text: template, source: 'template' });

  try {
    const { text, provider } = await jissrComplete({ system: SYSTEM(lang), user: userPrompt({ task, band: k.band, value: k.value, level, barrier }), maxTokens: 400 });
    const ok = safeText(text, lang);
    if (!ok) return send(200, { ok: true, text: template, source: 'template', note: 'ai answer rejected by safety filter' });
    return send(200, { ok: true, text: withDisclaimer(ok, lang), source: 'ai', provider });
  } catch {
    return send(200, { ok: true, text: template, source: 'template' });
  }
}
