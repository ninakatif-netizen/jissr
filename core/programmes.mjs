// SCREENING PROGRAMMES. One engine (owners, deadlines, alerts, evidence-based closing) for every programme.
// Only the content changes: the test, the words, the steps' names and where patients are referred.
import { STAGE_LABEL } from './rules.mjs';

export const PROGRAMMES = {
  hba1c: {
    id: 'hba1c', name: 'Diabetes screening (HbA1c)', short: 'Diabetes', test: 'HbA1c',
    referralTargets: ['Hospital endocrinology', 'Diabetes centre'],
    stageLabel: {},
  },
  fit: {
    id: 'fit', name: 'Bowel cancer screening (FIT)', short: 'Bowel', test: 'FIT',
    referralTargets: ['Colorectal clinic', 'Hospital oncology'],
    stageLabel: { booked: 'Colonoscopy booked', attended: 'Colonoscopy done', confirmed: 'Biopsy results reviewed', referred: 'Referral to specialist team' },
  },
};
export const progOf = (c) => PROGRAMMES[(c && c.programme) || 'hba1c'];
export const stageLabel = (c, s) => progOf(c).stageLabel[s] || STAGE_LABEL[s];
export const resultText = (c) => (c.programme === 'fit' ? 'FIT +' : `${c.value}%`);
export const targetsFor = (c) => progOf(c).referralTargets;
