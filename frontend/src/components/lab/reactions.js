/* Reaction engine · curated famous reactions + rule-based prediction + auto-balancing.
   Educational model: values (ΔH, flame temps) are standard textbook approximations. */
import { EL, COMP, parseFormula } from "./chemData";

/* ---------- rational helper + equation balancer ---------- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function balance(reactants, products) {
  // species = reactants(+), products(−) · solve M·x = 0 with last species = 1
  const species = [...reactants, ...products];
  const els = [...new Set(species.flatMap((f) => Object.keys(parseFormula(f))))];
  const M = els.map((el) => species.map((f, i) => (parseFormula(f)[el] || 0) * (i < reactants.length ? 1 : -1)));
  const n = species.length;
  // gaussian elimination to reduced row echelon over rationals (as [num, den])
  const A = M.map((row) => row.map((v) => [v, 1]));
  const norm = (x) => { let [a, b] = x; if (b < 0) { a = -a; b = -b; } const g = gcd(a, b); return [a / g, b / g]; };
  const sub = (x, y) => norm([x[0] * y[1] - y[0] * x[1], x[1] * y[1]]);
  const mul = (x, y) => norm([x[0] * y[0], x[1] * y[1]]);
  const div = (x, y) => norm([x[0] * y[1], x[1] * y[0]]);
  let pivRow = 0; const pivots = [];
  for (let col = 0; col < n && pivRow < A.length; col++) {
    let sel = -1;
    for (let r = pivRow; r < A.length; r++) if (A[r][col][0] !== 0) { sel = r; break; }
    if (sel < 0) continue;
    [A[pivRow], A[sel]] = [A[sel], A[pivRow]];
    const pv = A[pivRow][col];
    for (let c = col; c < n; c++) A[pivRow][c] = div(A[pivRow][c], pv);
    for (let r = 0; r < A.length; r++) {
      if (r !== pivRow && A[r][col][0] !== 0) {
        const f = A[r][col];
        for (let c = col; c < n; c++) A[r][c] = sub(A[r][c], mul(f, A[pivRow][c]));
      }
    }
    pivots.push(col); pivRow++;
  }
  const freeCols = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  if (freeCols.length !== 1) return null; // under/over determined
  const fc = freeCols[0];
  const sol = Array(n).fill([0, 1]);
  sol[fc] = [1, 1];
  pivots.forEach((col, r) => { sol[col] = norm([-A[r][fc][0], A[r][fc][1]]); });
  let lcm = 1;
  for (const [a, b] of sol) lcm = (lcm * b) / gcd(lcm, b);
  let ints = sol.map(([a, b]) => (a * lcm) / b);
  let g = ints.reduce((x, y) => gcd(x, Math.abs(y)), 0) || 1;
  ints = ints.map((x) => x / g);
  if (ints.some((x) => x <= 0)) return null;
  return { r: ints.slice(0, reactants.length), p: ints.slice(reactants.length) };
}

/* ---------- chemistry knowledge ---------- */
const ACT = { K: 10, Na: 9, Ca: 8, Mg: 7, Al: 6, Zn: 5, Fe: 4, Pb: 3, H: 2, Cu: 1, Ag: 0.5, Au: 0 };
const CATION = { Na: 1, K: 1, Ag: 1, NH4: 1, Ca: 2, Mg: 2, Ba: 2, Zn: 2, Fe: 2, Cu: 2, Pb: 2, Al: 3 };
const CAT_SYM = { Na: "Na", K: "K", Ag: "Ag", NH4: "NH4", Ca: "Ca", Mg: "Mg", Ba: "Ba", Zn: "Zn", Fe: "Fe", Cu: "Cu", Pb: "Pb", Al: "Al" };
const ANION = { Cl: { f: "Cl", ch: 1 }, Br: { f: "Br", ch: 1 }, I: { f: "I", ch: 1 }, SO4: { f: "SO4", ch: 2 }, NO3: { f: "NO3", ch: 1 }, CO3: { f: "CO3", ch: 2 }, CH3COO: { f: "CH3COO", ch: 1 }, OH: { f: "OH", ch: 1 }, PO4: { f: "PO4", ch: 3 } };
const POLY = new Set(["SO4", "NO3", "CO3", "OH", "CH3COO", "PO4", "NH4"]);
const ACIDS = { HCl: "Cl", H2SO4: "SO4", HNO3: "NO3", CH3COOH: "CH3COO", H2CO3: "CO3" };
const OXIDE = { Na: "Na2O", K: "K2O", Ca: "CaO", Mg: "MgO", Ba: "BaO", Al: "Al2O3", Zn: "ZnO", Fe: "Fe2O3", Cu: "CuO", Pb: "PbO" };

function combineQ(catSym, cc0, anKey) {
  const an = ANION[anKey];
  const cc = cc0;
  const g = gcd(cc, an.ch);
  const cs = an.ch / g, as = cc / g;
  const cp = POLY.has(catSym) && cs > 1 ? `(${catSym})` : catSym;
  const ap = POLY.has(an.f) && as > 1 ? `(${an.f})` : an.f;
  return cp + (cs > 1 ? cs : "") + ap + (as > 1 ? as : "");
}
function combine(catSym, anKey) { return combineQ(catSym, CATION[catSym], anKey); }
function oxideCharge(f) {
  const comp = parseFormula(f);
  const m = Object.keys(comp).find((k) => k !== "O");
  return m && comp.O ? (2 * comp.O) / comp[m] : CATION[m];
}
function anionOf(f) {
  if (f.includes("ClO")) return null; // chlorate/perchlorate are not chloride
  for (const k of ["SO4", "CO3", "NO3", "CH3COO", "PO4", "OH", "Cl", "Br", "I"]) if (f.includes(k)) return k;
  return null;
}
function cationOf(f) {
  const comp = parseFormula(f);
  for (const sym of Object.keys(CAT_SYM)) if (comp[sym] && CATION[sym]) {
    // crude: element present with known cation (NH4 special)
    if (sym === "NH4" || /^[A-Z]/.test(sym)) return sym;
  }
  if (f.startsWith("NH4")) return "NH4";
  const first = f.match(/^[A-Z][a-z]?/)?.[0];
  return CATION[first] ? first : null;
}
function isHydroxide(f) { return /OH\)?$/.test(f.replace(/\d+$/, "")) && !!cationOf(f) && (f.includes("OH")); }
function isCarbonate(f) { return f.includes("CO3") && !!cationOf(f); }
function isHydrocarbon(f) { const c = parseFormula(f); const ks = Object.keys(c); return c.C > 0 && c.H > 0 && ks.every((k) => ["C", "H", "O"].includes(k)) && !f.includes("COOH") && f !== "C6H12O6" ? true : (c.C > 0 && c.H > 0 && ks.length === 2); }

