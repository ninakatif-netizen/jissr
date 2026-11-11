// THE CARE PASSPORT: one object that follows the patient from the result to care.
// Five milestones, each stamped only when the right person records it in the case (who, role, when).
// It shows the journey, the owner and the next step. Never the result, never a diagnosis.
// In this demo it is computed from the case on this device; in a pilot the Falaj service would issue it,
// and opening it from a QR code would need authentication.
import { proofCode, proofUrl } from './proof.mjs';
import { progOf } from './programmes.mjs';
import { qrSvg } from './qr.mjs';

const L = {
  en: {
    brand: 'Falaj · Care Passport', title: 'Care Passport', pageT: 'Milestones of care', id: 'Passport ID', progress: 'In progress', closed: 'Loop closed',
    owner: 'Responsible', next: 'Next', recorded: 'Recorded by', waiting: 'Not yet', notNeeded: 'Not needed',
    m: ['Result communicated', 'Understanding confirmed', 'Referral accepted', 'Care delivered', 'Loop closed'],
    short: ['Result told', 'Understood', 'Referral accepted', 'Care delivered', 'Loop closed'],
    scan: 'Scan to check the journey. It never shows the result.', code: 'Check code', open: 'Open the passport',
    illus: 'Demo: real access would need sign-in and the patient’s permission.',
    nextOf: { understood: 'Confirm the patient understood', booked: 'Book the visit', attended: 'Doctor’s visit', confirmed: 'Confirmatory test', referred: 'Referral to a specialist', care_plan: 'Agree the care plan', closed: 'Close the loop, with evidence' },
  },
  ar: {
    brand: 'فلج · جواز الرعاية', title: 'جواز الرعاية', pageT: 'محطات الرعاية', id: 'رقم الجواز', progress: 'قيد التقدم', closed: 'اكتملت الحلقة',
    owner: 'المسؤول', next: 'التالي', recorded: 'سُجّل بواسطة', waiting: 'لم يتم بعد', notNeeded: 'غير مطلوب',
    m: ['إبلاغ النتيجة', 'تأكيد الفهم', 'قبول الإحالة', 'تقديم الرعاية', 'إغلاق الحلقة'],
    short: ['إبلاغ النتيجة', 'تأكيد الفهم', 'قبول الإحالة', 'تقديم الرعاية', 'إغلاق الحلقة'],
    scan: 'امسح الرمز للتحقق من مسار الرعاية. لا يُظهر النتيجة أبداً.', code: 'رمز التحقق', open: 'فتح الجواز',
    illus: 'نسخة تجريبية: الوصول الفعلي يتطلب تسجيل الدخول وإذن المريض.',
    nextOf: { understood: 'تأكيد فهم المريض', booked: 'حجز الموعد', attended: 'زيارة الطبيب', confirmed: 'فحص تأكيدي', referred: 'إحالة إلى أخصائي', care_plan: 'الاتفاق على خطة الرعاية', closed: 'إغلاق الحلقة مع الدليل' },
  },
};
const STAGES = ['result', 'notified', 'understood', 'booked', 'attended', 'confirmed', 'referred', 'care_plan', 'closed'];

export const passportId = (c) => `FLJ-${String(c.resultDay || '').slice(0, 4) || '2026'}-${String(c.id).replace(/\D/g, '').padStart(4, '0')}`;

