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
  ok(await p.locator('.gauge svg').count() === 1 && /not a diagnosis/.test(await text()), 'result shows the gauge and "not a diagnosis"');
  await shot(p, '03-result');
  await p.click('#yes'); await p.click('.tab[data-go=home]'); await p.click('#next-go');
  await p.click('[data-b=time_shift]'); await p.waitForTimeout(150);
  const times = await p.locator('.dt em').allInnerTexts();
  ok(times.length > 0 && times.every((t) => ['07:30', '18:30', '19:30'].includes(t)), 'shift workers get early or evening slots');
  await p.click('.dt >> nth=0'); await shot(p, '04-book'); await p.click('#confirm'); await p.waitForTimeout(250);
  ok(/Your visit is booked/.test(await text()), 'booking is confirmed');
  await p.click('.tab[data-go=home]'); await p.waitForTimeout(200);
  ok(/Upcoming appointment/.test(await text()), 'home shows the appointment card');
  await shot(p, '05-home-booked');
  await p.click('#aa'); ok(await p.evaluate(() => document.documentElement.classList.contains('big')), 'bigger text can be switched on');
  await p.click('#aa');
  await p.click('[data-lang=ar]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.documentElement.dir) === 'rtl', 'Arabic switches the layout to right-to-left');
  await shot(p, '06-arabic');
  await p.click('[data-lang=en]');

  // ---------- care team (laptop, same browser storage) ----------
  const desk = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: await phone.storageState() });
  const s = await desk.newPage(); watch(s, 'staff');
  await s.goto(BASE + 'staff.html?as=n1&c=C-001'); await s.waitForTimeout(300);
  ok(/Appointment booked/.test(await s.innerText('#drawer')), 'the care team sees the patient\'s booking');
  await s.goto(BASE + 'staff.html?as=c1&new=1'); await s.waitForTimeout(200);
  await s.fill('#i-name', 'Test Patient'); await s.fill('#i-val', '5.2'); await s.click('#i-go');
  ok(/not an actionable result/.test(await s.innerText('#i-err')), 'a result below 5.7% opens no case');
  await s.fill('#i-val', '11.4'); await s.waitForTimeout(100);
  ok(/Urgent/.test(await s.innerText('#i-preview')), 'the form previews what the rules will do');
  await shot(s, '07-new-result');
  await s.click('#i-go'); await s.waitForTimeout(300);
  const dr = await s.innerText('#drawer');
  ok(/C-031/.test(dr) && /Nurse/.test(dr) && /Urgent/.test(dr), 'a new urgent result is owned by a nurse, by rule');
  await shot(s, '08-new-case');
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
  await s.goto(BASE + 'index.html'); await s.waitForTimeout(200);
  ok((await s.getAttribute('#b3', 'href')).includes('tour=0'), 'the home page offers the guided tour');
  await s.goto(BASE + 'staff.html?as=n1&filter=attention&tour=3'); await s.waitForTimeout(200);
  ok(/step 4 of 8/i.test(await s.innerText('.tour')), 'the tour card shows on each step');
  await s.click('.tour .nx');
  const moved = await s.waitForURL(/tour=4/, { timeout: 10000 }).then(() => s.waitForSelector('#modal.open', { timeout: 10000 })).then(() => true, () => false);
  ok(moved, 'Next moves to the following step');
  await s.goto(BASE + 'trust.html?run=1');
  const res = await s.waitForFunction(() => document.body.dataset.result, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => 'none');
  ok(/^(\d+)\/\1$/.test(res), 'the live safety checks all pass (' + res + ')');
  await s.click('[data-a="0"]');
  ok(/Blocked/.test(await s.innerText('#verdict')) && /AI cannot/.test(await s.innerText('#verdict')), 'trying to make the AI close a case is blocked');
  await shot(s, '11-safety', true);
  await s.goto(BASE + 'metrics.html'); await s.waitForTimeout(300);
  ok(await s.locator('#funnel .fun').count() === 9, 'the measures page renders');
  await shot(s, '10-measures', true);

  ok(errors.length === 0, 'no errors in any page' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
