// THE FALAJ FLOW: patients flow like water through the channels of care. Each channel is as wide as the
// number of patients who reached it; the ones who stopped leave in a branch below ("where the water stops").
// Computed from the cases only, by fixed rules. Rendered as an SVG (decorative for screen readers: the same
// numbers are given as buttons next to it).
import { STAGES, isOverdue } from './rules.mjs';

const idx = (c) => STAGES.indexOf(c.stage);
const reached = (c) => idx(c) >= 2 || (c.events || []).some((e) => (e.type === 'contact' && e.role !== 'system') || e.type === 'understood');
const nextAgreed = (c) => c.stage === 'closed' || idx(c) >= 7 || (idx(c) >= 6 && (!c.referral || ['accepted', 'completed'].includes(c.referral.status)));

export const CHANNELS = [
  { k: 'results', label: 'Results', test: () => true },
  { k: 'reached', label: 'Reached', test: reached, leak: 'Not reached yet', act: 'Call' },
  { k: 'understood', label: 'Understood', test: (c) => idx(c) >= 2, leak: 'Not yet understood', act: 'Check understanding' },
  { k: 'booked', label: 'Booked', test: (c) => idx(c) >= 3, leak: 'No visit booked', act: 'Help to book' },
  { k: 'seen', label: 'Seen', test: (c) => idx(c) >= 4, leak: 'Visit not done yet', act: 'Confirm the visit' },
  { k: 'next', label: 'Next step', test: nextAgreed, leak: 'Decision or acceptance pending', act: 'Decide or follow the referral' },
  { k: 'closed', label: 'Loop closed', test: (c) => c.stage === 'closed', leak: 'Not closed yet', act: 'Close with evidence' },
];

// How far a case has flowed: the last channel it reached without a gap.
export function levelOf(c) {
  let l = 0;
  for (let i = 1; i < CHANNELS.length; i++) { if (CHANNELS[i].test(c)) l = i; else break; }
  return l;
}

// counts[i]: patients who reached channel i. leaks[i]: patients stopped after channel i (waiting for channel i+1).
export function flowOf(cases, today) {
  const levels = cases.map((c) => [c, levelOf(c)]);
  const counts = CHANNELS.map((_, i) => levels.filter(([, l]) => l >= i).length);
  const leaks = CHANNELS.slice(0, -1).map((ch, i) => {
    const here = levels.filter(([, l]) => l === i).map(([c]) => c);
    return { i, label: CHANNELS[i + 1].leak, act: CHANNELS[i + 1].act, cases: here, late: here.filter((c) => isOverdue(c, today)).length };
  });
  return { counts, leaks, total: cases.length };
}

// The SVG, flowing downward like a falaj: one channel per row, as wide as the number of patients who reached it;
// water runs down to the next channel; the ones who stopped branch off to the right (sand, amber when overdue).
export function flowSvg(flow, { selected = null } = {}) {
  const W = 360, lx = 112, maxW = 132, rowH = 52, top = 14, barH = 12, leakX = 268;
  const n = CHANNELS.length, scale = flow.total ? maxW / flow.total : 0;
  const w = (v) => (v ? Math.max(4, v * scale) : 0), y = (i) => top + i * rowH;
  let bands = '', water = '', bars = '', leaks = '', labels = '';
  for (let i = 0; i < n; i++) {
    const wi = w(flow.counts[i]), last = i === n - 1;
    bars += `<rect x="${lx}" y="${y(i)}" width="${Math.max(wi, 2)}" height="${barH}" rx="3" fill="${last ? '#1a7f52' : '#0b6fa8'}" opacity="${flow.counts[i] ? 1 : 0.25}"/>`;
    labels += `<text x="4" y="${y(i) + 10}" class="fl-l">${CHANNELS[i].label}</text><text x="${lx - 8}" y="${y(i) + 10}" text-anchor="end" class="fl-n">${flow.counts[i]}</text>`;
    if (last) continue;
    const wn = w(flow.counts[i + 1]), y1 = y(i) + barH, y2 = y(i + 1);
    if (wn) {
      bands += `<path d="M${lx} ${y1}H${lx + wn}V${y2}H${lx}Z" fill="#0b6fa8" opacity=".16"/>`;
      water += `<path class="fl-w" d="M${lx + wn / 2} ${y1}V${y2}" stroke-width="${Math.min(3, Math.max(1.2, wn / 10))}"/>`;
    }
    const lk = flow.leaks[i];
    if (lk.cases.length) {
      const xa = lx + wn, xb = lx + wi, ym = (y1 + y2) / 2 + 4, lw = Math.max(6, lk.cases.length * scale * 0.8), sel = selected === i;
      leaks += `<path d="M${xa} ${y1}C${xa} ${ym - 4},${leakX - 30} ${ym - 4},${leakX} ${ym - 4}V${ym + 4}C${leakX - 34} ${ym + 4},${xb} ${ym},${xb} ${y1}Z" fill="${sel ? '#e0a040' : '#d9c9a3'}" opacity="${sel ? 0.8 : 0.6}"/>`;
      leaks += `<path class="fl-w slow" d="M${(xa + xb) / 2} ${y1}C${(xa + xb) / 2} ${ym},${leakX - 30} ${ym},${leakX} ${ym}" stroke-width="1.4"/>`;
      leaks += `<rect x="${leakX}" y="${ym - 6}" width="${Math.min(lw, 52)}" height="12" rx="3" fill="#b3a27c"/>`;
      if (lk.late) leaks += `<rect x="${leakX}" y="${ym - 6}" width="${Math.max(4, Math.min(lw, 52) * lk.late / lk.cases.length)}" height="12" rx="3" fill="#d98a1c"/>`;
      leaks += `<text x="${leakX + Math.min(lw, 52) + 6}" y="${ym + 5}" class="fl-n${lk.late ? ' late' : ''}">${lk.cases.length}</text>`;
    }
  }
  const H = y(n - 1) + barH + 10;
  return `<svg class="flow-svg" viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true" focusable="false">
    <style>.fl-l{font:600 13px -apple-system,system-ui,sans-serif;fill:currentColor}.fl-n{font:700 14px -apple-system,system-ui,sans-serif;fill:currentColor}.fl-n.late{fill:#b0650a}
    .fl-w{fill:none;stroke:#fff;stroke-opacity:.75;stroke-linecap:round;stroke-dasharray:3 9;animation:flw 1.4s linear infinite}.fl-w.slow{stroke:#8a7348;stroke-opacity:.6;animation-duration:3s}
    @keyframes flw{to{stroke-dashoffset:-24}}@media (prefers-reduced-motion:reduce){.fl-w{animation:none}}</style>
    <text x="${leakX}" y="${top + 8}" class="fl-l" style="font-size:11px;opacity:.75">Stopped</text>
    ${bands}${water}${leaks}${bars}${labels}</svg>`;
}
