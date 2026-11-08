// SYNTHETIC DATA ONLY. Every name, age and result below is invented. No real patient is represented.
// Dates are generated relative to "today" so the overdue flags are always realistic when you demo.

import { STAGES, addDays } from './rules.mjs';
import { newCase } from './cases.mjs';

export const STAFF = [
  { id: 'n1', name: 'Nurse Huda Al Ali', role: 'nurse', org: 'Screening programme' },
  { id: 'n2', name: 'Nurse Peter Dsouza', role: 'nurse', org: 'Screening programme' },
  { id: 'c1', name: 'Sara Khan (coordinator)', role: 'coordinator', org: 'Screening programme' },
  { id: 'c2', name: 'Omar Said (coordinator)', role: 'coordinator', org: 'Screening programme' },
  { id: 'd1', name: 'Dr Mariam Al Hosani', role: 'clinician', org: 'Primary care clinic' },
  { id: 'd2', name: 'Dr Arjun Menon', role: 'clinician', org: 'Primary care clinic' },
  { id: 'e1', name: 'Dr Salma Haddad', role: 'clinician', org: 'Hospital endocrinology' },
  { id: 'e2', name: 'Dr Rahul Verma', role: 'clinician', org: 'Diabetes centre' },
];

// Journey stages by index: 0 result, 1 notified, 2 understood, 3 booked, 4 attended,
// 5 confirmed, 6 referred, 7 care plan, 8 closed.
// [id, name, age, sex, nationality, language, HbA1c, days since result, stage index, barrier, owner, drop-out reason, works shifts]
const ROWS = [
  [1, 'Fatima Al Mansoori', 58, 'F', 'Emirati', 'ar', 8.1, 12, 1, 'dont_understand', 'n1', '', 0],
  [2, 'Rashid Al Nuaimi', 61, 'M', 'Emirati', 'ar', 6.9, 20, 7, 'none', 'd1', '', 0],
  [3, 'Priya Nair', 44, 'F', 'Indian', 'en', 6.1, 35, 1, 'time_shift', 'c1', 'Rotating shifts, cannot take time off', 1],
  [4, 'Joseph Mathew', 39, 'M', 'Filipino', 'en', 7.4, 16, 2, 'cost', 'c1', 'Worried about cost', 0],
  [5, 'Mohammed Iqbal', 52, 'M', 'Pakistani', 'ur', 11.2, 1, 1, 'fear', 'n1', '', 0],
  [6, 'Aisha Khan', 35, 'F', 'Pakistani', 'ur', 5.9, 10, 3, 'none', 'c2', '', 0],
  [7, 'Samuel Okoye', 47, 'M', 'Nigerian', 'en', 8.8, 25, 1, 'time_shift', 'n2', 'Night shifts, keeps missing slots', 1],
  [8, 'Maryam Al Kaabi', 66, 'F', 'Emirati', 'ar', 9.4, 9, 5, 'none', 'd1', '', 0],
  [9, 'Ahmed Hassan', 55, 'M', 'Egyptian', 'ar', 10.4, 3, 2, 'fear', 'n1', 'Afraid of the result', 0],
  [10, 'Lakshmi Devi', 50, 'F', 'Indian', 'hi', 7.1, 13, 3, 'language', 'c2', '', 0],
  [11, 'Khalid Al Dhaheri', 29, 'M', 'Emirati', 'ar', 5.8, 8, 2, 'none', 'c1', '', 0],
  [12, 'Noura Al Shamsi', 42, 'F', 'Emirati', 'ar', 6.3, 40, 8, 'none', 'd2', '', 0],
  [13, 'Ravi Kumar', 37, 'M', 'Indian', 'en', 6.6, 15, 1, 'dont_understand', 'c1', 'Did not understand the result', 0],
  [14, 'Elena Santos', 48, 'F', 'Filipino', 'en', 7.9, 6, 2, 'none', 'n2', '', 0],
  [15, 'Yusuf Ali', 63, 'M', 'Sudanese', 'ar', 9.1, 30, 6, 'none', 'd1', '', 0],
  [16, 'Hana Mahmoud', 31, 'F', 'Jordanian', 'ar', 6.0, 5, 1, 'none', 'c2', '', 0],
  [17, 'Daniel Tan', 45, 'M', 'Singaporean', 'en', 6.8, 18, 2, 'cost', 'c2', '', 0],
  [18, 'Zainab Al Marzouqi', 72, 'F', 'Emirati', 'ar', 10.8, 4, 1, 'dont_understand', 'n1', '', 0],
  [19, 'Omar Farouk', 57, 'M', 'Egyptian', 'ar', 7.7, 11, 6, 'time_shift', 'd2', '', 1],
  [20, 'Sneha Reddy', 33, 'F', 'Indian', 'en', 5.7, 22, 4, 'none', 'c2', '', 0],
  [21, 'Tariq Mahmood', 60, 'M', 'Pakistani', 'ur', 8.4, 28, 1, 'language', 'c1', 'Needs an Urdu-speaking nurse', 0],
  [22, 'Layla Haddad', 38, 'F', 'Lebanese', 'ar', 6.2, 3, 0, 'none', null, '', 0],
  [23, 'George Mensah', 54, 'M', 'Ghanaian', 'en', 7.2, 19, 2, 'time_shift', 'n2', 'Works two jobs', 1],
  [24, 'Shamma Al Ketbi', 49, 'F', 'Emirati', 'ar', 6.5, 14, 3, 'none', 'c2', '', 0],
  [25, 'Vikram Singh', 43, 'M', 'Indian', 'en', 12.1, 1, 0, 'none', null, '', 0],
  [26, 'Amal Youssef', 34, 'F', 'Syrian', 'ar', 6.4, 45, 8, 'none', 'd2', '', 0],
  [27, 'Chen Wei', 51, 'M', 'Chinese', 'en', 9.8, 21, 6, 'cost', 'd2', '', 0],
  [28, 'Nadia Rahman', 41, 'F', 'Bangladeshi', 'en', 7.0, 7, 2, 'language', 'c2', '', 0],
  [29, 'Hamdan Al Ameri', 68, 'M', 'Emirati', 'ar', 8.0, 50, 8, 'none', 'd1', '', 0],
  [30, 'Grace Wanjiru', 36, 'F', 'Kenyan', 'en', 6.7, 26, 0, 'none', 'c1', 'Could not be reached (phone number not working)', 0],
];

