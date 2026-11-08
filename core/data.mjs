// SYNTHETIC DATA ONLY. Every name, age and result below is invented. No real patient is represented.
// Dates are generated relative to "today" so the overdue flags are always realistic when you demo.

import { STAGES, addDays } from './rules.mjs';
import { newCase } from './cases.mjs';

export const STAFF = [
  { id: 'n1', name: 'Nurse Huda Al Ali', role: 'nurse' },
  { id: 'n2', name: 'Nurse Peter Dsouza', role: 'nurse' },
  { id: 'c1', name: 'Sara Khan (coordinator)', role: 'coordinator' },
  { id: 'c2', name: 'Omar Said (coordinator)', role: 'coordinator' },
  { id: 'd1', name: 'Dr Mariam Al Hosani', role: 'clinician' },
  { id: 'd2', name: 'Dr Arjun Menon', role: 'clinician' },
];

// [id, name, age, sex, nationality, language, HbA1c, days since result, stage index, barrier, owner, drop-out reason, works shifts]
const ROWS = [
  [1, 'Fatima Al Mansoori', 58, 'F', 'Emirati', 'ar', 8.1, 12, 1, 'dont_understand', 'n1', '', 0],
  [2, 'Rashid Al Nuaimi', 61, 'M', 'Emirati', 'ar', 6.9, 20, 5, 'none', 'd1', '', 0],
  [3, 'Priya Nair', 44, 'F', 'Indian', 'en', 6.1, 35, 1, 'time_shift', 'c1', 'Rotating shifts, cannot take time off', 1],
  [4, 'Joseph Mathew', 39, 'M', 'Filipino', 'en', 7.4, 16, 2, 'cost', 'c1', 'Worried about cost', 0],
  [5, 'Mohammed Iqbal', 52, 'M', 'Pakistani', 'ur', 11.2, 1, 1, 'fear', 'n1', '', 0],
  [6, 'Aisha Khan', 35, 'F', 'Pakistani', 'ur', 5.9, 10, 3, 'none', 'c2', '', 0],
  [7, 'Samuel Okoye', 47, 'M', 'Nigerian', 'en', 8.8, 25, 1, 'time_shift', 'n2', 'Night shifts, keeps missing slots', 1],
  [8, 'Maryam Al Kaabi', 66, 'F', 'Emirati', 'ar', 9.4, 9, 4, 'none', 'd1', '', 0],
  [9, 'Ahmed Hassan', 55, 'M', 'Egyptian', 'ar', 10.4, 3, 2, 'fear', 'n1', 'Afraid of the result', 0],
  [10, 'Lakshmi Devi', 50, 'F', 'Indian', 'hi', 7.1, 13, 3, 'language', 'c2', '', 0],
  [11, 'Khalid Al Dhaheri', 29, 'M', 'Emirati', 'ar', 5.8, 8, 2, 'none', 'c1', '', 0],
  [12, 'Noura Al Shamsi', 42, 'F', 'Emirati', 'ar', 6.3, 40, 6, 'none', 'd2', '', 0],
  [13, 'Ravi Kumar', 37, 'M', 'Indian', 'en', 6.6, 15, 1, 'dont_understand', 'c1', 'Did not understand the result', 0],
  [14, 'Elena Santos', 48, 'F', 'Filipino', 'en', 7.9, 6, 2, 'none', 'n2', '', 0],
  [15, 'Yusuf Ali', 63, 'M', 'Sudanese', 'ar', 9.1, 30, 5, 'none', 'd1', '', 0],
  [16, 'Hana Mahmoud', 31, 'F', 'Jordanian', 'ar', 6.0, 5, 1, 'none', 'c2', '', 0],
  [17, 'Daniel Tan', 45, 'M', 'Singaporean', 'en', 6.8, 18, 2, 'cost', 'c2', '', 0],
  [18, 'Zainab Al Marzouqi', 72, 'F', 'Emirati', 'ar', 10.8, 2, 1, 'dont_understand', 'n1', '', 0],
  [19, 'Omar Farouk', 57, 'M', 'Egyptian', 'ar', 7.7, 11, 3, 'time_shift', 'c1', '', 1],
  [20, 'Sneha Reddy', 33, 'F', 'Indian', 'en', 5.7, 22, 4, 'none', 'c2', '', 0],
  [21, 'Tariq Mahmood', 60, 'M', 'Pakistani', 'ur', 8.4, 28, 1, 'language', 'c1', 'Needs an Urdu-speaking nurse', 0],
  [22, 'Layla Haddad', 38, 'F', 'Lebanese', 'ar', 6.2, 3, 0, 'none', 'c2', '', 0],
  [23, 'George Mensah', 54, 'M', 'Ghanaian', 'en', 7.2, 19, 2, 'time_shift', 'n2', 'Works two jobs', 1],
  [24, 'Shamma Al Ketbi', 49, 'F', 'Emirati', 'ar', 6.5, 14, 3, 'none', 'c2', '', 0],
  [25, 'Vikram Singh', 43, 'M', 'Indian', 'en', 12.1, 0, 0, 'none', 'n2', '', 0],
  [26, 'Amal Youssef', 34, 'F', 'Syrian', 'ar', 6.4, 45, 6, 'none', 'd2', '', 0],
  [27, 'Chen Wei', 51, 'M', 'Chinese', 'en', 9.8, 21, 3, 'cost', 'c1', '', 0],
  [28, 'Nadia Rahman', 41, 'F', 'Bangladeshi', 'en', 7.0, 7, 2, 'language', 'c2', '', 0],
  [29, 'Hamdan Al Ameri', 68, 'M', 'Emirati', 'ar', 8.0, 50, 6, 'none', 'd1', '', 0],
  [30, 'Grace Wanjiru', 36, 'F', 'Kenyan', 'en', 6.7, 26, 0, 'none', 'c1', 'Could not be reached (phone number not working)', 0],
];

// Days after the result when each step happened (never later than "today").
const STEP_OFFSET = { notified: 0, understood: 1, booked: 3, attended: 9, care_plan: 9, closed: 10 };
const STEP_BY = {
  notified: ['Jissr system', 'system'],
  understood: ['Patient (in app)', 'patient'],
  booked: ['Patient (in app)', 'patient'],
};

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
    for (let i = 1; i <= stageIdx; i++) {
      const stage = STAGES[i];
      const off = Math.min(STEP_OFFSET[stage], ago);
      const [by, role] = STEP_BY[stage] || [byId[owner].name, byId[owner].role];
      const note = stage === 'care_plan' ? 'Care plan agreed with patient' : stage === 'attended' ? 'Seen in clinic' : '';
      c.events.push({ type: stage, at: addDays(resultDay, off) + 'T10:00:00.000Z', by, role, note });
      c.stage = stage;
    }
    if (c.stage === 'closed') {
      c.closed = {
        type: 'care_plan_agreed',
        evidence: 'Seen in clinic, repeat HbA1c ordered, diet and activity plan agreed, review booked in 3 months.',
        by: byId[owner].name, at: addDays(resultDay, Math.min(STEP_OFFSET.closed, ago)) + 'T12:00:00.000Z',
      };
      c.events[c.events.length - 1].note = 'Care plan agreed and started: ' + c.closed.evidence;
    }
    if (n === 1) { // Fatima: her patient-app journey is a live demo, so no nurse request yet
      c.familyHelper = null;
    }
    return c;
  });
  return { version: 1, today, staff, cases };
}