// The five milestones. state: 'done' (with the event that proves it), 'na' (not needed for this case) or 'todo'.
export function milestones(c, lang = 'en') {
  const ev = (t, f = () => true) => (c.events || []).find((e) => e.type === t && f(e));
  const closed = ev('closed');
  const understood = ev('understood');
  // communicated means a person reached the patient, not that a message was sent
  const person = (e) => e && e.role !== 'system';
  const told = ev('contact', person) || (person(ev('notified')) ? ev('notified') : null) || (understood && person(understood) ? (understood.role === 'patient' ? { ...understood, by: lang === 'ar' ? 'قُرئت في تطبيق فلج' : 'Read in the Falaj app' } : understood) : null);
  const accepted = ev('referral_accepted');
  const care = ev('care_plan') || ev('referral_completed') || (closed && c.closed && c.closed.type === 'transferred_care' ? closed : null) || (closed ? ev('attended') : null);
  return [
    told ? ['done', told] : ['todo'],
    understood ? ['done', understood] : ['todo'],
    accepted ? ['done', accepted] : closed && !c.referral ? ['na'] : ['todo'],
    care ? ['done', care] : closed ? ['na'] : ['todo'],
    closed ? ['done', closed] : ['todo'],
  ];
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmtDay = (d, lang) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4 4 9-9.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let cssDone = false;
function ensureCss() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style');
  // The water-channel look: a light card; each milestone a node on a channel that fills with water when done.
  st.textContent = `
.cp{background:var(--card,#fff);color:var(--ink,#0a1f2e);border:1px solid var(--line,#e6dfd2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:12px;font-family:-apple-system,"SF Pro Text",system-ui,"Helvetica Neue",Arial,sans-serif;text-align:start}
.cp-t{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cp-brand{font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted,#56616b)}
.cp-st{font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;white-space:nowrap}
.cp-st.amber{background:#fbefdd;color:#7a4a0c}.cp-st.green{background:#e3f4ec;color:#0f5a3a}
.cp-name{font-size:20px;font-weight:700;line-height:1.2;margin:0}
.cp-sub{font-size:14px;color:var(--muted,#56616b);margin:2px 0 0}
.cp-id{font:600 12px ui-monospace,"SF Mono",Menlo,monospace;color:var(--muted,#56616b);letter-spacing:.4px}
.cp-stamps{list-style:none;margin:0;padding:0}
.cp-stamps li{position:relative;padding-inline-start:42px;padding-bottom:16px;min-height:30px;font-size:15px;line-height:1.35;color:var(--muted,#56616b)}
.cp-stamps li::before{content:"";position:absolute;inset-inline-start:13px;top:28px;bottom:0;width:4px;border-radius:2px;background:repeating-linear-gradient(180deg,#cbc3b4 0 5px,transparent 5px 10px)}
.cp-stamps li.done::before{background:linear-gradient(180deg,#0b6fa8,#36b5e8,#0b6fa8);background-size:100% 36px;animation:cpw 2.4s linear infinite}
.cp-stamps li:last-child{padding-bottom:0}.cp-stamps li:last-child::before{display:none}
@keyframes cpw{to{background-position:0 36px}}
.cp-s{position:absolute;inset-inline-start:0;top:0;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:2px dashed #b9ae98;color:#6b5a2e;font-weight:700;font-size:12px;background:var(--card,#fff)}
.cp-s svg{width:16px;height:16px}
.cp-stamps li.done{color:var(--ink,#0a1f2e)}
.cp-stamps li.done .cp-s{background:#0b6fa8;border:0;color:#fff}
.cp-stamps li.na .cp-s{border-style:solid;border-color:#cbc3b4;color:#6b5a2e}
.cp-stamps b{display:block;font-weight:600;padding-top:5px}
.cp-stamps small{display:block;font-size:13px;color:var(--muted,#56616b)}
.cp-stamps li.new .cp-s{animation:cpstamp .55s cubic-bezier(.2,.8,.2,1) both}
@keyframes cpstamp{0%{transform:scale(1.6);opacity:0}55%{transform:scale(.9);opacity:1}100%{transform:none}}
.cp-o{display:flex;flex-direction:column;gap:3px;font-size:14px;color:var(--ink2,#2c3e4c);border-top:1px solid var(--line,#e6dfd2);padding-top:10px}
.cp-o b{color:var(--ink,#0a1f2e);font-weight:600}
.cp-q{display:flex;gap:14px;align-items:center;background:var(--bg,#f6f2ea);color:var(--ink,#0a1f2e);border-radius:14px;padding:12px}
.cp-q .qr{border-radius:6px;flex:none}
.cp-q b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted,#56616b)}
.cp-q code{display:block;font:600 16px ui-monospace,"SF Mono",Menlo,monospace;margin:2px 0 4px}
.cp-q small{display:block;font-size:13px;line-height:1.35;color:var(--ink2,#2c3e4c)}
.cp-q a{display:inline-flex;align-items:center;min-height:44px;font-size:15px;font-weight:600;color:var(--tint,#0b5e8f)}
.cp-illus{font-size:12px;color:var(--muted,#56616b);margin:0}
.cp.compact{padding:12px 14px;gap:10px}
.cp.compact .cp-stamps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}
.cp.compact .cp-stamps li{padding:0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;font-size:11px;line-height:1.2}
.cp.compact .cp-stamps li::before{inset-inline-start:calc(50% + 15px);top:13px;bottom:auto;width:calc(100% - 30px);height:4px;background:repeating-linear-gradient(90deg,#cbc3b4 0 5px,transparent 5px 10px)}
.cp.compact .cp-stamps li.done::before{background:linear-gradient(90deg,#0b6fa8,#36b5e8,#0b6fa8);background-size:36px 100%;animation:cpwh 2.4s linear infinite}
[dir=rtl] .cp.compact .cp-stamps li.done::before{animation-direction:reverse}
@keyframes cpwh{to{background-position:36px 0}}
.cp.compact .cp-s{position:static}
.cp.compact .cp-stamps li.done{font-weight:600}
@media (prefers-reduced-motion:reduce){.cp-stamps li.new .cp-s,.cp-stamps li.done::before{animation:none}}`;
  document.head.appendChild(st);
}

