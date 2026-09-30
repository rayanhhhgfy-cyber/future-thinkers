import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp, Float } from "@/components/anim";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import * as Icons from "lucide-react";
import { BookOpen, Crown, MessagesSquare, Users, GraduationCap, Building2, Calendar, ArrowLeft, Sparkles, Target, Flag, Trophy, Rocket, Mic, Users2, ChevronDown } from "lucide-react";

const CLUB_ICON = (name) => Icons[name] || Icons.Circle;

const CLAMP_CLASSES = { 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4" };

// Collapsible "read more" wrapper: shows a preview, expands to full text on arrow tap.
// Nothing is excluded — all content stays, just collapsed by default.
function ReadMore({ children, lines = 3 }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className={expanded ? "" : (CLAMP_CLASSES[lines] || "line-clamp-3")}>{children}</div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 text-sm font-bold transition-colors"
      >
        {expanded ? "عرض أقل" : "اقرأ المزيد"}
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [cms, setCms] = useState(null);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  useEffect(() => {
    api.get("/stats/public").then((r) => setStats(r.data)).catch(() => {});
    api.get("/clubs").then((r) => setClubs(r.data)).catch(() => {});
    api.get("/landing/cms").then((r) => setCms(r.data)).catch(() => {});
  }, []);

  const statItems = stats ? [
    { label: "مفكرو المستقبل", value: stats.students, icon: Users },
    { label: "الكتب المعرفية", value: stats.books, icon: BookOpen },
    { label: "المدارس المشاركة", value: stats.schools, icon: GraduationCap },
    { label: "مديريات التربية", value: stats.directorates, icon: Building2 },
    { label: "الفعاليات", value: stats.events, icon: Calendar },
    { label: "مباريات الشطرنج", value: stats.chess_games, icon: Crown },
  ] : [];

  const aboutText = cms?.about || `نحن مجموعة ونخبة من طلبة المدارس المبدعين والرياديين والمفكرين نقدياً، والباحثين عن الخير والحقيقة والجمال لتطوير مجتمعنا ووطننا وأمتنا والإنسانية جمعاء.

وذلك من خلال التشبيك مع شباب المدارس الأخرى على مستوى مديرية قصبة إربد الأولى ومدارس المملكة الأردنية الهاشمية للقيام بنشاطات فكرية وثقافية تخدم رؤية وزارة التربية والتعليم، وتسعى لإنشاء جيلٍ منتمٍ لوطنه وقيادته، يسعى لخدمة وطنه ومجتمعه وأمته تربوياً وعلمياً وثقافياً وإنسانياً.

وذلك تحقيقاً لرؤى جلالة الملك عبدالله الثاني بن الحسين حفظه الله ورعاه، وولي عهده الأمين الأمير الحسين بن عبدالله الثاني وفقه الله.`;

  const visionText = cms?.vision || "يسعى نادي مفكري المستقبل لتكون المنصة الأولى محلياً على مستوى المملكة الأردنية الهاشمية وعربياً وعالمياً خلال الخمس سنوات القادمة، لتصبح جسراً ثقافياً وإنسانياً وثيقاً للتواصل والتعارف وتبادل الخبرات والتجارب الذاتية والتشبيك والدعم بين الطلبة، ونقل خبراتهم وثقافتهم لبعضهم البعض عبر الحوار والتواصل والفعاليات. ونسعى لتخريج مفكرين رياديين ومبدعين مميزين عربياً وعالمياً كسفراء لوطنهم الأردن، والمتابعة مع الطلبة من خلال منتدى ثقافي يجمعهم في الجامعات أيضاً ليبقوا سفراء للنادي وينقلوا تجربتهم لطلبة المدارس اللاحقين من بعدهم.";

  const missionText = cms?.mission || "تهدف رسالتنا في نادي مفكري المستقبل إلى بناء ثقافة جيلٍ كامل من الأجيال الصاعدة، متسلحة بالوعي والمعرفة والإيمان والمهارات الحياتية والناعمة والتفكير الناقد، بقيم وطنية أصيلة، وتطوير جميع الأدوات المهارية التي تصنع منه جيلاً مبدعاً ومتميزاً من خلال أنشطتنا ومنصتنا الرقمية.";

  const defaultGoals = [
    "تشبيك الطلبة بين بعضهم البعض وتعزيز مهارات الحوار والتواصل.",
    "تعزيز قيمة الكتاب والمعرفة والعلم في حياتهم.",
    "تطوير المهارات الداعمة والشخصية ليكونوا مستعدين لسوق العمل.",
    "تشبيك طرق التواصل من خلال التبادل الثقافي بين الدول والقارات ونقل التجربة العربية والأردنية للعالم.",
    "تأسيس مجموعة من المشاريع والأندية الريادية والمبادرات ضمن مظلة نادي مفكري المستقبل والعمل عليها بشكل دائم وفعال.",
    "تعزيز قيم الريادة والابتكار والإبداع والرقمنة والذكاء الاصطناعي من خلال منصة نادي مفكري المستقبل والموقع الإلكتروني.",
  ];
  const goalsList = (cms?.goals && cms.goals.length > 0) ? cms.goals : defaultGoals;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden ft-hero-gradient grain text-white">
        <div className="absolute top-20 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl">
            <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" /> المنصة المعرفية الوطنية لطلاب الأردن
            </div>
            <h1 className="animate-fade-up d-1 font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              نقرأ أكثر، نفكّر أعمق،<br /><span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-300 via-emerald-400 to-teal-300 animate-gradient-text">ونصنع المستقبل.</span>
            </h1>
            <p className="animate-fade-up d-2 mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
              بيئة معرفية وثقافية وعلمية تجمع طلاب المملكة الأردنية الهاشمية حول القراءة والحوار والشطرنج والبرمجة والابتكار والمنافسات في مجتمع طلابي واحد.
            </p>
            <div className="animate-fade-up d-3 mt-8 flex flex-wrap gap-3">
              <Button data-testid="hero-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg" className="pressable rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-7 text-base">
                {user ? "اذهب إلى لوحتي" : "انضم إلى مفكري المستقبل"} <ArrowLeft className="w-5 h-5 mr-1" />
              </Button>
              <Button data-testid="hero-library-btn" onClick={() => nav("/library")} size="lg" variant="outline" className="pressable rounded-2xl h-12 px-7 text-base bg-white/5 border-white/20 text-white hover:bg-white/10">
                تصفّح المكتبة
              </Button>
            </div>
          </div>
        </div>
        {/* stats ribbon */}
        <div className="relative border-t border-white/10 bg-black/20">
          <Stagger className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {statItems.map((s) => (
              <Item key={s.label} className="text-center">
                <div className="text-2xl lg:text-3xl font-extrabold font-head text-white"><Counter value={s.value} /></div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* About Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <FadeUp>
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-3xl p-8 lg:p-12 border border-emerald-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 grid place-items-center"><Users2 className="w-6 h-6 text-emerald-600" /></div>
            <h2 className="font-head text-3xl lg:text-4xl font-extrabold text-slate-900">من نحن</h2>
          </div>
          <div className="text-slate-700 leading-relaxed text-base font-body max-w-none">
            <ReadMore lines={3}>
              {aboutText.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-slate-600 leading-relaxed mb-4 last:mb-0">{paragraph}</p>
              ))}
            </ReadMore>
          </div>
        </div>
        </FadeUp>
      </section>

      {/* Vision / Mission / Goals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Stagger className="grid lg:grid-cols-2 gap-6 mb-6">
          <Item className="bg-white rounded-3xl p-8 ft-shadow border border-slate-100 hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 grid place-items-center mb-4"><Flag className="w-6 h-6 text-emerald-600" /></div>
            <h2 className="font-head text-2xl font-bold text-slate-900">رؤيتنا</h2>
            <div className="mt-3"><ReadMore lines={3}><p className="text-slate-600 leading-relaxed">{visionText}</p></ReadMore></div>
          </Item>
          <Item className="bg-white rounded-3xl p-8 ft-shadow border border-slate-100 hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 grid place-items-center mb-4"><Target className="w-6 h-6 text-emerald-600" /></div>
            <h2 className="font-head text-2xl font-bold text-slate-900">رسالتنا</h2>
            <div className="mt-3"><ReadMore lines={3}><p className="text-slate-600 leading-relaxed">{missionText}</p></ReadMore></div>
          </Item>
        </Stagger>

        <FadeUp><h2 className="font-head text-2xl font-bold text-slate-900 mb-5">أهدافنا</h2></FadeUp>
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(goalsExpanded ? goalsList : goalsList.slice(0, 3)).map((g, i) => (
            <Item key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center text-sm font-bold shrink-0">{i + 1}</div>
              <p className="text-slate-700 text-sm leading-relaxed">{g}</p>
            </Item>
          ))}
        </Stagger>
        {goalsList.length > 3 && (
          <div className="text-center mt-6">
            <button
              onClick={() => setGoalsExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 text-sm font-bold transition-colors bg-white border border-emerald-200 hover:border-emerald-300 rounded-2xl px-5 py-2.5 ft-shadow"
            >
              {goalsExpanded ? "عرض أقل" : `عرض جميع الأهداف (${goalsList.length})`}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${goalsExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </section>

      {/* Activities / Projects */}
      {cms?.activities && cms.activities.length > 0 && (
        <section className="bg-white py-20 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-head text-3xl lg:text-4xl font-extrabold text-slate-900">نشاطاتنا وفعالياتنا ومشاريعنا</h2>
              <p className="mt-3 text-slate-500 max-w-2xl mx-auto">مبادرات نوعية تستهدف بناء الطالب المبدع والمفكر الناقد والريادي الواعي</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cms.activities.map((activity, index) => {
                const Icon = Icons[activity.icon] || Icons.BookOpen;
                return (
                  <div key={index} className="group bg-white rounded-3xl p-6 border border-slate-100 ft-shadow hover-lift hover:border-emerald-200 transition-all duration-300">
                    <div className="w-14 h-14 rounded-2xl grid place-items-center mb-5 text-white" style={{ background: activity.color }}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-head text-xl font-bold text-slate-900 mb-3">{activity.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">{activity.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Clubs showcase */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <h2 className="font-head text-3xl lg:text-4xl font-extrabold text-slate-900">اكتشف الأندية</h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">مساحات تفاعلية حقيقية للقراءة، الحوار، الشطرنج، البرمجة، العلوم، الابتكار والمزيد.</p>
          </FadeUp>
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clubs.map((c) => {
              const Icon = CLUB_ICON(c.icon);
              return (
                <Item key={c.id}>
                <Link to={`/clubs/${c.slug}`} data-testid={`club-card-${c.slug}`} className="group bg-white hover:bg-slate-50 rounded-2xl p-6 border border-slate-100 hover-lift block h-full">
                  <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4 text-white" style={{ background: c.color }}><Icon className="w-6 h-6" /></div>
                  <h3 className="font-head font-bold text-lg text-slate-900">{c.name}</h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>
                  <div className="mt-4 text-emerald-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">ادخل النادي <ArrowLeft className="w-4 h-4" /></div>
                </Link>
                </Item>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <FadeUp>
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-[2rem] p-10 lg:p-16 text-center text-white">
          <Float className="inline-block"><Trophy className="w-14 h-14 text-emerald-400 mx-auto mb-5" /></Float>
          <h2 className="font-head text-3xl lg:text-4xl font-extrabold">جاهز لتكون من مفكري المستقبل؟</h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto">انضم إلى آلاف الطلاب في رحلة معرفية تنافسية، واجمع نقاط الخبرة، وتصدّر قوائم الصدارة الوطنية.</p>
          <Button data-testid="cta-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg" className="pressable mt-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12 px-8 text-base">
            <Rocket className="w-5 h-5 ml-2" /> {user ? "لوحتي" : "ابدأ الآن مجاناً"}
          </Button>
        </div>
        </FadeUp>
      </section>
    </Layout>
  );
}
