# Falaj · 3-minute pitch

Future Health Challenge 2026, challenge 05: closing the screening-to-care loop.
Live demo: https://jissr-three.vercel.app/loop.html ("See it in 3 moments" on the home page).

## The opening slide

> For centuries, the falaj made sure water reached where life depended on it, with a named keeper for every
> channel. Falaj does the same for abnormal screening results.

**Falaj is the care team's view of every abnormal result as water flowing to care.** Each step is a channel
with a named keeper and a deadline. When the water stops, Falaj shows who, where and since when, and its agents
do the routine work to start it flowing again. People decide; the system never does.

## What already exists (say it before the judges do)

- **Screening follow-up platforms (US):** Azra AI (oncology navigation, incidental findings, closed-loop
  tracking over the hospital record), Inflo Health (diagnostic-to-care orchestration).
- **Referral coordination:** Infina Connect (referring and receiving teams, referral status).
- **Patient outreach:** Luma Health (AI outreach, scheduling, missed-visit recovery).
- **Patient-held records:** Patients Know Best (UK). **National recall:** NHS cervical screening.

**The evidence that it works:**
- Atlas et al., *JAMA* 2023;330(14):1348-58 (mFOCUS, 44 practices): completion within 120 days was 22.9% with
  usual care, 22.7% with reminders in the record alone, 31.0% with reminders + patient outreach, 31.4% with
  outreach + navigation. **Reminders alone did nothing; reaching the patient did.**
- Coronado et al., *Annals of Internal Medicine* 2025 (32 community clinics, Washington State, about 970 patients):
  bilingual telephone navigation after an abnormal stool test: colonoscopy within a year 55.1% vs 42.1%
  (difference 13.0 points, 95% CI 6.5 to 19.4). **Reaching people in their language works.**

**The gap Falaj fills:** about nine in ten UAE residents are expatriates (estimate; no recent official breakdown),
speaking many languages, often on shifts, moving between public and private providers, insurers and jobs.
Abu Dhabi already shares records through Malaffi; what is missing is a responsible person and a patient-facing
journey across those organisations. **Falaj is the care team's falaj for a multilingual, multi-provider system.**

Do not say: "we invented closed-loop care", "AI replaces navigators", or any figure not in this list.

## From a lab result to a notification (how to explain the automation)

One sentence: "When a result arrives, Falaj's rules decide in seconds what kind of result it is, how fast it must go, who looks after it and how the patient is told. Agents send and chase; a person tells anything serious and makes every decision."

Result arrives (person confirms) → Sorted (rules) → Deadlines set (rules) → Keeper named (rules) → How to tell (rules: serious = a person calls) → Notified (agent, never talks about the result) → Watched until done (rules + people).

Say the example: Priya, BI-RADS 4 → priority, 14 days, keeper Nurse Peter → no text message; the agent calls in Malayalam without the result, holds a slot, asks the nurse to call today → the nurse tells her.

Why not just a notification: reminders alone 22.7% vs usual care 22.9%; outreach 31.0%, outreach + navigation 31.4% (Atlas, JAMA 2023). Shown on the jury page, section "From a lab result to the patient's phone".

## Before / with Falaj (no invented numbers)

| Before | With Falaj |
|---|---|
| The result leaves as a letter or portal message, often in a language the patient does not read | The Intake agent reads the report, a person confirms the result, rules set an owner and a deadline the same day |
| Nobody is named as responsible | The Outreach agent calls in the patient's language; a nurse checks understanding |
| A referral waits for days unnoticed | The sender stays responsible until acceptance; the Referral agent chases after 2 days |
| Nobody knows if the patient was seen | The loop closes only when a doctor confirms care, and the sender is told |

Figures: only the two published trials above. Falaj itself has not been measured; that is what a pilot is for.

## The script (about 3 minutes)

**0:00 · The problem (25 s)**
"A screening result only saves a life if it reaches a doctor. Today it is a letter or a portal message.
Many people never open it, never book, or get lost between two doctors. And nobody notices."

**0:25 · The idea (15 s)**
Say the one sentence. "Three moments: call, hand over, close."

**0:40 · Moment 1, the call and the nurse (55 s)**
Priya's phone rings. "Priya, 47, speaks Malayalam. Her mammogram needs a closer look, and her letter has
waited 3 days. Falaj calls her in her language. She asks 'is it something bad?' The assistant never talks
about results: it holds a visit around her work, and flags her to Nurse Peter. Nurse Peter calls the same
day, and Priya explains the next step back in her own words. Only then is the visit confirmed."

**1:35 · Moment 2, the hand over (30 s)**
"Dr Mariam, her family doctor, sees her and refers her. Priya chose what is shared. Dr Mariam stays
responsible until the breast clinic accepts; no answer in 2 days raises an alarm. Nothing falls between
two doctors."

**2:05 · Moment 3, the close (35 s)**
"In the consultation, with Priya's consent, Dr Noura dictates. The words become a draft note she checks
and confirms. Only then is the loop closed: the water reaches the palm, and every channel shows who did it and when. The audio is deleted; only the confirmed note is kept."

**2:40 · Why we can be trusted (15 s)**
"The AI only talks and writes. Rules and people decide: who owns the case, the deadlines, and the closing."

**2:55 · Close (5 s)**
"Falaj: no abnormal result left without an owner."

## Honest answers to expected questions

- **Is the data real?** No. Synthetic cases only; every source is declared in DATA-SOURCES.md.
- **Are the clinical rules validated?** Proposed by the team's medical student; awaiting sign-off by a
  supervising clinician.
- **Integrations?** Simulated: the health information exchange (Malaffi), national digital identity, insurers.
  The jury page lists what a pilot would need.
- **Translations?** The first message exists in 7 languages as drafts for medical translators.
- **AI?** It only talks and drafts wording. Fixed rules decide urgency, owners, deadlines and closure.
- **Is the AI call real?** Simulated in the demo. A real call needs a telephony provider, the patient's
  consent to be called, and Department of Health approval.
- **Recording a consultation?** Only with the patient's explicit consent; designed for zero retention of
  the audio. A pilot needs a provider contract that guarantees it, and data kept in the UAE.

## Plan B if the internet fails

- Open the app once before the pitch: it works offline afterwards (installable web app).
- Keep screenshots of the three moments on the laptop.
- Reset the demo data before presenting: open team.html?reset=1.
