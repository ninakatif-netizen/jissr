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
  inbox: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
};

// ic('check', 20) -> inline svg that uses the current text colour
export function ic(name, size = 20, extra = '') {
  return `<svg class="ico" ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

// The Jissr mark: a bridge (arch between two banks) with a saffron keystone.
export function logo(size = 30) {
  return `<svg width="${size * 1.25}" height="${size}" viewBox="0 0 40 32" fill="none" aria-hidden="true" focusable="false">
    <path d="M2 28h36" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M6 28V19a14 14 0 0 1 28 0v9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M13 28v-8a7 7 0 0 1 14 0v8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="17" y="1.5" width="6" height="6" rx="1" transform="rotate(45 20 4.5)" fill="#f5b544"/>
  </svg>`;
}

export const wordmark = () => `${logo(30)}<span>Jissr</span><span class="ar">جسر</span>`;
