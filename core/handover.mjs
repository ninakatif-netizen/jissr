// THE HANDOVER A CLINICIAN GETS WHEN THEY OPEN A FILE: one card in SBAR order
// (Situation, Background, Assessment, Recommendation: the handover format clinicians already use).
// Every line is built from the patient's real file and Falaj's fixed rules. No AI writes any of it,
// and the "A" line is where the case stands by rule: it is never a diagnosis.
import { BANDS, STAGE_LABEL, mustCall, slaDeadline } from './rules.mjs';
import { careHistory, FACILITIES, placeName } from './history.mjs';
import { promiseOf } from './assistant.mjs';

const LANG = { ar: 'Arabic', en: 'English', ur: 'Urdu', hi: 'Hindi', tl: 'Tagalog', bn: 'Bengali', ml: 'Malayalam' };
const CH = { whatsapp: 'WhatsApp', sms: 'text message', app: 'the app', phone: 'a phone call' };
const TEST = { mammo: 'Screening mammogram', fit: 'Bowel screening (FIT)', hba1c: 'HbA1c screening' };
const URG = { urgent: 'Urgent', priority: 'Priority', routine: 'Routine' };
export const fmtDate = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

// the same promise the patient reads, in a clinician's words
const CLIN = [[/^will call you about your result/, 'to call the patient about the result'], [/^will check that you understood your message/, 'to confirm the patient understood'], [/^will make sure your visit is booked/, 'to make sure the visit is booked'], [/^will see you at your visit/, 'to see the patient at the visit'], [/^will contact you for an appointment/, 'to contact the patient for an appointment'], [/^checks that your plan is in place/, 'to check the plan is in place'], [/^will tell you the next step/, 'to decide the next step']];
const clin = (w) => { for (const [r, t] of CLIN) if (r.test(w)) return w.replace(r, t); return w.replace("your doctor's referral", "the family doctor's referral"); };

export function handoverOf(c, staff = [], today) {
  const prog = TEST[c.programme] ? c.programme : 'hba1c', band = BANDS[c.band] || {};
  const value = prog === 'mammo' ? band.label || `BI-RADS ${c.value}` : prog === 'fit' ? 'Positive FIT' : `HbA1c ${c.value}% (${(band.label || 'above the usual range').toLowerCase()})`;
  const hist = careHistory(c, staff), past = hist.filter((h) => h.past);
  const prev = past.slice().reverse().find((h) => h.title === TEST[prog] || /screening/i.test(h.title));
  const places = new Set(past.map((h) => h.fac)).size;
  const pr = promiseOf(c, staff, today), must = mustCall(c);
  const seenBy = slaDeadline(c, 'attended');
  const stageTxt = c.stage === 'closed' ? 'Loop closed: care confirmed by a clinician.' : `${STAGE_LABEL[c.stage] || c.stage}.`;
  return {
    s: `${TEST[prog]}, ${fmtDate(c.resultDay)}: ${value}.`,
    b: `${prev ? `Last screening (${fmtDate(prev.day)}, ${FACILITIES[prev.fac].name}, ${placeName(prev.fac)}): ${prev.detail.replace(/\.$/, '')}. ` : ''}${past.length} earlier ${past.length === 1 ? 'record' : 'records'} in ${places} ${places === 1 ? 'place' : 'places'}. Speaks ${LANG[c.patient.language] || c.patient.language}; reached by ${CH[c.channel] || 'the app'}${c.patient.shifts ? '; works shifts' : ''}.`,
    a: `${URG[c.urgency] || 'Routine'} by rule. ${stageTxt}${must && c.stage !== 'closed' ? ' Must be told in person or by phone.' : ''}${pr && pr.late ? ` Late by ${pr.daysLate} ${pr.daysLate === 1 ? 'day' : 'days'}.` : ''}`,
    r: c.stage === 'closed' ? 'Nothing open. The sender has been told.' : `${pr && pr.keeper ? (/must answer/.test(pr.what) ? clin(pr.what) : `${pr.keeper.name} ${clin(pr.what)}`) : 'Next step to be assigned'}${pr && pr.by ? ` (${pr.late ? 'was due' : 'by'} ${fmtDate(pr.by)})` : ''}.${seenBy && ['result', 'notified', 'understood', 'booked'].includes(c.stage) ? ` Target: seen by ${fmtDate(seenBy)}.` : ''}`,
    late: !!(pr && pr.late),
  };
}

// The care timeline under the map: every record in order, with the index at which each place first appears.
export function timelineOf(c, staff = []) {
  const hist = careHistory(c, staff);
  const firstAt = {};
  hist.forEach((h, i) => { if (!(h.fac in firstAt)) firstAt[h.fac] = i; });
  return { items: hist.map((h) => ({ day: h.day, date: fmtDate(h.day), title: h.title, fac: h.fac, place: `${FACILITIES[h.fac].name}, ${placeName(h.fac)}`, now: !!h.now })), firstAt };
}
