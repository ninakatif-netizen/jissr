// THE RULES. Plain if/then logic, no AI. These decide urgency and deadlines.
// A clinician should confirm the numbers below before they are presented as final.

export const STAGES = ['result', 'notified', 'understood', 'booked', 'attended', 'care_plan', 'closed'];

export const STAGE_LABEL = {
  result: 'Result received',
  notified: 'Patient notified',
  understood: 'Patient understood',
  booked: 'Appointment booked',
  attended: 'Appointment attended',
  care_plan: 'Care plan agreed',
  closed: 'Case closed',
};

// HbA1c bands (percent). Lab values have one decimal, so we round to one decimal first.
export const BANDS = {
  normal:      { label: 'Below programme range', urgency: 'none',     dueDays: null },
  prediabetes: { label: 'Prediabetes range',     urgency: 'routine',  dueDays: 30 },
  diabetes:    { label: 'Diabetes range',        urgency: 'priority', dueDays: 14 },
  urgent:      { label: 'Urgent range',          urgency: 'urgent',   dueDays: 2 },
};

export function classify(value) {
  const x = Number(value);
  if (!Number.isFinite(x) || x < 3 || x > 20) return { band: 'invalid', inProgramme: false };
  const v = Math.round(x * 10) / 10;
  let band;
  if (v < 5.7) band = 'normal';
  else if (v <= 6.4) band = 'prediabetes';
  else if (v < 10) band = 'diabetes';
  else band = 'urgent';
  return { band, value: v, inProgramme: band !== 'normal', ...BANDS[band] };
}

// ---- dates (all as plain YYYY-MM-DD strings, UTC, so tests are stable) ----
export const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export function dueDate(resultDay, value) {
  const c = classify(value);
  return c.dueDays == null ? null : addDays(resultDay, c.dueDays);
}

// A case is overdue when it is still open and today is after its due date.
export function isOverdue(c, today) {
  return c.stage !== 'closed' && !!c.due && today > c.due;
}

// Status shown in the staff list. "at_risk" means a drop-out reason has been recorded.
export function statusOf(c, today) {
  if (c.stage === 'closed') return 'closed';
  if (isOverdue(c, today)) return 'overdue';
  if (c.dropReason) return 'at_risk';
  return 'on_track';
}

// ---- barriers: the patient says why following up is hard; rules choose the next step ----
export const BARRIERS = ['fear', 'cost', 'time_shift', 'language', 'dont_understand', 'none'];
export const BARRIER_LABEL = {
  fear: 'Afraid / worried',
  cost: 'Cost',
  time_shift: 'Time / shift work',
  language: 'Language',
  dont_understand: 'Does not understand the result',
  none: 'No barrier stated',
};

// What the system DOES for each barrier. (The AI only helps word the message.)
export function barrierPlan(barrier) {
  switch (barrier) {
    case 'fear':
      return { offer: 'nurse_call_first', staffTask: 'Call to listen and reassure; offer to bring a companion to the visit.' };
    case 'cost':
      return { offer: 'cost_check', staffTask: 'Check coverage and tell the patient the cost before they decide.' };
    case 'time_shift':
      return { offer: 'flexible_slots', staffTask: 'Offer early-morning or evening slots.' };
    case 'language':
      return { offer: 'language_support', staffTask: 'Arrange a nurse or interpreter who speaks the patient\'s language.' };
    case 'dont_understand':
      return { offer: 'explain_again_and_nurse', staffTask: 'Nurse to explain the result by voice, in the patient\'s language.' };
    default:
      return { offer: 'book_now', staffTask: 'Help the patient book the first visit.' };
  }
}

// Appointment slots offered to a patient. Urgent cases only get the next two days.
export function slotsFor({ band, barrier }, today) {
  const normal = ['09:00', '11:30', '14:00'];
  const flexible = ['07:30', '18:30', '19:30'];
  const times = barrier === 'time_shift' ? flexible : normal;
  const span = band === 'urgent' ? 2 : band === 'diabetes' ? 10 : 21;
  const out = [];
  for (let i = 1; i <= span && out.length < 6; i += band === 'urgent' ? 1 : 2) {
    out.push({ day: addDays(today, i), time: times[(i + out.length) % times.length] });
  }
  return out;
}

// Who should own a new case, by rule: urgent -> a nurse, everyone else -> a coordinator.
export const ownerRoleFor = (band) => (band === 'urgent' ? 'nurse' : 'coordinator');

// ---- AI safety filter. AI text is only used if it passes; otherwise a pre-written template is used. ----
export const DISCLAIMER = {
  en: 'This is not a diagnosis.',
  ar: 'هذا ليس تشخيصاً.',
};
const FORBIDDEN = [
  /\byou (have|are|\'ve got) (type ?[12] )?(diabet|diabetic)/i,
  /\byou (do not|don't|dont) have diabet/i,
  /\bdiagnos(ed|is of)\b(?!.*not a diagnosis)/i,
  /\b(take|start|stop|increase|reduce) (your )?(metformin|insulin|medication|medicine|tablets?)\b/i,
  /\bguarantee/i,
  /أنت مصاب/, /أنت مريض/, /تعاني من (مرض )?السكري/, /ابدأ.*(دواء|الأنسولين)/, /أوقف.*(دواء|الأنسولين)/,
];
export function safeText(text, lang) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  if (t.length < 20 || t.length > 1200) return null;
  if (FORBIDDEN.some((r) => r.test(t))) return null;
  if (lang === 'ar' && !/[؀-ۿ]/.test(t)) return null;
  if (lang === 'en' && /[؀-ۿ]/.test(t)) return null;
  return t;
}
// The disclaimer is added by code, so it can never be left out by a model.
export function withDisclaimer(text, lang) {
  const d = DISCLAIMER[lang] || DISCLAIMER.en;
  return text.includes(d) ? text : `${text} ${d}`;
}
