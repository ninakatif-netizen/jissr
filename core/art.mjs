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
