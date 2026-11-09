// SYNTHETIC DATA ONLY. Every name, age and result below is invented. No real patient is represented.
// Dates are generated relative to "today" so the overdue flags are always realistic when you demo.

import { STAGES, addDays } from './rules.mjs';
import { newCase } from './cases.mjs';

export const STAFF = [
  { id: 'n1', name: 'Nurse Huda Al Ali', nameAr: 'الممرضة هدى العلي', role: 'nurse', org: 'Screening programme' },
  { id: 'n2', name: 'Nurse Peter Dsouza', nameAr: 'الممرض بيتر دسوزا', role: 'nurse', org: 'Screening programme' },
  { id: 'c1', name: 'Sara Khan (coordinator)', nameAr: 'سارة خان (منسّقة)', role: 'coordinator', org: 'Screening programme' },
  { id: 'c2', name: 'Omar Said (coordinator)', nameAr: 'عمر سعيد (منسّق)', role: 'coordinator', org: 'Screening programme' },
  { id: 'd1', name: 'Dr Mariam Al Hosani', nameAr: 'د. مريم الحوسني', role: 'clinician', org: 'Primary care clinic' },
  { id: 'd2', name: 'Dr Arjun Menon', nameAr: 'د. أرجون مينون', role: 'clinician', org: 'Primary care clinic' },
  { id: 'e1', name: 'Dr Salma Haddad', nameAr: 'د. سلمى حداد', role: 'clinician', org: 'Hospital endocrinology' },
  { id: 'e2', name: 'Dr Rahul Verma', nameAr: 'د. راهول فيرما', role: 'clinician', org: 'Diabetes centre' },
  { id: 'e3', name: 'Dr Khalid Rahman', nameAr: 'د. خالد رحمن', role: 'clinician', org: 'Colorectal clinic' },
  { id: 'e4', name: 'Dr Noura Al Ketbi', nameAr: 'د. نورة الكتبي', role: 'clinician', org: 'Breast clinic' },
];

// Journey stages by index: 0 result, 1 notified, 2 understood, 3 booked, 4 attended,
// 5 confirmed, 6 referred, 7 care plan, 8 closed.
// [id, name, age, language, HbA1c, days since result, stage index, barrier, owner, drop-out reason, works shifts]
// Data minimisation: no sex, nationality, ID number, phone or address. The loop does not need them.
const ROWS = [
  [1, 'Fatima Al Mansoori', 58, 'ar', 8.1, 12, 1, 'dont_understand', 'n1', '', 0],
  [2, 'Rashid Al Nuaimi', 61, 'ar', 6.9, 20, 7, 'none', 'd1', '', 0],
  [3, 'Priya Nair', 44, 'en', 6.1, 35, 1, 'time_shift', 'c1', 'Rotating shifts, cannot take time off', 1],
  [4, 'Joseph Mathew', 39, 'en', 7.4, 16, 2, 'cost', 'c1', 'Worried about cost', 0],
  [5, 'Mohammed Iqbal', 52, 'ur', 11.2, 1, 1, 'fear', 'n1', '', 0],
  [6, 'Aisha Khan', 35, 'ur', 5.9, 10, 3, 'none', 'c2', '', 0],
  [7, 'Samuel Okoye', 47, 'en', 8.8, 25, 1, 'time_shift', 'n2', 'Night shifts, keeps missing slots', 1],
  [8, 'Maryam Al Kaabi', 66, 'ar', 9.4, 9, 5, 'none', 'd1', '', 0],
  [9, 'Ahmed Hassan', 55, 'ar', 10.4, 3, 2, 'fear', 'n1', 'Afraid of the result', 0],
  [10, 'Lakshmi Devi', 50, 'hi', 7.1, 13, 3, 'language', 'c2', '', 0],
  [11, 'Khalid Al Dhaheri', 29, 'ar', 5.8, 8, 2, 'none', 'c1', '', 0],
  [12, 'Noura Al Shamsi', 42, 'ar', 6.3, 40, 8, 'none', 'd2', '', 0],
  [13, 'Ravi Kumar', 37, 'en', 6.6, 15, 1, 'dont_understand', 'c1', 'Did not understand the result', 0],
  [14, 'Elena Santos', 48, 'en', 7.9, 6, 2, 'none', 'n2', '', 0],
  [15, 'Yusuf Ali', 63, 'ar', 9.1, 30, 6, 'none', 'd1', '', 0],
  [16, 'Hana Mahmoud', 31, 'ar', 6.0, 5, 1, 'none', 'c2', '', 0],
  [17, 'Daniel Tan', 45, 'en', 6.8, 18, 2, 'cost', 'c2', '', 0],
  [18, 'Zainab Al Marzouqi', 72, 'ar', 10.8, 4, 1, 'dont_understand', 'n1', '', 0],
  [19, 'Omar Farouk', 57, 'ar', 7.7, 11, 6, 'time_shift', 'd2', '', 1],
  [20, 'Sneha Reddy', 33, 'en', 5.7, 22, 4, 'none', 'c2', '', 0],
  [21, 'Tariq Mahmood', 60, 'ur', 8.4, 28, 1, 'language', 'c1', 'Needs an Urdu-speaking nurse', 0],
  [22, 'Layla Haddad', 38, 'ar', 6.2, 3, 0, 'none', null, '', 0],
  [23, 'George Mensah', 54, 'en', 7.2, 19, 2, 'time_shift', 'n2', 'Works two jobs', 1],
  [24, 'Shamma Al Ketbi', 49, 'ar', 6.5, 14, 3, 'none', 'c2', '', 0],
  [25, 'Vikram Singh', 43, 'en', 12.1, 1, 0, 'none', null, '', 0],
  [26, 'Amal Youssef', 34, 'ar', 6.4, 45, 8, 'none', 'd2', '', 0],
  [27, 'Chen Wei', 51, 'en', 9.8, 21, 6, 'cost', 'd2', '', 0],
  [28, 'Nadia Rahman', 41, 'en', 7.0, 7, 2, 'language', 'c2', '', 0],
  [29, 'Hamdan Al Ameri', 68, 'ar', 8.0, 50, 8, 'none', 'd1', '', 0],
  [30, 'Grace Wanjiru', 36, 'en', 6.7, 26, 0, 'none', 'c1', 'Could not be reached (phone number not working)', 0],
];

