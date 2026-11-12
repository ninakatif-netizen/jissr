// THE PATIENT'S STEPS, drawn the same way everywhere: an icon per step, joined by a water channel.
// Done steps are filled (with a check badge), the current step glows and holds what to do, later steps are faded.
// stepsHtml: the vertical list (patient steps page). trackHtml: the compact row (the app's Today card).

const P = (d, w = 2.2) => `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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

export const STEPS_CSS = `
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* vertical steps */
.stp{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.stp li{position:relative;display:grid;grid-template-columns:44px 1fr;column-gap:14px;padding-bottom:18px}
.stp li:last-child{padding-bottom:0}
.stp li:not(:last-child)::before{content:"";position:absolute;inset-inline-start:20px;top:46px;bottom:4px;width:4px;border-radius:2px;background:repeating-linear-gradient(180deg,color-mix(in srgb,var(--muted) 35%,transparent) 0 5px,transparent 5px 10px)}
.stp li.done:not(:last-child)::before{background:linear-gradient(180deg,#0a6aa8,#2fb3e3,#0a6aa8);background-size:100% 48px;animation:stpflow 2.2s linear infinite}
@keyframes stpflow{to{background-position:0 48px}}
.stp .ic{position:relative;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:color-mix(in srgb,var(--muted) 80%,transparent);background:color-mix(in srgb,var(--card) 70%,transparent);border:1.5px dashed color-mix(in srgb,var(--muted) 45%,transparent)}
.stp li.done .ic{background:linear-gradient(160deg,#0a6aa8,#1aa0d4);color:#fff;border:0;box-shadow:0 6px 14px -6px rgba(10,106,168,.6)}
.stp .ok{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;background:#1d7f53;display:grid;place-items:center;border:2px solid var(--bg)}
.stp li.now .ic{background:var(--card);color:#0a6aa8;border:2.5px solid #0a6aa8;animation:stphalo 2s ease-out infinite}
@keyframes stphalo{0%{box-shadow:0 0 0 0 rgba(47,179,227,.45)}100%{box-shadow:0 0 0 14px rgba(47,179,227,0)}}
.stp .bd{min-width:0;padding-top:10px;display:flex;flex-direction:column;gap:2px}
.stp .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.stp b{font-size:17px;font-weight:600;line-height:1.3}
.stp li.todo b{color:var(--muted);font-weight:500}
.stp small{font-size:14px;color:var(--muted)}
.stp .tag{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;background:#0a6aa8;color:#fff}
.stp .tag.soft{background:color-mix(in srgb,var(--muted) 16%,transparent);color:var(--muted)}
.stp .act{margin-top:10px}
.stp li.now .bd{padding-top:10px}
/* compact row */
.trk{list-style:none;margin:2px 0 0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);position:relative}
.trk li{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.trk li:not(:last-child)::after{content:"";position:absolute;top:17px;left:calc(50% + 20px);right:calc(-50% + 20px);height:3px;border-radius:2px;background:color-mix(in srgb,var(--muted) 25%,transparent)}
.trk li.done:not(:last-child)::after{background:linear-gradient(90deg,#0a6aa8,#2fb3e3,#0a6aa8);background-size:40px 100%;animation:trkflow 1.6s linear infinite}
@keyframes trkflow{to{background-position:40px 0}}
.trk .ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:color-mix(in srgb,var(--muted) 75%,transparent);background:color-mix(in srgb,var(--card) 60%,transparent);border:1.5px dashed color-mix(in srgb,var(--muted) 40%,transparent)}
.trk .ic svg{width:17px;height:17px}
.trk li.done .ic{background:linear-gradient(160deg,#0a6aa8,#1aa0d4);color:#fff;border:0}
.trk li.now .ic{background:var(--card);color:#0a6aa8;border:2.5px solid #0a6aa8;animation:stphalo 2s ease-out infinite}
.trk .lb{font-size:12px;font-weight:500;color:var(--muted)}
.trk li.done .lb{color:var(--ink)}.trk li.now .lb{color:#0a6aa8;font-weight:700}
#app.enter .trk li,.stp li{animation:stpin .45s cubic-bezier(.2,.8,.2,1) both}
.trk li:nth-child(2),.stp li:nth-child(2){animation-delay:.06s}.trk li:nth-child(3),.stp li:nth-child(3){animation-delay:.12s}.trk li:nth-child(4),.stp li:nth-child(4){animation-delay:.18s}.trk li:nth-child(5),.stp li:nth-child(5){animation-delay:.24s}.stp li:nth-child(6){animation-delay:.3s}
@keyframes stpin{from{opacity:0;transform:translateY(6px)}}
@media (prefers-color-scheme:dark){.stp li.now .ic,.trk li.now .ic{color:#5ab8ff;border-color:#5ab8ff}.trk li.now .lb{color:#5ab8ff}.stp .tag{background:#5ab8ff;color:#001a2b}}
@media (prefers-reduced-motion:reduce){.stp li,.trk li,.stp li.now .ic,.trk li.now .ic,.stp li.done::before,.trk li.done::after{animation:none !important}}
`;
