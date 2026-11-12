// THE PATIENT'S STEPS, drawn the same way everywhere: an icon per step, joined by a water channel.
// Done steps are filled (with a check badge), the current step glows and holds what to do, later steps are faded.
// stepsHtml: the vertical list (patient steps page). trackHtml: the compact row (the app's Today card).

const P = (d, w = 2) => `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const STEP_ICONS = {
  told: P('M6 3l3 4-2 2c1 2.5 3.5 5 6 6l2-2 4 3-2 4C10 20 4 14 3 5z'),
  understood: P('M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3zM9.5 20h5'),
  booked: P('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'),
  seen: P('M6 3v6a5 5 0 0 0 10 0V3M11 14v2a4 4 0 0 0 8 0v-2M19 12v0'),
  accepted: P('M4 21V8l8-5 8 5v13M9 21v-6h6v6M12 7v4M10 9h4'),
  closed: P('M12 2l2.4 2.4 3.4-.4.4 3.4L21 10l-2 2.6.3 3.4-3.4.5L14.4 20 12 18.2 9.6 20l-1.5-3.5-3.4-.5.3-3.4L3 10l2.8-2.6.4-3.4 3.4.4zM8.5 11.5l2.5 2.5 4.5-4.5'),
};
const CHECK = '<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 6.2l2.4 2.3 4.6-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// items: [{key, label, state: 'done'|'now'|'todo', sub, body}] (body is HTML shown inside the current step)
export function stepsHtml(items, { label = 'Your steps', nowWord = 'Now', nextWord = 'Next' } = {}) {
  const firstTodo = items.findIndex((x) => x.state === 'todo');
  return `<ol class="stp" aria-label="${esc(label)}">${items.map((x, i) => `<li class="${x.state}"${x.state === 'now' ? ' aria-current="step"' : ''}>
    <span class="ic" aria-hidden="true">${STEP_ICONS[x.key] || STEP_ICONS.told}${x.state === 'done' ? `<span class="ok">${CHECK}</span>` : ''}</span>
    <div class="bd"><div class="hd"><b>${esc(x.label)}</b>${x.state === 'now' ? `<span class="tag">${esc(nowWord)}</span>` : x.state === 'todo' && i === firstTodo ? `<span class="tag soft">${esc(nextWord)}</span>` : ''}</div>
      ${x.sub ? `<small>${esc(x.sub)}</small>` : ''}${x.state === 'done' ? '<span class="sr">: done</span>' : ''}
      ${x.state === 'now' && x.body ? `<div class="act">${x.body}</div>` : ''}</div></li>`).join('')}</ol>`;
}

export function trackHtml(items, { label = 'Your care, step by step' } = {}) {
  return `<ol class="trk" aria-label="${esc(label)}">${items.map((x) => `<li class="${x.state}"${x.state === 'now' ? ' aria-current="step"' : ''}><span class="ic" aria-hidden="true">${STEP_ICONS[x.key] || STEP_ICONS.told}</span><span class="lb">${esc(x.label)}</span>${x.state === 'done' ? '<span class="sr">: done</span>' : x.state === 'now' ? '<span class="sr">: now</span>' : ''}</li>`).join('')}</ol>`;
}

// THE FALAJ LINE: Falaj's signature. Seen from the side, a falaj is a channel with a line of access shafts,
// ending in a palm garden. The patient's steps are the shafts; water has reached the current one;
// the palm at the end grows a frond with every finished step and bears dates when care is confirmed.
// Everything is computed from the real steps: nothing here is decoration without meaning.
export function falajHtml(items, { label = 'Your care, step by step' } = {}) {
  const n = items.filter((x) => x.state === 'done').length, all = n === items.length;
  const X0 = 18, X1 = 318, Y = 84, xs = items.map((_, i) => 52 + i * ((284 - 52) / Math.max(1, items.length - 1)));
  const nowI = items.findIndex((x) => x.state === 'now');
  const xEnd = all ? X1 : nowI >= 0 ? xs[nowI] : X0, pct = ((xEnd - X0) / (X1 - X0)) * 100;
  const h = 14 + 9 * n, tx = 317, ty = Y - h, k = 0.7 + 0.11 * n;
  const F = [[-8, -6, -16, -4, -20, 4], [8, -6, 16, -4, 20, 4], [-6, -10, -14, -12, -18, -8], [6, -10, 14, -12, 18, -8], [0, -8, 3, -14, 7, -16]];
  const frond = (f, sc) => `M${tx} ${ty}c${f.map((v) => (v * sc).toFixed(1)).join(' ')}`;
  const fronds = n === 0 ? [frond(F[2], 0.35), frond(F[3], 0.35)] : F.slice(0, Math.min(5, n + 1)).map((f) => frond(f, k));
  const top = Math.max(0, Math.min(Y - 26, Math.floor(ty - 20 * (n === 0 ? 0.35 : k) - 6)));
  const shafts = items.map((x, i) => {
    const cx = xs[i];
    const icon = (STEP_ICONS[x.key] || STEP_ICONS.told).replace('width="20" height="20"', 'width="15" height="15"');
    return `<g class="fl-s ${x.state}">${x.state === 'now' ? `<circle class="fl-halo" cx="${cx}" cy="${Y}" r="14"/>` : ''}<circle class="fl-c" cx="${cx}" cy="${Y}" r="14"/><g transform="translate(${cx - 7.5} ${Y - 7.5})">${icon}</g><text x="${cx}" y="${Y + 34}" text-anchor="middle">${esc(x.label)}</text></g>`;
  }).join('');
  return `<div class="fl" style="--p:${pct.toFixed(1)}"><svg viewBox="0 ${top} 340 ${128 - top}" aria-hidden="true" focusable="false">
    <path class="fl-bed" d="M${X0} ${Y}H${X1}"/>
    <path class="fl-w" pathLength="100" d="M${X0} ${Y}H${X1}"/>
    ${xEnd > X0 ? `<path class="fl-sh" d="M${X0} ${Y}H${xEnd}"/>` : ''}
    <path class="fl-src" d="M${X0 - 6} ${Y - 4}c0-5 6-9 6-13 0 4 6 8 6 13a6 6 0 0 1-12 0z"/>
    <g class="fl-palm"><path class="fl-trunk" d="M318 ${Y}C320 ${(Y - h * 0.5).toFixed(1)} 319 ${(Y - h * 0.8).toFixed(1)} ${tx} ${ty}"/><path class="fl-fr" d="${fronds.join('')}"/>${all ? `<circle class="fl-date" cx="${tx - 4}" cy="${ty + 5}" r="3"/><circle class="fl-date" cx="${tx + 5}" cy="${ty + 7}" r="3"/>` : ''}</g>
    ${shafts}</svg>
    <ol class="sr">${items.map((x) => `<li${x.state === 'now' ? ' aria-current="step"' : ''}>${esc(x.label)}: ${x.state === 'done' ? 'done' : x.state === 'now' ? 'now' : 'to come'}</li>`).join('')}</ol></div>`;
}

export const STEPS_CSS = `
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* vertical steps */
.stp{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.stp li{position:relative;display:grid;grid-template-columns:44px 1fr;column-gap:14px;padding-bottom:18px}
.stp li:last-child{padding-bottom:0}
.stp li:not(:last-child)::before{content:"";position:absolute;inset-inline-start:20px;top:46px;bottom:4px;width:4px;border-radius:2px;background:repeating-linear-gradient(180deg,color-mix(in srgb,var(--muted) 35%,transparent) 0 5px,transparent 5px 10px)}
.stp li.done:not(:last-child)::before{background:linear-gradient(180deg,var(--water-600),var(--water-400),var(--water-600));background-size:100% 48px;animation:stpflow 2.2s linear infinite}
@keyframes stpflow{to{background-position:0 48px}}
.stp .ic{position:relative;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:color-mix(in srgb,var(--muted) 80%,transparent);background:color-mix(in srgb,var(--card) 70%,transparent);border:1.5px dashed color-mix(in srgb,var(--muted) 45%,transparent)}
.stp li.done .ic{background:linear-gradient(160deg,var(--water-600),var(--water-500));color:#fff;border:0;box-shadow:0 6px 14px -8px rgba(10,106,168,.55)}
.stp .ok{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;background:var(--care-ok);display:grid;place-items:center;border:2px solid var(--bg)}
.stp li.now .ic{background:var(--card);color:var(--water-600);border:2.5px solid var(--water-600);animation:stphalo 2s ease-out infinite}
@keyframes stphalo{0%{box-shadow:0 0 0 0 rgba(47,179,227,.45)}100%{box-shadow:0 0 0 14px rgba(47,179,227,0)}}
.stp .bd{min-width:0;padding-top:10px;display:flex;flex-direction:column;gap:2px}
.stp .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.stp b{font-size:17px;font-weight:600;line-height:1.3}
.stp li.todo b{color:var(--muted);font-weight:500}
.stp small{font-size:14px;color:var(--muted)}
.stp .tag{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--water-600)}
.stp .tag.soft{background:color-mix(in srgb,var(--muted) 16%,transparent);color:var(--muted)}
.stp .act{margin-top:10px}
.stp li.now .bd{padding-top:10px}
/* compact row */
.trk{list-style:none;margin:2px 0 0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);position:relative}
.trk li{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.trk li:not(:last-child)::after{content:"";position:absolute;top:17px;left:calc(50% + 20px);right:calc(-50% + 20px);height:3px;border-radius:2px;background:color-mix(in srgb,var(--muted) 25%,transparent)}
.trk li.done:not(:last-child)::after{background:linear-gradient(90deg,var(--water-600),var(--water-400),var(--water-600));background-size:40px 100%;animation:trkflow 1.6s linear infinite}
@keyframes trkflow{to{background-position:40px 0}}
.trk .ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:color-mix(in srgb,var(--muted) 75%,transparent);background:color-mix(in srgb,var(--card) 60%,transparent);border:1.5px dashed color-mix(in srgb,var(--muted) 40%,transparent)}
.trk .ic svg{width:17px;height:17px}
.trk li.done .ic{background:linear-gradient(160deg,var(--water-600),var(--water-500));color:#fff;border:0}
.trk li.now .ic{background:var(--card);color:var(--water-600);border:2.5px solid var(--water-600);animation:stphalo 2s ease-out infinite}
.trk .lb{font-size:12px;font-weight:500;color:var(--muted)}
.trk li.done .lb{color:var(--ink)}.trk li.now .lb{color:var(--water-600);font-weight:700}
#app.enter .trk li,.stp li{animation:stpin .45s cubic-bezier(.2,.8,.2,1) both}
.trk li:nth-child(2),.stp li:nth-child(2){animation-delay:.06s}.trk li:nth-child(3),.stp li:nth-child(3){animation-delay:.12s}.trk li:nth-child(4),.stp li:nth-child(4){animation-delay:.18s}.trk li:nth-child(5),.stp li:nth-child(5){animation-delay:.24s}.stp li:nth-child(6){animation-delay:.3s}
@keyframes stpin{from{opacity:0;transform:translateY(6px)}}
.stp .tag{color:var(--on-accent,#fff)}
/* the falaj line */
.fl svg{display:block;width:100%;height:auto;overflow:visible}
.fl-bed{fill:none;stroke:color-mix(in srgb,var(--sand,#e4dccb) 80%,var(--muted) 20%);stroke-width:9;stroke-linecap:round}
.fl-w{fill:none;stroke:var(--water-500);stroke-width:6;stroke-linecap:round;stroke-dasharray:var(--p) 200;animation:flfill 1.3s cubic-bezier(.3,.7,.2,1) both .2s}
@keyframes flfill{from{stroke-dashoffset:var(--p)}to{stroke-dashoffset:0}}
.fl-sh{fill:none;stroke:#fff;stroke-opacity:.75;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:3 9;animation:flsh 1.2s linear infinite 1.4s;opacity:0}
@keyframes flsh{from{opacity:1;stroke-dashoffset:0}to{opacity:1;stroke-dashoffset:-24}}
.fl-src{fill:var(--water-400)}
.fl-c{fill:var(--card);stroke:color-mix(in srgb,var(--muted) 45%,transparent);stroke-width:1.5;stroke-dasharray:3 3}
.fl-s{color:color-mix(in srgb,var(--muted) 85%,transparent)}
.fl-s text{font-size:11px;font-weight:500;fill:var(--muted);font-family:inherit}
.fl-s.done .fl-c{fill:var(--water-600);stroke:none}
.fl-s.done{color:var(--on-accent,#fff)}.fl-s.done text{fill:var(--ink)}
.fl-s.now .fl-c{stroke:var(--water-600);stroke-width:2.5;stroke-dasharray:none}
.fl-s.now{color:var(--water-600)}.fl-s.now text{fill:var(--water-700);font-weight:700}
.fl-halo{fill:var(--water-400);opacity:0;transform-box:fill-box;transform-origin:center;animation:flhalo 2s ease-out infinite 1.4s}
@keyframes flhalo{from{opacity:.45;transform:scale(1)}to{opacity:0;transform:scale(1.9)}}
.fl-palm{transform-box:fill-box;transform-origin:50% 100%;animation:flgrow .9s cubic-bezier(.3,1.4,.5,1) both .9s,flsway 6s ease-in-out infinite 2s}
@keyframes flgrow{from{transform:scale(.3);opacity:0}}
@keyframes flsway{50%{transform:rotate(2deg)}}
.fl-trunk{fill:none;stroke:#b07a43;stroke-width:5;stroke-linecap:round}
.fl-fr{fill:none;stroke:var(--care-ok);stroke-width:4;stroke-linecap:round}
.fl-date{fill:#d98a1c}
@media (prefers-reduced-motion:reduce){.fl-w,.fl-sh,.fl-halo,.fl-palm{animation:none !important}.fl-sh{opacity:1}}
@media (prefers-reduced-motion:reduce){.stp li,.trk li,.stp li.now .ic,.trk li.now .ic,.stp li.done::before,.trk li.done::after{animation:none !important}}
`;