/* ---------- curated reactions ---------- */
// cond: null | "spark" شرارة | "heat" تسخين | "electric" كهرباء | "light" ضوء | "catalyst" عامل حفّاز
const CURATED = [
  { r: ["H2", "O2"], p: ["H2O"], name: "تكوين الماء", type: "احتراق/اتحاد", dH: -572, cond: "spark", peak: 2800, obs: ["فرقعة مميزة عند الاشتعال", "تتكاثف قطرات ماء على جدار بارد"], fact: "هذا التفاعل نفسه يرفع الصواريخ إلى الفضاء." },
  { r: ["N2", "H2"], p: ["NH3"], name: "طريقة هابر (الأمونيا)", type: "اتحاد", dH: -92, cond: "catalyst", peak: null, obs: ["يحدث بضغط عالٍ وحفّاز حديد وحرارة 450°م"], fact: "نصف غذاء البشرية يعتمد على أسمدة هذا التفاعل." },
  { r: ["CH4", "O2"], p: ["CO2", "H2O"], name: "احتراق الغاز الطبيعي", type: "احتراق", dH: -890, cond: "spark", peak: 1950, obs: ["لهب أزرق نظيف", "حرارة عالية دون دخان"], fact: "هذا ما يحدث داخل موقد مطبخك حرفياً.", fl: "#60a5fa" },
  { r: ["C3H8", "O2"], p: ["CO2", "H2O"], name: "احتراق البروبان", type: "احتراق", dH: -2220, cond: "spark", peak: 1980, obs: ["لهب أزرق قوي"], fact: "غاز أسطوانات البيوت الأردنية.", fl: "#60a5fa" },
  { r: ["C2H5OH", "O2"], p: ["CO2", "H2O"], name: "احتراق الإيثانول", type: "احتراق", dH: -1367, cond: "spark", peak: 1900, obs: ["لهب شبه شفاف"], fact: "وقود حيوي يُستخرج من النباتات.", fl: "#93c5fd" },
  { r: ["C6H12O6", "O2"], p: ["CO2", "H2O"], name: "التنفس الخلوي", type: "احتراق بطيء", dH: -2805, cond: null, peak: null, obs: ["يحدث داخل خلاياك الآن على مراحل منظمة"], fact: "جسمك يحرق الغلوكوز كمحرك صامت ليمنحك الطاقة." },
  { r: ["CO2", "H2O"], p: ["C6H12O6", "O2"], name: "البناء الضوئي", type: "بناء ضوئي", dH: 2805, cond: "light", peak: null, obs: ["يحتاج ضوء الشمس والكلوروفيل الأخضر"], fact: "مصدر كل طعام وأكسجين على الأرض تقريباً." },
  { r: ["Na", "Cl2"], p: ["NaCl"], name: "تكوين ملح الطعام", type: "اتحاد", dH: -822, cond: "heat", peak: null, obs: ["لهب أصفر ووهج شديد", "يتكون مسحوق أبيض (الملح)"], fact: "عنصران خطران يصنعان ملح مائدتك." },
  { r: ["Mg", "O2"], p: ["MgO"], name: "احتراق المغنيسيوم", type: "احتراق/اتحاد", dH: -1203, cond: "spark", peak: 3100, obs: ["وهج أبيض يعمي البصر لحظياً · لا تنظر مباشرة"], fact: "كان يُستخدم في فلاشات التصوير القديمة وقنابل الإضاءة.", fl: "#ffffff" },
  { r: ["S", "O2"], p: ["SO2"], name: "احتراق الكبريت", type: "احتراق", dH: -297, cond: "spark", peak: null, obs: ["لهب أزرق خافت ورائحة خانقة"], fact: "ناتجه سبب رئيسي للمطر الحمضي.", fl: "#3b82f6" },
  { r: ["C", "O2"], p: ["CO2"], name: "احتراق الكربون (الفحم)", type: "احتراق", dH: -394, cond: "spark", peak: 1200, obs: ["توهج أحمر برتقالي"], fact: "حرق الفحم قاد الثورة الصناعية وما زال يولّد كهرباء العالم.", fl: "#f97316" },
  { r: ["Fe", "O2"], p: ["Fe2O3"], name: "صدأ الحديد", type: "اتحاد بطيء", dH: -1648, cond: null, peak: null, obs: ["يحدث ببطء شديد بوجود ماء وهواء", "قشور بنية محمرة متقشرة"], fact: "الصدأ يكلف العالم 3% من ناتجه سنوياً." },
  { r: ["Zn", "HCl"], p: ["ZnCl2", "H2"], name: "زنك + حمض", type: "إحلال", dH: -150, cond: null, peak: null, obs: ["فقاعات غاز سريعة", "الغاز يفرقع قرب لهب"], fact: "اختبار الهيدروجين الكلاسيكي: فرقعة عند تقريب عود مشتعل." },
  { r: ["Mg", "HCl"], p: ["MgCl2", "H2"], name: "مغنيسيوم + حمض", type: "إحلال", dH: -465, cond: null, peak: null, obs: ["تفاعل عنيف وفوران"], fact: "المغنيسيوم فوق الهيدروجين بكثير في سلسلة النشاط." },
  { r: ["Fe", "CuSO4"], p: ["FeSO4", "Cu"], name: "إحلال النحاس", type: "إحلال", dH: -150, cond: null, peak: null, obs: ["يختفي اللون الأزرق تدريجياً", "يترسب نحاس أحمر على الحديد"], fact: "الحديد أنشط من النحاس فيطرده من مركّبه." },
  { r: ["Zn", "CuSO4"], p: ["ZnSO4", "Cu"], name: "إحلال الزنك للنحاس", type: "إحلال", dH: -210, cond: null, peak: null, obs: ["يبهت الأزرق ويترسب النحاس"], fact: "مبدأ يقف خلف صناعة البطاريات الأولى." },
  { r: ["NaOH", "HCl"], p: ["NaCl", "H2O"], name: "تعادل حمض وقاعدة", type: "تعادل", dH: -57, cond: null, peak: null, obs: ["ترتفع حرارة المحلول قليلاً", "لا تغير لوني ظاهر"], fact: "تفاعل يحدث في أدوية حرقة المعدة." },
  { r: ["CaCO3", "HCl"], p: ["CaCl2", "CO2", "H2O"], name: "كربونات + حمض", type: "تحلل/غاز", dH: -15, cond: null, peak: null, obs: ["فوران وفقاعات قوية", "الغاز يعكّر ماء الجير"], fact: "هكذا يُكشف عن الحجر الجيري والرخام مخبرياً." },
  { r: ["NaHCO3", "CH3COOH"], p: ["CH3COONa", "CO2", "H2O"], name: "فوران صودا الخبز والخل", type: "تحلل/غاز", dH: 20, cond: null, peak: null, obs: ["فوران رغوي فوري"], fact: "نموذج البراكين المدرسية الشهير." },
  { r: ["Na", "H2O"], p: ["NaOH", "H2"], name: "صوديوم + ماء", type: "إحلال عنيف", dH: -369, cond: null, peak: null, obs: ["يذوب ويتحرك بسرعة على سطح الماء", "قد يشتعل بلهب أصفر"], fact: "خطر: يُحفظ الصوديوم تحت الزيت بعيداً عن الماء." },
  { r: ["K", "H2O"], p: ["KOH", "H2"], name: "بوتاسيوم + ماء", type: "إحلال عنيف", dH: -392, cond: null, peak: null, obs: ["يشتعل فوراً بلهب بنفسجي"], fact: "البوتاسيوم أنشط من الصوديوم · تفاعله أعنف." },
  { r: ["CaO", "H2O"], p: ["Ca(OH)2"], name: "إطفاء الجير", type: "اتحاد", dH: -65, cond: null, peak: 150, obs: ["بخار وحرارة شديدة وتفتت الكتل"], fact: "حرارته تكفي لغلي الماء · يُستخدم في البناء منذ آلاف السنين." },
  { r: ["AgNO3", "NaCl"], p: ["AgCl", "NaNO3"], name: "راسب كلوريد الفضة", type: "ترسيب", dH: -65, cond: null, peak: null, obs: ["راسب أبيض حليبي فوري يغمق بالضوء"], fact: "مبدأ عمل أفلام التصوير القديمة.", pc: "AgCl" },
  { r: ["BaCl2", "H2SO4"], p: ["BaSO4", "HCl"], name: "راسب كبريتات الباريوم", type: "ترسيب", dH: -26, cond: null, peak: null, obs: ["راسب أبيض كثيف لا يذوب بالأحماض"], fact: "كبريتات الباريوم آمنة طبياً وتُشرب قبل أشعة الأمعاء رغم سمية الباريوم وحده.", pc: "BaSO4" },
  { r: ["Pb(NO3)2", "KI"], p: ["PbI2", "KNO3"], name: "مطر ذهبي", type: "ترسيب", dH: -30, cond: null, peak: null, obs: ["راسب أصفر ذهبي مبهر"], fact: "يُلقّب بالمطر الذهبي لجمال بلوراته.", pc: "PbI2" },
  { r: ["Ca(OH)2", "CO2"], p: ["CaCO3", "H2O"], name: "اختبار ماء الجير", type: "ترسيب", dH: -40, cond: null, peak: null, obs: ["يتعكر المحلول الشفاف ويصبح حليبياً"], fact: "هكذا نكشف وجود ثاني أكسيد الكربون بنفخ القشة.", pc: "CaCO3" },
  { r: ["CuO", "H2"], p: ["Cu", "H2O"], name: "اختزال أكسيد النحاس", type: "أكسدة واختزال", dH: -85, cond: "heat", peak: null, obs: ["يتحول الأسود إلى نحاس وردي لامع"], fact: "الهيدروجين يسحب الأكسجين من النحاس · تعريف عملي للاختزال." },
  { r: ["SO2", "O2"], p: ["SO3"], name: "طريقة التلامس", type: "اتحاد", dH: -198, cond: "catalyst", peak: null, obs: ["يحتاج حفّاز خامس أكسيد الفاناديوم وحرارة"], fact: "خطوة مفتاحية لصناعة حمض الكبريتيك عالمياً." },
  { r: ["CaCO3"], p: ["CaO", "CO2"], name: "تفكك الحجر الجيري", type: "تفكك حراري", dH: 178, cond: "heat", peak: null, obs: ["يحتاج 900°م · ينطلق غاز يعكّر ماء الجير"], fact: "قلب صناعة الإسمنت والجير منذ الحضارات القديمة." },
  { r: ["H2O"], p: ["H2", "O2"], name: "تحليل الماء كهربائياً", type: "تفكك كهربائي", dH: 572, cond: "electric", peak: null, obs: ["فقاعات عند القطبين بنسبة 2:1"], fact: "هكذا يُنتج الهيدروجين الأخضر للطاقة النظيفة." },
  { r: ["H2O2"], p: ["H2O", "O2"], name: "تفكك فوق الأكسيد", type: "تفكك", dH: -196, cond: "catalyst", peak: null, obs: ["فوران أكسجين · يتسارع بالضوء أو لمس الجروح"], fact: "لهذا يفور مطهر الجروح عند ملامسة الدم." },
  { r: ["NH3", "HCl"], p: ["NH4Cl"], name: "دخان أبيض", type: "اتحاد", dH: -176, cond: null, peak: null, obs: ["سحابة بيضاء كثيفة عند التقاء الغازين"], fact: "كشف تسرب الأمونيا بعود مبلل بحمض الهيدروكلوريك." },
  { r: ["Al", "Fe2O3"], p: ["Al2O3", "Fe"], name: "تفاعل الثرمايت", type: "أكسدة واختزال", dH: -852, cond: "heat", peak: 2500, fl: "#fff3d6", obs: ["حديد منصهر يقطر كالحمم المتوهجة", "وهج أبيض ساطع وشرار كثيف"], fact: "يُلحم به قضبان السكك الحديدية · حرارته تذيب الفولاذ نفسه." },
  { r: ["Cu", "AgNO3"], p: ["Cu(NO3)2", "Ag"], name: "شجرة الفضة البلورية", type: "إحلال", dH: -105, cond: null, peak: null, obs: ["بلورات فضية متفرعة تنمو على سلك النحاس", "المحلول يزداد زرقة تدريجياً"], fact: "النحاس أنشط من الفضة فيطردها من محلولها بلوراتٍ لامعة." },
  { r: ["CuSO4", "NaOH"], p: ["Cu(OH)2", "Na2SO4"], name: "راسب أزرق سماوي", type: "ترسيب", dH: -55, cond: null, peak: null, pc: "Cu(OH)2", obs: ["راسب أزرق جيلاتيني يشبه الهلام", "بالغليان يتحول إلى أكسيد نحاس أسود"], fact: "الاختبار الكلاسيكي للكشف عن أيون النحاس Cu²⁺." },
  { r: ["FeCl3", "NaOH"], p: ["Fe(OH)3", "NaCl"], name: "راسب بني كالصدأ", type: "ترسيب", dH: -70, cond: null, peak: null, pc: "Fe(OH)3", obs: ["راسب بني محمرّ بلون الصدأ تماماً"], fact: "هيدروكسيد الحديد III هو الكيمياء نفسها التي تصنع صدأ الحديد." },
  { r: ["FeSO4", "NaOH"], p: ["Fe(OH)2", "Na2SO4"], name: "راسب أخضر يغمقّ", type: "ترسيب", dH: -60, cond: null, peak: null, pc: "Fe(OH)2", obs: ["راسب أخضر زيتوني", "يغمقّ تدريجياً بملامسة الهواء حتى يصير بنياً"], fact: "الهواء يؤكسد الحديد II إلى حديد III أمام عينيك." },
  { r: ["NH4Cl", "NaOH"], p: ["NaCl", "NH3", "H2O"], name: "إطلاق غاز الأمونيا", type: "تحلل/غاز", dH: -3, cond: null, peak: null, obs: ["رائحة أمونيا نفّاذة تتصاعد", "يزرقّ ورقة عباد شمس حمراء رطبة"], fact: "الاختبار الرسمي للكشف عن أيون الأمونيوم NH₄⁺." },
  { r: ["KClO3"], p: ["KCl", "O2"], name: "تحضير الأكسجين مخبرياً", type: "تفكك", dH: -78, cond: "catalyst", peak: null, obs: ["فقاعات أكسجين منتظمة", "شظية متوهجة تعود فتشتعل فيه"], fact: "حفّازه ثاني أكسيد المنغنيز · مصدر الأكسجين الكلاسيكي بمختبرات المدارس." },
  { r: ["KMnO4"], p: ["K2MnO4", "MnO2", "O2"], name: "تفكك البرمنغنات بالحرارة", type: "تفكك حراري", dH: -12, cond: "heat", peak: null, obs: ["البلورات البنفسجية تتشقق وتفور", "يتصاعد أكسجين يعيد إشعال شظية متوهجة"], fact: "طريقة المختبرات القديمة لتحضير الأكسجين بالتسخين." },
  { r: ["H2", "Cl2"], p: ["HCl"], name: "اتحاد ينفجر بالضوء", type: "اتحاد", dH: -185, cond: "light", peak: null, obs: ["الخليط هادئ بالظلام وينفجر بضوء الشمس", "يتكون غاز يذوب في الماء حمضاً"], fact: "الضوء وحده يفجّر هذا التفاعل المتسلسل · لا تقربه حقيقياً أبداً." },
  { r: ["Mg", "CO2"], p: ["MgO", "C"], name: "يشتعل داخل ثاني أكسيد الكربون!", type: "أكسدة واختزال", dH: -810, cond: "spark", peak: 2500, fl: "#ffffff", obs: ["يستمر المغنيسيوم مشتعلاً حتى داخل الثلج الجاف", "يتبقى أكسيد أبيض وبقع كربون أسود"], fact: "لهذا لا تُطفأ حرائق المغنيسيوم بطفايات CO₂ أبداً." },
  { r: ["C4H10", "O2"], p: ["CO2", "H2O"], name: "احتراق البيوتان", type: "احتراق", dH: -2878, cond: "spark", peak: 1975, fl: "#60a5fa", obs: ["لهب أزرق قوي"], fact: "البيوتان يسيّل تحت ضغط خفيف · يهتز سائلاً داخل ولاعتك." },
  { r: ["C2H2", "O2"], p: ["CO2", "H2O"], name: "لهب اللحام الأكسجيني", type: "احتراق", dH: -2600, cond: "spark", peak: 3100, fl: "#dbeafe", obs: ["من أسخن اللهبات المعروفة ~3100°م", "يقطع أسمك صفائح الفولاذ"], fact: "مشعل الأوكسي-أسيتيلين يلحم هياكل السفن والجسور." },
  { r: ["CaCO3", "H2SO4"], p: ["CaSO4", "CO2", "H2O"], name: "التفاعل الذي يخنق نفسه", type: "تحلل/غاز", dH: -20, cond: null, peak: null, obs: ["فوران يبدأ بقوة ثم يخفت ويتوقف", "طبقة كبريتات كالسيوم لا تذوب تغلّف الحجر وتخنقه"], fact: "لهذا يُستخدم الهيدروكلوريك المخفف لا الكبريتيك لكشف الكربونات." },
  { r: ["C", "H2O"], p: ["CO", "H2"], name: "غاز الماء", type: "أكسدة واختزال", dH: 131, cond: "heat", peak: null, obs: ["بخار يمر فوق فحم متوهج", "ينتج غازاً يشتعل بلهب أزرق · أول أكسيد الكربون سام جداً"], fact: "وقود صناعي تاريخي ومدخل قديم لإنتاج الهيدروجين." },
  { r: ["N2", "O2"], p: ["NO"], name: "البرق يصنع السماد", type: "اتحاد", dH: 181, cond: "electric", peak: null, obs: ["حرارة البرق الهائلة تدمج غازَي الهواء الرافضين", "أكاسيد النيتروجين تذوب في المطر سماداً"], fact: "البرق يثبّت ملايين الأطنان من نيتروجين الهواء كل سنة." },
  { r: ["NaOH", "CO2"], p: ["Na2CO3", "H2O"], name: "الصودا تلتقط الغاز", type: "امتصاص", dH: -109, cond: null, peak: null, obs: ["المحلول القلوي يبتلع ثاني أكسيد الكربون من الهواء"], fact: "مبدأ تنقية الهواء في الغواصات ومحطات الفضاء من CO₂." },
  { r: ["NaCl", "H2O"], p: ["NaOH", "H2", "Cl2"], name: "الكلور والصودا من ملح الطعام", type: "تفكك كهربائي", dH: 445, cond: "electric", peak: null, obs: ["هيدروجين عند القطب السالب", "كلور أصفر مخضرّ عند الموجب · غاز سام"], fact: "صناعة الكلور-قلوي: من ملح الطعام تأتي الصودا والكلور والمبيّضات." },
  { r: ["CH4", "H2O"], p: ["CO", "H2"], name: "إصلاح الميثان بالبخار", type: "أكسدة واختزال", dH: 206, cond: "catalyst", peak: null, obs: ["يحتاج حفّاز نيكل وحرارة نحو 800°م"], fact: "مصدر معظم الهيدروجين الصناعي في العالم اليوم." },
  { r: ["NaHCO3"], p: ["Na2CO3", "CO2", "H2O"], name: "سرّ انتفاخ الكيك", type: "تفكك حراري", dH: 135, cond: "heat", peak: null, obs: ["فقاعات CO2 تنفخ العجين داخل الفرن"], fact: "ومسحوق إطفاء الحرائق الجاف هو المادة نفسها تقريباً." },
  { r: ["Mg", "H2O"], p: ["MgO", "H2"], name: "مغنيسيوم يشعل البخار", type: "إحلال", dH: -360, cond: "heat", peak: null, obs: ["شريط متوهج يستمر مشتعلاً داخل البخار", "يتحرر هيدروجين وقد يشتعل بدوره"], fact: "حرائق المغنيسيوم تُطفأ بالرمل الجاف لا بالماء." },
  { r: ["Zn", "H2O"], p: ["ZnO", "H2"], name: "زنك وبخار الماء", type: "إحلال", dH: -109, cond: "heat", peak: null, obs: ["زنك محمّى حتى الاحمرار يفكك البخار ببطء"], fact: "طريقة تاريخية لتحضير هيدروجين نقي." },
  { r: ["Fe", "H2O"], p: ["Fe3O4", "H2"], name: "حديد أحمر وبخار ماء", type: "أكسدة واختزال", dH: -151, cond: "heat", peak: null, obs: ["الحديد المتوهج يخطف أكسجين الماء", "يتكون أكسيد أسود مغناطيسي ويتحرر الهيدروجين"], fact: "الأكسيد الناتج Fe₃O₄ هو الماغنتيت · حجر المغناطيس الطبيعي." },
  { r: ["C", "CO2"], p: ["CO"], name: "قلب الفرن العالي", type: "أكسدة واختزال", dH: 172, cond: "heat", peak: null, obs: ["الفحم المتوهج يحوّل CO₂ إلى أول أكسيد الكربون"], fact: "أول أكسيد الكربون الناتج هو من يختزل خام الحديد بالفرن العالي." },
  { r: ["Ca", "H2O"], p: ["Ca(OH)2", "H2"], name: "كالسيوم يفور بالماء", type: "إحلال", dH: -414, cond: null, peak: null, obs: ["فوران ثابت وحرارة عالية", "يتعكر الماء تدريجياً بالجير المطفأ"], fact: "الكالسيوم أهدأ من الصوديوم لكنه لا يقل خطراً بالماء." },
  { r: ["CaC2", "H2O"], p: ["C2H2", "Ca(OH)2"], name: "مصباح الكربيد", type: "تحلل/غاز", dH: -128, cond: null, peak: null, obs: ["فقاعات أسيتيلين فور ملامسة قطرات الماء للكربيد", "يشتعل بلهب ساطع مدخّن"], fact: "مصابيح عمّال المناجم ومستكشفي الكهوف قبل عصر البطاريات." },
  { r: ["(NH4)2Cr2O7"], p: ["Cr2O3", "N2", "H2O"], name: "بركان ثنائي الكرومات", type: "تفكك حراري", dH: -300, cond: "heat", peak: null, obs: ["جبل أخضر منتفخ ينمو كبركان حقيقي", "شرر برتقالي يتطاير مع انطلاق الغازات"], fact: "عرض المعلم الكلاسيكي · مركبات الكروم سامة فلا يُنفّذ حقيقياً إلا بإشراف صارم." },
  { r: ["NH4Cl", "Ba(OH)2"], p: ["BaCl2", "NH3", "H2O"], name: "التفاعل الذي يجمّد الكأس", type: "ماصّ للحرارة", dH: 70, cond: null, peak: null, obs: ["تنخفض الحرارة دون الصفر بسرعة", "يلتصق الكأس بلوح خشبي مبلل لأنه تجمّد عليه"], fact: "أشهر عرض ماصّ للحرارة في العالم · يبتلع حرارة محيطه بشراهة." },
  { r: ["Zn", "H2SO4"], p: ["ZnSO4", "H2"], name: "تحضير الهيدروجين مخبرياً", type: "إحلال", dH: -155, cond: null, peak: null, obs: ["فقاعات هيدروجين متوسطة ومنتظمة"], fact: "التحضير المخبري الأشهر لغاز الهيدروجين في المدارس." },
  { r: ["Fe", "HCl"], p: ["FeCl2", "H2"], name: "برادة الحديد والحمض", type: "إحلال", dH: -89, cond: null, peak: null, obs: ["فقاعات بطيئة منتظمة", "المحلول يخضرّ شاحباً (حديد II)"], fact: "الحديد أسفل الزنك بسلسلة النشاط · تفاعله أهدأ بوضوح." },
];

