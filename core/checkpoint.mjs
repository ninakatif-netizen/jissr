// THE LINK BETWEEN THE FALAJ AND THE HEALTH ID: opening a file is also a checkpoint.
// 1. After a clinician opens a patient's file with their Health ID, Falaj shows the open step they can record
//    (a visit, or a referral sent to them). One tap by the clinician: opening a file is never care by itself.
// 2. A watch for results that never arrive: the programme knows who was tested; if no result comes within the
//    expected time, the test is flagged. (The list below is invented for the demo; the times are proposals.)
import { canRecord, advance, respondReferral } from './cases.mjs';
import { addDays } from './rules.mjs';

const actorOf = (s) => ({ type: 'staff', id: s.id, role: s.role, name: s.name, org: s.org });
const first = (c) => c.patient.name.split(' ')[0];

export function checkpointFor(c, staff) {
  if (!c || !staff || c.stage === 'closed') return null;
  const a = actorOf(staff), r = c.referral;
  if (r && r.status === 'sent' && staff.role === 'clinician' && staff.org === r.to)
    return { kind: 'accept', title: `${first(c)} was referred to you`, text: `By the family doctor, to ${r.to}. If you accept, you become responsible for ${first(c)}.`, button: 'Accept the referral' };
  if (c.stage === 'booked' && canRecord('attended', a))
    return { kind: 'attended', title: `Is ${first(c)} here for the visit?`, text: c.slot ? `A visit is booked for ${c.slot.day}, ${c.slot.time}. Recording it moves ${first(c)}'s falaj to "Seen".` : `Recording it moves ${first(c)}'s falaj to "Seen".`, button: 'Record this visit' };
  return null;
}
export function doCheckpoint(state, c, staff) {
  const cp = checkpointFor(c, staff); if (!cp) return null;
  const a = actorOf(staff);
  if (cp.kind === 'accept') respondReferral(state, c.id, a, { accept: true, note: 'Accepted after opening the file with the patient\'s Health ID' });
  else advance(state, c.id, 'attended', a, 'Seen: recorded at the visit, after opening the file with the patient\'s Health ID');
  return cp;
}

// ---- tests done, no result yet ----
export const EXPECTED_DAYS = { mammo: 5, fit: 7, hba1c: 2 };   // proposals for a clinician to confirm
const TEST = { mammo: 'Mammogram', fit: 'Bowel test (FIT)', hba1c: 'HbA1c' };
const WAITING = [   // [id, name, age, programme, where it was done, days since the test]
  ['T-101', 'Huda Saleh', 54, 'mammo', 'Imaging Centre D', 9],
  ['T-102', 'Imran Sheikh', 61, 'fit', 'Screening Unit B', 11],
  ['T-103', 'Maria Lopez', 45, 'hba1c', 'Family Clinic A', 1],
  ['T-104', 'Noor Al Zaabi', 50, 'mammo', 'Imaging Centre D', 4],
];
export function missingResults(today, asked = {}) {
  return WAITING.map(([id, name, age, programme, lab, ago]) => ({ id, name, age, programme, test: TEST[programme], lab, doneDay: addDays(today, -ago), ago, expected: EXPECTED_DAYS[programme], late: ago - EXPECTED_DAYS[programme], asked: asked[id] || null }))
    .filter((x) => x.late > 0).sort((a, b) => b.late - a.late);
}
export function askLab(state, id, staff, at = new Date().toISOString()) {
  state.labAsks = state.labAsks || {};
  state.labAsks[id] = { at, by: staff.name };
  return state.labAsks[id];
}
