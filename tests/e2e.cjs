// Browser test of the whole demo (patient app, care team, tour, measures).
// Run:  npm run serve   (in one terminal)   then   BASE=http://127.0.0.1:8330/ npm run test:e2e
// Needs Playwright (npm i -D playwright, then npx playwright install chromium). SHOTS=folder saves screenshots.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8330/';
const SHOTS = process.env.SHOTS || '';
let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failed++; };
const shot = async (page, name, full) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !!full }); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = (p, n) => { p.on('pageerror', (e) => errors.push(`${n}: ${e.message}`)); p.on('dialog', (d) => { errors.push(`${n} dialog: ${d.message()}`); d.dismiss(); }); };

  // ---------- patient (phone) ----------
  const phone = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-GB' });
  const p = await phone.newPage(); watch(p, 'patient');
  const text = async () => (await p.innerText('#app')).replace(/\s+/g, ' ');
  await p.goto(BASE + 'patient.html?p=C-001&nosplash=1&fresh=1');
  ok(await p.locator('.otp .d').count() === 4, 'identity check is shown before the result');
  await shot(p, '01-gate');
  for (const [i, d] of [...'1111'].entries()) await p.fill(`.otp .d[data-i="${i}"]`, d);
  await p.waitForTimeout(150);
  ok(/not right/.test(await text()), 'a wrong code is refused');
  for (const [i, d] of [...'2026'].entries()) await p.fill(`.otp .d[data-i="${i}"]`, d);
  await p.waitForTimeout(250);
  ok(/Read your result/.test(await text()), 'the right code opens the app');
  await shot(p, '02-home');
  await p.click('#next-go'); await p.waitForTimeout(250);
  ok(await p.locator('.hscale').count() === 1 && /not a diagnosis/.test(await text()), 'result shows the scale and "not a diagnosis"');
  await shot(p, '03-result');
  await p.click('#yes'); await p.waitForTimeout(100);
  await p.click('[data-tb=no1]'); await p.waitForTimeout(100);
  ok(/Not quite/.test(await text()), 'a wrong teach-back answer explains again, gently');
  await p.click('[data-tb=ok]'); await p.waitForTimeout(150);
  ok(/Thank you|Thanks/i.test(await p.innerText('#sense')), 'the right teach-back answer records that the patient understood');
  await p.click('.tab[data-go=home]'); await p.click('#next-go');
  await p.click('[data-b=time_shift]'); await p.waitForTimeout(150);
  const times = await p.locator('.dt em').allInnerTexts();
  ok(times.length > 0 && times.every((t) => ['07:30', '18:30', '19:30'].includes(t)), 'shift workers get early or evening slots');
  await p.click('[data-mode=video]'); await p.waitForTimeout(100);
  ok(/blood test/.test(await text()), 'video visit can be chosen, with an honest note about blood tests');
  await p.click('.dt >> nth=0'); await shot(p, '04-book'); await p.click('#confirm'); await p.waitForTimeout(250);
  ok(/Video call/.test(await text()), 'the booked visit shows it is a video call');
  ok(/Your visit is booked/.test(await text()), 'booking is confirmed');
  await p.click('.tab[data-go=home]'); await p.waitForTimeout(200);
  ok(/Upcoming appointment/i.test(await text()), 'home shows the appointment card');
  await shot(p, '05-home-booked');
  await p.click('.tab[data-go=plan]'); await p.waitForTimeout(200);
  ok(await p.locator('.p5 li').count() === 5 && /Step 3 of 5/.test(await text()) && /Visit booked/.test(await text()), 'care plan shows the care path and the dated steps');
  await shot(p, '05b-plan');
  await p.click('.tab[data-go=home]'); await p.waitForTimeout(150);
  await p.click('#aa'); ok(await p.evaluate(() => document.documentElement.classList.contains('bigtext')), 'bigger text can be switched on');
  await p.click('#aa');
  await p.click('[data-lang=ar]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.documentElement.dir) === 'rtl', 'Arabic switches the layout to right-to-left');
  await shot(p, '06-arabic');
  await p.click('[data-lang=en]');

  await p.click('#me-btn'); await p.selectOption('#who', 'C-031'); await p.waitForTimeout(250);
  await p.click('.tab[data-go=result]'); await p.waitForTimeout(250);
  ok(/Positive/i.test(await text()) && /colonoscopy/i.test(await text()) && /not a diagnosis/.test(await text()), 'a bowel screening patient sees their own result and next step');
  await shot(p, '07b-bowel-patient');
  // CLOE: a BI-RADS 4 mammogram patient
  await p.click('.tab[data-go=home]'); await p.waitForTimeout(150); await p.click('#me-btn'); await p.selectOption('#who', 'C-040'); await p.waitForTimeout(250);
  await p.click('.tab[data-go=result]'); await p.waitForTimeout(250);
  ok(await p.locator('.rcard .rmeans').count() === 1 && await p.locator('.micro.navy').count() === 1 && /biopsy/i.test(await text()) && /not a diagnosis/.test(await text()), 'mammogram: result card with a plain-language meaning, then the nurse call as the next step');
  await shot(p, '07c-mammo-result');
  ok(await p.isVisible('#yes-bar'), 'the result screen keeps "I understand my result" in reach while scrolling');
  await p.click('.mslot >> nth=0'); await p.waitForTimeout(200);
  ok(/Your 10-minute call/.test(await text()), 'one tap books a 10-minute call with a nurse navigator');
  await p.goto(BASE + 'patient.html?p=C-001&nosplash=1'); await p.waitForTimeout(200);

  // natural voice: when the server says it is set up, Listen asks the server for the audio (Azure is faked here)
  const vctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ar-AE', storageState: await phone.storageState() });
  const v = await vctx.newPage(); watch(v, 'voice');
  let voiceAsked = '';
  await v.route('**/api/jissr-voice**', (r) => { const u = new URL(r.request().url()); if (!u.searchParams.get('text')) return r.fulfill({ contentType: 'application/json', body: '{"ok":true,"voice":true}' }); voiceAsked = u.search; return r.fulfill({ status: 503, body: '' }); });
  await v.goto(BASE + 'patient.html?p=C-001&nosplash=1&view=result&lang=ar'); await v.waitForTimeout(400);
  if (await v.locator('.otp .d').count()) { for (const [i, d] of [...'2026'].entries()) await v.fill(`.otp .d[data-i="${i}"]`, d); await v.waitForTimeout(300); }
  await v.click('#listen'); await v.waitForTimeout(400);
  ok(/lang=ar/.test(voiceAsked) && /text=/.test(voiceAsked), 'Listen uses the natural voice when it is set up');
  await vctx.close();

  // ---------- care team (laptop, same browser storage) ----------
  const desk = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: await phone.storageState() });
  const s = await desk.newPage(); watch(s, 'staff');
  await s.goto(BASE + 'staff.html?as=n1&c=C-001'); await s.waitForTimeout(300);
  ok(/Navigator command center/.test(await s.innerText('#cmd')) && await s.locator('#tbl .sla').count() > 5 && await s.locator('#tbl .phase').count() > 5, 'command center: phases and live SLA countdowns on every case');
  await s.goto(BASE + 'staff.html?as=n1'); await s.waitForTimeout(300); await s.click('[data-filter=sop_refusal]'); await s.waitForTimeout(200);
  ok(/Sana Qureshi/.test(await s.innerText('#tbl')), 'the refusal protocol queue lists the patient who declined');
  await s.goto(BASE + 'staff.html?as=n2&c=C-043'); await s.waitForTimeout(300);
  await s.fill('#sopreason', 'Afraid of the needle, does not want a biopsy now'); await s.click('[data-sop=refusal]'); await s.waitForTimeout(200);
  ok(/recorded/.test(await s.innerText('#drawer')) && /re-contact/i.test(await s.innerText('#drawer')), 'running the refusal protocol records the reason and a 90-day re-contact');
  await s.goto(BASE + 'staff.html?as=d1&c=C-001'); await s.waitForTimeout(300);
  await s.click('#close'); await s.waitForTimeout(150);
  ok(/Not closed/.test(await s.innerText('#drawer')) && await s.locator('.rules li.bad').count() >= 1, 'closing without evidence lists the closure rules that are broken');
  await shot(s, '08b-command-center');
  // ONE APP, TWO SIDES: start screen, then the care team app on a phone
  const ph = await browser.newContext({ ...devices['iPhone 13'], storageState: await desk.storageState() });
  const q = await ph.newPage(); watch(q, 'care app');
  // THE APP: splash, sign in, the patient's Health ID and QR, the assistant and its call, the doctor's lookup and care map
  await q.goto(BASE + 'app.html?splash=1'); await q.evaluate(() => { localStorage.removeItem('falaj.app.user'); });
  await q.goto(BASE + 'app.html?splash=1');
  ok(await q.isVisible('#splash') && await q.locator('#splash .sp-palm').count() === 1, 'the app opens on the splash: water through the workflow to the palm');
  await q.waitForFunction(() => document.getElementById('splash').hidden || !document.getElementById('sp-go').hidden, null, { timeout: 8000 });
  if (await q.isVisible('#sp-go')) await q.click('#sp-go');
  await q.waitForSelector('#t-pat', { timeout: 8000 });
  ok(/Sign in/.test(await q.innerText('#app')) && /I work in care/.test(await q.innerText('#app')), 'after the splash: sign in as a patient or as care');
  await q.click('[data-pat="C-040"]'); await q.waitForSelector('#hid');
  const hid = await q.innerText('#hid');
  ok(/^FLJ-\d{4}-0040$/.test(hid) && await q.locator('.idcard svg.qr').count() === 1, 'the patient sees their Health ID and a QR code');
  await q.click('#chatbtn'); await q.waitForSelector('#chat.chat');
  await q.click('[data-chip="What does my result mean?"]'); await q.waitForSelector('#chat li.ai .src');
  ok(/cannot tell you about results/.test(await q.innerText('#chat')), 'the assistant never gives results');
  await q.click('#chat li.ai:last-child [data-act="nurse"]'); await q.waitForTimeout(200);
  ok(/nurse .*will call you/i.test(await q.innerText('#chat')), 'the assistant can ask a nurse to call');
  await q.click('.back'); await q.waitForSelector('#callme'); await q.click('#callme');
  ok(/is calling you/.test(await q.innerText('#layer')), 'Call me: Falaj calls in the app');
  await q.click('#acc'); await q.waitForSelector('.call .cap');
  ok(/automated voice, not a nurse/.test(await q.innerText('.call .cap')), 'the call says it is an automated voice, with captions');
  await q.click('[data-o="next"]'); await q.click('[data-o="bye"]'); await q.waitForSelector('#done', { timeout: 8000 }); await q.click('#done');
  await q.click('#out'); await q.waitForSelector('#t-care'); await q.click('#t-care'); await q.click('[data-staff="d1"]'); await q.waitForSelector('#fid');
  await q.fill('#fid', hid); await q.fill('#fname', 'Priya Nair'); await q.click('#open'); await q.waitForTimeout(150);
  ok(/No patient matches/.test(await q.innerText('#ferr')), 'a doctor with the right ID but the wrong name sees nothing');
  await q.fill('#fname', 'Priya Raman'); await q.click('#open'); await q.waitForSelector('.cm');
  ok(await q.locator('.cm-dot').count() >= 4 && await q.locator('.hist li').count() >= 6 && await q.locator('.wf-n').count() > 5, 'ID and name open the care map: every place, the history and the falaj');
  await q.click('.cm-dot[data-fac="imD"]'); await q.waitForTimeout(150);
  ok(await q.locator('.hist li').count() === 1, 'tapping a place shows only its records');
  await q.click('#out'); await q.waitForSelector('#t-pat'); await q.click('#t-pat'); await q.click('[data-pat="C-040"]'); await q.waitForSelector('#hid');
  ok(/Dr Mariam Al Hosani/.test(await q.innerText('#app')), 'the patient sees which doctor opened their file');
  await q.goto(BASE + 'care.html?role=specialist'); await q.waitForTimeout(500);
  ok(/Handshakes for you/i.test(await q.innerText('#app')) && await q.locator('.tab').count() === 4, 'the care team app has its own tabs and the specialist sees the handshakes offered to them');
  await q.click('.citem:has-text("Handshake") >> nth=0'); await q.waitForTimeout(250);
  await q.fill('#rnote', 'Accepted, clinic slot this week'); await q.click('#racc'); await q.waitForTimeout(250);
  ok(/You now own this case/.test(await q.innerText('#app')), 'on the phone, a specialist accepts a referral and becomes the owner');
  await shot(q, '09-care-app');
  await q.goto(BASE + 'care.html?role=nurse'); await q.waitForTimeout(400); await q.click('.citem >> nth=0'); await q.waitForTimeout(200);
  ok(/Only a clinician can close/.test(await q.innerText('#app')), 'in the care app a nurse cannot close a case');
  await ph.close();
  // one case, many organisations: a page per role
  // the living map: computed from the same demo cases; a filter keeps the other places visible
  await s.goto(BASE + 'map.html'); await s.waitForSelector('#map text');
  ok(await s.locator('#ems button').count() === 8 && /past their deadline/i.test(await s.innerText('#kp')), 'the living map shows every emirate and the late cases');
  await s.click('[data-view=falaj]'); await s.waitForSelector('[data-cp=understood]');
  await s.click('[data-cp=understood]'); await s.waitForTimeout(150);
  ok(/Patient understood/.test(await s.innerText('#side')) && /The living falaj/.test(await s.innerText('#h1')), 'the living falaj: tapping a shaft shows who is waiting there');
  await s.click('[data-view=emirates]'); await s.click('[data-em=dxb]'); await s.waitForTimeout(200);
  ok(await s.getAttribute('[data-em=dxb]', 'aria-pressed') === 'true' && /Dubai/.test(await s.getAttribute('#map', 'aria-label')), 'the map can be filtered by emirate');
  await shot(s, '08d-map');
  // proof of care: the QR link opens a page that checks the receipt; signing in with UAE PASS is simulated
  await s.goto(BASE + 'verify.html?c=C-012&code=FLJ-0000-0000'); await s.waitForSelector('#out section');
  ok(/Not verified/.test(await s.innerText('#out')), 'a wrong proof-of-care code is refused');
  { const g = await browser.newPage(); await g.goto(BASE + 'patient.html?p=C-012&nosplash=1&fresh=1'); await g.click('#uaep'); await g.waitForSelector('.uaep .qr');
    await g.click('#uaep-ok'); await g.waitForTimeout(400);
    ok(!(await g.$('.otp .d')), 'signing in with UAE PASS (simulated) opens the app');
    await g.goto(BASE + 'patient.html?p=C-012&view=proof&nosplash=1'); await g.waitForSelector('.cp-q .qr');
    const code = await g.innerText('.cp-q code'); await g.goto(BASE + 'verify.html?c=C-012&code=' + code); await g.waitForSelector('#out section');
    ok(/Valid Care Passport/.test(await g.innerText('#out')), 'the code on the Care Passport checks out on the verify page'); await g.close(); }
  // family helper: the patient invites by number, the helper accepts on their own screen, never sees a result
  { const g = await browser.newPage(); await g.goto(BASE + 'patient.html?p=C-004&view=family&nosplash=1&fresh=1');
    if (await g.$('.otp .d')) { const d = await g.$$('.otp .d'); for (let i = 0; i < 4; i++) await d[i].fill('2026'[i]); await g.waitForSelector('#fn'); }
    await g.fill('#fn', 'Aisha'); await g.fill('#fp', '0501234567'); await g.check('#fc'); await g.click('#fam-on'); await g.waitForSelector('.fam-demo a');
    const href = await g.getAttribute('.fam-demo a', 'href'); await g.goto(href); await g.click('#acc'); await g.waitForTimeout(300);
    const txt = await g.innerText('#app');
    ok(/You are helping/.test(txt) && !/\d+(\.\d+)?%/.test(txt), 'the family helper accepts and sees the next step, never a result');
    await g.click('#stop'); ok(!!(await g.$('#sure-yes')), 'stopping asks once before it happens'); await g.click('#sure-no'); ok(!!(await g.$('#stop')), 'Go back keeps the helper helping');
    await g.goto(BASE + 'patient.html?p=C-004&view=family&nosplash=1'); await g.waitForSelector('.fam-state');
    ok(/accepted/.test(await g.innerText('.fam-state')), 'the patient sees that the helper accepted'); await g.close(); }
  await s.goto(BASE + 'roles.html'); await s.waitForTimeout(250);
  ok(await s.locator('.role').count() === 7, 'the "who are you?" page offers patient, lab, nurse, family doctor, specialist, clinical lead and programme manager');
  await shot(s, '08c-roles');
  await s.click('[data-role=specialist]'); await s.waitForSelector('#tbl tr[data-open]');
  ok(/Hospital specialist/.test(await s.innerText('#rolebar')) && /Referral inbox/.test(await s.innerText('#listtitle')) && await s.locator('#tbl tr[data-open]').count() >= 1 && !(await s.isVisible('#funnel')), 'the hospital specialist opens on their referral inbox');
  await s.goto(BASE + 'roles.html'); await s.click('[data-role=gp]'); await s.waitForSelector('#tbl tr[data-open]');
  ok(/Decisions for the family doctor/.test(await s.innerText('#listtitle')) && await s.locator('#tbl tr[data-open]').count() >= 1, 'the family doctor opens on the decisions waiting for them');
  await s.goto(BASE + 'staff.html?as=n1&c=C-001'); await s.waitForTimeout(300);
  ok(/Care journey funnel/.test(await s.innerText('#funnel')) && /synthetic/.test(await s.innerText('#funnel')), 'the care team sees where patients drop out, labelled as demo data');
  ok(/Appointment booked/.test(await s.innerText('#drawer')), 'the care team sees the patient\'s booking');
  await s.goto(BASE + 'staff.html?as=c1&new=1'); await s.waitForTimeout(200);
  await s.fill('#i-name', 'Test Patient'); await s.fill('#i-val', '5.2'); await s.click('#i-go');
  ok(/not an actionable result/.test(await s.innerText('#i-err')), 'a result below 5.7% opens no case');
  await s.fill('#i-val', '11.4'); await s.waitForTimeout(100);
  ok(/Urgent/.test(await s.innerText('#i-preview')), 'the form previews what the rules will do');
  await shot(s, '07-new-result');
  await s.click('#i-go'); await s.waitForTimeout(300);
  const dr = await s.innerText('#drawer');
  ok(/C-0[3-9][0-9]/.test(dr) && /Nurse/.test(dr) && /Urgent/.test(dr), 'a new urgent result is owned by a nurse, by rule');
  await shot(s, '08-new-case');
  await s.goto(BASE + 'staff.html?as=c1&new=1'); await s.waitForTimeout(200);
  await s.fill('#i-name', 'Bowel Test'); await s.selectOption('#i-prog', 'fit'); await s.selectOption('#i-fit', 'negative'); await s.click('#i-go');
  ok(/negative FIT/i.test(await s.innerText('#i-err')), 'a negative bowel screening test opens no case');
  await s.selectOption('#i-fit', 'positive'); await s.click('#i-go'); await s.waitForTimeout(300);
  ok(/FIT \+/.test(await s.innerText('#drawer')) && /Bowel cancer screening/.test(await s.innerText('#drawer')), 'a positive bowel screening test opens a case in the same engine');
  await s.goto(BASE + 'staff.html?as=n1&prog=fit'); await s.waitForTimeout(200);
  ok((await s.locator('#tbl tr.click').count()) >= 6 && !(/HbA1c ·/.test(await s.innerText('#tbl'))), 'the list can be filtered to one programme');
  await shot(s, '12-bowel-programme');
  await s.goto(BASE + 'staff.html?as=n1&c=C-002'); await s.waitForTimeout(200);
  ok(await s.isDisabled('#close'), 'a nurse cannot close a case');
  await s.selectOption('#me', 'd1'); await s.waitForTimeout(100);
  await s.fill('#cev', 'short'); await s.click('#close'); await s.waitForTimeout(100);
  ok(/evidence/i.test(await s.innerText('#drawer')) && !/Closed by/.test(await s.innerText('#drawer')), 'closing without real evidence is refused');
  await s.fill('#cev', 'Seen 12 Nov, repeat HbA1c 7.0%, plan agreed, review in 3 months.'); await s.click('#close'); await s.waitForTimeout(150);
  ok(/Closed by Dr Mariam/.test(await s.innerText('#drawer')), 'a clinician closes with evidence');
  await s.goto(BASE + 'staff.html?as=d1&c=C-008'); await s.waitForTimeout(150);
  await s.fill('#rwhy', 'Needs specialist review of treatment.'); await s.click('#rsend');
  await s.selectOption('#me', 'e1'); await s.waitForTimeout(100); await s.click('#racc');
  ok(/Dr Salma Haddad/.test(await s.innerText('#drawer')), 'accepting a referral hands the case to the specialist');
  await s.fill('#rrep', 'Seen, treatment adjusted, review in 3 months.'); await s.click('#rdone');
  await s.selectOption('#me', 'd1'); await s.waitForTimeout(100); await s.click('#step');
  ok(/Treatment or surveillance plan/.test(await s.innerText('#drawer')), 'the plan is recorded after the report back');
  await s.goto(BASE + 'staff.html?as=n1'); await s.waitForTimeout(200);
  ok(await s.locator('#alerts .task').count() > 0, 'the clinical lead alerts panel lists urgent cases');
  await shot(s, '09-care-team');

  // ---------- tour + measures ----------
  // the full patient app: the AI call, a result told by a person first, booking the held time, the passport
  { const m = await browser.newPage(); await m.goto(BASE + 'me.html?reset=1&fast=1&p=C-040');
    await m.click('#answer'); await m.click('#caccept'); const callTxt = await m.innerText('.call');
    ok(/cannot talk about results/.test(callTxt) && !/BI-RADS|biopsy/i.test(callTxt), 'the AI call never talks about the result');
    await m.click('#cclose'); await m.goto(BASE + 'me.html?fast=1&p=C-040&tab=result');
    ok(!/BI-RADS|biopsy/i.test(await m.innerText('main')), 'a suspicious mammogram is not shown in the app before a person has called');
    await m.goto(BASE + 'team.html?as=n2'); ok(/Asked to talk to a nurse/.test(await m.innerText('main')), 'the nurse sees that the patient asked for a call');
    await m.goto(BASE + 'team.html?as=n2&c=C-040'); await m.click('[data-act="call"]'); await m.click('[data-call="understood"]'); await m.waitForTimeout(200);
    await m.goto(BASE + 'me.html?fast=1&p=C-040'); await m.click('#book'); await m.click('#do-book'); await m.waitForTimeout(200);
    ok(/Your visit/.test(await m.innerText('main')) && (await m.$$('main .chan2 li.done')).length === 3, 'the patient books the held time; three steps are done, and a booking is not care');
    await m.goto(BASE + 'me.html?fast=1&p=C-040&tab=family'); await m.fill('#fn', 'Anu'); await m.fill('#fp', '12345'); await m.check('#fc'); await m.click('#faminvite');
    ok(/UAE mobile/.test(await m.innerText('main')), 'the family invitation needs a UAE mobile number');
    await m.goto(BASE + 'me.html?fast=1&p=C-040&tab=passport');
    ok(/Nurse Peter/.test(await m.innerText('main')), 'the passport shows each step and who did it');
    await m.goto(BASE + 'me.html?fast=1&p=C-040&tab=messages');
    ok(/Reply YES/.test(await m.innerText('main')) && /In English/.test(await m.innerText('main')), 'messages arrive in the patient\'s language, with a translation');
    await m.goto(BASE + 'me.html?fast=1&p=C-040&tab=passport'); await m.click('#share'); await m.click('#do-share'); await m.waitForSelector('[data-unshare]');
    const shareHref = await m.getAttribute('main a.light[href*="&s="]', 'href');
    await m.goto(BASE + shareHref); await m.waitForSelector('#out section');
    const sv = await m.innerText('#out');
    ok(/Shared Care Passport/.test(sv) && /Malayalam/.test(sv) && !/BI-RADS|biopsy|\d+(\.\d+)?%/i.test(sv), 'a shared passport opens for the new doctor, with what the patient chose, never the result');
    await m.goto(BASE + 'me.html?fast=1&p=C-040&tab=passport'); await m.click('[data-unshare]'); await m.waitForTimeout(200);
    await m.goto(BASE + shareHref); await m.waitForSelector('#out section');
    ok(/Link not valid/.test(await m.innerText('#out')), 'when the patient stops sharing, the link stops working');
    await m.goto(BASE + 'me.html?reset=1&p=&lang=en'); await m.close(); }
  // the Falaj flow and the channel map
  { const f = await browser.newPage(); await f.goto(BASE + 'team.html?reset=1&as=n2');
    ok(!!(await f.$('ol.falaj')) && /Needs you/i.test(await f.innerText('main')), 'the care team app opens on the falaj, then what needs you');
    await f.click('[data-scope="all"]'); await f.click('button.ch[data-flow]');
    ok(/stopped here/i.test(await f.innerText('main')) && (await f.$$('main .stopped .prog')).length > 0, 'tapping a channel shows who stopped there, right under it, with their progress');
    await f.click('#agents-more'); ok(/never confirm understanding/.test(await f.innerText('#sheet')), 'the agents say what they never do');
    await f.click('#runagents'); await f.waitForTimeout(300);
    ok(/Overnight, Falaj made \d+ call/.test(await f.innerText('.agline')), 'after a run, one line says what the agents did');
    await f.click('#agents-more'); await f.click('#newdoc'); await f.click('#in-read'); await f.click('#in-create');
    ok(/confirm the result/i.test(await f.innerText('#sheet')), 'the Intake agent will not create a case until a person confirms the result');
    await f.check('#in-ok'); await f.click('#in-create'); await f.waitForSelector('.ticks');
    ok(/Case created/.test(await f.innerText('.ticks')) && /Acknowledgment sent/.test(await f.innerText('.ticks')), 'a document becomes a case: owner, acknowledgment, outreach');
    await f.click('#in-open'); ok(/Meera Pillai/.test(await f.innerText('main')), 'the new case opens with its Care Passport');
    await f.goto(BASE + 'pathways.html'); await f.click('[data-node="1"]');
    ok(/may never/i.test(await f.innerText('.panel')) && /result or a diagnosis/.test(await f.innerText('.panel')), 'the channel map says what the AI may never do');
    await f.close(); }
  // the full care team app: nurse calls and books, family doctor refers, the clinic accepts and closes, on one patient
  { const t = await browser.newPage(); await t.goto(BASE + 'team.html?reset=1'); await t.click('[data-as="n2"]');
    const cid = await t.getAttribute('.hl a.wide', 'data-case'); await t.click('.hl a.wide');
    await t.click('[data-act="call"]'); ok(!!(await t.$('[data-call="understood"]')), 'a nurse can confirm understanding after a call');
    await t.click('[data-call="understood"]'); await t.waitForSelector('[data-act="book"]');
    await t.click('[data-act="book"]'); await t.click('#do-book'); await t.waitForSelector('main .card.status');
    ok(/Visit booked/.test(await t.innerText('main')) && !!(await t.$('main .wf-n[data-node="p4"].done')) && !!(await t.$('main .wf-n[data-node="k11"].todo')), 'the nurse books: the booking box fills, the loop is still to come: a booking is not care');
    await t.goto(BASE + `team.html?as=d1&c=${cid}`); await t.click('[data-act="attended"]'); await t.waitForSelector('[data-act="refer"]');
    await t.click('[data-act="refer"]'); const to = await t.getAttribute('input[name=to]:checked', 'value'); await t.click('#do-refer'); await t.waitForTimeout(200);
    ok(/You stay responsible/.test(await t.innerText('main')), 'the family doctor stays responsible until the referral is accepted');
    const spec = await t.evaluate((org) => JSON.parse(localStorage.getItem('jissr.demo.v4')).staff.find((x) => x.org === org).id, to);
    await t.goto(BASE + `team.html?as=${spec}`); ok(/Referral waiting/.test(await t.innerText('main')), 'the specialist sees the referral first');
    await t.click('.hl a.wide'); await t.click('[data-act="accept"]'); await t.waitForSelector('[data-act="consult"]');
    await t.click('[data-act="consult"]'); ok((await t.getAttribute('#dictate', 'aria-disabled')) === 'true' && !(await t.$('#do-consult')), 'no voice note without consent');
    await t.click('#cs'); await t.click('#dictate'); await t.click('#do-consult'); await t.waitForTimeout(300);
    ok(!!(await t.$('main .wf-n[data-node="k11"].done')) && /Loop closed/.test(await t.innerText('main')), 'the clinic confirms the consultation: the loop-closed box fills');
    await t.click('[data-act="add"]'); await t.fill('#add-t', 'Ultrasound'); await t.fill('#add-v', 'Finding as written in the report'); await t.click('#do-add'); await t.waitForTimeout(200);
    ok(/Lab added\s*Ultrasound/.test(await t.innerText('main .wf')), 'a lab added appears as a new box in the patient\'s falaj');
    await t.goto(BASE + 'team.html?reset=1'); await t.close(); }
  await s.goto(BASE + 'index.html'); await s.waitForTimeout(200);
  ok((await s.getAttribute('#b0', 'href')) === 'loop.html', 'the home page leads to the three moments');
  // the three moments, on Priya's real case: call, nurse, hand over, close, then the proof verifies
  { const l = await browser.newPage(); await l.goto(BASE + 'loop.html?fast=1');
    await l.click('#answer'); await l.waitForSelector('.chat li');
    const call = await l.innerText('#main');
    ok(/Held/.test(call) && /will call today/.test(call) && !/\d+(\.\d+)?%/.test(call), 'the call holds the visit, hands worry to the nurse, never gives a result');
    await l.click('#next'); ok(/Call today/i.test(await l.innerText('#main')), 'the nurse sees Priya flagged: call today');
    await l.click('#callp'); ok(/understood/i.test(await l.innerText('#main')), 'the nurse checks understanding before the visit is confirmed');
    await l.click('#next'); ok(/Keeper:.*Mariam/s.test(await l.innerText('main .wc')), 'the Care Passport shows the family doctor as owner');
    await l.click('#openp'); await l.click('#next'); ok(/Waiting for the breast clinic/.test(await l.innerText('#main')), 'the GP stays responsible until the specialist accepts');
    await l.click('#next'); ok(/Accepted by/.test(await l.innerText('#main')) && /Keeper:.*Noura/s.test(await l.innerText('main .wc')), 'the specialist accepts, and the Care Passport moves to them');
    await l.click('#next'); ok((await l.getAttribute('#rec', 'aria-disabled')) === 'true', 'no recording without the patient\'s consent');
    await l.click('#consent'); await l.click('#rec'); await l.waitForSelector('#next');
    await l.click('#next'); ok(/Clinical note/i.test(await l.innerText('#sheet')), 'the voice note becomes a draft clinical note, reviewed in a sheet');
    await l.click('#confirm'); ok(/Loop closed/.test(await l.innerText('#main')) && (await l.$$('#main .wc-steps li.done')).length === 7, 'confirming closes the loop: the water reaches the palm');
    await l.close(); }
  ok((await s.getAttribute('#bapp', 'href')) === 'app.html', 'the home page opens the app');
  await s.goto(BASE + 'jury.html'); await s.waitForTimeout(200);
  ok((await s.getAttribute('#b3', 'href')) === 'loop.html' && !(await s.$('a[href="map.html"]')), 'the jury page leads to the story, and the removed parts are not linked');
  await s.goto(BASE + 'index.html'); await s.waitForTimeout(200);
  await s.goto(BASE + 'care.html?role=specialist&tour=3'); await s.waitForSelector('.tour');
  ok(/step 4 of 8/i.test(await s.innerText('.tour')) && /handshake/i.test(await s.innerText('.tour')), 'the tour card shows on each step, in the care team app too');
  await s.click('.tour .nx');
  const moved = await s.waitForURL(/role=gp.*tour=4/, { timeout: 10000 }).then(() => s.waitForSelector('.tour', { timeout: 10000 })).then(() => true, () => false);
  ok(moved, 'Next moves to the following step');
  await s.goto(BASE + 'trust.html?run=1');
  const res = await s.waitForFunction(() => document.body.dataset.result, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => 'none');
  ok(/^(\d+)\/\1$/.test(res), 'the live safety checks all pass (' + res + ')');
  await s.click('[data-a="0"]');
  ok(/Blocked/.test(await s.innerText('#verdict')) && /AI cannot/.test(await s.innerText('#verdict')), 'trying to make the AI close a case is blocked');
  await shot(s, '11-safety', true);
  await s.goto(BASE + 'impact.html'); await s.waitForTimeout(200);
  const before = await s.innerText('#r-x');
  await s.fill('#c-u', '30'); await s.dispatchEvent('#c-u', 'input'); await s.waitForTimeout(100);
  ok(before !== await s.innerText('#r-x') && (await s.locator('.fact cite a').count()) >= 5, 'impact page: every figure has a source and the calculator responds');
  await shot(s, '13-impact', true);
  await s.goto(BASE + 'pilot.html'); await s.waitForTimeout(200);
  ok((await s.locator('.ph').count()) === 3 && (await s.locator('#arch svg').count()) === 1, 'pilot page shows the 90-day plan and the architecture');
  await shot(s, '14-pilot', true);
  await s.goto(BASE + 'metrics.html'); await s.waitForTimeout(300);
  ok(await s.locator('#funnel .fun').count() === 9, 'the measures page renders');
  await shot(s, '10-measures', true);

  ok(errors.length === 0, 'no errors in any page' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