// BOWEL CANCER SCREENING (FIT stool test): all invented. A positive FIT needs a colonoscopy.
// [id, name, age, language, days since result, stage index, barrier, owner, drop-out reason, works shifts]
const FIT_ROWS = [
  [31, 'Salem Al Mazrouei', 62, 'ar', 9, 1, 'fear', 'c1', 'Afraid of the colonoscopy', 0],
  [32, 'Rosa Fernandez', 55, 'tl', 40, 2, 'time_shift', 'c2', 'Cannot take a day off for the bowel preparation', 1],
  [33, 'Abdullah Karim', 58, 'ur', 16, 3, 'none', 'c1', '', 0],
  [34, 'Meera Pillai', 51, 'ml', 25, 4, 'none', 'd2', '', 0],
  [35, 'Hessa Al Dhaheri', 67, 'ar', 33, 6, 'none', 'd1', '', 0],
  [36, 'John Abraham', 49, 'en', 4, 0, 'none', null, '', 0],
  [37, 'Fawzia Saeed', 70, 'ar', 60, 8, 'none', 'd1', '', 0],
  [38, 'Arjun Nair', 46, 'en', 6, 1, 'cost', 'c2', '', 0],
];

// Breast screening (mammogram): [n, name, age, language, BI-RADS, days ago, stage index, barrier, owner, drop-out reason, shifts]
const MAMMO_ROWS = [
  [39, 'Layla Al Nuaimi', 52, 'ar', 4, 1, 1, 'fear', 'n1', '', 0],
  [40, 'Priya Raman', 47, 'ml', 4, 3, 1, 'none', 'n2', '', 0],
  [41, 'Amna Al Shamsi', 61, 'ar', 5, 2, 2, 'none', 'n1', '', 0],
  [42, 'Grace Mensah', 55, 'en', 0, 6, 3, 'time_shift', 'c2', '', 1],
  [43, 'Sana Qureshi', 58, 'ur', 4, 9, 1, 'fear', 'n2', 'Says she does not want a biopsy', 0],
];

