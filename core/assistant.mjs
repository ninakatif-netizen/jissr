// THE PATIENT'S ASSISTANT ("Ask Falaj"): helps a patient organise appointments, reminders, documents and
// questions for the doctor, and can call them in the app with a natural voice.
// SAFETY, decided by rules, not by a model:
//  - it never gives, explains or guesses a result, and never diagnoses: a person on the care team does that;
//  - worry goes to a nurse, and danger signs go to 998 straight away;
//  - it only ever sees a small context (no name, no result value, no ID): see contextOf();
//  - it can only do patient-side things (a reminder, a question, a request for a nurse call). It cannot book
//    for a clinician, record a visit, accept a referral or close a loop.
import { mustCall } from './rules.mjs';

const PROG = { hba1c: 'blood sugar test (HbA1c)', fit: 'bowel screening test', mammo: 'mammogram' };
const fmtDay = (d) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : '');

// The ONLY facts the assistant (and any AI behind it) is allowed to see.
export function contextOf(c) {
  const told = (c.events || []).some((e) => (e.type === 'contact' && e.role !== 'system') || e.type === 'understood');
  return {
    programme: PROG[c.programme] ? c.programme : 'hba1c',
    stage: c.stage,
    waitingForPerson: mustCall(c) && !told,
    visit: c.slot ? { day: c.slot.day, time: c.slot.time } : null,
    held: !c.slot && c.hold ? { day: c.hold.day, time: c.hold.time } : null,
    referralTo: c.referral ? c.referral.to : null,
    referralStatus: c.referral ? c.referral.status : null,
    nurseRequested: !!(c.nurseRequest && !c.nurseRequest.done),
    reminders: (c.assist && c.assist.reminders || []).length,
    questions: (c.assist && c.assist.questions || []).length,
  };
}
// Accept only the shape above (used by the server before anything reaches a model).
export function cleanContext(x) {
  x = x && typeof x === 'object' ? x : {};
  const day = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v.day) && /^\d{2}:\d{2}$/.test(v.time) ? { day: v.day, time: v.time } : null);
  const STAGES = ['result', 'notified', 'understood', 'booked', 'attended', 'confirmed', 'referred', 'care_plan', 'closed'];
  return {
    programme: PROG[x.programme] ? x.programme : 'hba1c',
    stage: STAGES.includes(x.stage) ? x.stage : 'notified',
    waitingForPerson: !!x.waitingForPerson, visit: day(x.visit), held: day(x.held),
    referralTo: typeof x.referralTo === 'string' && x.referralTo.length < 60 ? x.referralTo.replace(/[^\w\s]/g, '') : null,
    referralStatus: ['sent', 'accepted', 'rejected', 'completed'].includes(x.referralStatus) ? x.referralStatus : null,
    nurseRequested: !!x.nurseRequested, reminders: Math.min(+x.reminders || 0, 99), questions: Math.min(+x.questions || 0, 99),
  };
}

export function nextStep(ctx) {
  const test = PROG[ctx.programme];
  if (ctx.stage === 'closed') return 'Your care for this result is complete. Nothing else to do now.';
  if (ctx.waitingForPerson) return `A nurse from your care team will call you to talk about your ${test}. You do not need to do anything before that call.`;
  if (ctx.stage === 'result' || ctx.stage === 'notified') return `Read the message about your ${test} in Falaj, then tell us you have understood it.`;
  if (ctx.stage === 'understood') return ctx.held ? `Confirm the visit held for you on ${fmtDay(ctx.held.day)} at ${ctx.held.time}, or choose another time.` : 'Book a visit with your family doctor.';
  if (ctx.stage === 'booked') return ctx.visit ? `Go to your visit with your family doctor on ${fmtDay(ctx.visit.day)} at ${ctx.visit.time}.` : 'Go to your visit with your family doctor.';
  if (ctx.referralTo && ctx.referralStatus === 'sent') return `Your doctor has asked ${ctx.referralTo} to see you. They will contact you once they accept.`;
  if (ctx.referralTo && ctx.referralStatus === 'accepted') return `${ctx.referralTo} has accepted you. They will contact you for an appointment.`;
  if (ctx.stage === 'care_plan') return 'Follow the plan you agreed with your doctor. Your care team checks it is in place.';
  return 'Your doctor will tell you the next step. Your care team is following it.';
}

// The documents Falaj keeps together for the patient (names only; the patient opens each in the app).
export function documentsOf(c) {
  const d = [{ id: 'result', title: `${PROG[c.programme] ? PROG[c.programme][0].toUpperCase() + PROG[c.programme].slice(1) : 'Test'} letter`, from: 'Screening Unit B' }];
  if (c.slot) d.push({ id: 'visit', title: 'Visit confirmation', from: 'Family Clinic A' });
  if (c.referral) d.push({ id: 'referral', title: `Referral to ${c.referral.to}`, from: 'Family Clinic A' });
  if (c.referral && c.referral.status === 'accepted') d.push({ id: 'insurance', title: 'Insurance approval request', from: 'Family Clinic A (simulated)' });
  if (c.plan) d.push({ id: 'plan', title: 'Care plan', from: 'Your doctor' });
  return d;
}

