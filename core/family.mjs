// FAMILY HELPER: a patient invites one person (by WhatsApp or SMS) to help with appointments.
// Both must agree: the patient chooses and consents, the helper accepts. The helper sees only the steps,
// the appointment and how to help. Never the result, the diagnosis or the messages with the nurse.
// In this demo the invitation link carries a code computed from the case and the helper's name (never the
// phone number), so it opens on any phone; in a pilot the Falaj service would issue, check and revoke it.
import { journeyStep } from './rules.mjs';

// UAE mobile numbers: 05x xxx xxxx, 5x xxx xxxx, +971 5x xxx xxxx or 00971 5x xxx xxxx.
export function normaliseUaeMobile(raw) {
  const d = String(raw || '').replace(/[\s\-().]/g, '');
  const m = d.match(/^(?:\+971|00971|0)?(5\d{8})$/);
  return m ? '+971' + m[1] : null;
}
export const maskPhone = (p) => (p ? p.slice(0, 6) + ' ••• ' + p.slice(-4) : '');

export function familyToken(caseId, helper) {
  let h = 2166136261;
  for (const ch of `${caseId}|${helper.name}|falaj-family`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h.toString(36).toUpperCase().padStart(7, '0');
}
export const familyUrl = (caseId, helper, origin) =>
  `${origin}/family.html?c=${encodeURIComponent(caseId)}&n=${encodeURIComponent(helper.name)}&t=${familyToken(caseId, helper)}`;

// The text the helper receives. It never mentions the result.
export const inviteText = (lang, patientFirst, helperName, url) => lang === 'ar'
  ? `مرحباً ${helperName}، تمت دعوتك من قِبل ${patientFirst} للمساعدة في مواعيد ${patientFirst} الصحية عبر تطبيق فلج. سترى المواعيد والتذكيرات فقط، ولن ترى أي نتيجة أبداً. افتح الرابط: ${url}`
  : `Hello ${helperName}, ${patientFirst} has invited you to help with ${patientFirst}'s health appointments on Falaj. You will see appointment dates and reminders, never any result. Open: ${url}`;

// What the helper may see. Checks the code; uses the patient's own revocation if this browser knows it.
export function familyStatus(state, caseId, name, token) {
  const c = state.cases.find((x) => x.id === caseId);
  if (!c) return { ok: false, why: 'This invitation is not valid.' };
  const helper = { name };
  if (familyToken(caseId, helper) !== String(token || '').toUpperCase()) return { ok: false, why: 'This invitation is not valid.' };
  const fh = c.familyHelper;
  if (fh && fh.revoked && fh.token === token) return { ok: false, why: 'The patient has stopped sharing with you.' };
  return {
    ok: true, caseId: c.id, patientFirst: c.patient.name.split(' ')[0], helperName: name,
    step: journeyStep(c), stage: c.stage, programme: c.programme || 'hba1c',
    slot: c.slot || null, due: c.due || null, owner: c.owner || null,
    accepted: !!(fh && fh.token === token && fh.accepted),
  };
}