const COND_AR = { spark: "شرارة أو لهب", heat: "تسخين قوي", electric: "تيار كهربائي", light: "ضوء الشمس", catalyst: "عامل حفّاز" };

/* ---------- predictor ---------- */
function makeEq(r, p) {
  const b = balance(r, p);
  if (!b) return null;
  return { reactants: r.map((f, i) => ({ f, n: b.r[i] })), products: p.map((f, i) => ({ f, n: b.p[i] })) };
}
function enthalpyNote(dH) {
  if (dH == null) return null;
  return dH < 0 ? { dir: "exo", ar: "طارد للحرارة", val: dH } : dH > 0 ? { dir: "endo", ar: "ماصّ للحرارة", val: dH } : { dir: "neutral", ar: "متعادل حرارياً", val: 0 };
}
const sameSet = (a, b) => a.length === b.length && [...a].sort().join("+") === [...b].sort().join("+");

function curated(fs, cond) {
  const hit = CURATED.find((c) => sameSet(c.r, fs));
  if (!hit) return null;
  const eq = makeEq(hit.r, hit.p);
  if (!eq) return null;
  if (hit.cond && cond !== hit.cond) {
    return { reacts: false, needs: hit.cond, eq, hit,
      reason: `هذا التفاعل يحتاج ${COND_AR[hit.cond]} ليبدأ · فعّل الشرط المناسب من الأعلى وجرّب مجدداً.` };
  }
  return { reacts: true, eq, name: hit.name, type: hit.type, dH: hit.dH, peak: hit.peak, fx: fxOf(hit),
           obs: hit.obs, fact: hit.fact, condUsed: hit.cond, approx: false, pc: hit.pc || null, flameHex: hit.fl || null };
}

