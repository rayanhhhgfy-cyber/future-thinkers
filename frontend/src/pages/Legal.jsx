import React from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  ShieldCheck, ScrollText, Cookie, Database, EyeOff, Share2, Lock,
  UserCheck, Baby, RefreshCw, Scale, UserPlus, Ban, PenLine, Award,
  AlertTriangle, Gavel, Info, BellRing, FileWarning, KeyRound, Trash2,
} from "lucide-react";

const UPDATED = "٦ أكتوبر ٢٠٢٦";

const AR_NUMS = ["٠١", "٠٢", "٠٣", "٠٤", "٠٥", "٠٦", "٠٧", "٠٨", "٠٩", "١٠", "١١", "١٢"];

function LegalShell({ icon: Icon, title, subtitle, sections, testid }) {
  return (
    <Layout>
      <section className="relative overflow-hidden ft-hero-gradient grain text-white">
        <div className="pointer-events-none absolute -top-24 right-1/4 w-[26rem] h-[26rem] rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 24%, transparent)" }} />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-96 h-96 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 16%, transparent)" }} />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <span className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-md shadow-2xl mb-5">
            <Icon className="w-8 h-8 ft-text-accent-bright" />
          </span>
          <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-extrabold ft-on-hero">{title}</h1>
          <p className="mt-4 text-slate-300 leading-relaxed max-w-2xl mx-auto ft-on-hero">{subtitle}</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-bold text-slate-200">
            <RefreshCw className="w-3.5 h-3.5" /> آخر تحديث · {UPDATED}
          </p>
        </div>
      </section>

      <section className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16" data-testid={testid}>
        <div className="space-y-5">
          {sections.map((s, i) => (
            <article key={s.title} className="rounded-[1.75rem] bg-white border border-slate-100 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.25)] p-6 sm:p-8">
              <div className="flex items-center gap-3.5 mb-4">
                <span className="w-11 h-11 rounded-2xl ft-icon-tile grid place-items-center shrink-0">
                  <s.icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-extrabold ft-text-accent font-head">{AR_NUMS[i]}</span>
                <h2 className="font-head text-lg sm:text-xl font-extrabold text-slate-900">{s.title}</h2>
              </div>
              <div className="space-y-3 text-[15px] leading-loose text-slate-600">
                {(s.body || []).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {s.list && (
                  <ul className="space-y-2.5 pt-1">
                    {s.list.map((li, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className="mt-[13px] w-1.5 h-1.5 rounded-full ft-grad-bar shrink-0" aria-hidden="true" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.note && (
                  <p className="rounded-2xl ft-bg-soft border border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{s.note}</p>
                )}
              </div>
            </article>
          ))}
        </div>

        <nav aria-label="سياسات المنصة" className="mt-10 rounded-[1.75rem] ft-navy-gradient grain relative overflow-hidden text-white p-6 sm:p-8">
          <h2 className="font-head font-extrabold text-lg mb-4">سياسات المنصة</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/privacy" className="pressable inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/15 transition"><ShieldCheck className="w-4 h-4" /> سياسة الخصوصية</Link>
            <Link to="/terms" className="pressable inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/15 transition"><ScrollText className="w-4 h-4" /> الشروط والأحكام</Link>
            <Link to="/cookies" className="pressable inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/15 transition"><Cookie className="w-4 h-4" /> سياسة ملفات الارتباط</Link>
          </div>
          <p className="mt-5 text-sm text-slate-300 leading-relaxed">لأي استفسار حول هذه السياسات، تواصلوا معنا عبر زر «الإبلاغ عن مشكلة» في أسفل الموقع.</p>
        </nav>
      </section>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      icon={ShieldCheck}
      title="سياسة الخصوصية"
      subtitle="خصوصيتك مهمة لنا. توضح هذه الصفحة ببساطة ما البيانات التي تجمعها منصة مفكري المستقبل، ولماذا، وما حقوقك تجاهها."
      testid="privacy-page"
      sections={[
        {
          icon: Database,
          title: "البيانات التي نجمعها",
          body: ["نجمع فقط ما يلزم لتشغيل المنصة وتقديم ميزاتها:"],
          list: [
            "بيانات الحساب: الاسم الكامل، البريد الإلكتروني، كلمة المرور (محفوظة بصورة مشفرة لا يمكن قراءتها)، نوع الحساب (طالب أو معلم)، المحافظة والمديرية والمدرسة، والصف والشعبة إن وجدت.",
            "بيانات نشاطك داخل المنصة: تقدّمك في قراءة الكتب، نقاط الخبرة، مباريات الشطرنج، والمحتوى الذي تنشره مثل المراجعات والمناقشات والرسائل والمشاريع والأعمال.",
            "بيانات تقنية وأمنية: مفتاح جهاز عام يُستخدم لحماية الاتصال بين متصفحك والمنصة، واشتراك إشعارات الهاتف إذا فعّلته بنفسك، وبلاغات الأخطاء التي ترسلها إلينا (وقد تتضمن لقطة شاشة إذا أرفقتها باختيارك).",
          ],
        },
        {
          icon: UserCheck,
          title: "كيف نستخدم بياناتك",
          body: ["نستخدم بياناتك لتشغيل حسابك وتقديم الميزات التي تستخدمها: عرض تقدمك في القراءة، حساب نقاط الخبرة وقوائم الصدارة والشهادات، وتمكينك من التواصل مع زملائك داخل المنصة. كما نطّلع على إحصاءات مجمّعة ومجهولة الهوية (مثل عدد القرّاء النشطين يومياً) لإدارة المنصة وتحسينها."],
        },
        {
          icon: EyeOff,
          title: "ما لا نفعله ببياناتك",
          list: [
            "لا نبيع بياناتك لأي طرف، ولا نشاركها لأغراض تسويقية.",
            "لا توجد إعلانات في المنصة، ولا أدوات تتبع خارجية مثل Google Analytics أو ما يشبهها.",
            "لا نتتبع نشاطك في مواقع أخرى.",
          ],
        },
        {
          icon: Share2,
          title: "ظهور بياناتك ومشاركتها",
          body: ["اسمك وصورتك الرمزية وإنجازاتك تظهر لزملائك داخل المنصة بحسب الميزات التي تستخدمها، مثل ملفك العام وقوائم الصدارة والمجتمع. ملفات الكتب التي يرفعها الأعضاء تُخزَّن عبر خدمة تخزين خارجية (Telegram) لتقديمها لك بأمان داخل قارئ الكتب، ولا تحتوي هذه الملفات على بياناتك الشخصية. لا نشارك بياناتك مع أي طرف ثالث خارج ما يلزم لتشغيل المنصة تقنياً."],
        },
        {
          icon: Cookie,
          title: "ملفات الارتباط والتخزين المحلي",
          body: ["تستخدم المنصة ملفات ارتباط أساسية لحفظ تسجيل دخولك، وتفضيلات محفوظة على جهازك مثل المظهر وإعدادات القارئ. التفاصيل الكاملة في سياسة ملفات الارتباط."],
        },
        {
          icon: Lock,
          title: "أمن بياناتك",
          body: ["نحمي حسابك بعدة طبقات: كلمات المرور محفوظة بصورة مجزّأة (Hashed) لا يمكن استرجاعها، وملفات ارتباط الدخول من نوع HttpOnly لا تستطيع الصفحات قراءتها، وطلبات المنصة موقعة رقمياً لصد الاستخدام الآلي المسيء، والاتصال مشفّر بالكامل عبر HTTPS."],
        },
        {
          icon: Trash2,
          title: "حقوقك تجاه بياناتك",
          list: [
            "يمكنك الاطلاع على بيانات حسابك وتعديلها في أي وقت من صفحة إعدادات الحساب.",
            "يمكنك حذف حسابك وبياناتك المرتبطة به من إعدادات الحساب.",
            "لأي طلب آخر يخص بياناتك، تواصل معنا عبر زر «الإبلاغ عن مشكلة» في أسفل الموقع وسنرد عليك.",
          ],
        },
        {
          icon: Baby,
          title: "خصوصية الطلاب",
          body: ["المنصة موجّهة لطلاب المدارس في المملكة الأردنية الهاشمية وتعمل في إطار مدرسي وبإشراف المعلمين والإدارة. حسابات المعلمين لا تُفعَّل إلا بعد موافقة إدارة المنصة. ننصح الطلاب بعدم مشاركة أي معلومات شخصية حساسة (مثل أرقام الهواتف أو العناوين) في المناقشات أو الرسائل."],
        },
        {
          icon: RefreshCw,
          title: "تغييرات هذه السياسة",
          body: ["قد نحدّث هذه السياسة عند الحاجة، وسنعلن عن أي تغيير جوهري داخل المنصة. استمرارك في استخدام المنصة بعد التحديث يعني قبولك بالنسخة الجديدة."],
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalShell
      icon={ScrollText}
      title="الشروط والأحكام"
      subtitle="باستخدامك منصة مفكري المستقبل فأنت توافق على هذه الشروط. كتبناها بلغة واضحة ومباشرة، فاقرأها بعناية."
      testid="terms-page"
      sections={[
        {
          icon: UserPlus,
          title: "الأهلية وإنشاء الحساب",
          list: [
            "المنصة مخصصة لطلاب ومعلمي مدارس المملكة الأردنية الهاشمية.",
            "عليك تقديم بيانات صحيحة عند إنشاء الحساب، وأنت مسؤول عن سرية كلمة مرورك وعن كل نشاط يتم عبر حسابك.",
            "حسابات المعلمين تُفعَّل بعد مراجعة وموافقة إدارة المنصة.",
          ],
        },
        {
          icon: Scale,
          title: "الاستخدام المقبول",
          list: [
            "التعامل باحترام مع جميع الأعضاء؛ لا إساءة أو تنمّر أو مضايقة بأي شكل.",
            "لا تنشر محتوى مخالفاً لقوانين المملكة الأردنية الهاشمية أو للآداب العامة، ولا تنتحل شخصية غيرك.",
            "لا تستخدم المنصة لأي غرض تجاري أو إعلاني خارج أنشطة النادي المعتمدة.",
          ],
        },
        {
          icon: Ban,
          title: "نزاهة المنافسة",
          body: ["نقاط الخبرة وقوائم الصدارة والمسابقات والشهادات قائمة على جهدك الحقيقي. يُمنع استخدام أي برامج أو أدوات آلية أو محاولات تقنية لجمع النقاط أو التلاعب بالنتائج. عند المخالفة يحق للإدارة إلغاء النقاط المكتسبة بغير وجه حق، وحجب الميزات، أو إيقاف الحساب."],
        },
        {
          icon: PenLine,
          title: "المحتوى الذي تنشره",
          body: ["المحتوى الذي تكتبه أو ترفعه (مراجعات، مناقشات، أعمال، مشاريع، صور) يبقى ملكاً لك. بنشره داخل المنصة أنت تمنحنا إذناً بعرضه داخل المنصة لأعضائها. أنت مسؤول عن محتواك، وعن امتلاكك حق نشره. يحق للإدارة حذف أي محتوى مخالف لهذه الشروط."],
        },
        {
          icon: Award,
          title: "الكتب والشهادات",
          body: ["الكتب المتاحة في المكتبة مواد تراثية وتعليمية يوفّرها النادي لأعضائه لأغراض القراءة والتعلم. الشهادات ونقاط الخبرة داخل المنصة إنجازات رمزية تعليمية تُحتسب بناء على نشاطك الفعلي، وليست مؤهلات رسمية معتمدة من أي جهة."],
        },
        {
          icon: AlertTriangle,
          title: "إيقاف الحساب وحدود المسؤولية",
          body: ["يحق للإدارة إيقاف أو إنهاء أي حساب يخالف هذه الشروط. المنصة خدمة تعليمية مجتمعية تُقدَّم كما هي، ونبذل جهدنا لاستمرارها وتطويرها، دون ضمان خلوّها من الانقطاع أو الأخطاء."],
        },
        {
          icon: Gavel,
          title: "القانون والتواصل",
          body: ["تخضع هذه الشروط لقوانين المملكة الأردنية الهاشمية. قد نحدّث الشروط من وقت لآخر ونعلن عن التغييرات الجوهرية داخل المنصة. لأي سؤال أو ملاحظة، تواصلوا معنا عبر زر «الإبلاغ عن مشكلة» في أسفل الموقع."],
        },
      ]}
    />
  );
}

export function CookiesPage() {
  return (
    <LegalShell
      icon={Cookie}
      title="سياسة ملفات الارتباط"
      subtitle="نستخدم ملفات الارتباط بالحد الأدنى اللازم لتشغيل المنصة فقط. هذه الصفحة تشرح ما يُحفظ على جهازك بالضبط، وما لا نستخدمه أبداً."
      testid="cookies-page"
      sections={[
        {
          icon: Info,
          title: "ما هي ملفات الارتباط؟",
          body: ["ملفات الارتباط (Cookies) ملفات صغيرة يحفظها متصفحك ليتذكر الموقع معلومات بسيطة عنك، مثل بقائك مسجلاً للدخول. بعض المواقع تستخدمها للتتبع والإعلانات؛ نحن لا نفعل ذلك."],
        },
        {
          icon: KeyRound,
          title: "ما نستخدمه فعلاً",
          list: [
            "ملف access_token: أساسي لتشغيل المنصة، يبقيك مسجلاً للدخول. من نوع HttpOnly فلا تستطيع أي صفحة قراءته، وينتهي بانتهاء مدته.",
            "ملف refresh_token: أساسي، يجدّد جلستك تلقائياً حتى لا تضطر لتسجيل الدخول كل مرة. من نوع HttpOnly أيضاً.",
            "تفضيلات على جهازك (Local Storage): مثل اختيار المظهر، وإعدادات قارئ الكتب والصوت، وإخفاء التنبيهات. تبقى على جهازك ولا تغادره.",
            "مفتاح جهاز في متصفحك (IndexedDB): مفتاح رقمي يُستخدم لتوقيع طلبات المنصة وحمايتها من الاستخدام الآلي المسيء. لا يتضمن أي معلومة شخصية عنك.",
          ],
        },
        {
          icon: EyeOff,
          title: "ما لا نستخدمه أبداً",
          list: [
            "لا ملفات ارتباط إعلانية أو تسويقية.",
            "لا أدوات تحليل أو تتبع خارجية (لا Google Analytics ولا غيرها).",
            "لا تتبع لنشاطك خارج منصتنا.",
          ],
          note: "لهذا السبب لا تحتاج المنصة إلى موافقة تتبع: كل ما يُحفظ أساسي لتشغيلها. يظهر لك إشعار قصير عند زيارتك الأولى للإحاطة فقط، ويمكنك قراءة التفاصيل هنا دائماً.",
        },
        {
          icon: Trash2,
          title: "تحكّمك الكامل",
          body: ["يمكنك حذف ملفات الارتباط والتفضيلات المحلية في أي وقت من إعدادات متصفحك. سيؤدي حذف ملفات الدخول إلى تسجيل خروجك من المنصة، وحذف التفضيلات يعيد إعدادات المظهر والقارئ إلى وضعها الافتراضي. إشعارات الهاتف اختيارية تماماً ويمكنك إيقافها من إعدادات الحساب في أي وقت."],
        },
      ]}
    />
  );
}
