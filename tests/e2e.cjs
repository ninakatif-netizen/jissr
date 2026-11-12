// Browser test of the whole demo: the app, the patient's steps, the care team website, the story, home and jury.
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

  const ph = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-GB' });
  const q = await ph.newPage(); watch(q, 'app');
  // THE APP: splash, sign in, the patient's Health ID and QR, the assistant and its call, the doctor's lookup and care map
  await q.goto(BASE + 'app.html?splash=1'); await q.evaluate(() => { localStorage.removeItem('falaj.app.user'); });
  await q.goto(BASE + 'app.html?splash=1');
  ok(await q.isVisible('#splash') && await q.locator('#splash .sp-palm').count() === 1, 'the app opens on the splash: water through the workflow to the palm');
  await q.waitForFunction(() => document.getElementById('splash').hidden || !document.getElementById('sp-go').hidden, null, { timeout: 8000 });
  if (await q.isVisible('#sp-go')) await q.click('#sp-go');
  await q.waitForSelector('#t-pat', { timeout: 8000 });
  ok(/Welcome to Falaj/.test(await q.innerText('#app')) && /I work in care/.test(await q.innerText('#app')), 'after the splash: sign in as a patient or as care');
  await q.click('[data-pat="C-040"]'); await q.waitForSelector('#tab-id');
  ok(await q.locator('.hero2 .track li').count() === 5 && await q.locator('#tabs a').count() === 3, 'the patient lands on Today: the next step and the journey first, three tabs');
  await q.click('#tab-id'); await q.waitForSelector('#hid');
  const hid = await q.innerText('#hid');
  ok(/^FLJ-\d{4}-0040$/.test(hid) && await q.locator('.pass svg.qr').count() === 1, 'the patient sees their Health ID and a QR code');
  await q.click('#tab-ask'); await q.waitForSelector('#chat.chat');
  await q.click('[data-chip="What does my result mean?"]'); await q.waitForSelector('#chat li.ai .src');
  ok(/cannot tell you about results/.test(await q.innerText('#chat')), 'the assistant never gives results');
  await q.click('#chat li.ai:last-child [data-act="nurse"]'); await q.waitForTimeout(200);
  ok(/nurse .*will call you/i.test(await q.innerText('#chat')), 'the assistant can ask a nurse to call');
  await q.click('#callme');
  ok(/is calling you/.test(await q.innerText('#layer')), 'Call me: Falaj calls in the app');
  await q.click('#acc'); await q.waitForSelector('.call .cap');
  ok(/automated voice, not a nurse/.test(await q.innerText('.call .cap')), 'the call says it is an automated voice, with captions');
  await q.click('[data-o="next"]'); await q.click('[data-o="bye"]'); await q.waitForSelector('#done', { timeout: 8000 }); await q.click('#done');
  await q.click('#tab-me'); await q.waitForSelector('#out'); await q.click('#out'); await q.waitForSelector('#t-care'); await q.click('#t-care'); await q.click('[data-staff="d1"]'); await q.waitForSelector('#fid');
  await q.fill('#fid', hid); await q.fill('#fname', 'Priya Nair'); await q.click('#open'); await q.waitForTimeout(150);
  ok(/No patient matches/.test(await q.innerText('#ferr')), 'a doctor with the right ID but the wrong name sees nothing');
  await q.fill('#fname', 'Priya Raman'); await q.click('#open'); await q.waitForSelector('.cm');
  ok(await q.locator('.cm-dot').count() >= 4 && await q.locator('.hist li').count() >= 6, 'ID and name open the care map: every place and the history');
  await q.click('[data-v="falaj"]'); ok(await q.locator('.wf-n').count() > 5, 'one tap shows this result\'s falaj');
  await q.click('[data-v="history"]');
  await q.click('.cm-dot[data-fac="imD"]'); await q.waitForTimeout(150);
  ok(await q.locator('.hist li').count() === 1, 'tapping a place shows only its records');
  await q.click('#out'); await q.waitForSelector('#t-pat'); await q.click('#t-pat'); await q.click('[data-pat="C-040"]'); await q.waitForSelector('#o-acc');
  await ph.close();
  const s = await browser.newPage(); watch(s, 'site');
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
  // the website: five clear pages, one navigation, nothing old linked
  await s.goto(BASE + 'index.html'); await s.waitForTimeout(200);
  ok((await s.getAttribute('#bapp', 'href')) === 'app.html' && /team\.html/.test(await s.getAttribute('#bteam', 'href')) && (await s.getAttribute('#b0', 'href')) === 'loop.html', 'the home page opens the app, the care team website and the story');
  await shot(s, 'home', true);
  await s.goto(BASE + 'jury.html'); await s.waitForTimeout(200);
  ok(await s.locator('#demo li').count() === 4 && await s.locator('#result-to-notification .r2n li').count() === 7, 'the jury page gives a 4-step demo path and the 7 steps from result to notification');
  await shot(s, 'jury', true);
  const OK = new Set(['index.html', 'app.html', 'team.html', 'me.html', 'loop.html', 'jury.html', 'verify.html', 'family.html']);
  const bad = [];
  for (const u of ['index.html', 'jury.html', 'app.html?nosplash=1', 'team.html?as=n2', 'me.html?p=C-040', 'loop.html', 'verify.html', 'family.html']) {
    await s.goto(BASE + u); await s.waitForTimeout(300);
    for (const h of await s.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))) { const f = (h.match(/^([a-z-]+\.html)/) || [])[1]; if (f && !OK.has(f)) bad.push(`${u} -> ${h}`); }
  }
  ok(bad.length === 0, 'no page links to a removed page' + (bad.length ? ': ' + bad.join(', ') : ''));

  ok(errors.length === 0, 'no errors in any page' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
