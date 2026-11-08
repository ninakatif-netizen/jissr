# Jissr · جسر

Prototype for the **Future Health Challenge 2026**, challenge "Closing the Screening-to-Care Loop".
One programme: abnormal HbA1c from screening. **All data is synthetic. Not medical advice.**

## Pages
- `index.html`: home, and a short "who decides what" (rules vs AI)
- `patient.html`: patient app (English / Arabic): plain-language result, barrier check-in, booking, reminders, nurse, family helper
- `staff.html`: care-team dashboard: cases, owners, due dates, overdue flags, drop-out reasons, timeline, clinician-only closing
- `animation/index.html`: 50-second opening story

## How it is built
- `core/rules.mjs`: HbA1c bands, due dates, barrier plans, AI safety filter (plain logic, no AI)
- `core/cases.mjs`: case rules. Only a clinician with written evidence can close a case; the AI is refused every action
- `core/templates.mjs`: pre-written English/Arabic messages (fallback when AI is off)
- `core/data.mjs`: 30 invented patients
- `api/_jissr-ai.js`: the one place that talks to an AI provider (Anthropic or Azure OpenAI)
- `api/jissr-explain.js`: serverless endpoint that asks the AI to word a message, then safety-checks it

## Run and test
```
npm test                      # 18 tests, no install needed
npm run serve                 # then open http://localhost:8330/
```
Without an AI key everything still works using the pre-written messages.

## Deploy (free): Vercel
Import this repository, leave defaults, deploy. To switch the AI on, add environment variables in Vercel:
- Anthropic: `ANTHROPIC_API_KEY` (optional `JISSR_AI_MODEL`)
- Azure OpenAI: `JISSR_AI_PROVIDER=azure-openai`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`

Never commit keys.

## Before real use
Clinician review of thresholds, follow-up windows and all Arabic text; real sign-in (e.g. Microsoft Entra ID); UAE health-data compliance (DoH, ADHICS), Malaffi integration and consent management.
