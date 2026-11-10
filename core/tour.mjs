// GUIDED TOUR for judges: 8 short steps, one story (Priya, BI-RADS 4) across patient, care team and authorities.
// Any page with ?tour=N shows the step card. Nothing here changes the rules.
const STEPS = [
  { url: 'patient.html?p=C-040&fresh=1', title: 'Meet Priya', text: 'Her mammogram shows an area that needs a closer look (BI-RADS 4). She speaks Malayalam. She opens Falaj on her phone and first confirms it is her.' },
  { url: 'patient.html?p=C-040&view=result', title: 'Her result, without fear', text: 'Plain words, in her language or read aloud: "this is not a diagnosis of cancer". Then she says in her own words what happens next, and books a 10-minute call with a nurse.' },
  { url: 'care.html?role=nurse&as=n2', title: 'The nurse sees who to call first', text: 'Every case has one owner and a deadline. "Call required": a suspicious mammogram is told by a person, never by a message alone. The dropout radar shows why someone may be lost.' },
  { url: 'care.html?role=specialist', title: 'The handshake', text: 'A referral exists only when the hospital takes it. Until then the sender stays responsible, and the insurance approval is requested at the same time. A case is never between two owners.' },
  { url: 'care.html?role=gp', title: 'A 2-minute consult', text: 'Open a case and ask the specialist a short question from the phone. The answer joins the case and often makes a referral unnecessary.' },
  { url: 'map.html', title: 'Where does the water stop?', text: 'For the Department of Health: open and late cases in every emirate, the biggest leak, who holds the water, and who drops out by language. Switch to "The falaj" to see each checkpoint.' },
  { url: 'patient.html?p=C-012&view=proof', title: 'The palm: proof of care', text: 'When care is in place, a clinician closes the case with evidence and the patient keeps a dated receipt she can share. It shows the steps, never the result.' },
  { url: 'trust.html?run=1', title: 'Try to break it', text: 'Every safety promise is checked live on the real code. Press any red button: make the AI close a case, skip a step, or remove an owner. The rules refuse.' },
];
export const tourUrl = (i) => { const s = STEPS[i]; return s.url + (s.url.includes('?') ? '&' : '?') + 'tour=' + i; };

export function startTour() {
  const p = new URLSearchParams(location.search);
  if (!p.has('tour')) return;
  const i = Math.max(0, Math.min(STEPS.length - 1, parseInt(p.get('tour'), 10) || 0));
  const st = STEPS[i];
  const css = document.createElement('style');
  css.textContent = `.tour{position:fixed;z-index:120;inset-inline-start:20px;bottom:20px;width:340px;background:#0a1f2e;color:#fff;border-radius:22px;padding:18px 18px 14px;box-shadow:0 24px 60px rgba(10,31,46,.4);font:14px/1.55 var(--text,system-ui),sans-serif;animation:tourin .35s ease}
  @keyframes tourin{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  .tour .k{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9fdaf4;font-weight:600}
  .tour h4{margin:4px 0 6px;font-size:17px;font-weight:600}
  .tour p{margin:0 0 14px;color:rgba(255,255,255,.85)}
  .tour .dots{display:flex;gap:5px;margin-bottom:12px}.tour .dots i{height:4px;flex:1;border-radius:2px;background:rgba(255,255,255,.18)}.tour .dots i.on{background:#36b5e8}
  .tour .r{display:flex;gap:8px;align-items:center}
  .tour a,.tour button{font:inherit;font-size:13.5px;border-radius:12px;padding:8px 14px;text-decoration:none;cursor:pointer;border:0}
  .tour .nx{background:#fff;color:#0a1f2e;font-weight:600;margin-inline-start:auto}
  .tour .bk{background:rgba(255,255,255,.1);color:#fff}
  .tour .x{background:none;color:rgba(255,255,255,.6);padding:8px 4px}
  .tour.min p,.tour.min .dots,.tour.min .r .bk{display:none}
  @media(max-width:699px){.tour{inset-inline:12px;width:auto;bottom:96px}}`;
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