// passportHtml(c, opts): the Care Passport. opts: lang, staff (to name the owner), compact, qr, origin, link (href of the
// QR link), fresh (indexes of milestones just reached, to animate), hideOwner, and story overrides: owner, next, status, tone.
export function passportHtml(c, opts = {}) {
  ensureCss();
  const lang = opts.lang === 'ar' ? 'ar' : 'en', t = L[lang];
  const ms = milestones(c, lang), fresh = new Set(opts.fresh || []);
  const closed = c.stage === 'closed';
  const status = opts.status || (closed ? t.closed : t.progress), tone = opts.tone || (closed ? 'green' : 'amber');
  const parts = (c.patient && c.patient.name ? c.patient.name : '').split(' ');
  const who = `${parts[0] || ''}${parts.length > 1 ? ' ' + parts[parts.length - 1][0] + '.' : ''}`;
  const prog = progOf(c);
  const sub = [prog && (lang === 'ar' && prog.nameAr ? prog.nameAr : prog.name), c.referral && c.referral.to].filter(Boolean).join(' · ');
  const ownerName = opts.owner || (((opts.staff || []).find((s) => s.id === c.owner) || {}).name || '').replace(/\s*\(coordinator\)/, '');
  const nextStage = STAGES[STAGES.indexOf(c.stage) + 1];
  const next = opts.next || (closed ? '' : t.nextOf[nextStage] || '');
  const label = ms.map(([st], i) => `${t.m[i]}: ${st === 'done' ? '✓' : st === 'na' ? t.notNeeded : t.waiting}`).join('; ');
  const ownerNext = !opts.hideOwner && (ownerName || next) ? `<div class="cp-o">${ownerName ? `<span>${t.owner}: <b>${esc(ownerName)}</b></span>` : ''}${next ? `<span>${t.next}: <b>${esc(next)}</b></span>` : ''}</div>` : '';
  const node = (st, i) => `<span class="cp-s" aria-hidden="true">${st === 'done' ? CHECK : st === 'na' ? '–' : i + 1}</span>`;
  if (opts.compact) {
    return `<section class="cp compact" aria-label="${esc(t.brand)}"><div class="cp-t"><span class="cp-brand">${esc(t.brand)}</span><span class="cp-st ${tone}">${esc(status)}</span></div>
      <ol class="cp-stamps" aria-label="${esc(label)}">${ms.map(([st], i) => `<li class="${st}${fresh.has(i) ? ' new' : ''}">${node(st, i)}${t.short[i]}</li>`).join('')}</ol>${ownerNext}</section>`;
  }
  let h = `<section class="cp" aria-label="${esc(t.brand)}"><div class="cp-t"><span class="cp-brand">${esc(t.brand)}</span><span class="cp-st ${tone}">${esc(status)}</span></div>
    <div><p class="cp-name"><bdi>${esc(who)}</bdi></p><p class="cp-sub">${esc(sub)}</p><div class="cp-id" dir="ltr">${t.id} ${passportId(c)}</div></div>
    <ol class="cp-stamps" aria-label="${esc(label)}">${ms.map(([st, e], i) => `<li class="${st}${fresh.has(i) ? ' new' : ''}">${node(st, i)}<b>${t.m[i]}</b><small>${st === 'done' ? `${esc(e.by)} · ${fmtDay(e.at.slice(0, 10), lang)}` : st === 'na' ? t.notNeeded : t.waiting}</small></li>`).join('')}</ol>${ownerNext}`;
  if (opts.qr && closed) {
    const code = proofCode(c), url = proofUrl(c, opts.origin || (typeof location !== 'undefined' ? location.origin : ''));
    h += `<div class="cp-q">${qrSvg(url, { size: 112, label: `${t.brand} ${code}` })}<span><b>${t.code}</b><code dir="ltr">${code}</code><small>${t.scan}</small>${opts.link ? `<a href="${esc(opts.link === true ? url : opts.link)}" id="openproof">${t.open}</a>` : ''}</span></div>
      <p class="cp-illus">${t.illus}</p>`;
  }
  return h + '</section>';
}
