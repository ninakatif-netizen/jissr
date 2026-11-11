// Falaj: the patient's assistant ("Ask Falaj").
//   GET  /api/jissr-assistant                 -> {ok:true, ai:true|false}
//   POST {msg, ctx}                           -> {ok:true, text, actions, intent, source:'ai'|'rules'}
//
// SAFETY: the server only accepts a small context (no name, no ID, no result value: see cleanContext).
// Rules choose the intent and the actions. A model (if one is set up in Vercel) may only reword the answer,
// and its words must pass two filters. Results and emergencies are always answered by fixed rule text.
import { falajComplete, pickFalajProvider } from './_jissr-ai.js';
import { reply, cleanContext, nextStep, FIXED, assistantSafe } from '../core/assistant.mjs';
import { safeText } from '../core/rules.mjs';
import { fromThisSite } from './jissr-voice.js';

const hits = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

const SYSTEM = `You are Falaj, a patient's assistant in a screening follow-up service in Abu Dhabi.
You help the patient organise: their next step, appointments, reminders, documents and questions for the doctor.
Rules you must follow:
- Plain English, warm and calm, under 70 words, no lists, no markdown.
- NEVER talk about a test result, what it means, or any diagnosis. Never name a disease. Never give numbers about results.
- Never give medical advice, never mention medicines.
- Use only the facts given. Do not invent dates, places, costs or phone numbers.
- You cannot book for a doctor, record a visit, or accept a referral. A person on the care team does that.
- Output only the message text.`;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (code, body) => { res.statusCode = code; res.end(JSON.stringify(body)); };
  if (req.method === 'GET') return send(200, { ok: true, ai: !!pickFalajProvider() });
  if (req.method !== 'POST') return send(405, { ok: false });
  if (!fromThisSite(req)) return send(403, { ok: false, error: 'only from the Falaj site' });
  if (limited(req)) return send(429, { ok: false, error: 'slow down' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  b = b || {};
  const msg = String(b.msg || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!msg) return send(400, { ok: false, error: 'empty message' });
  const ctx = cleanContext(b.ctx);
  const base = reply(msg, ctx);
  if (FIXED.includes(base.intent) || !pickFalajProvider()) return send(200, { ok: true, ...base, source: 'rules' });
  try {
    const facts = `Facts (from the service's rules): next step: ${nextStep(ctx)} Visit booked: ${ctx.visit ? ctx.visit.day + ' ' + ctx.visit.time : 'none'}. Nurse call already requested: ${ctx.nurseRequested ? 'yes' : 'no'}.
The app will show these buttons under your answer: ${base.actions.map((a) => a.label).join('; ') || 'none'}.
A draft answer written by the rules: ${base.text}
The patient wrote: """${msg}"""
Write the answer to the patient.`;
    const { text, provider } = await falajComplete({ system: SYSTEM, user: facts, maxTokens: 220 });
    const ok = safeText(text, 'en') && assistantSafe(text);
    if (!ok) return send(200, { ok: true, ...base, source: 'rules', note: 'ai answer rejected by safety filter' });
    return send(200, { ok: true, ...base, text: text.trim(), source: 'ai', provider });
  } catch {
    return send(200, { ok: true, ...base, source: 'rules' });
  }
}
