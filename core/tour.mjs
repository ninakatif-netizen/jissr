// GUIDED TOUR for judges: 7 short steps across the patient app, the care team and the measures.
// Any page with ?tour=N shows the step card. Nothing here changes the rules.
const STEPS = [
  { url: 'patient.html?p=C-001&fresh=1', title: 'Meet Fatima', text: 'Her HbA1c came back high. She opens Jissr on her phone and first confirms it is her, with the code from her SMS (demo code: 2026). Then she taps "Read my result".' },
  { url: 'patient.html?p=C-001&view=result', title: 'Her result, in plain words', text: 'The gauge shows where 8.1% sits. Every message says "this is not a diagnosis". She can listen, ask for simpler words, or book a 10-minute call with a nurse. Tap "Yes, I understand", then answer the quick check.' },
  { url: 'patient.html?p=C-001&view=book', title: 'What gets in her way?', text: 'She works nights. Tap "No time / shifts": evening slots appear. Pick one and book it.' },
  { url: 'staff.html?as=n1&filter=attention', title: 'The care team sees every case', text: 'Three screening programmes run on the same engine: diabetes (HbA1c), bowel cancer (FIT) and breast screening (mammogram). Each case has a named owner and a deadline set by rules. This queue shows what needs a person now.' },
  { url: 'staff.html?as=c1&new=1', title: 'A new result arrives', text: 'Type an HbA1c and add it. The rules set urgency, the due date and the least busy owner at once. No AI is involved.' },
  { url: 'staff.html?as=d1&c=C-002', title: 'Only a clinician closes, with evidence', text: 'Dr Mariam can close this case only by writing the evidence. A nurse cannot, and the AI cannot change anything. This is enforced in code and tested.' },
  { url: 'trust.html?run=1', title: 'Try to break it', text: 'Every safety promise is checked live on the real code. Then press any red button: make the AI close a case, close without proof, make a case vanish. The rules block each one.' },
  { url: 'metrics.html', title: 'Proving it works', text: 'Time to each step, referral completion, unresolved results and why patients drop out. These numbers are synthetic: this is what a pilot would measure.' },
];
export const tourUrl = (i) => { const s = STEPS[i]; return s.url + (s.url.includes('?') ? '&' : '?') + 'tour=' + i; };

export function startTour() {
  const p = new URLSearchParams(location.search);
  if (!p.has('tour')) return;
  const i = Math.max(0, Math.min(STEPS.length - 1, parseInt(p.get('tour'), 10) || 0));
  const st = STEPS[i];
  const css = document.createElement('style');
  css.textContent = `.tour{position:fixed;z-index:120;inset-inline-start:20px;bottom:20px;width:340px;background:#1b2238;color:#fff;border-radius:22px;padding:18px 18px 14px;box-shadow:0 24px 60px rgba(27,34,56,.35);font:14px/1.55 "Readex",system-ui,sans-serif;animation:tourin .35s ease}
  @keyframes tourin{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  .tour .k{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#f5b544;font-weight:600}
  .tour h4{margin:4px 0 6px;font-size:17px;font-weight:600}
  .tour p{margin:0 0 14px;color:rgba(255,255,255,.85)}
  .tour .dots{display:flex;gap:5px;margin-bottom:12px}.tour .dots i{height:4px;flex:1;border-radius:2px;background:rgba(255,255,255,.18)}.tour .dots i.on{background:#f5b544}
  .tour .r{display:flex;gap:8px;align-items:center}
  .tour a,.tour button{font:inherit;font-size:13.5px;border-radius:12px;padding:8px 14px;text-decoration:none;cursor:pointer;border:0}
  .tour .nx{background:#f5b544;color:#1b2238;font-weight:600;margin-inline-start:auto}
  .tour .bk{background:rgba(255,255,255,.1);color:#fff}
  .tour .x{background:none;color:rgba(255,255,255,.6);padding:8px 4px}
  .tour.min p,.tour.min .dots,.tour.min .r .bk{display:none}
  @media(max-width:699px){.tour{inset-inline:12px;width:auto;bottom:92px}}`;
  document.head.appendChild(css);
  const el = document.createElement('aside');
  el.className = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Guided tour');
  const last = i === STEPS.length - 1;
  el.innerHTML = `<div class="k">Guided tour · step ${i + 1} of ${STEPS.length}</div><h4>${st.title}</h4><p>${st.text}</p>
    <div class="dots">${STEPS.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="r">${i > 0 ? `<a class="bk" href="${tourUrl(i - 1)}">Back</a>` : ''}<button class="x" id="tour-min" aria-label="Minimise tour">Hide</button><button class="x" id="tour-x">Exit</button>
    <a class="nx" href="${last ? 'index.html' : tourUrl(i + 1)}">${last ? 'Finish' : 'Next'}</a></div>`;
  document.body.appendChild(el);
  el.querySelector('#tour-min').onclick = () => { el.classList.toggle('min'); el.querySelector('#tour-min').textContent = el.classList.contains('min') ? 'Show' : 'Hide'; };
  el.querySelector('#tour-x').onclick = () => { p.delete('tour'); el.remove(); history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); };
}
