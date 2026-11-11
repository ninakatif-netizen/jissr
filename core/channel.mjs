// THE PATIENT'S CHANNEL: where the water is for one patient. The same seven channels as the falaj, with the date
// each one was reached, the keeper (the named owner) and the next checkpoint (deadline from the rules).
// Never shows the result.
import { CHANNELS, levelOf } from './flow.mjs';
import { slaDeadline, isOverdue } from './rules.mjs';

const LABEL = {
  en: ['Result', 'Reached', 'Understood', 'Booked', 'Seen', 'Next step', 'Loop closed'],
  ar: ['النتيجة', 'تم التواصل', 'الفهم', 'الحجز', 'الزيارة', 'الخطوة التالية', 'إغلاق الحلقة'],
};
const T = {
  en: { keeper: 'Keeper', next: 'Next checkpoint', by: 'by', late: 'overdue', closed: 'The water reached the palm: loop closed.', aria: 'Where the water is' },
  ar: { keeper: 'المسؤول', next: 'نقطة التحقق التالية', by: 'قبل', late: 'متأخر', closed: 'وصل الماء إلى النخلة: اكتملت الحلقة.', aria: 'أين وصل الماء' },
};
// the event that proves each channel was reached
const PROOF = [['result'], ['contact', 'understood'], ['understood'], ['booked'], ['attended'], ['referral_accepted', 'care_plan', 'referred'], ['closed']];
const SLA_STEP = { 1: 'notified', 2: 'understood', 3: 'booked', 4: 'attended' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = (d, lang) => new Date(d + 'T00:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
.wc{background:var(--card,#fff);color:var(--ink,#0a1f2e);border:1px solid var(--line,#e6dfd2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:12px;font-family:-apple-system,"SF Pro Text",system-ui,"Helvetica Neue",Arial,sans-serif;text-align:start}
.wc-steps{list-style:none;margin:0;padding:0}
.wc-steps li{position:relative;padding-inline-start:38px;padding-bottom:12px;min-height:26px;font-size:15px;line-height:1.3;color:var(--muted,#56616b)}
.wc-steps li::before{content:"";position:absolute;inset-inline-start:11px;top:24px;bottom:0;width:4px;border-radius:2px;background:repeating-linear-gradient(180deg,#cbc3b4 0 5px,transparent 5px 10px)}
.wc-steps li.done::before{background:linear-gradient(180deg,#0b6fa8,#36b5e8,#0b6fa8);background-size:100% 36px;animation:wcw 2.4s linear infinite}
.wc-steps li:last-child{padding-bottom:0}.wc-steps li:last-child::before{display:none}
@keyframes wcw{to{background-position:0 36px}}
.wc-n{position:absolute;inset-inline-start:0;top:0;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:2px dashed #b9ae98;background:var(--card,#fff)}
.wc-steps li.done{color:var(--ink,#0a1f2e)}
.wc-steps li.done .wc-n{background:#0b6fa8;border:0}
.wc-steps li.done .wc-n::after{content:"";width:8px;height:8px;border-radius:50%;background:#fff}
.wc-steps li.now .wc-n{border:2.5px solid #0b6fa8;animation:wcp 1.8s ease-out infinite}
.wc-steps li.now.late .wc-n{border-color:#d98a1c}
.wc-steps li.last.done .wc-n{background:#1a7f52}
@keyframes wcp{0%{box-shadow:0 0 0 0 rgba(11,111,168,.35)}100%{box-shadow:0 0 0 10px rgba(11,111,168,0)}}
.wc-steps b{display:block;font-weight:600;padding-top:3px}
.wc-steps li:not(.done):not(.now) b{font-weight:500}
.wc-steps small{display:block;font-size:13px;color:var(--muted,#56616b)}
.wc-steps li.now small{color:var(--ink2,#2c3e4c)}.wc-steps li.now.late small{color:#7a4a0c;font-weight:600}
.wc-o{display:flex;flex-direction:column;gap:3px;font-size:14px;color:var(--ink2,#2c3e4c);border-top:1px solid var(--line,#e6dfd2);padding-top:10px}
.wc-o b{color:var(--ink,#0a1f2e);font-weight:600}
.wc-o .late{color:#7a4a0c;font-weight:700}
.wc.compact{padding:12px 12px;gap:10px}
.wc.compact .wc-steps{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.wc.compact .wc-steps li{padding:0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;font-size:10.5px;line-height:1.15;min-height:0}
.wc.compact .wc-steps li::before{inset-inline-start:calc(50% + 12px);top:11px;bottom:auto;width:calc(100% - 24px);height:4px;background:repeating-linear-gradient(90deg,#cbc3b4 0 5px,transparent 5px 10px)}
.wc.compact .wc-steps li.done::before{background:linear-gradient(90deg,#0b6fa8,#36b5e8,#0b6fa8);background-size:36px 100%;animation:wcwh 2.4s linear infinite}
@keyframes wcwh{to{background-position:36px 0}}
.wc.compact .wc-n{position:static;width:24px;height:24px}
.wc.compact b{padding:0;font-weight:600;white-space:nowrap}
.wc.compact li:not(.now) b{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.wc.compact li.now b{color:var(--tint,#0b5e8f)}
.wc.compact small{display:none}
@media (prefers-reduced-motion:reduce){.wc-steps li.done::before,.wc-steps li.now .wc-n{animation:none}}`;
  document.head.appendChild(st);
}

// channelHtml(c, opts): opts.compact, opts.lang, opts.staff (to name the keeper), opts.owner / opts.next (story overrides),
// opts.today (to flag an overdue checkpoint), opts.title (an optional heading line).
export function channelHtml(c, opts = {}) {
  css();
  const lang = opts.lang === 'ar' ? 'ar' : 'en', t = T[lang], L = LABEL[lang];
  const level = levelOf(c), closed = c.stage === 'closed';
  const ev = (types) => [...(c.events || [])].filter((e) => types.includes(e.type) && !(e.type === 'contact' && e.role === 'system'))[0];
  const nowI = closed ? -1 : level + 1;
  const dl = nowI > 0 ? (SLA_STEP[nowI] ? slaDeadline(c, SLA_STEP[nowI]) : null) || c.due : null;
  const late = !!(dl && opts.today && opts.today > dl) || (opts.today && isOverdue(c, opts.today) && nowI > 0);
  const keeper = opts.owner || (((opts.staff || []).find((s) => s.id === c.owner) || {}).name || '').replace(/\s*\(coordinator\)/, '');
  const items = CHANNELS.map((ch, i) => {
    const done = i <= level, e = done ? ev(PROOF[i]) : null;
    const cls = [done ? 'done' : i === nowI ? 'now' : '', i === nowI && late ? 'late' : '', i === CHANNELS.length - 1 ? 'last' : ''].filter(Boolean).join(' ');
    const sub = done && e ? `${esc(String(e.by || '').replace(/\s*\(coordinator\)/, ''))} · ${fmt(e.at.slice(0, 10), lang)}` : i === nowI && dl ? `${t.by} ${fmt(dl, lang)}${late ? ` · ${t.late}` : ''}` : '';
    return `<li class="${cls}"${i === nowI ? ' aria-current="step"' : ''}><span class="wc-n" aria-hidden="true"></span><b>${L[i]}</b>${sub ? `<small>${sub}</small>` : ''}</li>`;
  }).join('');
  const nextLabel = opts.next || (nowI > 0 ? `${L[nowI]}${dl ? ` ${t.by} ${fmt(dl, lang)}` : ''}` : '');
  const foot = closed ? `<div class="wc-o"><span>${t.closed}</span></div>`
    : (keeper || nextLabel) ? `<div class="wc-o">${keeper ? `<span>${t.keeper}: <b>${esc(keeper)}</b></span>` : ''}${nextLabel ? `<span>${t.next}: <b class="${late && !opts.next ? 'late' : ''}">${esc(nextLabel)}${late && !opts.next ? ` · ${t.late}` : ''}</b></span>` : ''}</div>` : '';
  return `<section class="wc${opts.compact ? ' compact' : ''}" aria-label="${t.aria}">${opts.title ? `<b style="font-size:13px;letter-spacing:.4px;text-transform:uppercase;color:var(--muted,#56616b)">${esc(opts.title)}</b>` : ''}<ol class="wc-steps">${items}</ol>${foot}</section>`;
}