function fxOf(hit) {
  const t = (hit.type || "") + (hit.name || "");
  if (t.includes("ترسيب")) return "precip";
  if (t.includes("بناء ضوئي")) return "rays";
  if (hit.cond === "electric") return "bubbles";
  if (t.includes("بركان")) return "foam";
  if (hit.cond === "light") return "rays";
  if ((hit.dH ?? 0) <= -700) return "flame";
  return null;
}

function patterns(fs, cond) {
  const [a, b] = fs;
  // --- combustion of hydrocarbon / organics with O2 ---
  const o2 = fs.indexOf("O2");
  if (fs.length === 2 && o2 >= 0) {
    const fuel = fs[1 - o2];
    if (isHydrocarbon(fuel)) {
      const eq = makeEq([fuel, "O2"], ["CO2", "H2O"]);
      if (cond !== "spark") return { reacts: false, needs: "spark", eq, name: "احتراق كامل",
        reason: "الوقود والأكسجين خليط صامت لا يشتعل وحده · يحتاج شرارة أو لهباً (طاقة التنشيط) ليبدأ الاحتراق." };
      const dhc = { CH4: -890, C2H6: -1560, C3H8: -2220, C4H10: -2878, C2H5OH: -1367, C6H12O6: -2805 }[fuel];
      return { reacts: true, eq, name: "احتراق كامل", type: "احتراق", dH: dhc ?? null, peak: 1900, fx: "flame",
        obs: ["لهب وحرارة وضوء", "يتصاعد بخار ماء وثاني أكسيد الكربون"], approx: !dhc,
        fact: "شرط الاحتراق الكامل: وفرة الأكسجين · بنقصه يتكون أول أكسيد الكربون السام." };
    }
  }
  if (fs.length === 2) {
    // --- metal / element + oxygen ---
    if (o2 >= 0) {
      const el = fs[1 - o2];
      if (EL[el] && OXIDE[el]) {
        const eq = makeEq([el, "O2"], [OXIDE[el]]);
        if (eq) return { reacts: true, eq, name: `تكوين أكسيد ${EL[el].ar}`, type: "اتحاد", dH: -300, peak: null, approx: true,
          obs: ["يتكون مسحوق الأكسيد على السطح"], fact: "الأكاسيد طبقة جديدة تغيّر خواص العنصر تماماً." };
      }
      if (el === "C") return null;
    }
    // --- metal + acid ---
    const acid = fs.find((f) => ACIDS[f]);
    const metal = fs.find((f) => EL[f] && ACT[f] !== undefined);
    if (acid && metal) {
      if (acid === "HNO3") return { reacts: false, reason: "حمض النيتريك مؤكسد قوي لا يُخرج هيدروجيناً مع الفلزات · بل يذيب حتى النحاس مطلقاً غازات نيتروجينية بنّية سامة.", tip: "لتحضير الهيدروجين استخدم الهيدروكلوريك أو الكبريتيك المخفف." };
      if ((ACT[metal] ?? 0) <= ACT.H) return { reacts: false, reason: `${EL[metal].ar} أسفل الهيدروجين في سلسلة النشاط الكيميائي · لا يستطيع إحلاله من الحمض المخفف.`, tip: "جرّب الزنك أو المغنيسيوم أو الحديد بدلاً منه." };
      const salt = combine(metal, ACIDS[acid]);
      const eq = makeEq([metal, acid], [salt, "H2"]);
      if (eq) return { reacts: true, eq, name: "فلز + حمض", type: "إحلال", dH: -120, peak: null, approx: true, fx: "bubbles",
        obs: ["فقاعات هيدروجين تفرقع قرب لهب", "يذوب الفلز تدريجياً"], fact: "كلما ارتفع الفلز في سلسلة النشاط كان التفاعل أعنف." };
    }
    // --- acid + base (hydroxide) ---
    const base = fs.find((f) => isHydroxide(f) || f === "NH4OH");
    if (acid && base) {
      const cat = cationOf(base);
      const salt = combine(cat, ACIDS[acid]);
      const eq = makeEq([acid, base], [salt, "H2O"]);
      if (eq) return { reacts: true, eq, name: "تعادل حمض وقاعدة", type: "تعادل", dH: -57, peak: null, approx: true, fx: "steam",
        obs: ["ترتفع حرارة المحلول قليلاً"], fact: "التعادل ينتج دائماً ملحاً + ماء." };
    }
    // --- acid + carbonate ---
    const carb = fs.find((f) => isCarbonate(f) && !ACIDS[f]);
    if (acid && carb) {
      const cat = cationOf(carb);
      const salt = combine(cat, ACIDS[acid]);
      const eq = makeEq([carb, acid], [salt, "CO2", "H2O"]);
      if (eq) return { reacts: true, eq, name: "كربونات + حمض", type: "تحلل/غاز", dH: -20, peak: null, approx: true, fx: "foam",
        obs: ["فوران وانطلاق ثاني أكسيد الكربون"], fact: "الغاز المنطلق يعكّر ماء الجير · اختبار الكربونات الأشهر." };
    }
    // --- acid + metal oxide ---
    const oxide = fs.find((f) => Object.values(OXIDE).includes(f));
    if (acid && oxide) {
      const cat = Object.keys(OXIDE).find((k) => OXIDE[k] === oxide);
      const salt = combineQ(cat, oxideCharge(oxide), ACIDS[acid]);
      const eq = makeEq([oxide, acid], [salt, "H2O"]);
      if (eq) return { reacts: true, eq, name: "حمض + أكسيد قاعدي", type: "تعادل", dH: -60, peak: null, approx: true,
        obs: ["يذوب الأكسيد ويتكون ملح ملون أحياناً"], fact: "أكاسيد الفلزات قواعد · تُعادل الأحماض دائماً." };
    }
    // --- basic oxide + water -> hydroxide ---
    if (fs.includes("H2O")) {
      const oxF = fs.find((f) => Object.values(OXIDE).includes(f));
      if (oxF) {
        const cat = Object.keys(OXIDE).find((k) => OXIDE[k] === oxF);
        const hydrox = combine(cat, "OH");
        const eq = makeEq([oxF, "H2O"], [hydrox]);
        if (eq) return { reacts: true, eq, name: "أكسيد قاعدي + ماء", type: "اتحاد", dH: -40, peak: null, approx: true,
          obs: ["يتكون محلول قلوي (هيدروكسيد)", "قد ترتفع حرارة الوعاء بوضوح"], fact: "أكاسيد الفلزات قواعد · مع الماء تصنع القلويات الكاوية." };
      }
    }
    // --- displacement: metal + salt ---
    const saltIn = fs.find((f) => COMP[f] && cationOf(f) && Object.keys(ANION).some((k) => f.replace(/[^A-Z]/g, "").includes(k.slice(0, 2))));
    if (metal && saltIn && metal !== saltIn) {
      const catB = cationOf(saltIn);
      const anKey = Object.keys(ACIDS).find((k) => ACIDS[k] && saltIn.includes(ACIDS[k].replace(/\d/g, "")));
      if (catB && anKey && (ACT[metal] ?? 0) > (ACT[catB] ?? 0)) {
        const salt = combine(metal, ACIDS[anKey]);
        const eq = makeEq([metal, saltIn], [salt, catB === "NH4" ? "NH3" : catB]);
        if (eq) return { reacts: true, eq, name: "إحلال فلز أنشط", type: "إحلال", dH: -100, peak: null, approx: true,
          obs: ["يترسب الفلز الأقل نشاطاً", "يتغير لون المحلول"], fact: "الفلز الأنشط يطرد الأضعف من مركّبه دائماً." };
      }
    }
    // --- salt + salt -> precipitation when an insoluble pair forms ---
    if (!acid && !fs.includes("H2O")) {
      const cA = cationOf(a), cB = cationOf(b), anA = anionOf(a), anB = anionOf(b);
      if (cA && cB && anA && anB && cA !== cB && anA !== anB) {
        const n1 = combine(cA, anB), n2 = combine(cB, anA);
        const pcF = [n1, n2].find((x) => PRECIP[x]);
        if (pcF && !((n1 === a && n2 === b) || (n1 === b && n2 === a))) {
          const eq = makeEq([a, b], [n1, n2]);
          if (eq) return { reacts: true, eq, name: "تبادل مزدوج وترسيب", type: "ترسيب", dH: -50, peak: null, approx: true, pc: pcF,
            obs: ["يتعكّر الخليط فوراً ويتكوّن راسب لا يذوب في الماء", "الأيونات المتفرّجة تبقى حرّة في المحلول"], fact: "محرك الترسيب: أيونات تلتقي فتبني مركّباً لا يذوب في الماء." };
        }
      }
    }
    // --- metal + water ---
    if (fs.includes("H2O")) {
      const m = fs.find((f) => EL[f] && ACT[f] !== undefined);
      if (m && ACT[m] >= 8) {
        const hydrox = combine(m, "OH");
        const eq = makeEq([m, "H2O"], [hydrox, "H2"]);
        if (eq) return { reacts: true, eq, name: "فلز قلوي + ماء", type: "إحلال عنيف", dH: -350, peak: null, approx: true, fx: "bubbles",
          obs: ["تفاعل عنيف قد يشتعل · خطر"], fact: "تُحفظ هذه الفلزات تحت الزيت لأن رطوبة الهواء قد تشعلها." };
      }
      if (m && ACT[m] === 7) return { reacts: false, reason: "المغنيسيوم يتفاعل ببطء شديد مع الماء البارد · يحتاج بخار ماء ساخناً جداً.", tip: "فعّل التسخين أو جرّب حمضاً بدل الماء." };
    }
  }
  return null;
}

