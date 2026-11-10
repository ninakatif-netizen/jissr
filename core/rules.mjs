// THE RULES. Plain if/then logic, no AI. These decide urgency and deadlines.
// A clinician should confirm the numbers below before they are presented as final.

// The full journey. "confirmed" and "referred" are optional: a clinician can record "not required" with a reason.
export const STAGES = ['result', 'notified', 'understood', 'booked', 'attended', 'confirmed', 'referred', 'care_plan', 'closed'];
export const OPTIONAL_STAGES = ['confirmed', 'referred'];

export const STAGE_LABEL = {
  result: 'Result received',
  notified: 'Patient notified',
  understood: 'Patient understood',
  booked: 'Appointment booked',
  attended: 'Appointment attended',
  confirmed: 'Confirmatory test done',
  referred: 'Referral to specialist',
  care_plan: 'Treatment or surveillance plan',
  closed: 'Case closed',
};

// HbA1c bands (percent). Lab values have one decimal, so we round to one decimal first.
export const BANDS = {
  normal:      { label: 'Below programme range', urgency: 'none',     dueDays: null },
  prediabetes: { label: 'Prediabetes range',     urgency: 'routine',  dueDays: 30 },
  diabetes:    { label: 'Diabetes range',        urgency: 'priority', dueDays: 14 },
  urgent:      { label: 'Urgent range',          urgency: 'urgent',   dueDays: 2 },
  fit_positive: { label: 'Positive FIT',         urgency: 'priority', dueDays: 30 },
  birads0: { label: 'BI-RADS 0: more imaging needed',        urgency: 'routine',  dueDays: 14 },
  birads4: { label: 'BI-RADS 4: suspicious, biopsy advised',  urgency: 'priority', dueDays: 14 },
  birads5: { label: 'BI-RADS 5: highly suspicious, biopsy',   urgency: 'urgent',   dueDays: 7 },
};

// BREAST SCREENING (mammogram). The radiologist reports a BI-RADS category (ACR BI-RADS Atlas, 5th edition).
// 0 = more pictures needed; 4 and 5 = a biopsy is advised. 1 and 2 are normal or benign: no case is opened.
// 3 (probably benign, re-check in about 6 months) is not handled by this prototype yet, so it is refused rather than guessed.
// Deadlines are proposals for a clinician to confirm.
export function classifyMammo(birads) {
  const b = Number(birads);
  if (b === 0) return { band: 'birads0', value: 0, inProgramme: true, ...BANDS.birads0 };
  if (b === 4) return { band: 'birads4', value: 4, inProgramme: true, ...BANDS.birads4 };
  if (b === 5) return { band: 'birads5', value: 5, inProgramme: true, ...BANDS.birads5 };
  if (b === 1 || b === 2) return { band: 'birads_normal', value: b, inProgramme: false };
  if (b === 3) return { band: 'birads3', value: 3, inProgramme: false, unsupported: true };
  return { band: 'invalid', inProgramme: false };
}

// BOWEL CANCER SCREENING (FIT stool test). The lab reports positive or negative.
// A positive result needs a colonoscopy. Deadlines are proposals for a clinician to confirm.
export function classifyFit(result) {
  if (result === 'positive') return { band: 'fit_positive', inProgramme: true, ...BANDS.fit_positive };
  if (result === 'negative') return { band: 'fit_negative', inProgramme: false };
  return { band: 'invalid', inProgramme: false };
}

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

