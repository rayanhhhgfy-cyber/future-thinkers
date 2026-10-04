import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { FadeUp } from "@/components/anim";
import {
  PenLine, Plus, Trash2, Flag, GitBranch, Save, Rocket, X,
} from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#E11D48", "#0891B2", "#0A192F"];
let seq = 3;

const blankNode = (key) => ({ key, text: "", choices: [{ label: "", to: "" }] });

export default function StoryEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [start, setStart] = useState("scene1");
  const [nodes, setNodes] = useState([
    { key: "scene1", text: "", choices: [{ label: "", to: "scene2" }, { label: "", to: "end1" }] },
    { key: "scene2", text: "", choices: [] },
    { key: "end1", text: "", choices: [] },
  ]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api.get(`/stories/${id}`).then(({ data }) => {
      setTitle(data.title); setDesc(data.desc || ""); setColor(data.color || COLOR_OPTIONS[0]);
      setStart(data.start);
      setNodes(Object.entries(data.nodes || {}).map(([key, n]) => ({
        key, text: n.text, choices: (n.choices || []).map((c) => ({ label: c.label, to: c.to })),
      })));
    }).catch((e) => setErr(apiErr(e))).finally(() => setLoading(false));
  }, [id, editing]);

  if (loading) return <Layout><PageLoader /></Layout>;

  const setNode = (i, patch) => setNodes((ns) => ns.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  const setChoice = (i, k, patch) =>
    setNodes((ns) => ns.map((n, j) => j === i ? { ...n, choices: n.choices.map((c, m) => (m === k ? { ...c, ...patch } : c)) } : n));
  const addNode = (end) => {
    seq += 1;
    const key = end ? `end${seq}` : `scene${seq}`;
    setNodes((ns) => [...ns, { key, text: "", choices: [] }]);
  };
  const removeNode = (i) => {
    if (nodes.length <= 2) return toast.error("القصة تحتاج مشهدين على الأقل");
    const key = nodes[i].key;
    setNodes((ns) => ns.filter((_, j) => j !== i).map((n) => ({ ...n, choices: n.choices.filter((c) => c.to !== key) })));
    if (start === key) setStart(nodes.find((_, j) => j !== i)?.key || "");
  };

  const save = async (publish) => {
    setErr("");
    const payload = {
      title: title.trim(), desc: desc.trim(), color, start, publish,
      nodes: nodes.map((n) => ({
        key: n.key.trim(),
        text: n.text.trim(),
        choices: n.choices.filter((c) => c.label.trim()).map((c) => ({ label: c.label.trim(), to: c.to.trim() })),
      })),
    };
    if (payload.nodes.some((n) => !n.key || n.text.length < 10)) {
      setErr("كل مشهد يحتاج مفتاحاً ونصاً لا يقل عن 10 أحرف");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/stories/${id}`, payload);
        toast.success(publish ? "نُشرت القصة 🚀" : "حُفظت التعديلات");
        nav(`/stories/${id}`);
      } else {
        const { data } = await api.post("/stories", payload);
        toast.success(publish ? "نُشرت قصتك 🚀" : "حُفظت كمسودة");
        nav(publish ? `/stories/${data.id}` : "/stories");
      }
    } catch (e) { setErr(apiErr(e)); } finally { setBusy(false); }
  };

  const keys = nodes.map((n) => n.key.trim()).filter(Boolean);

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <FadeUp>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <Link to="/stories" className="text-xs font-black text-slate-400 hover:text-slate-700">→ كل القصص</Link>
              <h1 className="font-head font-black text-3xl mt-1 flex items-center gap-2">
                <PenLine className="w-7 h-7 text-violet-500" /> {editing ? "تعديل القصة" : "اكتب مغامرتك"}
              </h1>
              <p className="text-slate-500 text-sm mt-1">ابنِ مشاهد واربطها باختيارات · المشاهد بلا اختيارات تصبح نهايات للقصة</p>
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-5 sm:p-6 space-y-4 ft-shadow">
            <div>
              <label className="text-xs font-black text-slate-500">عنوان القصة</label>
              <input data-testid="story-title-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={90}
                placeholder="مثال: لغز الجزيرة الضائعة"
                className="mt-1.5 w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500">وصف قصير (اختياري)</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300}
                placeholder="سطر يجذب القرّاء إلى مغامرتك"
                className="mt-1.5 w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-1.5">لون الغلاف</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-label={c}
                      className={`w-9 h-9 rounded-full transition ${color === c ? "ring-4 ring-offset-2 ring-slate-300 scale-110" : "hover:scale-110"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 block mb-1.5">مشهد البداية</label>
                <select data-testid="story-start-select" value={start} onChange={(e) => setStart(e.target.value)}
                  className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 font-bold outline-none">
                  {keys.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="space-y-4" data-testid="story-nodes">
          {nodes.map((n, i) => {
            const isEnd = n.choices.length === 0;
            return (
              <motion.div key={i} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl bg-white ring-1 p-5 sm:p-6 ft-shadow ${isEnd ? "ring-amber-200" : "ring-slate-200/70"}`}>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black ${isEnd ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                    {isEnd ? <Flag className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}
                    {isEnd ? "مشهد نهاية" : "مشهد"}
                  </span>
                  <input value={n.key} onChange={(e) => setNode(i, { key: e.target.value.replace(/\s+/g, "_") })}
                    className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-1.5 text-sm font-bold w-36 outline-none" dir="ltr" />
                  {n.key === start && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[10px] font-black">البداية</span>}
                  <span className="flex-1" />
                  <button onClick={() => setNode(i, { choices: [...n.choices, { label: "", to: keys.find((k) => k !== n.key) || "" }] })}
                    className="inline-flex items-center gap-1 text-xs font-black text-violet-600 hover:text-violet-800">
                    <Plus className="w-3.5 h-3.5" /> اختيار
                  </button>
                  <button onClick={() => removeNode(i)} className="inline-flex items-center gap-1 text-xs font-black text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
                <textarea data-testid="story-node-text" value={n.text} onChange={(e) => setNode(i, { text: e.target.value })} rows={4}
                  placeholder="اكتب ما يحدث في هذا المشهد… (10 أحرف على الأقل)"
                  className="mt-3 w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 leading-relaxed outline-none focus:ring-2 focus:ring-violet-400" />
                {n.choices.map((c, k) => (
                  <div key={k} className="flex items-center gap-2 mt-2.5">
                    <input data-testid="story-choice-label" value={c.label} onChange={(e) => setChoice(i, k, { label: e.target.value })}
                      placeholder="نص زر الاختيار: ماذا يفعل القارئ؟"
                      className="flex-1 min-w-0 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300" />
                    <span className="text-slate-300 font-black">←</span>
                    <select value={c.to} onChange={(e) => setChoice(i, k, { to: e.target.value })}
                      className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-2.5 py-2.5 text-sm font-bold outline-none max-w-[130px]">
                      <option value="">اختر مشهداً</option>
                      {keys.filter((kk) => kk !== n.key).map((kk) => <option key={kk} value={kk}>{kk}</option>)}
                    </select>
                    <button onClick={() => setNode(i, { choices: n.choices.filter((_, m) => m !== k) })}
                      className="w-8 h-8 grid place-items-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100" aria-label="حذف الاختيار"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {isEnd && <p className="text-[11px] text-amber-600 font-bold mt-2.5">هذا المشهد نهاية · أضف اختياراً إن أردت أن تستمر القصة بعده</p>}
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => addNode(false)} className="inline-flex items-center gap-2 rounded-2xl bg-white ring-1 ring-slate-200 px-5 py-3 font-head font-black text-sm transition hover:shadow-md active:scale-95">
            <Plus className="w-4 h-4" /> مشهد جديد
          </button>
          <button onClick={() => addNode(true)} className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-amber-700 px-5 py-3 font-head font-black text-sm transition hover:shadow-md active:scale-95">
            <Flag className="w-4 h-4" /> مشهد نهاية
          </button>
        </div>

        {err && <p className="rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 px-4 py-3 text-sm font-bold">{err}</p>}

        <div className="flex flex-wrap gap-2.5 sticky bottom-4 z-10">
          <button data-testid="story-publish-btn" disabled={busy} onClick={() => save(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white px-7 py-3.5 font-head font-black shadow-xl shadow-fuchsia-500/25 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50">
            <Rocket className="w-5 h-5" /> {editing ? "حفظ ونشر" : "نشر القصة"}
          </button>
          <button data-testid="story-draft-btn" disabled={busy} onClick={() => save(false)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-6 py-3.5 font-head font-black transition hover:scale-[1.02] active:scale-95 disabled:opacity-50">
            <Save className="w-5 h-5" /> حفظ كمسودة
          </button>
        </div>
      </div>
    </Layout>
  );
}