// ---- the rules that answer (and that pick the actions, whoever writes the words) ----
const R = {
  danger: /chest pain|can'?t breathe|cannot breathe|short of breath|heavy bleeding|bleeding a lot|faint|passed out|unconscious|suicid|kill myself|ألم في الصدر|لا أستطيع التنفس|نزيف/i,
  result: /result|cancer|tumou?r|malignan|serious|bi-?rads|biopsy|benign|what does (it|this) mean|diagnos|positive|negative|hba1c|sugar level|نتيج|سرطان|ورم|تشخيص/i,
  worry: /worr|scared|afraid|anxious|nervous|frighten|panic|stress|can'?t sleep|خائف|خوف|قلق/i,
  remind: /remind|alarm|don'?t let me forget|تذكير|ذكرني/i,
  book: /appoint|book|visit|when (is|do)|what time|reschedul|change (the )?(time|date)|move (my|the)|موعد|حجز/i,
  docs: /document|letter|paper|report|file|records?|insurance|approval|وثيق|ملف|تأمين/i,
  question: /question|ask (the|my) doctor|want to ask|سؤال|اسأل/i,
  call: /call me|phone me|ring me|speak to (me|you)|talk to me|اتصل/i,
  nurse: /nurse|human|real person|someone|ممرض|شخص/i,
  cost: /cost|pay|price|money|afford|expensive|تكلف|سعر|مال/i,
  next: /next|what (do|should) i|what now|step|help|التالي|ماذا/i,
};
export function intentOf(msg) {
  const m = String(msg || '');
  for (const k of ['danger', 'result', 'worry', 'remind', 'question', 'book', 'docs', 'call', 'nurse', 'cost', 'next']) if (R[k].test(m)) return k;
  return 'other';
}
// Intents whose words are fixed by rules (a model never rewrites them).
export const FIXED = ['danger', 'result'];

export function reply(msg, ctx) {
  const intent = intentOf(msg), next = nextStep(ctx), test = PROG[ctx.programme];
  const nurse = ctx.nurseRequested ? { type: 'info', label: 'A nurse will call you: already asked' } : { type: 'nurse', label: 'Ask a nurse to call me' };
  switch (intent) {
    case 'danger': return { intent, text: 'If you feel very unwell, or have chest pain, trouble breathing or heavy bleeding, call 998 now or go to the nearest emergency department. I am an assistant and cannot help in an emergency.', actions: [{ type: 'tel', label: 'Call 998', href: 'tel:998' }] };
    case 'result': return { intent, text: `I cannot tell you about results or what they mean. Only a person on your care team does that, so you can ask everything you need. ${ctx.waitingForPerson ? 'A nurse is going to call you about your ' + test + '.' : 'I can ask a nurse to call you.'}`, actions: [nurse] };
    case 'worry': return { intent, text: 'It is normal to feel worried while you wait. You are not alone: your care team is following your next step. A nurse can call you today to talk it through. If you ever feel very unwell, call 998.', actions: [nurse, { type: 'question', label: 'Save a question for my doctor' }] };
    case 'remind': {
      const when = ctx.visit || ctx.held;
      return when ? { intent, text: `I will remind you the day before your visit on ${fmtDay(when.day)} at ${when.time}. You can also add it to your phone's calendar.`, actions: [{ type: 'reminder', label: 'Set the reminder' }, { type: 'ics', label: 'Add to my calendar' }] }
        : { intent, text: 'There is no visit booked yet, so there is nothing to remind you about. When you book, I will remind you the day before.', actions: [{ type: 'book', label: 'Book my visit' }] };
    }
    case 'book': {
      if (ctx.visit) return { intent, text: `Your visit is on ${fmtDay(ctx.visit.day)} at ${ctx.visit.time}, at Family Clinic A. You can add it to your calendar, or move it.`, actions: [{ type: 'ics', label: 'Add to my calendar' }, { type: 'book', label: 'Move my visit' }] };
      if (ctx.waitingForPerson) return { intent, text: 'First, a nurse will call you to talk about your result. After that call, I can help you book a visit at a time that suits you.', actions: [nurse] };
      return { intent, text: ctx.held ? `A visit is held for you on ${fmtDay(ctx.held.day)} at ${ctx.held.time}. Do you want to confirm it, or choose another time?` : 'You can choose a time for a visit with your family doctor.', actions: [{ type: 'book', label: ctx.held ? 'Confirm or change' : 'Book my visit' }] };
    }
    case 'docs': return { intent, text: 'I keep your documents together, from every clinic: your letters, your visit confirmation, any referral and approvals. Here they are.', actions: [{ type: 'docs', label: 'See my documents' }] };
    case 'question': return { intent, text: 'Tell me your question and I will save it for your next visit, so you do not forget to ask. Your doctor sees your list when you show it.', actions: [{ type: 'question', label: 'Save a question' }] };
    case 'call': return { intent, text: 'I can call you now, in this app, with a natural voice. It is a short call about your next step and your appointments, never about results.', actions: [{ type: 'call', label: 'Call me now' }] };
    case 'nurse': return { intent, text: ctx.nurseRequested ? 'You have already asked, and a nurse will call you. You do not need to ask again.' : 'I can ask a nurse from your care team to call you.', actions: [nurse] };
    case 'cost': return { intent, text: 'I cannot see your insurance or costs. Before any referral, the clinic asks your insurer for approval. A nurse can explain what applies to you.', actions: [nurse] };
    case 'next': return { intent, text: `Your next step: ${next}`, actions: actionsFor(ctx) };
    default: return { intent, text: `I can help you with your next step, your appointments, reminders, your documents and questions for your doctor. Your next step: ${next}`, actions: actionsFor(ctx) };
  }
}
function actionsFor(ctx) {
  if (ctx.waitingForPerson) return [{ type: 'call', label: 'Call me now' }];
  if (ctx.stage === 'understood') return [{ type: 'book', label: 'Book my visit' }];
  if (ctx.stage === 'booked') return [{ type: 'reminder', label: 'Remind me the day before' }, { type: 'ics', label: 'Add to my calendar' }];
  return [{ type: 'docs', label: 'See my documents' }];
}