// Extra story for a few cases: referrals in different states, a hand-off, a question to a specialist, a waiting nurse call.
const REFERRALS = {
  19: { to: 'Hospital endocrinology', status: 'sent', ago: 3, reason: 'HbA1c 7.7% with symptoms; specialist review requested.' },
  15: { to: 'Hospital endocrinology', status: 'rejected', ago: 6, replyAgo: 5, by: 'e1', reason: 'HbA1c 9.1%, no repeat test yet; specialist advice on treatment.', reply: 'Please complete the repeat HbA1c and a kidney profile first, then resubmit.' },
  27: { to: 'Diabetes centre', status: 'accepted', ago: 5, replyAgo: 4, by: 'e2', reason: 'HbA1c 9.8%; needs structured diabetes education and review.', reply: '' },
  35: { to: 'Colorectal clinic', status: 'accepted', ago: 12, replyAgo: 11, by: 'e3', reason: 'Colonoscopy found a lesion; biopsy needs specialist review.', reply: '' },
};
const CONSULTS = { 18: { to: 'Hospital endocrinology', ago: 4, question: '72-year-old, HbA1c 10.8%, no treatment yet. Advice on how soon she should be seen?' } };
const NURSE_WAITING = { 5: 2 };
// 10-minute calls with a nurse navigator already booked by the patient (days from today, time, nurse).
const MICRO = { 39: [1, '18:00', 'n1'], 9: [1, '12:40', 'n2'] };       // days ago the patient asked for a nurse call (still waiting)
const PLAN_KIND = { 2: 'treatment', 12: 'surveillance', 26: 'surveillance', 29: 'treatment', 37: 'surveillance' };
// Some patients were notified or reached late (days of delay), so the measures show real-looking gaps.
const LATE = { 3: 4, 7: 5, 13: 3, 21: 4, 23: 3, 10: 2, 16: 2, 4: 3, 17: 2 };
const CHANNEL_BY_LANG = { ar: 'whatsapp', ur: 'sms', hi: 'sms', en: 'app', tl: 'whatsapp', ml: 'whatsapp' };

// Days after the result when each step happened (never later than "today").
const STEP_OFFSET = { notified: 0, understood: 1, booked: 3, attended: 9, confirmed: 9, referred: 10, care_plan: 11, closed: 12 };