function noReaction(fs) {
  const els = fs.filter((f) => EL[f]);
  if (els.some((e) => EL[e].cat === "noble")) {
    const n = els.find((e) => EL[e].cat === "noble");
    return { reacts: false, reason: `${EL[n].ar} غاز نبيل · غلافه الإلكتروني مكتمل فلا يكوّن روابط في الظروف العادية.`, tip: "الغازات النبيلة خاملة · جرّب عنصراً من المجموعة الأولى أو السابعة." };
  }
  if (fs.length === 1 && EL[fs[0]]) return { reacts: false, reason: "عنصر واحد وحده لا يتفاعل مع نفسه · أضف عنصراً أو مركباً ثانياً.", tip: "جرّب إضافة الأكسجين أو حمض." };
  if (fs.length === 1) return { reacts: false, reason: "مركب مستقر · جرّب تفعيل التسخين أو التيار الكهربائي لتحليله.", tip: "كربونات الكالسيوم تتفكك بالتسخين · جرّبها." };
  return { reacts: false, reason: "لا يحدث تفاعل ملحوظ بين هذه المواد في الظروف العادية.", tip: "جرّب: فلز نشط + حمض · أو وقود + أكسجين مع شرارة · أو حمض + قاعدة." };
}

export function predict(reactants, condition) {
  const fs = reactants.map((x) => x.f);
  const cur = curated(fs, condition);
  if (cur) return cur;
  const pat = patterns(fs, condition);
  if (pat) return pat;
  return noReaction(fs);
}