// A model's words must also pass this (on top of the general filter): no result talk, no diagnosis.
const AI_FORBIDDEN = [/bi-?rads/i, /\bbenign\b/i, /\bmalignan/i, /\bcancer\b/i, /\btumou?r\b/i, /\bnormal result\b/i, /\byour result (is|was|shows)\b/i, /\b\d+(\.\d+)?\s?%/, /\bdiagnos/i, /سرطان/, /ورم/, /تشخيص/];
export const assistantSafe = (t) => typeof t === 'string' && t.trim().length >= 10 && t.length <= 700 && !AI_FORBIDDEN.some((r) => r.test(t));

// ---- the call: short turns spoken with a natural voice; the patient answers with buttons ----
const CALL = {
  en: {
    hello: 'Hello, this is Falaj, the assistant of your care team. I am an automated voice, not a nurse. Is now a good time to talk for one minute?',
    later: 'No problem. I will try again later. Goodbye.',
    next: (n) => `Thank you. ${n}`,
    ask: 'Would you like a reminder, or do you have a question for your care team?',
    remind: 'Done. I will remind you the day before. Anything else?',
    question: 'I cannot talk about results, but I have asked a nurse to call you today. They will answer your questions.',
    bye: 'Thank you. Everything is saved in your Falaj. Goodbye, and take care.',
  },
  ar: {
    hello: 'مرحباً، معك فلج، مساعد فريق رعايتك. أنا صوت آلي ولست ممرضة. هل هذا وقت مناسب للحديث دقيقة واحدة؟',
    later: 'لا مشكلة. سأحاول لاحقاً. مع السلامة.',
    next: () => 'شكراً لك. خطوتك التالية مكتوبة في التطبيق، وفريق رعايتك يتابعها.',
    ask: 'هل تريد تذكيراً، أم لديك سؤال لفريق رعايتك؟',
    remind: 'تم. سأذكرك قبل الموعد بيوم. هل هناك شيء آخر؟',
    question: 'لا أستطيع الحديث عن النتائج، لكنني طلبت من ممرضة أن تتصل بك اليوم لتجيب عن أسئلتك.',
    bye: 'شكراً لك. كل شيء محفوظ في فلج. مع السلامة.',
  },
};
// callTurn(step, ctx, lang) -> {say, options:[{id,label}], done, action}
export function callTurn(step, ctx, lang = 'en') {
  const t = CALL[lang] || CALL.en, ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  switch (step) {
    case 'hello': return { say: t.hello, options: [{ id: 'next', label: L('Yes, now is good', 'نعم، الآن مناسب') }, { id: 'later', label: L('Call me later', 'اتصل لاحقاً') }] };
    case 'later': return { say: t.later, options: [], done: true };
    case 'next': return { say: `${t.next(nextStep(ctx))} ${t.ask}`, options: [{ id: 'remind', label: L('Remind me', 'ذكرني') }, { id: 'question', label: L('I have a question', 'لدي سؤال') }, { id: 'bye', label: L('That is all', 'هذا كل شيء') }] };
    case 'remind': return { say: t.remind, options: [{ id: 'question', label: L('I have a question', 'لدي سؤال') }, { id: 'bye', label: L('That is all', 'هذا كل شيء') }], action: 'reminder' };
    case 'question': return { say: t.question, options: [{ id: 'bye', label: L('Thank you', 'شكراً') }], action: 'nurse' };
    default: return { say: t.bye, options: [], done: true };
  }
}
