// The demo's memory. Everything is saved in this browser only (localStorage), shared by the patient
// and staff pages so a patient's action shows up on the staff dashboard. "Reset" restores the fake data.
// No server, no database, no real data.

import { buildState } from './data.mjs';
import { isoDay } from './rules.mjs';
import { explanation, barrierText } from './templates.mjs';
import { safeText, withDisclaimer, classify } from './rules.mjs';

const KEY = 'jissr.demo.v3';

export function loadState() {
  const today = isoDay(Date.now());
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 3 && Array.isArray(s.cases)) { s.today = today; return s; }
    }
  } catch { /* storage may be blocked: fall through to fresh data */ }
  return buildState(today);
}
export function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
export function resetState() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } return buildState(isoDay(Date.now())); }

// ---- AI client: asks the server for wording; falls back to the pre-written text; always safety-checked ----
export async function aiText({ task = 'explain', band, value, lang, level = 'normal', barrier = 'none' }) {
  const fallback = () => ({
    text: task === 'barrier' ? withDisclaimer(barrierText(barrier, lang), lang) : explanation({ band, value, lang, level }),
    source: 'template',
  });
  if (!classify(value).inProgramme) return fallback();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch('/api/jissr-explain', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ task, band, value, lang, level, barrier }),
    });
    clearTimeout(timer);
    if (!r.ok) return fallback();
    const j = await r.json();
    const ok = j && j.ok && safeText(j.text, lang);
    return ok ? { text: withDisclaimer(ok, lang), source: j.source === 'ai' ? 'ai' : 'template' } : fallback();
  } catch { return fallback(); }
}
