// Hand-drawn style line art for Falaj: an Abu Dhabi skyline, with a bridge whose wave-like arches are
// inspired by the Sheikh Zayed Bridge (Zaha Hadid). An original drawing, not a copy of any photo or plan.
// Drawn for this project (no stock art). Uses currentColor, so it takes the colour of where it sits.
export function skyline({ width = 360, opacity = 1, sun = true } = {}) {
  return `<svg class="skyline" width="${width}" viewBox="0 0 360 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:${opacity}" aria-hidden="true" focusable="false">
    ${sun ? '<circle cx="292" cy="26" r="11"/>' : ''}
    <path d="M196 104V44h14v60M200 52h6M200 62h6M200 72h6M200 82h6"/>
    <path d="M216 104V26c0-6 10-6 10 0v78M221 14v8"/>
    <path d="M232 104V58q9-12 18 0v46"/>
    <path d="M256 104V36h12v68M256 48h12M256 60h12"/>
    <path d="M274 104V64c0-8 14-8 14 0v40"/>
    <path d="M294 104V50l10-8 10 8v54"/>
    <path d="M320 104V70h16v34"/>
    <path d="M4 104h188"/>
    <path d="M6 104C24 78 54 78 70 104M58 104C82 50 132 50 154 104M140 104C152 84 176 82 186 96"/>
    <path d="M14 104C30 86 50 86 64 104M66 104C88 62 126 62 146 104" stroke-opacity=".45"/>
    <path d="M0 112c40-6 80-6 120 0s80 6 120 0 80-6 120 0" stroke-opacity=".55"/>
  </svg>`;
}

// The falaj in cross-section, for the home page: mountain and mother well, the tunnel with its access
// shafts, the open channel, the palm garden. Drawn in code, an original illustration.
export function falajScene({ width = 360, opacity = 1 } = {}) {
  const h = Math.round(width * 0.45);
  const palm = (x, y) => `<path d="M${x} ${y}V${y - 22}M${x} ${y - 21}C${x - 5} ${y - 27} ${x - 11} ${y - 26} ${x - 13} ${y - 21}M${x} ${y - 21}C${x + 5} ${y - 27} ${x + 11} ${y - 26} ${x + 13} ${y - 21}M${x} ${y - 21}C${x - 2} ${y - 29} ${x + 1} ${y - 32} ${x + 5} ${y - 33}"/>`;
  return `<svg width="${width}" height="${h}" viewBox="0 0 400 180" fill="none" aria-hidden="true" style="opacity:${opacity}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 70L28 34L50 52L76 18L104 58L400 104" stroke="#0a1f2e" stroke-width="2"/>
    <path d="M40 66V150" stroke="#0a1f2e" stroke-width="2"/><path d="M48 62V150" stroke="#0a1f2e" stroke-width="2"/>
    <path d="M44 148L270 92" stroke="#0b6fa8" stroke-width="7"/>
    <path d="M44 148L270 92" stroke="#9fdaf4" stroke-width="2" stroke-dasharray="4 6"/>
    <path d="M110 66V129M162 74V116M214 83V104" stroke="#0a1f2e" stroke-width="1.6" stroke-dasharray="2 3"/>
    <path d="M270 92L398 104" stroke="#0b6fa8" stroke-width="5"/>
    <g stroke="#1a7f52" stroke-width="2">${palm(320, 97)}${palm(345, 99)}${palm(370, 101)}</g>
    <path d="M0 160C60 152 120 166 180 158" stroke="#36b5e8" stroke-width="2" opacity=".5"/>
  </svg>`;
}
