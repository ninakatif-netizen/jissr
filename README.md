# Falaj · فلج

Prototype for the **Future Health Challenge 2026**, challenge "Closing the Screening-to-Care Loop".
Three programmes on one engine: abnormal HbA1c (diabetes), positive FIT (bowel cancer) and suspicious mammograms (BI-RADS 0, 4, 5). **All data is synthetic. Not medical advice.**

## Data
No organiser data and no real personal data are used. Every source and licence is declared in [DATA-SOURCES.md](DATA-SOURCES.md).

## Pages
- `index.html`: home: the one idea, how Falaj closes the loop, three ways in, the evidence
- `app.html`: **the app** (phone): splash, demo sign-in; patients see their Health ID and QR, next step, an assistant that organises and can call them; doctors type the Health ID and name to open the care map across hospitals
- `team.html`: **the care team website** (computer and phone): where the water stops, the one thing to do, each patient's falaj as a workflow, agents and documents
- `me.html`: the patient's steps (first message in their language, the call, booking, help)
- `loop.html`: **the story**: Priya in three moments (3 minutes)
- `jury.html`: **for the jury**: the 5-minute demo path, the 7 steps from result to notification, who decides what, evidence, limits
- `verify.html`, `family.html`: helpers used from the patient's steps (a shared Care Passport, a family helper)

Older pages from earlier versions were removed; their addresses redirect to the pages above (`vercel.json`).

## How it is built
- `core/rules.mjs`: HbA1c bands, due dates, barrier plans, AI safety filter (plain logic, no AI)
- `core/cases.mjs`: case rules: confirmation, referral accept/reject and report back, ownership hand-offs, clinician questions. Only a clinician with written evidence can close a case; the AI is refused every action
- escalation and service levels are in `core/rules.mjs` (fixed rules, no AI)
- `core/templates.mjs`: pre-written English/Arabic messages (fallback when AI is off)
- `core/data.mjs`: 43 invented patients (30 HbA1c, 8 FIT, 5 mammogram)
- `api/_jissr-ai.js`: the one place that talks to an AI provider (Anthropic or Azure OpenAI)
- `api/jissr-explain.js`: serverless endpoint that asks the AI to word a message, then safety-checks it

## Install it like an app
Open `app.html` on a phone. Android (Chrome): menu, then "Install app". iPhone (Safari): Share, then "Add to Home Screen". It then opens full-screen and works offline (`sw.js`). **Bump `VERSION` in `sw.js` on every release.**

## Demo tips
- Follow the 5-minute demo on `jury.html`.
- **Reset the demo data:** open `team.html?reset=1`.
- **Doctor lookup:** Priya Raman's Health ID is shown on her app home (FLJ-YYYY-0040); type it with her name.

## Run and test
```
npm test                      # unit tests, no install needed
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

## The app (app.html)

Splash (water runs through the workflow to the palm, with a chime made in the browser), demo sign-in, the patient's Falaj Health ID and QR code, an assistant that organises appointments, reminders, documents and questions (and can call the patient in the app), and a lookup for doctors: Health ID **and** name open the patient's care map across places. Every opening is shown to the patient. All records and facilities are invented.

Natural voice for the call (Vercel environment variables only): `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`, optional `CARTESIA_VOICE_ID_AR`, `CARTESIA_MODEL` (default `sonic-3`), `CARTESIA_VERSION`. Without them, the phone's own voice is used. The assistant uses the same AI keys as the explanation (see `api/_jissr-ai.js`); without a key it answers with rules. Rules alone decide results questions (never answered), emergencies (998) and every action.