export function buildState(today) {
  const staff = STAFF.map((s) => ({ ...s }));
  const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
  const rows = [...ROWS.map((r) => [...r, 'hba1c']), ...FIT_ROWS.map(([n, nm, ag, lg, ...rest]) => [n, nm, ag, lg, null, ...rest, 'fit']), ...MAMMO_ROWS.map((r) => [...r, 'mammo'])];
  const cases = rows.map(([n, name, age, language, value, ago, stageIdx, barrier, owner, dropReason, shifts, programme]) => {
    const fit = programme === 'fit';
    const resultDay = addDays(today, -ago);
    const id = 'C-' + String(n).padStart(3, '0');
    const c = newCase({
      id, value, resultDay, owner, programme,
      patient: { id: 'P-' + String(n).padStart(3, '0'), name, age, language, shifts: !!shifts },
    });
    c.barrier = barrier;
    c.dropReason = dropReason || null;
    c.channel = age >= 70 ? 'phone' : CHANNEL_BY_LANG[language] || 'app';
    const ref = REFERRALS[n];
    const clin = byId[owner] && byId[owner].role === 'clinician' ? byId[owner] : byId.d1;
    const staffBy = (s) => [s.name, s.role];

    for (let i = 1; i <= stageIdx; i++) {
      const stage = STAGES[i];
      const off = Math.min(STEP_OFFSET[stage] + (LATE[n] || 0), ago);
      let by, role, note = '', skipped = false;
      if (stage === 'notified') { by = 'Falaj system'; role = 'system'; }
      else if (stage === 'understood' || stage === 'booked') { by = 'Patient (in app)'; role = 'patient'; }
      else if (stage === 'attended') { [by, role] = staffBy(byId[owner]); note = fit ? 'Colonoscopy done' : 'Seen in clinic'; }
      else if (stage === 'confirmed') { [by, role] = staffBy(clin); note = fit ? 'Biopsy results reviewed with the patient' : 'Repeat HbA1c confirms the first result'; }
      else if (stage === 'referred') {
        [by, role] = staffBy(clin);
        if (ref) note = `Referred to ${ref.to}: ${ref.reason}`;
        else { note = 'Not required: managed in primary care'; skipped = true; }
      } else if (stage === 'care_plan') {
        [by, role] = staffBy(clin);
        const kind = PLAN_KIND[n] || 'treatment';
        c.plan = { kind, at: addDays(resultDay, off) + 'T10:00:00.000Z', by };
        note = fit ? (kind === 'surveillance' ? 'Surveillance plan agreed: repeat colonoscopy in 3 years' : 'Treatment plan agreed with the specialist team') : kind === 'surveillance' ? 'Surveillance plan agreed: lifestyle advice, re-test in 3 months' : 'Treatment plan agreed and started';
      } else if (stage === 'closed') { [by, role] = staffBy(clin); }
      let at = addDays(resultDay, off) + 'T10:00:00.000Z';
      if (stage === 'referred' && ref) at = addDays(today, -ref.ago) + 'T09:00:00.000Z';
      c.events.push({ type: stage, at, by, role, note, ...(skipped ? { skipped: true } : {}) });
      c.stage = stage;
    }

    if (ref) {
      c.referral = { to: ref.to, reason: ref.reason, status: 'sent', sentAt: addDays(today, -ref.ago) + 'T09:00:00.000Z', fromOwner: owner, history: [] };
      if (ref.status !== 'sent') {
        const rep = byId[ref.by];
        const at = addDays(today, -ref.replyAgo) + 'T11:00:00.000Z';
        if (ref.status === 'accepted') {
          c.referral.status = 'accepted'; c.referral.note = ref.reply; c.referral.acceptedAt = at;
          c.owner = rep.id; // hand-off
          c.events.push({ type: 'referral_accepted', at, by: rep.name, role: rep.role, note: `Accepted by ${rep.name}. Owner is now ${rep.name}.` });
        } else {
          c.referral.status = 'rejected'; c.referral.note = ref.reply;
          c.events.push({ type: 'referral_rejected', at, by: rep.name, role: rep.role, note: `Rejected by ${ref.to}: ${ref.reply}` });
        }
      }
    }
    const cs = CONSULTS[n];
    if (cs) {
      const askedDay = addDays(today, -cs.ago);
      c.consults = [{ id: 'Q1', to: cs.to, question: cs.question, askedBy: byId.d1.name, askedAt: askedDay + 'T09:30:00.000Z', due: addDays(askedDay, 2), answer: null }];
      c.events.push({ type: 'consult_asked', at: askedDay + 'T09:30:00.000Z', by: byId.d1.name, role: 'clinician', note: `Asked ${cs.to}: ${cs.question}` });
    }
    if (NURSE_WAITING[n]) {
      const at = addDays(today, -NURSE_WAITING[n]) + 'T14:00:00.000Z';
      c.nurseRequest = { at, note: 'Preferred time: evening', done: false };
      c.events.push({ type: 'nurse_requested', at, by: 'Patient (in app)', role: 'patient', note: 'Patient asked to talk to a nurse' });
    }
    if (n === 43) c.declined = true; // said she does not want a biopsy
    if (MICRO[n]) {
      const [d, time, nid] = MICRO[n], nurse = byId[nid];
      c.microConsult = { day: addDays(today, d), time, nurseId: nid, nurseName: nurse.name, minutes: 10, status: 'booked', at: addDays(today, -1) + 'T19:00:00.000Z' };
      c.events.push({ type: 'micro_consult_booked', at: c.microConsult.at, by: 'Patient (in app)', role: 'patient', note: `10-minute call with ${nurse.name} on ${c.microConsult.day} at ${time}` });
    }
    if (stageIdx >= 3) { // patient-reported confidence (1 to 5), synthetic
      c.confidence = { score: ((n * 7) % 3) + 3, at: addDays(resultDay, Math.min(3, ago)) + 'T10:05:00.000Z' };
    }
    if (c.stage === 'closed') {
      const closer = clin;
      c.closed = {
        type: 'care_plan_agreed',
        evidence: fit
          ? 'Colonoscopy done, two small polyps removed, biopsy benign, surveillance colonoscopy planned in 3 years.'
          : c.plan && c.plan.kind === 'surveillance'
          ? 'Seen in clinic, repeat HbA1c confirmed, lifestyle plan given, re-test booked in 3 months.'
          : 'Seen in clinic, repeat HbA1c confirmed, treatment started, review booked in 3 months.',
        by: closer.name, at: addDays(resultDay, Math.min(STEP_OFFSET.closed, ago)) + 'T12:00:00.000Z',
      };
      c.events[c.events.length - 1].note = 'Treatment or surveillance plan agreed and started: ' + c.closed.evidence;
    }
    return c;
  });
  return { version: 4, today, staff, cases };
}