// Extra story for a few cases: referrals in different states, a hand-off, a question to a specialist, a waiting nurse call.
const REFERRALS = {
  19: { to: 'Hospital endocrinology', status: 'sent', ago: 3, reason: 'HbA1c 7.7% with symptoms; specialist review requested.' },
  15: { to: 'Hospital endocrinology', status: 'rejected', ago: 6, replyAgo: 5, by: 'e1', reason: 'HbA1c 9.1%, no repeat test yet; specialist advice on treatment.', reply: 'Please complete the repeat HbA1c and a kidney profile first, then resubmit.' },
  27: { to: 'Diabetes centre', status: 'accepted', ago: 5, replyAgo: 4, by: 'e2', reason: 'HbA1c 9.8%; needs structured diabetes education and review.', reply: '' },
};
const CONSULTS = { 18: { to: 'Hospital endocrinology', ago: 4, question: '72-year-old, HbA1c 10.8%, no treatment yet. Advice on how soon she should be seen?' } };
const NURSE_WAITING = { 5: 2 };       // days ago the patient asked for a nurse call (still waiting)
const PLAN_KIND = { 2: 'treatment', 12: 'surveillance', 26: 'surveillance', 29: 'treatment' };
// Some patients were notified or reached late (days of delay), so the measures show real-looking gaps.
const LATE = { 3: 4, 7: 5, 13: 3, 21: 4, 23: 3, 10: 2, 16: 2, 4: 3, 17: 2 };
const CHANNEL_BY_LANG = { ar: 'whatsapp', ur: 'sms', hi: 'sms', en: 'app' };

// Days after the result when each step happened (never later than "today").
const STEP_OFFSET = { notified: 0, understood: 1, booked: 3, attended: 9, confirmed: 9, referred: 10, care_plan: 11, closed: 12 };

export function buildState(today) {
  const staff = STAFF.map((s) => ({ ...s }));
  const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
  const cases = ROWS.map(([n, name, age, sex, nationality, language, value, ago, stageIdx, barrier, owner, dropReason, shifts]) => {
    const resultDay = addDays(today, -ago);
    const id = 'C-' + String(n).padStart(3, '0');
    const c = newCase({
      id, value, resultDay, owner,
      patient: { id: 'P-' + String(n).padStart(3, '0'), name, age, sex, nationality, language, shifts: !!shifts },
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
      if (stage === 'notified') { by = 'Jissr system'; role = 'system'; }
      else if (stage === 'understood' || stage === 'booked') { by = 'Patient (in app)'; role = 'patient'; }
      else if (stage === 'attended') { [by, role] = staffBy(byId[owner]); note = 'Seen in clinic'; }
      else if (stage === 'confirmed') { [by, role] = staffBy(clin); note = 'Repeat HbA1c confirms the first result'; }
      else if (stage === 'referred') {
        [by, role] = staffBy(clin);
        if (ref) note = `Referred to ${ref.to}: ${ref.reason}`;
        else { note = 'Not required: managed in primary care'; skipped = true; }
      } else if (stage === 'care_plan') {
        [by, role] = staffBy(clin);
        const kind = PLAN_KIND[n] || 'treatment';
        c.plan = { kind, at: addDays(resultDay, off) + 'T10:00:00.000Z', by };
        note = kind === 'surveillance' ? 'Surveillance plan agreed: lifestyle advice, re-test in 3 months' : 'Treatment plan agreed and started';
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
    if (stageIdx >= 3) { // patient-reported confidence (1 to 5), synthetic
      c.confidence = { score: ((n * 7) % 3) + 3, at: addDays(resultDay, Math.min(3, ago)) + 'T10:05:00.000Z' };
    }
    if (c.stage === 'closed') {
      const closer = clin;
      c.closed = {
        type: 'care_plan_agreed',
        evidence: c.plan && c.plan.kind === 'surveillance'
          ? 'Seen in clinic, repeat HbA1c confirmed, lifestyle plan given, re-test booked in 3 months.'
          : 'Seen in clinic, repeat HbA1c confirmed, treatment started, review booked in 3 months.',
        by: closer.name, at: addDays(resultDay, Math.min(STEP_OFFSET.closed, ago)) + 'T12:00:00.000Z',
      };
      c.events[c.events.length - 1].note = 'Treatment or surveillance plan agreed and started: ' + c.closed.evidence;
    }
    return c;
  });
  return { version: 2, today, staff, cases };
}
