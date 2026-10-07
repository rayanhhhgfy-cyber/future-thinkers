import React from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Atom, ChevronLeft, Beaker } from "lucide-react";
import { Layout } from "@/components/Layout";
import ScienceTools from "@/components/lab/ScienceTools";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CATS, shells } from "@/components/lab/chemData";

function MiniElModal({ el, onClose }) {
  if (!el) return null;
  const sh = shells(el.z);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[1.75rem] overflow-hidden bg-white ft-shadow-lg">
        <div className="p-6 relative" style={{ background: `linear-gradient(135deg, ${CATS[el.cat].color}2e, #ffffff 65%)` }}>
          <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 grid place-items-center rounded-full bg-slate-900/[0.06] text-slate-600"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl grid place-items-center shadow-lg ring-1 ring-black/5" style={{ background: CATS[el.cat].color }}>
              <div className="text-center">
                <div className="text-[10px] font-black text-slate-900/60">{el.z}</div>
                <div className="text-3xl font-black text-slate-900 leading-none">{el.sym}</div>
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-head text-slate-900">{el.ar}</div>
              <div className="text-slate-500 text-sm font-semibold" dir="ltr">{el.enName}</div>
              <span className="inline-block mt-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black" style={{ background: CATS[el.cat].color + "2e", color: "#334155", border: `1px solid ${CATS[el.cat].color}88` }}>{CATS[el.cat].ar}</span>
            </div>
          </div>
          <p className="mt-3 text-slate-600 text-sm leading-relaxed">{el.desc}</p>
        </div>
        <div className="px-5 pb-5 grid grid-cols-3 gap-2 text-center">
          {[["الكتلة", el.mass], ["الحالة", el.state === "g" ? "غاز" : el.state === "l" ? "سائل" : "صلب"], ["الكهروسلبية", el.en ?? "—"], ["المجموعة", el.g || "f"], ["الدورة", el.p], ["الأغلفة", sh.join("·")]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 py-2 px-1">
              <div className="text-[15px] font-black text-slate-900" dir="ltr">{v}</div>
              <div className="text-[9.5px] text-slate-400 font-black mt-0.5">{k}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ScienceLabTools() {
  const [elModal, setElModal] = React.useState(null);
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 overflow-x-clip" dir="rtl">
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-cyan-400 via-emerald-400 to-amber-400" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1.3px)] [background-size:24px_24px]" />
          <div className="relative">
            <Link to="/clubs/science" className="inline-flex items-center gap-1.5 text-cyan-200/80 hover:text-cyan-100 text-[13px] font-bold mb-4 transition"><ChevronLeft className="w-4 h-4 rotate-180" /> نادي العلوم</Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
              <FlaskConical className="w-3.5 h-3.5 text-amber-300" /> مختبر نادي العلوم التفاعلي
            </span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-black mt-3 leading-tight">المختبر العلمي <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-300 via-emerald-300 to-amber-300">الكبير</span></h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">خمس ميزات ضخمة بدل أدوات صغيرة متناثرة: مستكشف الذرة والجدول الدوري · حاسبة كيمياء شاملة بخطوات محلولة · مختبر الكشف عن المواد المجهولة · وقاعة التجارب الأسطورية · بعد المحاكاة التكيفية ثلاثية الأبعاد بالمختبر الرئيسي</p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Link to="/clubs/science/lab" data-testid="tools-to-sim"
                className="pressable inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 font-head font-black text-white ft-shadow hover:scale-[1.03] active:scale-95 transition">
                <Atom className="w-5 h-5" /> افتح محاكي التفاعلات ثلاثي الأبعاد
              </Link>
              <span className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                <Beaker className="w-4 h-4 text-cyan-300" /> كل تجربة هنا مربوطة بالمحاكي · جرّبها هناك حيّاً
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ScienceTools onInfo={setElModal} onTry={(items, c2) => {
            try {
              sessionStorage.setItem("ft-lab-try", JSON.stringify({ items, cond: c2 }));
            } catch { /* private mode */ }
            window.location.assign("/clubs/science/lab?try=1");
          }} />
        </div>

        <div className="mt-8 rounded-3xl bg-gradient-to-l from-cyan-50 via-white to-emerald-50 ring-1 ring-cyan-100 ft-shadow p-5 flex items-start gap-3">
          <FlaskConical className="w-6 h-6 text-cyan-600 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            <b className="text-slate-900 font-head">كيف تستفيد بذكاء؟</b> اقرأ التجربة هنا أولاً وافهم فكرتها، ثم اضغط «نفّذها بالمختبر» أو زر المحاكي لتشاهدها تحدث ذرّةً ذرّة مع المعادلة والطاقة · وكل تفاعل تنفّذه يرفع خبرتك في لوحة صدارة نادي العلوم ويقرّبك من أوسمة الكيميائي.
          </p>
        </div>
      </div>
      <AnimatePresence>{elModal && <MiniElModal el={elModal} onClose={() => setElModal(null)} />}</AnimatePresence>
    </Layout>
  );
}
