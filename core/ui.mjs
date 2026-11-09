import { slaText, CLOE_LABEL } from './rules.mjs';
// Shared look: line icons (instead of emoji) and the Falaj mark (a water channel and a palm).
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

// The Falaj mark: a falaj (the water channel of the oases of Al Ain, UNESCO World Heritage) carrying water to a
// palm tree. Every abnormal screening result is water that must reach care. An original drawing.
const CH = 'M4 32C14 32 16 15 28 15C38 15 40 26 50 26';
const PALM = 'M55 27C55.6 20 55.2 13 54 8M54 8C50 4.5 45 5 43 8.5M54 8C58 4.5 63 5 65 8.5M54 8C51.5 3.5 52.5 1 56 0M54 8C57 5 61 6 62.5 10';
export function logo(size = 30) {
  const h = Math.round(size), w = Math.round(h * 66 / 40);
  return `<svg class="jmark" width="${w}" height="${h}" viewBox="0 0 66 40" fill="none" aria-hidden="true" focusable="false">
    <path d="${CH}" style="stroke:var(--logo-sand,#e2d7c1)" stroke-width="9" stroke-linecap="round"/>
    <path d="${CH}" style="stroke:var(--logo-water,var(--brand,#0a5c8a))" stroke-width="3.6" stroke-linecap="round"/>
    <path d="${PALM}" style="stroke:var(--logo-palm,#1e7a4c)" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;
}

// The care path as a falaj: a U-shaped channel bed, filled segment by segment like a loading bar (20 segments,
// 4 per step), with sluice gates at each step and a palm at the end that turns green when everything is done.
const CANAL = 'M24 40H290A40 40 0 0 1 290 120H70';
export function bridgeGauge(done, label = '') {
  const filled = Math.min(5, done) * 4;
  const segs = Array.from({ length: 20 }, (_, i) => `<path class="gseg${i < filled ? ' on' : ''}" d="${CANAL}" pathLength="100" stroke-dasharray="4.2 95.8" stroke-dashoffset="${-(i * 4.8 + 0.4)}" style="--i:${i}"/>`).join('');
  return `<svg class="gauge-b${done >= 5 ? ' all' : ''}" viewBox="0 0 350 160" fill="none" role="img" aria-label="${label}">
    <path class="gbed" d="${CANAL}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <g stroke-width="11">${segs}</g>
    <g class="gpalm" stroke-width="2.8" stroke-linecap="round"><path d="M46 142C47 130 46 114 44 100M44 100C36 94 28 96 24 102M44 100C52 93 60 95 64 101M44 100C40 90 42 84 48 80M44 100C48 91 56 88 60 89"/></g>
  </svg>`;
}

export const wordmark = () => `${logo(30)}<span>Falaj</span><span class="ar">فلج</span>`;

// CLOE badges, shared by the staff screens.
// SLA countdown: green on track, amber warning, red breached. The tier is also written in words (not colour only).
const TIER_WORD = { ON_TRACK: 'On track', WARNING: 'Warning', BREACHED: 'Breached' };
export function slaBadge(clock) {
  if (!clock) return '<span class="sla none">No clock running</span>';
  return `<span class="sla ${clock.tier.toLowerCase()}" title="${TIER_WORD[clock.tier]}: ${clock.stepText}">${ic('clock', 13)}<span>${slaText(clock)}</span></span>`;
}
export const phaseChip = (phase) => `<span class="phase ph-${phase.toLowerCase()}">${CLOE_LABEL[phase]}</span>`;

// Mini care path for list rows: a short falaj, 5 segments (one per step), and its palm.
export function miniSteps(now, label = '') {
  const d = 'M4 18C26 18 30 8 52 8S80 18 100 18';
  const segs = [0, 1, 2, 3, 4].map((i) => `<path d="${d}" pathLength="100" stroke-dasharray="18 82" stroke-dashoffset="${-20 * i}" class="${i < now || now >= 5 ? 'm-on' : 'm-off'}"/>`).join('');
  return `<svg class="mini" viewBox="0 0 120 26" width="84" height="20" role="img" aria-label="${label || 'Step ' + Math.min(now + 1, 5) + ' of 5'}">
    <path d="${d}" class="m-bed" stroke-width="9" stroke-linecap="round" fill="none"/>
    <g fill="none" stroke-width="5">${segs}</g>
    <path d="M110 22V9M110 10C107 7 104 8 103 10M110 10C113 7 116 8 117 10M110 10C109 6 110 4 112 3" class="${now >= 5 ? 'm-palm on' : 'm-palm'}" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
}
