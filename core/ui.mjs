import { slaText, CLOE_LABEL } from './rules.mjs';
// Shared look: line icons (instead of emoji) and the Jissr bridge mark.
// Icons are simple 24px strokes drawn for this project; they inherit the text colour.

const P = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  result: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  doctor: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a4.5 4.5 0 0 0 9 0v-2"/><circle cx="19" cy="11.5" r="2"/>',
  flask: '<path d="M9 3h6M10 3v6L5 19a1.6 1.6 0 0 0 1.4 2.3h11.2A1.6 1.6 0 0 0 19 19l-5-10V3"/><path d="M8 15h8"/>',
  plan: '<rect x="6" y="4" width="12" height="17" rx="2.5"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
  phone: '<path d="M5 4h3.5l2 5-2.4 1.4a11 11 0 0 0 5.5 5.5L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16.5 14a5 5 0 0 1 4.5 5"/>',
  speaker: '<path d="M11 5 6.5 9H3v6h3.5l4.5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  back: '<path d="M14 5l-7 7 7 7"/>',
  next: '<path d="M10 5l7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  send: '<path d="M4 12 20 4l-4 16-4.5-6.5z"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 6"/><path d="M20 5v6h-6"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  handshake: '<path d="M3 11l4-4 4 2 3-2 4 3 3 3"/><path d="M3 11l5 5a2 2 0 0 0 3 0l1-1m0 0 1 1a2 2 0 0 0 3 0l1-1"/>',
  star: '<path d="M12 3l2.2 5.3L20 9l-4.3 3.8L17 18.5l-5-3-5 3 1.3-5.7L4 9l5.8-.7z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6 9-8"/>',
  pill: '<rect x="3.5" y="9" width="17" height="7" rx="3.5" transform="rotate(-35 12 12.5)"/><path d="M9.5 8.5l5 7"/>',
  chart: '<path d="M4 20V6M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  list: '<path d="M5 7h14M5 12h14M5 17h9"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
  wave: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7c-3 0-4-1.5-6-4.5L4 13a1.5 1.5 0 0 1 2.5-1.5L8 13"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  video: '<rect x="3" y="6.5" width="13" height="11" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  inbox: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
};

// ic('check', 20) -> inline svg that uses the current text colour
export function ic(name, size = 20, extra = '') {
  return `<svg class="ico" ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

// The Jissr mark, inspired by the Sheikh Zayed Bridge in Abu Dhabi (Zaha Hadid): three arches rising from one deck,
// the tall middle arch drawn as a twisting ribbon (a second, gold line inside it). An original drawing, no photo or plan.
export function logo(size = 30) {
  return `<svg width="${size * 1.5}" height="${size}" viewBox="0 0 48 32" fill="none" aria-hidden="true" focusable="false">
    <path d="M2 27h44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M4 27C6.5 18.5 13 18.5 16.5 27M12 27C15.5 -1 32.5 -1 36 27M31.5 27C35 18.5 41.5 18.5 44 27" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M16.6 27C19.6 7.5 28.4 7.5 31.4 27" style="stroke:var(--logo-acc,#d6a85a)" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

export const wordmark = () => `${logo(30)}<span>Jissr</span><span class="ar">جسر</span>`;

// CLOE badges, shared by the staff screens.
// SLA countdown: green on track, amber warning, red breached. The tier is also written in words (not colour only).
const TIER_WORD = { ON_TRACK: 'On track', WARNING: 'Warning', BREACHED: 'Breached' };
export function slaBadge(clock) {
  if (!clock) return '<span class="sla none">No clock running</span>';
  return `<span class="sla ${clock.tier.toLowerCase()}" title="${TIER_WORD[clock.tier]}: ${clock.stepText}">${ic('clock', 13)}<span>${slaText(clock)}</span></span>`;
}
export const phaseChip = (phase) => `<span class="phase ph-${phase.toLowerCase()}">${CLOE_LABEL[phase]}</span>`;

// Mini care path: the patient's five steps as dots on a line, small enough for a list row.
// Done steps filled, the current one in gold with a ring, the rest hollow.
export function miniSteps(now, label = '') {
  const X = [6, 34, 62, 90, 118], end = now >= 5 ? 118 : X[now];
  const dots = X.map((x, i) => i < now || now >= 5 ? `<circle cx="${x}" cy="13" r="4" style="fill:var(--hero)"/>`
    : i === now ? `<circle cx="${x}" cy="13" r="5.2" style="fill:var(--accent);stroke:var(--hero)" stroke-width="1.6"/>`
    : `<circle cx="${x}" cy="13" r="3.6" style="fill:var(--card);stroke:var(--chev)" stroke-width="1.4"/>`).join('');
  return `<svg class="mini" viewBox="0 0 124 26" width="124" height="26" role="img" aria-label="${label || 'Step ' + Math.min(now + 1, 5) + ' of 5'}">
    <path d="M6 13H118" style="stroke:var(--line)" stroke-width="2" stroke-linecap="round"/>
    ${end > 6 ? `<path d="M6 13H${end}" style="stroke:var(--hero)" stroke-width="2.4" stroke-linecap="round"/>` : ''}${dots}</svg>`;
}
