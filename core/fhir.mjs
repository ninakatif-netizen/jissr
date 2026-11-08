// FHIR-READY EXPORT (demo). Shows how a Jissr case maps to standard HL7 FHIR R4 resources, so it could
// plug into hospital systems and Malaffi later. It is shaped to FHIR R4 but has NOT been checked with the
// official FHIR validator, and it is synthetic data only. No AI-written text is included.
//
//   Patient          the person (synthetic)
//   Observation      the HbA1c result (LOINC 4548-4)
//   Practitioner     the case owner
//   Organization     the receiving provider, if referred
//   Task             "follow up this actionable result": owner, due date, status, journey stage
//   ServiceRequest   the referral to a specialist, if any

import { STAGE_LABEL } from './rules.mjs';

const SYNTH = { system: 'https://jissr.example/synthetic', code: 'SYNTHETIC', display: 'Synthetic demo data, not real' };
const meta = () => ({ tag: [SYNTH] });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const TASK_STATUS = (c) => (c.stage === 'closed' ? 'completed' : c.stage === 'result' ? 'requested' : 'in-progress');
const REFERRAL_STATUS = { sent: 'active', accepted: 'active', rejected: 'revoked', completed: 'completed', cancelled: 'revoked' };
const PRIORITY = { urgent: 'urgent', priority: 'routine', routine: 'routine' };

export function caseToFhirBundle(c, staff = []) {
  const pid = `pat-${c.patient.id}`;
  const entries = [];
  const add = (resource) => entries.push({ fullUrl: `urn:uuid:${resource.resourceType}-${resource.id}`, resource });

  add({
    resourceType: 'Patient', id: pid, meta: meta(),
    name: [{ text: c.patient.name }],
    gender: c.patient.sex === 'F' ? 'female' : c.patient.sex === 'M' ? 'male' : 'unknown',
    communication: [{ language: { coding: [{ system: 'urn:ietf:bcp:47', code: c.patient.language }] }, preferred: true }],
  });

  add({
    resourceType: 'Observation', id: `obs-${c.id}`, meta: meta(), status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' }] },
    subject: { reference: `Patient/${pid}` },
    effectiveDateTime: c.resultDay,
    valueQuantity: { value: c.value, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
    interpretation: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: c.band === 'urgent' ? 'HH' : 'H' }] }],
  });

  const owner = c.owner && staff.find((s) => s.id === c.owner);
  if (owner) add({ resourceType: 'Practitioner', id: `prac-${owner.id}`, meta: meta(), name: [{ text: owner.name }] });

  const r = c.referral;
  if (r) {
    const orgId = `org-${slug(r.to)}`;
    add({ resourceType: 'Organization', id: orgId, meta: meta(), name: r.to });
    add({
      resourceType: 'ServiceRequest', id: `ref-${c.id}`, meta: meta(),
      status: REFERRAL_STATUS[r.status] || 'unknown', intent: 'order',
      priority: PRIORITY[c.urgency] || 'routine',
      code: { text: 'Referral for specialist review of raised HbA1c' },
      subject: { reference: `Patient/${pid}` },
      performer: [{ reference: `Organization/${orgId}` }],
      authoredOn: r.sentAt,
      reasonReference: [{ reference: `Observation/obs-${c.id}` }],
      note: [{ text: r.reason }, ...(r.note ? [{ text: 'Reply: ' + r.note }] : [])],
    });
  }

  add({
    resourceType: 'Task', id: `task-${c.id}`, meta: meta(),
    status: TASK_STATUS(c), intent: 'order', priority: PRIORITY[c.urgency] || 'routine',
    description: 'Follow up an actionable screening result until care is received and the case is closed with evidence',
    businessStatus: { text: STAGE_LABEL[c.stage] },
    focus: { reference: `Observation/obs-${c.id}` },
    for: { reference: `Patient/${pid}` },
    ...(owner ? { owner: { reference: `Practitioner/prac-${owner.id}` } } : {}),
    restriction: { period: { end: c.due } },
    ...(c.closed ? { statusReason: { text: c.closed.evidence } } : {}),
    extension: [
      { url: 'https://jissr.example/StructureDefinition/hba1c-band', valueCode: c.band },
      ...(owner ? [] : [{ url: 'https://jissr.example/StructureDefinition/unassigned', valueBoolean: true }]),
    ],
  });

  return { resourceType: 'Bundle', type: 'collection', meta: meta(), timestamp: new Date().toISOString(), entry: entries };
}