export function compoundInfo(f) {
  const comp = parseFormula(f);
  const mm = Object.entries(comp).reduce((s, [sym, n]) => s + (EL[sym]?.mass || 0) * n, 0);
  const parts = Object.entries(comp).map(([sym, n]) => ({
    sym, n, el: EL[sym], pct: mm ? Math.round(((EL[sym]?.mass || 0) * n / mm) * 1000) / 10 : 0,
  }));
  return { formula: f, molar: Math.round(mm * 100) / 100, parts, meta: COMP[f] || null, isElement: !!EL[f] };
}

export const COND_LIST = [
  { id: null, ar: "بدون شرط", icon: "⚗️" },
  { id: "spark", ar: "شرارة", icon: "⚡" },
  { id: "heat", ar: "تسخين", icon: "🔥" },
  { id: "electric", ar: "كهرباء", icon: "🔌" },
  { id: "light", ar: "ضوء شمس", icon: "☀️" },
  { id: "catalyst", ar: "عامل حفّاز", icon: "🧪" },
];

/* ---------- adaptive-insight helpers ---------- */
export const PRECIP = {
  AgCl: { hex: "#e8edf3", name: "أبيض حليبي يغمقّ بالضوء" }, AgBr: { hex: "#fef3c7", name: "أصفر شاحب" },
  AgI: { hex: "#fde047", name: "أصفر كناري" }, BaSO4: { hex: "#f4f7fb", name: "أبيض كثيف" },
  BaCO3: { hex: "#f4f7fb", name: "أبيض" }, CaCO3: { hex: "#eef2f6", name: "أبيض طباشيري" },
  CaSO4: { hex: "#e8edf3", name: "أبيض قليل الذوبان" }, PbI2: { hex: "#facc15", name: "أصفر ذهبي لامع" },
  PbCl2: { hex: "#eef2f6", name: "أبيض" }, PbSO4: { hex: "#eef2f6", name: "أبيض" },
  "Cu(OH)2": { hex: "#38bdf8", name: "أزرق سماوي جيلاتيني" }, "Fe(OH)3": { hex: "#b45309", name: "بني محمرّ كالصدأ" },
  "Fe(OH)2": { hex: "#65a30d", name: "أخضر زيتوني" }, "Zn(OH)2": { hex: "#eef2f6", name: "أبيض جيلاتيني" },
  "Al(OH)3": { hex: "#eef2f6", name: "أبيض جيلاتيني" }, "Mg(OH)2": { hex: "#eef2f6", name: "أبيض حليبي" },
};
const GAS_PRODUCTS = new Set(["H2", "O2", "N2", "Cl2", "CO2", "CO", "NH3", "SO2", "CH4", "C2H2", "H2S"]);

