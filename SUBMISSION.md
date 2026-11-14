# Falaj: submission pack

Future Health Digital Innovation Challenge 2026. Due 20 November (submit before 15 November for the early screening review).

Everything below is ready to copy into the form. Square brackets are things only you can fill in.

## Select

| Field | What to choose |
|---|---|
| Challenge statement | Challenge 05: Closing the Screening-to-Care Loop |
| Solution stage | Prototype (working, with invented data; not yet piloted with real patients) |
| Technology type | Digital health software: a web and mobile app with rule-based automation. If the form has an "AI" option, it only partly fits: AI is optional and never makes a clinical decision. |
| Software or hardware | Software |

Pick the closest option the form offers; these are the honest answers behind them.

## Link

Prototype: https://jissr-three.vercel.app

Good pages to mention if there is room:
- For the jury (5-minute demo path): https://jissr-three.vercel.app/jury.html
- Two phones, one screen (the Health ID, live): https://jissr-three.vercel.app/duo.html
- The app: https://jissr-three.vercel.app/app.html

## Write: solution summary

### Short version (about 90 words)

Falaj follows every abnormal screening result until a doctor confirms care. When a result arrives, fixed rules sort it, set the deadlines and name one responsible person within seconds. Agents reach the patient in their own language; a nurse tells anything serious in person. The patient sees who is responsible for them and by when, and can say "I'm still waiting". One Health ID, shown as a QR code that changes every minute, lets any clinic open the patient's care history, only with the patient's say. People make every clinical decision.

### Longer version (about 230 words)

A screening result only helps if someone acts on it. Today a result can leave the lab as a letter in a language the patient does not read, with nobody named as responsible, and a referral can wait for days unnoticed.

Falaj is named after the water channels that fed the oases of the Emirates: every plot had a named keeper and a known turn. Falaj does the same for a result.

- **Rules, in seconds.** Each abnormal result (HbA1c, bowel screening, mammogram) is sorted by fixed rules that set its deadlines and name a keeper. No result is ever nobody's.
- **Reaching the patient.** An agent calls or messages in the patient's language and holds a visit. A serious result is never sent by message: a nurse tells it in person.
- **The patient's promise.** The patient sees who is responsible for them and by when. If a step is late they can tap "I'm still waiting" or "It already happened", and it goes first on the keeper's list.
- **One Health ID.** A QR code with a code that changes every minute opens the patient's care history in any clinic, only with their live code or their yes. The doctor gets a handover in SBAR order and can record the visit in one tap.
- **Closing the loop.** The loop closes only when a clinician confirms care, with written evidence.

AI is optional and only writes words. It never gives a result, diagnoses or closes a case.

## Write: what we have built so far

A working prototype, live at the link above, with invented data only:

- **The app** (installable on a phone): the patient's next step, who is responsible and by when, a Health ID with a QR code and a code that changes every minute, an assistant that organises appointments, reminders and documents, and an in-app call.
- **The doctor's side of the app:** scan or type the Health ID, an SBAR handover built from the file and the rules, a map of the places the patient was cared for with a timeline, and one tap to record a visit or accept a referral.
- **The care team website:** every patient as water flowing to care, where it stops, the one thing to do next, and tests done with no result yet.
- **A three-minute story** of one patient, and a page where the patient's phone and the doctor's phone work side by side.
- **The rules engine:** three screening programmes, owners, deadlines, referrals with accept or reject, and closing only by a clinician. 80 automated tests, plus browser tests of every journey, run on each change. Accessibility checked in light and dark mode.

What is simulated, and said so in the prototype: sign-in, messages and calls, the care history and facilities, and the Health ID check (there is no server yet). The follow-up deadlines are proposals for a clinician to confirm. Falaj itself has not been measured; a pilot would do that.

The evidence it is built on: reminders alone did no better than usual care (22.7% vs 22.9% follow-up at 120 days), while outreach with navigation reached 31.4% (Atlas et al., JAMA 2023). Phone navigation in the patient's language raised colonoscopy after an abnormal bowel test from 42.1% to 55.1% (Coronado et al., Annals of Internal Medicine 2025).

## Upload: the deck (PDF, up to 5 MB, on the organisers' template)

Not done yet: the organisers' template is needed first. `PITCH.md` has the content for each slide (the one idea, what already exists, before and with Falaj, the three patient promises, the QR script, what if someone forgets, honest answers).

## Demo video (under 3 minutes, link viewable by anyone)

Not done yet. A suggested order, about 2 minutes 40 seconds:

1. **0:00 The problem** (15 s): a result waits unread. Home page hero.
2. **0:15 A result arrives** (25 s): the care team website: rules name a keeper and a deadline; where the water stops.
3. **0:40 The patient** (40 s): the app as Priya: Nurse Peter is responsible, the call is 2 days late, "I'm still waiting"; the nurse's list changes.
4. **1:20 The Health ID** (45 s): two phones, one screen: the code typed on the doctor's phone, the SBAR handover and the care map open, Priya's phone says who opened her file.
5. **2:05 Nobody forgets** (20 s): "Record this visit" in one tap; tests done with no result yet.
6. **2:25 Close** (15 s): people decide, the loop closes only when a doctor confirms care. Falaj: every result, all the way to care.
