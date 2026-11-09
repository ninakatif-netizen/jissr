// ROLE VIEWS: who uses Falaj across the health system, and what each one sees first.
// One shared case moves between organisations; each role opens the same engine with its own default list.
// (Demo: picking a role is not a login.)

export const ROLE_VIEWS = [
  {
    id: 'lab', icon: 'flask', as: 'c1', title: 'Laboratory', org: 'Lab result feed',
    part: 'Sends the abnormal result. The rules then set the urgency, the deadline and the owner.',
    filter: 'open', hide: ['today', 'funnel', 'cmd'],
  },
  {
    id: 'nurse', icon: 'phone', as: 'n1', title: 'Nurse navigator', org: 'Screening programme',
    part: 'Tells the patient, checks they understood, helps them book, runs the protocols.',
    filter: 'mine', hide: ['funnel'],
  },
  {
    id: 'gp', icon: 'doctor', as: 'd1', title: 'Family doctor', org: 'Primary care clinic',
    part: 'Confirms the result, refers if needed, agrees the plan, closes the case with evidence.',
    filter: 'gp', hide: ['funnel', 'cmd', 'alerts', 'newresult'],
  },
  {
    id: 'specialist', icon: 'inbox', as: 'e1', title: 'Hospital specialist', org: 'Hospital endocrinology',
    part: 'Accepts or rejects referrals, owns the case while it is with the hospital, reports back.',
    filter: 'inbox', hide: ['today', 'funnel', 'cmd', 'newresult'],
  },
  {
    id: 'lead', icon: 'shield', as: 'd2', title: 'Clinical lead', org: 'Primary care clinic',
    part: 'Acts on alerts: urgent results not yet told, overdue cases, referrals with no reply.',
    filter: 'attention', hide: ['funnel', 'mytasks', 'newresult'],
  },
  {
    id: 'programme', icon: 'chart', as: 'c1', title: 'Programme manager', org: 'Department of Health view',
    part: 'Sees the whole loop: where patients drop out, service levels and protocols, across all programmes.',
    filter: 'open', hide: ['today', 'newresult'],
  },
];
export const roleView = (id) => ROLE_VIEWS.find((v) => v.id === id) || null;

// Extra list filters used by the role views.
// gp: decisions a family doctor has to take. inbox: handshakes (referrals) and 2-minute consults sent to the specialist's organisation.
export function roleFilter(filter, c, actor) {
  if (filter === 'gp') return ['attended', 'confirmed', 'care_plan'].includes(c.stage) || (!!c.referral && c.referral.status === 'rejected');
  if (filter === 'inbox') return (!!c.referral && c.referral.to === actor.org && ['sent', 'accepted'].includes(c.referral.status))
    || (c.consults || []).some((q) => q.to === actor.org && !q.answer); // 2-minute consults waiting for this team
  return null; // not a role filter
}

// The roles that have a phone app (care.html). Lab and programme manager stay on the desktop dashboard.
export const CARE_ROLES = ['nurse', 'gp', 'specialist', 'lead'];
