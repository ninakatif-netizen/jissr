// PROOF OF CARE: the receipt a patient keeps when a case is closed with evidence.
// The verification code is derived from the case and its closure, so the same receipt always has the
// same code. In this demo it is checked against the demo data on the device; in a pilot it would be
// checked by the Falaj service (the patient's consent is needed to share it).

const closedEvent = (c) => (c.events || []).find((e) => e.type === 'closed');

export function proofCode(c) {
  const ev = closedEvent(c);
  const seed = `${c.id}|${c.programme || 'hba1c'}|${ev ? ev.by : ''}`;
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const b = h.toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return `FLJ-${b.slice(0, 4)}-${b.slice(4, 8)}`;
}

export const PROOF_STEPS = ['notified', 'understood', 'booked', 'attended', 'confirmed', 'referred', 'care_plan', 'closed'];

// The link encoded in the receipt's QR code.
export const proofUrl = (c, origin) => `${origin}/verify.html?c=${encodeURIComponent(c.id)}&code=${proofCode(c)}`;

// What a verifier may see: the steps, their dates and who did them. Never the result.
export function verifyProof(state, id, code) {
  const c = state.cases.find((x) => x.id === id);
  if (!c) return { ok: false, why: 'No case with this reference.' };
  if (c.stage !== 'closed') return { ok: false, why: 'This case is not closed yet.' };
  if (proofCode(c) !== String(code || '').toUpperCase()) return { ok: false, why: 'The code does not match this case.' };
  const steps = PROOF_STEPS.map((k) => [k, [...c.events].reverse().find((e) => e.type === k)]).filter(([, e]) => e)
    .map(([k, e]) => ({ step: k, day: e.at.slice(0, 10), by: e.by }));
  const parts = c.patient.name.split(' ');
  return { ok: true, who: `${parts[0]} ${parts.length > 1 ? parts[parts.length - 1][0] + '.' : ''}`.trim(), programme: c.programme || 'hba1c', steps };
}
