import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ChevronLeft, Atom, Rocket, Play, RotateCcw, Volume2, VolumeX, Check, X,
  Trophy, Timer, Activity, Triangle,
} from "lucide-react";
import { Layout } from "@/components/Layout";

import { fmt, chips, cardCls, gradBtn, ghostBtn, head3, Stat, Slider, Steps, numIn, selIn, useSimCanvas, LazyMount, usePrefersReducedMotion, NOOP, roundRect, arrow, PLANETS, planetById, RANKS, rankOf, BADGES, SPECTRUM, QUIZ_BANK, FACTS, FACT_CATS, LS_KEY, blankStore, loadStore, PhysCtx, usePhys, todayStr, lamText, sciHz } from "@/components/lab/physCore";
import { ProjectileSim, ProjectileLab, CollisionLab, CircuitLab, WaveStudio, OpticsBench, PendulumLab, OrbitLab, SpringLab, RampLab, ForcesLab } from "@/components/lab/physSims";
function SpectrumLab() {
  const [sel, setSel] = useState(SPECTRUM[3]);
  const fHz = 3e8 / (sel.lamNm * 1e-9);
  const eV = 1240 / sel.lamNm;
  return (
    <div className={cardCls} data-testid="phys-spectrum">
      {head3("🌈", "الطيف الكهرومغناطيسي الكامل", "من موجات الراديو العملاقة إلى غاما الخارقة · كلها ضوء بسرعات مختلفة الأطوال")}
      <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 ft-shadow" dir="ltr">
        <div className="flex h-14 sm:h-16">
          {SPECTRUM.map((b) => (
            <button key={b.id} onClick={() => setSel(b)} aria-label={b.name}
              className={`pressable relative transition-all ${sel.id === b.id ? "ring-2 ring-inset ring-slate-900 scale-y-110 z-10" : "opacity-85 hover:opacity-100"}`}
              style={{ background: `linear-gradient(180deg, ${b.col}, ${b.col}88)`, flexGrow: Math.max(1, 12 - Math.abs(Math.log10(b.lamNm) - 2)) }}>
              <span className="absolute inset-0 grid place-items-center text-[15px] sm:text-lg">{b.icon}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between px-2 py-1 bg-slate-900 text-[8.5px] sm:text-[9.5px] font-black text-slate-300">
          <span>طول موجي أطول ←</span><span>طاقة أعلى · اختراق أعمق</span><span>→ طول أقصر</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {SPECTRUM.map((b) => <button key={b.id} onClick={() => setSel(b)} className={chips(sel.id === b.id)}>{b.icon} {b.name}</button>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            <Stat label="الطول الموجي λ" value={lamText(sel.lamNm)} />
            <Stat label="التردد f" value={sciHz(fHz)} unit="Hz" tone="from-indigo-50 ring-indigo-100" />
            <Stat label="طاقة الفوتون" value={sciHz(eV)} unit="eV" tone="from-fuchsia-50 ring-fuchsia-100" />
            <Stat label="الخطورة" value={sel.dangerAr} tone="from-rose-50 ring-rose-100" />
          </div>
          <div className="rounded-2xl bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-100 p-4 mt-3">
            <div className="font-black font-head text-slate-900">{sel.icon} {sel.name}</div>
            <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1">في حياتك: {sel.uses}</p>
            <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-1">{sel.note}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============ FEATURE 12 · physics calculator ============ */
const pf = (s) => { const v = parseFloat(s); return isNaN(v) ? null : v; };
function CalcKinematics() {
  const [v0, setV0] = useState("0"), [a, setA] = useState("2"), [t, setT] = useState("5");
  const V0 = pf(v0), A = pf(a), T = pf(t);
  const ok = V0 != null && A != null && T != null;
  const v = ok ? V0 + A * T : null, x = ok ? V0 * T + 0.5 * A * T * T : null;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[["السرعة الابتدائية v0", v0, setV0], ["التسارع a", a, setA], ["الزمن t", t, setT]].map(([k, v, s]) => (
          <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{k}</span><input type="number" value={v} onChange={(e) => s(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
      </div>
      {ok && (
        <div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Stat label="السرعة النهائية v" value={fmt(v)} unit="m/s" />
            <Stat label="الإزاحة x" value={fmt(x)} unit="m" tone="from-indigo-50 ring-indigo-100" />
          </div>
          <Steps steps={[
            `نختار معادلة السرعة: v = v0 + a·t لأن عندنا v0 و a و t`,
            `نعوّض: v = ${V0} + ${A} × ${T} = ${fmt(v)} م/ثا`,
            `ومعادلة الإزاحة: x = v0·t + ½·a·t² = ${V0}×${T} + 0.5×${A}×${T}² = ${fmt(x)} م`,
            `تحقق سريع: متوسط السرعة × الزمن = (${fmt(V0)} + ${fmt(v)}) ÷ 2 × ${T} = ${fmt(((V0 + v) / 2) * T)} م ✓`,
          ]} />
        </div>
      )}
    </div>
  );
}
function CalcNewton() {
  const [F, setF] = useState(""), [m, setM] = useState("4"), [a, setA] = useState("3");
  const Fn = pf(F), Mn = pf(m), An = pf(a);
  let res = null;
  if (Fn == null && Mn != null && An != null) res = { k: "القوة F", v: Mn * An, u: "N", steps: [`المجهول هو القوة · من قانون نيوتن الثاني: F = m × a`, `نعوّض: F = ${Mn} × ${An} = ${fmt(Mn * An)} نيوتن`] };
  else if (An == null && Fn != null && Mn) res = { k: "التسارع a", v: Fn / Mn, u: "m/s²", steps: [`المجهول هو التسارع · نعيد ترتيب القانون: a = F ÷ m`, `نعوّض: a = ${Fn} ÷ ${Mn} = ${fmt(Fn / Mn)} م/ثا²`] };
  else if (Mn == null && Fn != null && An) res = { k: "الكتلة m", v: Fn / An, u: "kg", steps: [`المجهول هو الكتلة · m = F ÷ a`, `نعوّض: m = ${Fn} ÷ ${An} = ${fmt(Fn / An)} كغ`] };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[["القوة F (اتركه فارغاً لحسابه)", F, setF], ["الكتلة m كغ", m, setM], ["التسارع a", a, setA]].map(([k, v, s]) => (
          <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{k}</span><input type="number" value={v} onChange={(e) => s(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
      </div>
      {res ? (
        <div><div className="mt-3"><Stat label={res.k} value={fmt(res.v)} unit={res.u} /></div><Steps steps={res.steps} /></div>
      ) : <p className="text-[12px] text-slate-400 font-bold mt-3">اترك خانة واحدة فارغة (المجهول) واملأ الباقي · وسنختار المعادلة المناسبة</p>}
    </div>
  );
}
function CalcEnergy() {
  const [m, setM] = useState("2"), [v, setV] = useState("6"), [hgt, setHgt] = useState("5"), [pw, setPw] = useState("");
  const M = pf(m), V = pf(v), H = pf(hgt);
  const KE = M != null && V != null ? 0.5 * M * V * V : null;
  const PE = M != null && H != null ? M * 9.81 * H : null;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[["الكتلة m كغ", m, setM], ["السرعة v", v, setV], ["الارتفاع h م", hgt, setHgt]].map(([k, vv, s]) => (
          <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{k}</span><input type="number" value={vv} onChange={(e) => s(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Stat label="الطاقة الحركية ½mv²" value={KE != null ? fmt(KE, 1) : "-"} unit="J" tone="from-amber-50 ring-amber-100" />
        <Stat label="طاقة الوضع mgh" value={PE != null ? fmt(PE, 1) : "-"} unit="J" tone="from-indigo-50 ring-indigo-100" />
      </div>
      {KE != null && PE != null && (
        <Steps steps={[
          `الطاقة الحركية: KE = ½ × ${M} × ${V}² = ${fmt(KE, 1)} جول`,
          `طاقة الوضع: PE = ${M} × 9.81 × ${H} = ${fmt(PE, 1)} جول`,
          `لو سقط الجسم من هذا الارتفاع لوصلت سرعته: v = √(2gh) = ${fmt(Math.sqrt(2 * 9.81 * H))} م/ثا وتتحول كل PE إلى KE`,
        ]} />
      )}
      <label className="block mt-3"><span className="text-[11px] font-black text-slate-500">وللقدرة: ما الشغل (جول)؟</span><input type="number" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="اختياري · ثم سنقسمه على الزمن بالأسفل" className={numIn + " mt-1"} dir="ltr" /></label>
      {pf(pw) != null && <p className="text-[12px] text-slate-500 font-bold mt-2">لو أنجز هذا الشغل في 4 ثوانٍ فالقدرة = {fmt(pf(pw) / 4, 1)} واط · القدرة = الشغل ÷ الزمن</p>}
    </div>
  );
}
function CalcMomentum() {
  const [m1, setM1] = useState("3"), [v1, setV1] = useState("6"), [m2, setM2] = useState("2"), [v2, setV2] = useState("-2"), [stick, setStick] = useState(true);
  const M1 = pf(m1) || 0, V1 = pf(v1) || 0, M2 = pf(m2) || 0, V2 = pf(v2) || 0;
  const p1 = M1 * V1, p2 = M2 * V2, pt = p1 + p2, vf = (M1 + M2) ? pt / (M1 + M2) : 0;
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {[["m1", m1, setM1], ["v1", v1, setV1], ["m2", m2, setM2], ["v2", v2, setV2]].map(([k, v, s]) => (
          <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{k}</span><input type="number" value={v} onChange={(e) => s(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        <button onClick={() => setStick(true)} className={chips(stick)}>يتصادمان ويلتصقان</button>
        <button onClick={() => setStick(false)} className={chips(!stick)}>أحسب الزخم فقط</button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="زخم الأول" value={fmt(p1, 1)} unit="kg·m/s" />
        <Stat label="زخم الثاني" value={fmt(p2, 1)} unit="kg·m/s" tone="from-cyan-50 ring-cyan-100" />
        <Stat label={stick ? "سرعتهما معاً بعد" : "الزخم الكلي"} value={stick ? fmt(vf) : fmt(pt, 1)} unit={stick ? "m/s" : "kg·m/s"} tone="from-emerald-50 ring-emerald-100" />
      </div>
      <Steps steps={[
        `زخم كل جسم: p = m × v · الأول ${fmt(p1, 1)} والثاني ${fmt(p2, 1)} (الإشارة تعني الاتجاه)`,
        `الزخم الكلي قبل التصادم = ${fmt(pt, 1)} · وهو نفسه بعد التصادم مهما حدث (حفظ الزخم)`,
        ...(stick ? [`لأنهما التصقا: كتلتهما معاً ${M1 + M2} كغ · السرعة المشتركة = ${fmt(pt, 1)} ÷ ${M1 + M2} = ${fmt(vf)} م/ثا`] : [`الزخم كمية متجهة: لو كان المجموع صفراً فالجسمان يتوقفان تماماً لو التصقا`]),
      ]} />
    </div>
  );
}
function CalcElectric() {
  const [V, setV] = useState("12"), [I, setI] = useState(""), [R, setR] = useState("4");
  const Vn = pf(V), In = pf(I), Rn = pf(R);
  let res = null;
  if (Vn != null && Rn) res = { I: Vn / Rn, V: Vn, R: Rn, sol: `التيار = الجهد ÷ المقاومة = ${Vn} ÷ ${Rn}` };
  else if (In != null && Rn) res = { I: In, V: In * Rn, R: Rn, sol: `الجهد = التيار × المقاومة = ${In} × ${Rn}` };
  else if (Vn != null && In) res = { I: In, V: Vn, R: Vn / In, sol: `المقاومة = الجهد ÷ التيار = ${Vn} ÷ ${In}` };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[["الجهد V", V, setV], ["التيار I (أو اتركه)", I, setI], ["المقاومة R", R, setR]].map(([k, v, s]) => (
          <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{k}</span><input type="number" value={v} onChange={(e) => s(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
      </div>
      {res ? (
        <div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="الجهد" value={fmt(res.V, 2)} unit="V" />
            <Stat label="التيار" value={fmt(res.I)} unit="A" tone="from-amber-50 ring-amber-100" />
            <Stat label="القدرة P = V×I" value={fmt(res.V * res.I, 1)} unit="W" tone="from-emerald-50 ring-emerald-100" />
          </div>
          <Steps steps={[`من قانون أوم نبدأ: ${res.sol} = ${fmt(res.I, 2)} أمبير`, `القدرة الكهربائية: P = V × I = ${fmt(res.V, 1)} × ${fmt(res.I)} = ${fmt(res.V * res.I, 1)} واط · هذه حرارة وضوء جهازك كل ثانية`]} />
        </div>
      ) : <p className="text-[12px] text-slate-400 font-bold mt-3">املأ قيمتين من ثلاث وسنحسب الثالثة بقانون أوم</p>}
    </div>
  );
}
function CalcWave() {
  const [v, setV] = useState("343"), [ fq, setFq ] = useState("440"), [lam, setLam] = useState("");
  const Vn = pf(v), Fn = pf(fq), Ln = pf(lam);
  let res = null;
  if (Vn != null && Fn) res = { lam: Vn / Fn, txt: `الطول الموجي = السرعة ÷ التردد = ${Vn} ÷ ${Fn}` };
  else if (Fn != null && Ln) res = { v2: Fn * Ln, txt: `السرعة = التردد × الطول الموجي = ${Fn} × ${Ln}` };
  else if (Vn != null && Ln) res = { fq2: Vn / Ln, txt: `التردد = السرعة ÷ الطول الموجي = ${Vn} ÷ ${Ln}` };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[["السرعة v", v, setV], ["التردد f", fq, setFq], ["الطول الموجي λ", lam, setLam]].map(([k, vv, s]) => (
          <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{k}</span><input type="number" value={vv} onChange={(e) => s(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
      </div>
      {res ? (
        <div>
          <div className="mt-3"><Stat label="الناتج" value={fmt(res.lam ?? res.v2 ?? res.fq2, 3)} tone="from-fuchsia-50 ring-fuchsia-100" /></div>
          <Steps steps={[`علاقة الموجة الذهبية: v = f × λ تربط الثلاثة`, res.txt, `نغمة 440 هرتز (نوتة لا الموسيقية) طولها بالهواء نحو 0.78 م · كلما ارتفع التردد قصرت الموجة`]} />
        </div>
      ) : <p className="text-[12px] text-slate-400 font-bold mt-3">املأ قيمتين من ثلاث</p>}
    </div>
  );
}
const CALC_TABS = [["kin", "🏃 حركة بعجلة ثابتة"], ["newton", "🍎 قوة نيوتن"], ["energy", "⚡ شغل وطاقة وقدرة"], ["mom", "⚖️ زخم وتصادم"], ["elec", "🔌 كهرباء أوم"], ["wave", "🌊 موجات"]];
function PhysicsCalculator() {
  const [mode, setMode] = useState("kin");
  return (
    <div className={cardCls} data-testid="phys-calculator">
      {head3("🧮", "حاسبة الفيزياء الشاملة", "ست آلات متخصصة · كل واحدة تعرض خطوات الحل كما يكتبها معلمك")}
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CALC_TABS.map(([id, ar]) => <button key={id} onClick={() => setMode(id)} className={chips(mode === id) + " shrink-0"}>{ar}</button>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {mode === "kin" && <CalcKinematics />}
          {mode === "newton" && <CalcNewton />}
          {mode === "energy" && <CalcEnergy />}
          {mode === "mom" && <CalcMomentum />}
          {mode === "elec" && <CalcElectric />}
          {mode === "wave" && <CalcWave />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============ FEATURE 13 · unit converter ============ */
const UNIT_CATS = [
  { id: "len", name: "📏 الطول", units: [["مليمتر", 0.001], ["سنتيمتر", 0.01], ["متر", 1], ["كيلومتر", 1000], ["إنش", 0.0254], ["قدم", 0.3048], ["ميل", 1609.34]] },
  { id: "speed", name: "🚗 السرعة", units: [["متر/ثانية", 1], ["كم/ساعة", 1 / 3.6], ["ميل/ساعة", 0.44704]] },
  { id: "energy", name: "🔥 الطاقة", units: [["جول", 1], ["كيلوجول", 1000], ["سعرة حرارية", 4.184], ["كيلوواط·ساعة", 3600000]] },
  { id: "power", name: "💪 القدرة", units: [["واط", 1], ["كيلوواط", 1000], ["حصان", 745.7]] },
  { id: "pressure", name: "🌡️ الضغط", units: [["باسكال", 1], ["كيلوباسكال", 1000], ["بار", 100000], ["ضغط جوي", 101325]] },
  { id: "temp", name: "🌡️ الحرارة", units: [["درجة مئوية °C", "c"], ["كلفن K", "k"], ["فهرنهايت °F", "fh"]] },
];
function UnitConverter() {
  const [catId, setCatId] = useState("len");
  const [from, setFrom] = useState(2), [to, setTo] = useState(3);
  const [val, setVal] = useState("1");
  const cat = UNIT_CATS.find((c) => c.id === catId);
  const v = pf(val);
  let result = null, steps = [];
  if (v != null) {
    if (catId === "temp") {
      const toC = (x, u) => (u === "c" ? x : u === "k" ? x - 273.15 : (x - 32) * 5 / 9);
      const fromC = (x, u) => (u === "c" ? x : u === "k" ? x + 273.15 : x * 9 / 5 + 32);
      const c = toC(v, cat.units[from][1]);
      result = fromC(c, cat.units[to][1]);
      steps = [`الحرارة لا تضرب بمعامل · نحوّل أولاً للمئوية: النتيجة الوسيطة ${fmt(c)} °C`, `ثم نحوّل منها للوحدة المطلوبة: ${fmt(result)}`, `تذكر: صفر كلفن هو أبرد شيء بالكون (-273.15 مئوية) ولا يوجد أسفل منه`];
    } else {
      const base = v * cat.units[from][1];
      result = base / cat.units[to][1];
      steps = [`نحوّل للوحدة الأساسية أولاً: ${v} × ${cat.units[from][1]} = ${fmt(base, 6)}`, `ثم نقسم على معامل الوحدة الهدف: ${fmt(base, 6)} ÷ ${cat.units[to][1]} = ${fmt(result, 6)}`, `تحقق: التحويل العكسي يجب أن يعيدك لنفس الرقم تماماً`];
    }
  }
  return (
    <div className={cardCls} data-testid="phys-units">
      {head3("🔁", "محول الوحدات الشامل", "طول وسرعة وطاقة وقدرة وضغط وحرارة · بخطوات التحويل")}
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {UNIT_CATS.map((c) => <button key={c.id} onClick={() => { setCatId(c.id); setFrom(0); setTo(1); }} className={chips(catId === c.id) + " shrink-0"}>{c.name}</button>)}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
        <label className="block"><span className="text-[11px] font-black text-slate-500">من</span>
          <select value={from} onChange={(e) => setFrom(+e.target.value)} className={selIn + " mt-1"}>{cat.units.map((u, i) => <option key={u[0]} value={i}>{u[0]}</option>)}</select></label>
        <span className="text-xl text-slate-300 font-black pb-2">←</span>
        <label className="block"><span className="text-[11px] font-black text-slate-500">إلى</span>
          <select value={to} onChange={(e) => setTo(+e.target.value)} className={selIn + " mt-1"}>{cat.units.map((u, i) => <option key={u[0]} value={i}>{u[0]}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <label className="block"><span className="text-[11px] font-black text-slate-500">القيمة</span>
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        <div><span className="text-[11px] font-black text-slate-500">الناتج</span>
          <div className="mt-1 rounded-2xl bg-gradient-to-b from-violet-600 to-indigo-700 text-white px-4 py-2.5 font-black font-head text-lg ft-shadow" dir="ltr">{result != null ? fmt(result, 6) : "-"}</div></div>
      </div>
      <Steps steps={steps} />
    </div>
  );
}

/* ============ FEATURE 14 · your weight on planets ============ */
function PlanetWeight() {
  const [pid, setPid] = useState("mars");
  const [massStr, setMassStr] = useState("50");
  const planet = planetById(pid);
  const m = pf(massStr) || 0;
  const W = m * planet.g;
  const equiv = W / 9.81;
  const jump = 0.45 * (9.81 / planet.g);
  return (
    <div className={cardCls} data-testid="phys-planets">
      {head3("🪐", "وزنك على الكواكب", "كتلتك لا تتغير أبداً · لكن وزنك يرقص مع جاذبية كل عالم")}
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PLANETS.map((p) => (
          <button key={p.id} onClick={() => setPid(p.id)} className={chips(pid === p.id) + " shrink-0"}>
            <span className="inline-block w-2.5 h-2.5 rounded-full ml-1 ring-1 ring-black/10" style={{ background: p.col }} />{p.name}
          </button>
        ))}
      </div>
      <label className="block max-w-xs"><span className="text-[12px] font-black text-slate-600">كتلتك بالكيلوغرام</span>
        <input type="number" value={massStr} onChange={(e) => setMassStr(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
      <AnimatePresence mode="wait">
        <motion.div key={pid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            <Stat label={`وزنك على ${planet.name}`} value={fmt(W, 0)} unit="N" />
            <Stat label="يكافئ على الأرض" value={fmt(equiv, 1)} unit="kg" tone="from-indigo-50 ring-indigo-100" />
            <Stat label="جاذبيته g" value={fmt(planet.g)} unit="m/s²" tone="from-cyan-50 ring-cyan-100" />
            <Stat label="سرعة الهروب" value={fmt(planet.esc, 1)} unit="km/s" tone="from-fuchsia-50 ring-fuchsia-100" />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            <div className="rounded-2xl bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-100 p-3.5">
              <div className="text-[12px] font-black text-violet-800">🏃 قفزتك هناك</div>
              <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1">لو قفزت 45 سم على الأرض، على {planet.name} ستقفز نحو <b>{fmt(jump)} م</b> بنفس قوة رجليك</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-b from-indigo-50 to-white ring-1 ring-indigo-100 p-3.5">
              <div className="text-[12px] font-black text-indigo-800">💡 حقيقة {planet.name}</div>
              <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1">{planet.fact}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============ FEATURE 15 · target challenge ============ */
function TargetChallenge() {
  const { award, patchStore, store } = usePhys();
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(() => 80 + Math.floor(Math.random() * 120));
  const [shots, setShots] = useState(5);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const newRound = () => {
    setTarget(80 + Math.floor(Math.random() * 120));
    setShots(5); setResults([]); setDone(false); setRound((r) => r + 1);
  };
  const onLand = useCallback((x) => {
    if (done) return;
    const err = Math.abs(x - target);
    const pts = Math.max(0, Math.round(100 - err * 2.2));
    const nr = [...results, { x, err, pts }];
    setResults(nr);
    const left = shots - 1;
    setShots(left);
    if (pts >= 90) award("sniper-hit-" + round, 30, "إصابة شبه مثالية", "sniper");
    if (left <= 0 || pts >= 97) {
      setDone(true);
      const best = Math.max(...nr.map((r) => r.pts));
      patchStore((s) => ({ ...s, records: { ...s.records, bestTarget: Math.max(s.records.bestTarget || 0, best) } }));
      award("target-round-" + round, 12 + best, `أنهيت الجولة · أفضل إصابة ${best}`);
    }
  }, [done, results, shots, round, award, patchStore]);
  return (
    <div className={cardCls} data-testid="phys-target">
      {head3("🎯", "تحدي إصابة الهدف", "هدف أحمر على بعد عشوائي · عندك 5 قذائف · كلما اقتربت كبرت نقاطك")}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-3 py-1.5 rounded-full bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-[12px] font-black">الهدف: {target} م</span>
        <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[12px] font-black">القذائف المتبقية: {"🎯".repeat(Math.max(0, shots)) || "انتهت"}</span>
        <span className="px-3 py-1.5 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-700 text-[12px] font-black">أفضل إصابة بتاريخك: {store.records.bestTarget || 0}</span>
      </div>
      <MProjectileSim challenge targetM={target} onLand={onLand} />
      {results.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {results.map((r, i) => (
            <span key={i} className={`px-3 py-1.5 rounded-full text-[11.5px] font-black ring-1 ${r.pts >= 90 ? "bg-emerald-50 ring-emerald-200 text-emerald-700" : r.pts >= 60 ? "bg-amber-50 ring-amber-200 text-amber-700" : "bg-rose-50 ring-rose-200 text-rose-600"}`}>
              قذيفة {i + 1}: {fmt(r.x)} م · خطأ {fmt(r.err)} م · {r.pts} نقطة
            </span>
          ))}
        </div>
      )}
      {done && (
        <div className="flex flex-wrap items-center gap-2 mt-3 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-700 text-white px-4 py-3 ft-shadow">
          <span className="font-black text-[13px]">انتهت الجولة {round} · أفضل إصابة {Math.max(...results.map((r) => r.pts))} نقطة {Math.max(...results.map((r) => r.pts)) >= 90 ? "🏆 قنّاص حقيقي" : "· قرّب زاويتك من 45 وجرّب سرعات مختلفة"}</span>
          <button onClick={newRound} className="pressable mr-auto px-4 py-2 rounded-xl bg-white text-indigo-800 text-[12px] font-head font-black active:scale-95 min-h-[40px]">جولة جديدة</button>
        </div>
      )}
    </div>
  );
}

/* ============ FEATURE 16 · circuit challenge ============ */
function CircuitChallenge() {
  const { award, patchStore, store } = usePhys();
  const [targetI, setTargetI] = useState(() => Math.round((0.5 + Math.random() * 1.7) * 10) / 10);
  const [volts, setVolts] = useState(9);
  const [res, setRes] = useState(18);
  const [tries, setTries] = useState(0);
  const [won, setWon] = useState(false);
  const I = volts / res;
  const errPct = Math.abs(I - targetI) / targetI * 100;
  const check = () => {
    setTries((t) => t + 1);
    if (errPct <= 5) {
      setWon(true);
      patchStore((s) => ({ ...s, records: { ...s.records, circuitWins: (s.records.circuitWins || 0) + 1 } }));
      award("circuit-win-" + Date.now(), 30, "ضبطت التيار على الهدف", "circuit-master");
    }
  };
  const reset = () => { setTargetI(Math.round((0.5 + Math.random() * 1.7) * 10) / 10); setTries(0); setWon(false); };
  return (
    <div className={cardCls} data-testid="phys-circuit-challenge">
      {head3("🔌", "تحدي الدائرة", "المهندس يطلب تياراً محدداً · اضبط الجهد والمقاومة حتى تلمسه")}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-3 py-1.5 rounded-full bg-cyan-50 ring-1 ring-cyan-200 text-cyan-800 text-[12px] font-black">التيار المطلوب: <span dir="ltr">{fmt(targetI)} A</span> (±5%)</span>
        <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[12px] font-black">انتصاراتك: {store.records.circuitWins || 0}</span>
        <span className="px-3 py-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-600 text-[12px] font-black">المحاولات: {tries}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Slider label="جهد البطارية" value={volts} set={setVolts} min={2} max={24} step={0.5} unit="V" tone="accent-amber-500" />
        <Slider label="المقاومة" value={res} set={setRes} min={4} max={60} unit="Ω" tone="accent-indigo-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="التيار الحالي I = V ÷ R" value={fmt(I)} unit="A" tone="from-amber-50 ring-amber-100" />
        <Stat label="الفرق عن الهدف" value={fmt(errPct, 1)} unit="%" tone="from-rose-50 ring-rose-100" />
        <Stat label="القدرة" value={fmt(volts * I, 1)} unit="W" tone="from-emerald-50 ring-emerald-100" />
      </div>
      <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden mt-3 relative" dir="ltr">
        <motion.span animate={{ scaleX: Math.min(1, I / (targetI * 1.6)) }} className={`block h-full w-full origin-left rounded-full ${errPct <= 5 ? "bg-emerald-500" : "bg-gradient-to-r from-amber-300 to-orange-500"}`} />
        <span className="absolute top-0 bottom-0 w-0.5 bg-slate-900" style={{ left: `${(1 / 1.6) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={check} disabled={won} className={gradBtn + (won ? " opacity-50 pointer-events-none" : "")}><Check className="w-4 h-4" /> فحص التيار</button>
        <button onClick={reset} className={ghostBtn}><RotateCcw className="w-4 h-4" /> هدف جديد</button>
      </div>
      {won && <p className="text-[13px] font-black text-emerald-700 mt-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-3.5 py-2.5">🎉 ضبطتها! {fmt(I)} أمبير ضمن الهامش · هكذا يصمم المهندسون دوائر الإضاءة الحقيقية</p>}
      {!won && tries > 0 && <p className="text-[12px] font-bold text-slate-500 mt-3">تلميح: التيار المطلوب {fmt(targetI)} · جرّب قسمة الجهد على التيار لتخمين المقاومة المناسبة</p>}
    </div>
  );
}

/* ============ FEATURE 17 · daily physics quiz ============ */
function dailyQuizSet() {
  const s = todayStr();
  let seed = 0;
  for (const ch of s) seed += ch.charCodeAt(0);
  const idx = [];
  let i = 0;
  while (idx.length < 5) {
    const c = (seed + i * 3 + idx.length * 7) % QUIZ_BANK.length;
    if (!idx.includes(c)) idx.push(c);
    i++;
  }
  return idx.map((j) => QUIZ_BANK[j]);
}
function QuizLab() {
  const { award, patchStore, store } = usePhys();
  const quiz = useMemo(() => dailyQuizSet(), []);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const doneToday = store.daily.date === todayStr() && store.daily.quizDone;
  const finish = (finalCorrect) => {
    setFinished(true);
    if (doneToday) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    patchStore((s) => ({
      ...s,
      daily: { date: todayStr(), quizDone: true },
      records: {
        ...s.records,
        quizAnswered: (s.records.quizAnswered || 0) + 5,
        quizCorrect: (s.records.quizCorrect || 0) + finalCorrect,
        quizStreak: s.records.lastQuizDate === yesterday ? (s.records.quizStreak || 0) + 1 : 1,
        lastQuizDate: todayStr(),
      },
    }));
    award("quiz-" + todayStr(), 25 + finalCorrect * 5, `أنهيت اختبار اليوم · ${finalCorrect} من 5`, finalCorrect >= 4 ? "quiz-ace" : undefined);
  };
  const pick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === quiz[qi].a) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (qi + 1 >= quiz.length) { finish(correct); return; }
    setQi(qi + 1); setPicked(null);
  };
  const q = quiz[qi];
  return (
    <div className={cardCls} data-testid="phys-quiz">
      {head3("🧠", "اختبار الفيزياء اليومي", "خمسة أسئلة جديدة كل يوم · حافظ على سلسلتك اليومية")}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[12px] font-black">السؤال {Math.min(qi + 1, 5)} من 5</span>
        <span className="px-3 py-1.5 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-700 text-[12px] font-black">🔥 سلسلتك: {store.records.quizStreak || 0} يوم</span>
        {doneToday && !finished && <span className="px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 text-[12px] font-black">أنجزت اختبار اليوم · اللعب الآن للتدريب فقط</span>}
      </div>
      {!finished ? (
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={qi} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <div className="rounded-2xl bg-gradient-to-b from-violet-600 to-indigo-700 text-white p-4 ft-shadow">
                <div className="font-black font-head text-[15px] sm:text-base leading-relaxed">{q.q}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-3">
                {q.opts.map((op, i) => {
                  const isRight = picked !== null && i === q.a;
                  const isWrong = picked === i && i !== q.a;
                  return (
                    <button key={i} onClick={() => pick(i)}
                      className={`pressable text-right px-4 py-3 rounded-2xl font-black text-[13px] ring-1 transition min-h-[48px] ${isRight ? "bg-emerald-500 text-white ring-emerald-300" : isWrong ? "bg-rose-500 text-white ring-rose-300" : "bg-white ring-slate-200 text-slate-700 hover:ring-indigo-300"}`}>
                      {isRight ? "✓ " : isWrong ? "✗ " : ""}{op}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-cyan-50 ring-1 ring-cyan-100 px-4 py-3">
                    <p className="text-[12.5px] text-slate-600 font-semibold leading-relaxed">💡 {q.why}</p>
                    <button onClick={next} className={gradBtn + " mt-2"}>{qi + 1 >= quiz.length ? "إنهاء الاختبار" : "السؤال التالي"}</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center rounded-2xl bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-100 p-5">
          <div className="text-4xl">{correct >= 4 ? "🏆" : correct >= 3 ? "⭐" : "💪"}</div>
          <div className="font-black font-head text-xl text-slate-900 mt-2">أجبت {correct} من 5 صح</div>
          <p className="text-[12.5px] text-slate-500 font-semibold mt-1">{doneToday ? "نقاط اليوم سجلت · عد غداً لأسئلة جديدة وحافظ على السلسلة" : correct >= 4 ? "مستوى عباقرة · وسام عبقري الفيزياء صار أقرب" : "راجع شروحات الأسئلة وارجع غداً أقوى"}</p>
          <button onClick={() => { setQi(0); setPicked(null); setCorrect(0); setFinished(false); }} className={ghostBtn + " mt-3"}><RotateCcw className="w-4 h-4" /> تدريب إضافي (بلا نقاط)</button>
        </div>
      )}
    </div>
  );
}

/* ============ FEATURE 20 · physics facts wall ============ */
function FactsWall() {
  const [cat, setCat] = useState("الكل");
  const [flipped, setFlipped] = useState({});
  const shown = FACTS.map((f, i) => ({ ...f, i })).filter((f) => cat === "الكل" || f.cat === cat);
  return (
    <div className={cardCls} data-testid="phys-facts">
      {head3("💡", "جدار حقائق الفيزياء", "اضغط أي بطاقة لتقلبها · حقائق تدهشك عن الحركة والكهرباء والضوء والفضاء")}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FACT_CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={chips(cat === c)}>{c}</button>)}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shown.map((f) => {
          const open = !!flipped[f.i];
          return (
            <button key={f.i} onClick={() => setFlipped((s) => ({ ...s, [f.i]: !s[f.i] }))}
              className="pressable text-right rounded-3xl ring-1 overflow-hidden ft-shadow active:scale-[0.98] transition min-h-[150px]">
              <AnimatePresence mode="wait">
                {!open ? (
                  <motion.div key="front" initial={{ opacity: 0, rotateX: 40 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: -40 }} transition={{ duration: 0.22 }}
                    className="h-full bg-gradient-to-b from-violet-600 via-indigo-600 to-indigo-800 text-white p-4 flex flex-col">
                    <span className="text-3xl">{f.icon}</span>
                    <span className="font-black font-head text-[15px] mt-2 leading-snug">{f.title}</span>
                    <span className="mt-auto flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/25">{f.cat}</span>
                      <span className="text-[10px] font-black text-cyan-200">اضغط للقلب ⟳</span>
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="back" initial={{ opacity: 0, rotateX: -40 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 40 }} transition={{ duration: 0.22 }}
                    className="h-full bg-white p-4">
                    <span className="text-[11px] font-black text-violet-600">{f.icon} {f.title}</span>
                    <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1.5">{f.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============ FEATURE 18 · badges & ranks wall ============ */
function BadgesWall() {
  const { store } = usePhys();
  const { rank, next } = rankOf(store.xp);
  const pct = next ? Math.min(100, ((store.xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
  return (
    <div className={cardCls} data-testid="phys-badges">
      {head3("🏅", "أوسمة الفيزياء والرتب", "كل وسام قصة تجربة عشتها بيدك في هذا المختبر")}
      <div className="rounded-2xl bg-gradient-to-l from-violet-600 via-indigo-600 to-indigo-800 text-white p-4 ft-shadow">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/30 grid place-items-center text-2xl">🎓</span>
          <div className="min-w-0">
            <div className="font-black font-head text-lg leading-tight">{rank.name}</div>
            <div className="text-[11.5px] text-indigo-100 font-bold">{store.xp} نقطة خبرة فيزياء {next ? `· للرتبة التالية ${next.xp}` : "· أعلى رتبة 🏆"}</div>
          </div>
          <span className="mr-auto text-[12px] font-black px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25">{store.badges.length} / {BADGES.length} وساماً</span>
        </div>
        <div className="h-3 rounded-full bg-white/15 overflow-hidden mt-3" dir="ltr">
          <motion.span animate={{ scaleX: pct / 100 }} transition={{ type: "spring", stiffness: 60, damping: 16 }} className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
        {BADGES.map((b) => {
          const got = store.badges.includes(b.id);
          return (
            <div key={b.id} className={`rounded-3xl p-3 text-center ring-1 transition ${got ? "bg-gradient-to-b from-amber-50 to-white ring-amber-200 ft-shadow" : "bg-slate-50/70 ring-slate-100 opacity-75"}`}>
              <div className={`text-3xl ${got ? "" : "grayscale opacity-40"}`}>{b.icon}</div>
              <div className={`text-[12px] font-black mt-1.5 ${got ? "text-slate-900" : "text-slate-400"}`}>{b.name}</div>
              <div className="text-[10px] text-slate-400 font-bold leading-snug mt-0.5">{b.desc}</div>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[9.5px] font-black ${got ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"}`}>{got ? "مفتوح ✓" : "مقفل"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ FEATURE 19 · personal lab record ============ */
function RecordsCard() {
  const { store, patchStore } = usePhys();
  const [arm, setArm] = useState(false);
  const r = store.records;
  const acc = r.quizAnswered ? Math.round(((r.quizCorrect || 0) / r.quizAnswered) * 100) : 0;
  const stats = [
    ["🧪", "تجارب شغّلتها", r.experiments || 0],
    ["🔭", "تجارب مختلفة جرّبتها", (r.sims || []).length],
    ["🎯", "أفضل نتيجة هدف", (r.bestTarget || 0) + " نقطة"],
    ["🔌", "انتصارات تحدي الدائرة", r.circuitWins || 0],
    ["🧠", "أسئلة أجبتها", r.quizAnswered || 0],
    ["✓", "إجابات صحيحة", (r.quizCorrect || 0) + " (" + acc + "%)"],
    ["🔥", "أطول سلسلة يومية", (r.quizStreak || 0) + " يوم"],
    ["⭐", "نقاط الخبرة الكلية", store.xp],
  ];
  return (
    <div className={cardCls} data-testid="phys-records">
      {head3("📓", "سجل المختبر الشخصي", "أرقامك محفوظة على جهازك · تكبر مع كل زيارة")}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(([icon, label, v]) => (
          <div key={label} className="rounded-2xl bg-white ring-1 ring-slate-100 p-3 flex items-center gap-2.5">
            <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-violet-50 ring-1 ring-violet-100 text-lg">{icon}</span>
            <div className="min-w-0">
              <div className="text-[15px] font-black font-head text-slate-900 leading-none" dir="ltr">{v}</div>
              <div className="text-[9.5px] text-slate-400 font-black mt-1 leading-tight">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => {
        if (!arm) { setArm(true); setTimeout(() => setArm(false), 3500); return; }
        patchStore(() => blankStore());
        setArm(false);
      }} className={`pressable mt-3 px-4 py-2.5 rounded-2xl text-[12px] font-black min-h-[44px] active:scale-95 transition ${arm ? "bg-rose-600 text-white ft-shadow" : "bg-white ring-1 ring-rose-200 text-rose-600 hover:bg-rose-50"}`}>
        {arm ? "متأكد؟ اضغط مرة أخرى لمسح كل السجل والنقاط" : "تصفير السجل والنقاط"}
      </button>
      <p className="text-[11px] text-slate-400 font-semibold mt-2">التصفير يمسح النقاط والأوسمة والسجل من هذا الجهاز فقط · ولا يمكن التراجع عنه</p>
    </div>
  );
}

/* ================= main page ================= */
const SIM_TABS = [
  ["projectile", "🚀 المقذوفات"], ["collision", "🚗 التصادمات"], ["circuit", "💡 الدوائر الكهربائية"],
  ["waves", "🌊 الموجات والصوت"], ["optics", "🔍 البصريات"], ["pendulum", "⏱️ البندول"],
  ["orbit", "🛰️ المدارات"], ["spring", "🌀 النوابض"], ["ramp", "📐 المنحدر والاحتكاك"], ["forces", "🎯 مخطط القوى"],
];
function SectionHead({ icon, title, sub }) {
  return (
    <div className="flex items-center gap-2.5 mt-9 mb-4">
      <span className="w-11 h-11 rounded-2xl bg-gradient-to-b from-violet-600 to-indigo-700 grid place-items-center ft-shadow text-xl text-white">{icon}</span>
      <div>
        <div className="font-head font-black text-xl sm:text-2xl text-slate-900 leading-tight">{title}</div>
        {sub && <div className="text-[12px] text-slate-400 font-bold">{sub}</div>}
      </div>
    </div>
  );
}

/* memoized sections: page-level state (toast / sim tabs) must not repaint the whole lab */
const MProjectileLab = React.memo(ProjectileLab);
const MCollisionLab = React.memo(CollisionLab);
const MCircuitLab = React.memo(CircuitLab);
const MWaveStudio = React.memo(WaveStudio);
const MOpticsBench = React.memo(OpticsBench);
const MPendulumLab = React.memo(PendulumLab);
const MOrbitLab = React.memo(OrbitLab);
const MSpringLab = React.memo(SpringLab);
const MRampLab = React.memo(RampLab);
const MForcesLab = React.memo(ForcesLab);
const MProjectileSim = React.memo(ProjectileSim);
const MSpectrumLab = React.memo(SpectrumLab);
const MPhysicsCalculator = React.memo(PhysicsCalculator);
const MUnitConverter = React.memo(UnitConverter);
const MPlanetWeight = React.memo(PlanetWeight);
const MTargetChallenge = React.memo(TargetChallenge);
const MCircuitChallenge = React.memo(CircuitChallenge);
const MQuizLab = React.memo(QuizLab);
const MFactsWall = React.memo(FactsWall);
const MBadgesWall = React.memo(BadgesWall);
const MRecordsCard = React.memo(RecordsCard);

export default function PhysicsLab() {
  const [store, setStore] = useState(loadStore);
  const [toast, setToast] = useState(null);
  const [sim, setSim] = useState("projectile");
  const awardedRef = useRef(new Set());
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* private */ } }, [store]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const award = useCallback((id, xp, msg, badgeId) => {
    if (awardedRef.current.has(id)) return;
    awardedRef.current.add(id);
    setStore((s) => {
      let ns = { ...s, xp: s.xp + xp };
      if (badgeId && !ns.badges.includes(badgeId)) ns = { ...ns, badges: [...ns.badges, badgeId] };
      return ns;
    });
    if (msg) setToast({ xp, msg, badgeId, key: Date.now() });
  }, []);
  const patchStore = useCallback((fn) => setStore(fn), []);
  const recordExperiment = useCallback((simId) => {
    setStore((s) => {
      const sims = (s.records.sims || []).includes(simId) ? s.records.sims : [...(s.records.sims || []), simId];
      return { ...s, records: { ...s.records, experiments: (s.records.experiments || 0) + 1, sims } };
    });
    const sims = new Set([...(storeRef.current.records.sims || []), simId]);
    if (sims.size >= 5) award("explorer-badge", 20, "شغّلت 5 تجارب مختلفة في المسرح", "explorer");
  }, [award]);
  useEffect(() => {
    if (store.xp >= 500 && !store.badges.includes("scholar")) {
      setStore((s) => ({ ...s, badges: [...s.badges, "scholar"] }));
      setToast({ xp: 0, msg: "وسام جديد: الفيزيائي المثابر · 500 نقطة", badgeId: "scholar", key: Date.now() });
    }
  }, [store.xp, store.badges]);
  const ctxVal = useMemo(() => ({ store, award, recordExperiment, patchStore }), [store, award, recordExperiment, patchStore]);
  const { rank } = rankOf(store.xp);

  return (
    <PhysCtx.Provider value={ctxVal}>
      <MotionConfig reducedMotion="user">
      <Layout>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 overflow-x-clip" dir="rtl">
          {/* ===== hero ===== */}
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl" />
            <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-fuchsia-400/15 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-violet-400 via-indigo-300 to-cyan-300" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1.3px)] [background-size:24px_24px]" />
            <div className="relative">
              <Link to="/clubs/science" className="inline-flex items-center gap-1.5 text-cyan-200/80 hover:text-cyan-100 text-[13px] font-bold mb-4 transition"><ChevronLeft className="w-4 h-4 rotate-180" /> نادي العلوم</Link>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                    <Atom className="w-3.5 h-3.5 text-cyan-300" /> مختبر نادي العلوم التفاعلي
                  </span>
                  <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-black mt-3 leading-tight">مختبر <span className="text-transparent bg-clip-text bg-gradient-to-l from-violet-300 via-indigo-200 to-cyan-300">الفيزياء</span> المتقدم</h1>
                  <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">عشر محاكيات حيّة تراها بعينك: مقذوفات وتصادمات ودوائر وموجات ومدارات · وكل تجربة تشغّلها ترفع رتبتك من فيزيائي مبتدئ إلى أستاذ الفيزياء</p>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-3 shrink-0 w-full lg:w-auto">
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-xl sm:text-2xl font-black font-head text-cyan-200 drop-shadow">10</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">محاكيات حيّة</div>
                  </div>
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-xl sm:text-2xl font-black font-head text-violet-200 drop-shadow">20</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">ميزة كاملة</div>
                  </div>
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-xl sm:text-2xl font-black font-head text-fuchsia-200 drop-shadow" dir="ltr">{store.xp}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">نقطة خبرة</div>
                  </div>
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-lg sm:text-xl font-black font-head text-amber-200 drop-shadow leading-tight">{rank.name}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">رتبتك الحالية</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-400 text-slate-950 text-[12.5px] font-black ft-shadow">
                  🧠 {store.daily.date === todayStr() && store.daily.quizDone ? "أنجزت اختبار اليوم 🏆 عد غداً" : "اختبار فيزياء جديد بانتظارك اليوم"}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                  🏅 أوسمة مفتوحة: {store.badges.length} من {BADGES.length}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                  🔥 سلسلة الاختبار: {store.records.quizStreak || 0} يوم
                </span>
              </div>
            </div>
          </div>

          {/* ===== simulator stage ===== */}
          <SectionHead icon="🎛️" title="مسرح المحاكاة الحية" sub="عشر تجارب فيزيائية تتحرك أمامك · بدّل بينها وجرّب كل واحدة بيدك" />
          <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="تجارب المسرح">
            {SIM_TABS.map(([id, ar]) => (
              <button key={id} onClick={() => setSim(id)} data-testid={`phys-tab-${id}`} role="tab" aria-selected={sim === id}
                className={`pressable shrink-0 px-3.5 py-2.5 rounded-2xl text-[12.5px] font-black transition min-h-[44px] ${sim === id ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-violet-600 via-indigo-600 to-indigo-700 ring-1 ring-white/30" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-indigo-200"}`}>
                {ar}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={sim} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {sim === "projectile" && <MProjectileLab />}
              {sim === "collision" && <MCollisionLab />}
              {sim === "circuit" && <MCircuitLab />}
              {sim === "waves" && <MWaveStudio />}
              {sim === "optics" && <MOpticsBench />}
              {sim === "pendulum" && <MPendulumLab />}
              {sim === "orbit" && <MOrbitLab />}
              {sim === "spring" && <MSpringLab />}
              {sim === "ramp" && <MRampLab />}
              {sim === "forces" && <MForcesLab />}
            </motion.div>
          </AnimatePresence>

          {/* ===== explorers ===== */}
          <SectionHead icon="🔭" title="المستكشفون والحاسبات" sub="طيف كامل وحاسبة بستة أوضاع ومحول وحدات وميزان كواكب" />
          <LazyMount minH={430} icon="🌈" title="الطيف الكهرومغناطيسي الكامل"><MSpectrumLab /></LazyMount>
          <div className="mt-4">
            <LazyMount minH={560} icon="🧮" title="حاسبة الفيزياء الشاملة">
              <div className="grid lg:grid-cols-2 gap-4">
                <MPhysicsCalculator />
                <MUnitConverter />
              </div>
            </LazyMount>
          </div>
          <div className="mt-4"><LazyMount minH={380} icon="🪐" title="وزنك على الكواكب"><MPlanetWeight /></LazyMount></div>

          {/* ===== challenges ===== */}
          <SectionHead icon="🏆" title="ساحة التحديات" sub="هنا تتحول الفيزياء إلى نقاط وأوسمة · ثلاث ساحات بانتظارك" />
          <LazyMount minH={600} icon="🎯" title="تحدي إصابة الهدف"><MTargetChallenge /></LazyMount>
          <div className="mt-4">
            <LazyMount minH={560} icon="🔌" title="تحدي الدائرة">
              <div className="grid lg:grid-cols-2 gap-4">
                <MCircuitChallenge />
                <MQuizLab />
              </div>
            </LazyMount>
          </div>

          {/* ===== progression ===== */}
          <SectionHead icon="🎓" title="تقدمك ورتبك" sub="أوسمتك وسجلك الشخصي · محفوظة على جهازك وتكبر معك" />
          <LazyMount minH={460} icon="🏅" title="أوسمة الفيزياء والرتب">
            <div className="grid lg:grid-cols-2 gap-4">
              <MBadgesWall />
              <MRecordsCard />
            </div>
          </LazyMount>

          <div className="mt-4"><LazyMount minH={420} icon="💡" title="جدار حقائق الفيزياء"><MFactsWall /></LazyMount></div>

          <div className="mt-8 rounded-3xl bg-gradient-to-l from-violet-50 via-white to-cyan-50 ring-1 ring-violet-100 ft-shadow p-5 flex items-start gap-3">
            <span className="text-2xl shrink-0">⚛️</span>
            <p className="text-sm text-slate-600 leading-relaxed">
              <b className="text-slate-900 font-head">كيف تستفيد بذكاء؟</b> شغّل كل تجربة في المسرح مرة على الأقل لتفتح وسام مستكشف المختبر، ثم العب تحديات الهدف والدائرة، ولا تكسر سلسلة اختبار اليوم · قيم المحاكيات تقريبية تعليمية تهمل مقاومة الهواء والاحتكاك الداخلي ما لم يذكر غير ذلك.
            </p>
          </div>
        </div>

        {/* ===== XP toast ===== */}
        <AnimatePresence>
          {toast && (
            <motion.div key={toast.key} initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.97 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="fixed inset-x-0 bottom-[86px] sm:bottom-24 z-[95] flex justify-center px-3 pointer-events-none">
              <div className="relative w-full max-w-[700px] overflow-hidden rounded-[1.75rem] bg-white/75 backdrop-blur-xl ft-shadow-lg">
                <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/70 rounded-[1.75rem]" />
                <span className="pointer-events-none absolute -top-10 right-10 w-32 h-32 rounded-full bg-amber-300/30 blur-2xl" />
                <span className="pointer-events-none absolute -bottom-12 left-10 w-32 h-32 rounded-full bg-violet-400/25 blur-2xl" />
                <div className="relative flex items-center gap-3 px-4 py-3.5">
                  <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-b from-amber-300 to-orange-500 grid place-items-center ft-shadow ring-1 ring-white/50">
                    <Trophy className="w-6 h-6 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-black text-amber-600">{toast.badgeId ? "وسام فيزياء جديد 🏅" : "إنجاز فيزياء جديد 🏆"}</div>
                    <div className="font-black font-head text-slate-900 text-[15px] leading-snug truncate">{toast.msg}</div>
                  </div>
                  {toast.xp > 0 && <span className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-to-l from-violet-600 to-indigo-600 text-white text-[12px] font-black ft-shadow" dir="ltr">+{toast.xp} XP</span>}
                  <button onClick={() => setToast(null)} className="pressable pointer-events-auto shrink-0 w-9 h-9 grid place-items-center rounded-full bg-slate-900/[0.06] text-slate-500 active:scale-90" aria-label="إغلاق"><X className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
      </MotionConfig>
    </PhysCtx.Provider>
  );
}