// Who should own a new case, by rule: urgent results and suspicious mammograms -> a nurse navigator, everyone else -> a coordinator.
export const ownerRoleFor = (band) => (['urgent', 'birads4', 'birads5'].includes(band) ? 'nurse' : 'coordinator');

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
  /(?<!not mean )\byou (have|\'ve got) (breast |bowel |colon )?cancer/i, /لديك سرطان/, /أنت مصابة? بالسرطان/,
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


// ---- SERVICE LEVELS (days after the result). Proposals for a clinician to confirm. ----
export const SLA = {
  urgent:   { notified: 0, understood: 1, booked: 1,  attended: 2 },
  priority: { notified: 1, understood: 3, booked: 7,  attended: 14 },
  routine:  { notified: 3, understood: 7, booked: 14, attended: 30 },
};
export const SLA_STEPS = ['notified', 'understood', 'booked', 'attended'];
export const REFERRAL_REPLY_DAYS = 2;   // a referral should be accepted or rejected within 2 days
export const CONSULT_REPLY_DAYS = 2;    // a clinician-to-clinician question should be answered within 2 days
export const NURSE_CALLBACK_DAYS = 1;   // a requested nurse call should happen within 1 day

// Programmes with their own service levels (days after the result). FIT: proposal, colonoscopy within 30 days.
export const PROGRAMME_SLA = {
  fit: { notified: 2, understood: 7, booked: 14, attended: 30 },
  // Mammogram: tighter for suspicious results (proposal: told within 1 day, biopsy within 7 or 14 days).
  mammo: { notified: 1, understood: 2, booked: 5, attended: 14 },
};
const MAMMO_SLA_BY_BAND = { birads5: { notified: 1, understood: 1, booked: 3, attended: 7 } };
export function slaDeadline(c, step) {
  const row = (c.programme === 'mammo' && MAMMO_SLA_BY_BAND[c.band]) || PROGRAMME_SLA[c.programme] || SLA[c.urgency];
  return row && step in row ? addDays(c.resultDay, row[step]) : null;
}

// ---- ESCALATION: fixed rules decide what needs a human's attention (the AI plays no part). ----
// level 2 = coordinator or clinical lead should act; level 3 = clinical lead now.
export function escalationsFor(c, today) {
  const out = [];
  if (c.stage === 'closed') return out;
  const add = (code, level, text) => out.push({ code, level, text });
  const late = c.due && today > c.due ? daysBetween(c.due, today) : 0;
  if (!c.owner) add('unassigned', 2, 'No owner assigned');
  if (late >= 7) add('overdue_7d', 3, `Overdue by ${late} days: clinical lead to review`);
  else if (late >= 3) add('overdue_3d', 2, `Overdue by ${late} days`);
  if (c.stage === 'result') {
    const age = daysBetween(c.resultDay, today);
    if (c.urgency === 'urgent' && age >= 1) add('urgent_not_notified', 3, `Urgent result not yet communicated (${age} day${age === 1 ? '' : 's'})`);
    else if (today > slaDeadline(c, 'notified')) add('notify_late', 2, 'Patient not notified within the service level');
  }
  const r = c.referral;
  if (r && r.status === 'rejected') add('referral_rejected', 3, `Referral rejected by ${r.to}: needs a new plan`);
  if (r && r.status === 'sent' && daysBetween(r.sentAt.slice(0, 10), today) >= REFERRAL_REPLY_DAYS) add('referral_unanswered', 2, `No reply from ${r.to} to the referral`);
  const n = c.nurseRequest;
  if (n && !n.done && daysBetween(n.at.slice(0, 10), today) >= NURSE_CALLBACK_DAYS) add('nurse_callback_late', 2, 'Patient asked for a nurse call and is still waiting');
  const m = c.microConsult;
  if (m && m.status === 'booked' && m.day < today) add('micro_consult_missed', 2, `10-minute call on ${m.day} not marked as done`);
  for (const q of c.consults || []) {
    if (!q.answer && today > q.due) add('consult_late', 2, `No answer yet from ${q.to} to the clinical question`);
  }
  return out;
}
export const maxLevel = (list) => list.reduce((m, e) => Math.max(m, e.level), 0);

export const CHANNELS = ['app', 'sms', 'whatsapp', 'phone'];
export const CHANNEL_LABEL = { app: 'This app', sms: 'SMS', whatsapp: 'WhatsApp', phone: 'Phone call' };


// =====================================================================================================
// CLOE: CARE LOOP ORCHESTRATION ENGINE (a view over the detailed journey above, not a second state machine)
// The five CLOE phases are what a navigator needs at a glance. Each one maps to the detailed stages, so the
// rules, the audit trail and the patient app keep working exactly as before.
// =====================================================================================================
export const CLOE_PHASES = ['ISSUED', 'NOTIFIED', 'MICRO_CONSULT_BOOKED', 'REFERRED', 'CLOSED'];
export const CLOE_LABEL = {
  ISSUED: 'Result issued',
  NOTIFIED: 'Patient notified',
  MICRO_CONSULT_BOOKED: '10-min call booked',
  REFERRED: 'In diagnostic or specialist care',
  CLOSED: 'Closed with evidence',
};
export function cloePhase(c) {
  if (c.stage === 'closed') return 'CLOSED';
  if (STAGES.indexOf(c.stage) >= STAGES.indexOf('booked')) return 'REFERRED';
  if (c.microConsult && c.microConsult.status === 'booked') return 'MICRO_CONSULT_BOOKED';
  if (c.stage === 'result') return 'ISSUED';
  return 'NOTIFIED';
}

// SLA CLOCK in hours, with three tiers. The clock runs on the first service-level step not yet done
// (or on the specialist's reply while a referral is waiting). A step's deadline is the end of its due day (UTC).
export const SLA_TIER = { ON_TRACK: 'ON_TRACK', WARNING: 'WARNING', BREACHED: 'BREACHED' };
export const SLA_WARNING_HOURS = 24;     // WARNING when less than a day is left...
export const SLA_WARNING_SHARE = 0.25;   // ...or less than a quarter of the step's time window
const H = 3600000;
const endOfDay = (day) => Date.parse(addDays(day, 1) + 'T00:00:00Z');
const STEP_TEXT = { notified: 'Tell the patient', understood: 'Patient understands', booked: 'Book the next test or visit', attended: 'Test or visit done', referral_reply: 'Specialist replies to the referral' };

export function slaClock(c, now = Date.now()) {
  if (!c || c.stage === 'closed') return null;
  const t = typeof now === 'number' ? now : Date.parse(now);
  let step, start, deadline;
  const r = c.referral;
  if (r && r.status === 'sent') {
    step = 'referral_reply'; start = Date.parse(r.sentAt); deadline = endOfDay(addDays(r.sentAt.slice(0, 10), REFERRAL_REPLY_DAYS));
  } else {
    const idx = STAGES.indexOf(c.stage);
    step = SLA_STEPS.find((s) => STAGES.indexOf(s) > idx);
    if (!step) return null; // every timed step is done: the clinician now owns the plan
    const day = slaDeadline(c, step);
    if (!day) return null;
    start = Date.parse(c.resultDay + 'T00:00:00Z'); deadline = endOfDay(day);
  }
  const left = deadline - t, window = Math.max(deadline - start, H);
  const tier = left < 0 ? SLA_TIER.BREACHED : left < SLA_WARNING_HOURS * H || left < window * SLA_WARNING_SHARE ? SLA_TIER.WARNING : SLA_TIER.ON_TRACK;
  return { step, stepText: STEP_TEXT[step], deadline: new Date(deadline).toISOString(), hoursLeft: Math.round(left / H), tier };
}
// "14 h left", "2 d 3 h left", "Breached 5 h ago"
export function slaText(clock) {
  if (!clock) return '';
  const h = Math.abs(clock.hoursLeft);
  const span = h >= 48 ? `${Math.floor(h / 24)} d` : `${h} h`;
  return clock.tier === SLA_TIER.BREACHED ? `Breached ${span} ago` : `${span} left`;
}

// 10-MINUTE MICRO-CONSULTATIONS with a nurse navigator: a short call before the patient has to decide anything.
export const MICRO_MINUTES = 10;
const MICRO_TIMES = ['08:30', '10:10', '12:40', '16:20', '18:00', '19:30'];
// Free slots for the next `days` days. Nurses are shared round-robin; slots already taken by any case are removed.
export function microConsultSlots(staff, cases, today, days = 2) {
  const nurses = staff.filter((s) => s.role === 'nurse' && s.org === 'Screening programme');
  if (!nurses.length) return [];
  const taken = new Set(cases.filter((c) => c.microConsult && c.microConsult.status === 'booked').map((c) => `${c.microConsult.day} ${c.microConsult.time} ${c.microConsult.nurseId}`));
  const out = [];
  for (let d = 1; d <= days; d++) {
    const day = addDays(today, d);
    MICRO_TIMES.forEach((time, i) => {
      const n = nurses[(i + d) % nurses.length];
      if (!taken.has(`${day} ${time} ${n.id}`)) out.push({ day, time, nurseId: n.id, nurseName: n.name, minutes: MICRO_MINUTES });
    });
  }
  return out;
}

// STANDARD OPERATING PROCEDURES (SOPs) a navigator can run. Each one is a fixed list of steps; the code
// records what was done in the audit trail. Rules decide when an SOP applies; people decide to run it.
export const SOPS = {
  unread_outreach: {
    label: 'Unread outreach',
    when: 'The patient has not confirmed they understood, and the service level is at risk or missed.',
    steps: ['Resend the message on the next channel (app → SMS → WhatsApp → phone call)', 'Create a nurse call task', 'Log it in the audit trail'],
  },
  stalled_referral: {
    label: 'Stalled referral',
    when: 'A referral has no reply within the agreed time, or was rejected.',
    steps: ['Phone the receiving team and log the call', 'Tell the clinical lead', 'If rejected: a clinician re-sends or chooses another team'],
  },
  refusal: {
    label: 'Refusal management',
    when: 'The patient says they do not want follow-up (staff mark it, or the patient tells the nurse).',
    steps: ['Record the patient\'s reason in their words', 'A clinician explains the risks (informed refusal)', 'Book a re-contact in 90 days as a safety net', 'Only then can a clinician close the case as "informed refusal"'],
  },
};
export const CHANNEL_LADDER = ['app', 'sms', 'whatsapp', 'phone'];
export function sopsFor(c, now = Date.now()) {
  if (!c || c.stage === 'closed') return [];
  const out = [];
  const clock = slaClock(c, now);
  if (STAGES.indexOf(c.stage) < STAGES.indexOf('understood') && clock && clock.tier !== SLA_TIER.ON_TRACK) out.push('unread_outreach');
  const r = c.referral;
  if (r && (r.status === 'rejected' || (r.status === 'sent' && clock && clock.step === 'referral_reply' && clock.tier !== SLA_TIER.ON_TRACK))) out.push('stalled_referral');
  if (c.refusal || c.declined) out.push('refusal');
  return out;
}

// Where the patient is on the five-step journey shown everywhere as a bridge (0..4), or 5 when everything is done.
export function journeyStep(c) {
  switch (c.stage) {
    case 'closed': return 5;
    case 'result': case 'notified': return 0;
    case 'understood': return 1;
    case 'booked': return 2;
    case 'attended': case 'confirmed': case 'referred': return 3;
    default: return 4; // care_plan
  }
}

// ---- FALAJ: clinical safety and the dropout radar ----
// Proposed by the team (a medical student), awaiting sign-off by a supervising clinician.
// Some results must be told by a person, by phone or face to face, never by a message alone.
export function mustCall(c) {
  if (!c || c.stage === 'closed') return null;
  if (c.programme === 'mammo' && ['birads4', 'birads5'].includes(c.band)) return 'Suspicious mammogram: tell her in person or by phone, never by message alone.';
  if ((!c.programme || c.programme === 'hba1c') && c.urgency === 'urgent') return 'HbA1c in the urgent band: call the same day and ask about symptoms.';
  return null;
}

// The dropout radar: simple visible rules, no AI. Two signals or more puts a case on the radar.
// It suggests who to call first; a person always decides.
const BARRIER_WORDS = { dont_understand: 'does not understand the result', time_shift: 'time off work or shifts', fear: 'feels worried', cost: 'cost', language: 'language', transport: 'transport', family: 'family duties' };
const RADAR_LANG = { ur: 'Urdu', hi: 'Hindi', tl: 'Tagalog', ml: 'Malayalam', bn: 'Bengali' };
export function radarFor(c, today) {
  if (!c || c.stage === 'closed') return { on: false, signals: [] };
  const s = [];
  const told = [...(c.events || [])].reverse().find((e) => e.type === 'notified');
  if (c.stage === 'notified' && told && today && daysBetween(told.at.slice(0, 10), today) >= 2) s.push('Result not opened for 2 days or more');
  const lang = c.patient && c.patient.language;
  if (RADAR_LANG[lang]) s.push(`Speaks ${RADAR_LANG[lang]}: use an interpreter or a first message in ${RADAR_LANG[lang]}`);
  if (c.patient && c.patient.shifts) s.push('Works shifts: offer an evening or weekend slot');
  if ((c.events || []).some((e) => e.type === 'contact' && /no answer|not reached|missed/i.test(e.note || ''))) s.push('A call was not answered');
  if (c.barrier && c.barrier !== 'none') s.push(`Said something gets in the way: ${BARRIER_WORDS[c.barrier] || c.barrier.replace(/_/g, ' ')}`);
  if ((c.events || []).some((e) => e.type === 'micro_consult_missed') || (c.microConsult && c.microConsult.status === 'missed')) s.push('Missed a booked call before');
  if (c.referral && c.referral.preauth && c.referral.preauth.status === 'requested') s.push('Insurance approval still pending');
  return { on: s.length >= 2, signals: s };
}
