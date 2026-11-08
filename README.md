# Jissr · جسر

Prototype for the **Future Health Challenge 2026**, challenge "Closing the Screening-to-Care Loop".
Three programmes on one engine: abnormal HbA1c (diabetes), positive FIT (bowel cancer) and suspicious mammograms (BI-RADS 0, 4, 5). **All data is synthetic. Not medical advice.**

## Data
No organiser data and no real personal data are used. Every source and licence is declared in [DATA-SOURCES.md](DATA-SOURCES.md).

## Pages
- `index.html`: home, and a short "who decides what" (rules vs AI)
- `patient.html`: patient app (English / Arabic): plain-language result, barrier check-in, booking, reminders, nurse, family helper
- `staff.html`: care-team dashboard: full journey per case, owners, service levels, escalation queue, confirmation, referrals and hand-offs, clinician-to-clinician advice, clinician-only closing
- `metrics.html`: live measures (time to each step, referral completion, unresolved results, reasons for delay, patient confidence)
- `animation/index.html`: 50-second opening story

## How it is built
- `core/rules.mjs`: HbA1c bands, due dates, barrier plans, AI safety filter (plain logic, no AI)
- `core/cases.mjs`: case rules: confirmation, referral accept/reject and report back, ownership hand-offs, clinician questions. Only a clinician with written evidence can close a case; the AI is refused every action
- escalation and service levels are in `core/rules.mjs` (fixed rules, no AI)
- `core/templates.mjs`: pre-written English/Arabic messages (fallback when AI is off)
- `core/data.mjs`: 43 invented patients (30 HbA1c, 8 FIT, 5 mammogram)
- `api/_jissr-ai.js`: the one place that talks to an AI provider (Anthropic or Azure OpenAI)
- `api/jissr-explain.js`: serverless endpoint that asks the AI to word a message, then safety-checks it

## CLOE: Care Loop Orchestration Engine
A navigator's view on top of the detailed journey (it does not replace it):
- **Five phases** (`cloePhase` in `core/rules.mjs`): ISSUED → NOTIFIED → MICRO_CONSULT_BOOKED → REFERRED → CLOSED. Each maps to the detailed stages, so the audit trail and the rules stay the same.
- **SLA clock in hours** (`slaClock`, `slaText`): runs on the first service-level step not yet done, or on the specialist's reply while a referral waits. Tiers: ON_TRACK, WARNING (under 24 h or under a quarter of the window left), BREACHED. Countdowns refresh every minute on `staff.html`.
- **Closure rules** (`CLOSURE_RULES`, `validateClosure` in `core/cases.mjs`): 8 rules, all must hold; clinician sign-off with written evidence; "informed refusal" needs the refusal protocol first.
- **Patient side** (`patient.html`): reassurance banner and plain-language summary card (mammogram), one-tap 10-minute call with a nurse navigator (`microConsultSlots`, `bookMicroConsult`), teach-back comprehension check.
- **Navigator command center** (`staff.html`): live SLA tiers, phase and countdown on every case, protocol queues and buttons (`SOPS`, `sopsFor`, `runSop`): unread outreach, stalled referral, refusal management. Every protocol run is written to the audit trail.
- Shared badges (`slaBadge`, `phaseChip`) live in `core/ui.mjs`.

## Install it like an app
Open `patient.html` on a phone. Android (Chrome): menu, then "Install app". iPhone (Safari): Share, then "Add to Home Screen". It then opens full-screen and works offline (`sw.js`). **Bump `VERSION` in `sw.js` on every release.**

## Demo tips
- **Guided tour:** home page, "Take the 3-minute guided tour" (or open `patient.html?p=C-001&fresh=1&tour=0`).
- **Patient identity check:** the demo code is **2026**. Tapping the patient's avatar opens the demo panel (switch patient, reset), which skips the code.
- **New result:** on the care-team screen, "New result". The rules set urgency, due date and the least busy owner.
- **Story video:** `media/jissr-story.mp4` (silent, subtitled). Live animation: `animation/`.

## Run and test
```
npm test                      # 48 tests, no install needed
npm run serve                 # then open http://localhost:8330/
BASE=http://127.0.0.1:8330/ npm run test:e2e   # browser checks (needs Playwright)
```
Without an AI key everything still works using the pre-written messages.

## Deploy (free): Vercel
Import this repository, leave defaults, deploy. To switch the AI on, add environment variables in Vercel:
- Gemini (free key from Google AI Studio): `GEMINI_API_KEY`, `JISSR_AI_PROVIDER=gemini` (optional `JISSR_AI_MODEL`, default `gemini-2.5-flash`)
- Anthropic: `ANTHROPIC_API_KEY` (optional `JISSR_AI_MODEL`)
- Azure OpenAI: `JISSR_AI_PROVIDER=azure-openai`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`


Natural voice for "Listen" (optional, Azure AI Speech): `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (optional `JISSR_VOICE_AR`, default `ar-AE-FatimaNeural`; `JISSR_VOICE_EN`, default `en-GB-SoniaNeural`). Without them the phone's built-in voice is used.

Never commit keys.

## Before real use
Clinician review of thresholds, follow-up windows and all Arabic text; real sign-in (e.g. Microsoft Entra ID); UAE health-data compliance (DoH, ADHICS), Malaffi integration and consent management.
