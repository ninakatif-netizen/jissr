# Falaj · design brief (the reference for every change)

## The one idea (never add a second one)
Falaj is the care team's view of every abnormal result as water flowing to care. Each step is a channel with a
named keeper and a deadline. When the water stops, Falaj shows who, where and since when, and does the routine
work to start it flowing again. People decide; the system never does.

## The metaphor, used precisely
| Falaj | Product |
|---|---|
| The source (umm al falaj) | The lab result arrives |
| The channel | reached, understood, booked, seen, next step (referral or plan), closed |
| The access shafts | Checkpoints with deadlines, set by rules |
| The keeper (arif) | The named owner of each patient |
| A blockage | A patient stopped at a channel; amber when overdue |
| The palm reached | The loop closed, confirmed by a doctor |
No other metaphor (no passport, no booklet, no stamps).

## Users, in order
1. Nurse navigator: who do I call first, and why?
2. Family doctor: who did I see, and what must I decide or refer?
3. Specialist: which referrals wait for me to accept?
4. The patient is not an app user: they receive messages and calls in their language, and one page of next steps from a link.

## Screens (nothing more)
1. The falaj (home per person): channels top to bottom, tap one to see who stopped there; then Needs you.
2. The patient (care team view): their channel, keeper, next checkpoint, the one action; timeline folded.
3. The action sheet: call + teach-back, book, refer, accept or decline, consultation (consent, voice note, confirm).
4. The patient's page from a link: the message in their language, the next step, the appointment, talk to a nurse.
Plus, for the pitch: Watch the story (Priya), and one For the jury page.

## Agents
Intake, Outreach, Booking, Referral, Insurance. Background only: timeline lines and one summary line on the home.
They never confirm understanding, record a visit, accept a referral or close a loop.

## Design system
iOS structure, system font, large titles. Navy for text and actions, sand background, water blue only for flow,
green only for done, amber only for stopped or overdue. One primary button per screen. Only the water moves
(off with reduced motion). WCAG 2.2 AA, 44 pt targets, Arabic RTL, dark mode.

## Honesty
Synthetic data; every simulation labelled; only the two published trial figures; the AI never gives a result;
clinical rules marked proposed until a clinician signs off; secrets only in Vercel.

## Done means
Each clinician does their job from the home in two taps or fewer; the idea is clear in ten seconds; the story
runs in under three minutes; unit, e2e and accessibility tests pass on phone and laptop; screenshots at 390x844
reviewed before publishing.