export function familyOf(result) {
  if (!result?.reacts || !result.eq) return null;
  const prods = result.eq.products;
  const pcF = result.pc || prods.map((x) => x.f).find((f) => PRECIP[f]) || null;
  const gases = prods.filter((x) => GAS_PRODUCTS.has(x.f));
  const t = result.type || "";
  let fam = "synthesis";
  if (result.condUsed === "electric" || t.includes("كهربائي")) fam = "electrolysis";
  else if (pcF) fam = "precipitation";
  else if (t.includes("بناء ضوئي")) fam = "photosynthesis";
  else if (t.includes("احتراق") || result.flameHex) fam = "combustion";
  else if (t.includes("تعادل") || t.includes("امتصاص")) fam = "neutralization";
  else if (t.includes("إحلال")) fam = "displacement";
  else if (t.includes("تفكك")) fam = "decomposition";
  else if (gases.length) fam = "gas";
  const flameHex = result.flameHex || (fam === "combustion" ? (result.eq.reactants.some((x) => x.f === "Mg") ? "#ffffff" : "#f59e0b") : null);
  return { fam, pre: pcF ? { f: pcF, ...(PRECIP[pcF] || {}) } : null, gases, flameHex };
}

export const REACTION_INDEX = CURATED.map((c, i) => ({ id: i, name: c.name, type: c.type, r: c.r, p: c.p, dH: c.dH, cond: c.cond, eq: makeEq(c.r, c.p) })).filter((x) => x.eq);
export const REACTION_COUNT = CURATED.length;
