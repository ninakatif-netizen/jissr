// PRE-WRITTEN PATIENT MESSAGES (English and Arabic).
// Used when the AI is off or its answer fails the safety check, so the demo never breaks.
// NOTE: the Arabic must be reviewed by a native-speaking clinician before real use.

import { withDisclaimer } from './rules.mjs';

const T = {
  en: {
    explain: {
      prediabetes: (v) => `Your HbA1c result is ${v}%. HbA1c shows your average blood sugar over the last 2 to 3 months. Yours is a little higher than usual. This is common, and it can often be improved with changes to food and activity, and regular check-ups. A nurse or doctor needs to look at your result with you.`,
      diabetes: (v) => `Your HbA1c result is ${v}%. HbA1c shows your average blood sugar over the last 2 to 3 months. Yours is higher than the usual range. A doctor needs to check you and talk through what it means. Many people with a result like this stay well with the right care. Please see a doctor in the next two weeks.`,
      fit_positive: () => 'Your bowel screening test (FIT) found a small amount of blood in your stool sample that cannot be seen by eye. This is common and has many possible causes, such as piles or small growths called polyps. Most people with a positive result do not have cancer, but a camera test of the bowel (colonoscopy) is the way to find out. Please book it in the next few weeks.',
      birads0: () => 'Your mammogram pictures were not clear enough to give a full answer, or the radiologist would like a few more pictures. This happens often and usually does not mean something is wrong. Please book the extra imaging (more mammogram views or an ultrasound) in the next two weeks.',
      birads4: () => 'Your mammogram showed an area in the breast that needs a closer look. This does not mean you have cancer. Many areas like this turn out to be harmless, but the only way to know for sure is a small test called a biopsy, where a doctor takes a tiny sample with a needle. A nurse navigator will help you book it in the next two weeks and answer your questions.',
      birads5: () => 'Your mammogram showed an area in the breast that needs to be checked quickly. A doctor needs to take a tiny sample with a needle (a biopsy) to find out what it is. A nurse navigator will call you and help you book it within a week. You will not go through this alone.',
      urgent: (v) => `Your HbA1c result is ${v}%. HbA1c shows your average blood sugar over the last 2 to 3 months. Yours is much higher than the usual range, and we want a nurse to speak with you in the next day or two. Please do not wait. If you feel very thirsty, tired, sick or confused, or you are passing a lot of urine, get medical help straight away (ambulance: 998).`,
    },
    simple: {
      prediabetes: (v) => `Your blood sugar test (HbA1c) is ${v}%. It is a little high. This is common. A nurse or doctor will explain what to do next. Small changes often help.`,
      diabetes: (v) => `Your blood sugar test (HbA1c) is ${v}%. It is higher than normal. A doctor needs to see you soon to explain it. Many people stay well with the right care.`,
      fit_positive: () => 'Your bowel test (FIT) found a little hidden blood. This has many possible causes, and most are not cancer. A camera test called a colonoscopy will check. A nurse will help you book it.',
      birads0: () => 'Your mammogram needs a few more pictures. This is common and usually nothing is wrong. Please book them in the next two weeks.',
      birads4: () => 'Your mammogram found an area that needs a closer look. Many are harmless. A small needle test (biopsy) will check. A nurse will help you.',
      birads5: () => 'Your mammogram found an area that must be checked soon with a small needle test (biopsy). A nurse will call you and help you book it this week.',
      urgent: (v) => `Your blood sugar test (HbA1c) is ${v}%. It is much higher than normal. A nurse will call you in the next day or two. If you feel very unwell, call 998.`,
    },
    barrier: {
      fear: 'It is normal to feel worried. A result like this is a reason to look after your health, not a verdict. A nurse can talk with you first by phone, with no pressure. You can bring someone with you to the visit.',
      cost: 'Cost worries are common. Before you decide, our team can check what your insurance covers and tell you the cost in advance.',
      time_shift: 'We know shift work makes visits hard. We have shown early-morning and evening times so you can choose what fits.',
      language: 'You can ask for a nurse or interpreter who speaks your language. Tell us which language and we will arrange it.',
      dont_understand: 'Let us make it simpler. A nurse can also call you and explain the result by voice, as many times as you need.',
      none: 'You are ready to book a visit. Pick a time that suits you.',
    },
    nurse: 'A nurse will call you back. You can choose a time that suits you.',
  },
  ar: {
    explain: {
      prediabetes: (v) => `نتيجة تحليل السكر التراكمي (HbA1c) لديك ${v}%. يُظهر هذا التحليل متوسط مستوى السكر في دمك خلال الشهرين أو الثلاثة الماضية. نتيجتك أعلى قليلاً من المعتاد. هذا أمر شائع، ويمكن غالباً تحسينه بتغيير الطعام والنشاط والمتابعة المنتظمة. يحتاج الأمر أن تراجع نتيجتك مع ممرضة أو طبيب.`,
      diabetes: (v) => `نتيجة تحليل السكر التراكمي (HbA1c) لديك ${v}%. يُظهر هذا التحليل متوسط مستوى السكر في دمك خلال الشهرين أو الثلاثة الماضية. نتيجتك أعلى من المعدل المعتاد. يحتاج الطبيب إلى فحصك ومناقشة معنى النتيجة معك. كثير من الناس بنتائج مشابهة يبقون بصحة جيدة مع الرعاية المناسبة. يرجى مراجعة الطبيب خلال أسبوعين.`,
      fit_positive: () => 'وجد فحص الكشف المبكر عن سرطان القولون (FIT) كمية صغيرة من الدم في عينة البراز لا تُرى بالعين. هذا أمر شائع وله أسباب كثيرة، مثل البواسير أو زوائد صغيرة تسمى السلائل. معظم من تكون نتيجتهم إيجابية ليس لديهم سرطان، لكن فحص القولون بالمنظار هو الطريقة لمعرفة السبب. يرجى حجزه خلال الأسابيع القليلة القادمة.',
      birads0: () => 'لم تكن صور الماموغرام واضحة بما يكفي لإعطاء إجابة كاملة، أو يرغب أخصائي الأشعة في بعض الصور الإضافية. يحدث هذا كثيراً، وغالباً لا يعني وجود مشكلة. يرجى حجز التصوير الإضافي (صور ماموغرام إضافية أو تصوير بالموجات فوق الصوتية) خلال الأسبوعين القادمين.',
      birads4: () => 'أظهر الماموغرام منطقة في الثدي تحتاج إلى فحص أدق. هذا لا يعني أن لديكِ مرضاً خبيثاً. كثير من هذه المناطق يتبيّن أنها غير ضارة، لكن الطريقة الوحيدة للتأكد هي فحص صغير يسمى الخزعة، يأخذ فيه الطبيب عينة صغيرة جداً بإبرة. ستساعدك ممرضة مرافقة على حجزه خلال الأسبوعين القادمين وتجيب عن أسئلتك.',
      birads5: () => 'أظهر الماموغرام منطقة في الثدي يجب فحصها بسرعة. يحتاج الطبيب إلى أخذ عينة صغيرة جداً بإبرة (خزعة) لمعرفة طبيعتها. ستتصل بك ممرضة مرافقة وتساعدك على حجزها خلال أسبوع. لن تكوني وحدك في هذا.',
      urgent: (v) => `نتيجة تحليل السكر التراكمي (HbA1c) لديك ${v}%. يُظهر هذا التحليل متوسط مستوى السكر في دمك خلال الشهرين أو الثلاثة الماضية. نتيجتك أعلى بكثير من المعدل المعتاد، ونريد أن تتحدث معك ممرضة خلال يوم أو يومين. يرجى عدم الانتظار. إذا شعرت بعطش شديد أو تعب أو غثيان أو ارتباك، أو كنت تتبول كثيراً، فاطلب مساعدة طبية فوراً (الإسعاف: 998).`,
    },
    simple: {
      prediabetes: (v) => `نتيجة تحليل السكر (HbA1c) لديك ${v}%. هي أعلى قليلاً من المعتاد، وهذا شائع. ستشرح لك ممرضة أو طبيب ما يمكن فعله. التغييرات الصغيرة تفيد كثيراً.`,
      diabetes: (v) => `نتيجة تحليل السكر (HbA1c) لديك ${v}%. هي أعلى من المعتاد. يحتاج الطبيب أن يراك قريباً ليشرح لك ذلك. كثيرون يبقون بصحة جيدة مع الرعاية المناسبة.`,
      fit_positive: () => 'وجد فحص القولون (FIT) القليل من الدم الخفي. لهذا أسباب كثيرة، ومعظمها ليس سرطاناً. سيتحقق فحص بالمنظار يسمى تنظير القولون من السبب. ستساعدك ممرضة على الحجز.',
      birads0: () => 'يحتاج الماموغرام إلى بعض الصور الإضافية. هذا شائع وغالباً لا توجد مشكلة. يرجى حجزها خلال الأسبوعين القادمين.',
      birads4: () => 'وجد الماموغرام منطقة تحتاج إلى فحص أدق. كثير منها غير ضار. سيتحقق فحص صغير بالإبرة (خزعة). ستساعدك ممرضة.',
      birads5: () => 'وجد الماموغرام منطقة يجب فحصها قريباً بفحص صغير بالإبرة (خزعة). ستتصل بك ممرضة وتساعدك على الحجز هذا الأسبوع.',
      urgent: (v) => `نتيجة تحليل السكر (HbA1c) لديك ${v}%. هي أعلى بكثير من المعتاد. ستتصل بك ممرضة خلال يوم أو يومين. إذا شعرت بتعب شديد فاتصل بالإسعاف 998.`,
    },
    barrier: {
      fear: 'من الطبيعي أن تشعر بالقلق. هذه النتيجة سبب للعناية بصحتك وليست حكماً نهائياً. يمكن لممرضة أن تتحدث معك أولاً بالهاتف دون أي ضغط. ويمكنك أن تصطحب معك شخصاً إلى الموعد.',
      cost: 'القلق من التكلفة أمر شائع. قبل أن تقرر، يمكن لفريقنا أن يتحقق مما يغطيه تأمينك ويخبرك بالتكلفة مسبقاً.',
      time_shift: 'نعرف أن العمل بنظام المناوبات يجعل الزيارات صعبة. عرضنا لك مواعيد صباحية مبكرة ومسائية لتختار ما يناسبك.',
      language: 'يمكنك أن تطلب ممرضة أو مترجماً يتحدث لغتك. أخبرنا باللغة وسنرتب ذلك.',
      dont_understand: 'دعنا نبسّط الأمر. يمكن لممرضة أن تتصل بك وتشرح لك النتيجة صوتياً، وبقدر ما تحتاج من المرات.',
      none: 'أنت جاهز لحجز موعد. اختر الوقت المناسب لك.',
    },
    nurse: 'ستتصل بك ممرضة. يمكنك اختيار الوقت المناسب لك.',
  },
};

export const pick = (lang) => (lang === 'ar' ? T.ar : T.en);

// The patient's result text. level: 'normal' or 'simple'. The disclaimer is always added by code.
export function explanation({ band, value, lang = 'en', level = 'normal' }) {
  const t = pick(lang)[level === 'simple' ? 'simple' : 'explain'][band];
  if (!t) return '';
  return withDisclaimer(t(value), lang);
}
export const barrierText = (barrier, lang = 'en') => pick(lang).barrier[barrier] || pick(lang).barrier.none;
export const nurseText = (lang = 'en') => pick(lang).nurse;
