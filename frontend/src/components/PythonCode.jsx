import React, { useRef, useState } from "react";
import { Copy, Check, Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";

/* Lightweight Python syntax highlighting (no dependencies): comments, strings,
   numbers, keywords, constants, builtins and function calls get colors.
   Used on a dark editor background. */
const TOKEN_RE = /(#[^\n]*)|((?:f|r|b|fr|rf)?"(?:\\.|[^"\\])*"|(?:f|r|b|fr|rf)?'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?)\b|\b(def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|pass|break|continue|raise|lambda|and|or|not|in|is|global|nonlocal|assert|del|yield|async|await)\b|\b(True|False|None)\b|\b(print|input|int|str|float|bool|len|range|list|dict|set|tuple|sum|min|max|abs|round|enumerate|zip|map|filter|sorted|reversed|type|isinstance|open|super|repr|any|all)\b|([A-Za-z_]\w*)(?=\s*\()/g;

export function highlightPython(code) {
  const out = [];
  let last = 0;
  let i = 0;
  const re = new RegExp(TOKEN_RE.source, "g");
  const push = (text, cls) => { if (text) out.push(<span key={i++} className={cls}>{text}</span>); };
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) push(code.slice(last, m.index), "text-slate-200");
    if (m[1]) push(m[1], "text-slate-500 italic");
    else if (m[2]) push(m[2], "text-amber-300");
    else if (m[3]) push(m[3], "text-orange-400");
    else if (m[4]) push(m[4], "text-fuchsia-400 font-semibold");
    else if (m[5]) push(m[5], "text-rose-400");
    else if (m[6]) push(m[6], "text-sky-300");
    else if (m[7]) push(m[7], "text-emerald-300");
    last = m.index + m[0].length;
  }
  if (last < code.length) push(code.slice(last), "text-slate-200");
  return out;
}

/* Code editor with live Python colors: a transparent textarea over a
   highlighted <pre>. Tab inserts two spaces; scroll stays in sync. */
export function PythonEditor({ value, onChange, minHeight = 280, testId, placeholder }) {
  const preRef = useRef(null);
  const taRef = useRef(null);
  const sync = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };
  const onKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.target;
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    onChange({ target: { value: value.slice(0, s) + "  " + value.slice(en) } });
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
  };
  return (
    <div className="relative bg-slate-900" dir="ltr">
      <pre ref={preRef} aria-hidden="true"
        className="absolute inset-0 overflow-hidden p-3 font-mono text-sm leading-6 whitespace-pre-wrap break-words pointer-events-none text-left">
        {highlightPython(value || "")}
        {"\n"}
      </pre>
      <textarea ref={taRef} data-testid={testId} value={value} onChange={onChange} onScroll={sync} onKeyDown={onKeyDown}
        spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" placeholder={placeholder}
        className="relative w-full bg-transparent text-transparent caret-emerald-300 font-mono text-sm leading-6 p-3 outline-none resize-none selection:bg-sky-400/30 placeholder:text-slate-500"
        style={{ minHeight }} />
    </div>
  );
}

/* Colors an error line: the exception name (NameError, ValueError...) in bold
   red, the explanation after it lighter. Works inside Arabic-prefixed lines
   like "اختبار 1: NameError: ..." too. */
const ERR_NAME = /([A-Za-z_][\w.]*(?:Error|Exception|Interrupt|Exit|Warning|Fault|Failure))/;

export function PyErrorText({ text, tone = "dark", trail = true }) {
  const plain = tone === "dark" ? "text-rose-200" : "text-rose-700";
  const name = tone === "dark" ? "text-rose-400" : "text-red-600";
  const rest = tone === "dark" ? "text-rose-100" : "text-rose-800";
  const lines = String(text ?? "").split("\n");
  return lines.map((ln, i) => {
    const m = ln.match(ERR_NAME);
    if (!m) return <span key={i} className={plain}>{ln}{trail ? "\n" : ""}</span>;
    const idx = ln.indexOf(m[1]);
    return (
      <span key={i}>
        <span className={plain}>{ln.slice(0, idx)}</span>
        <span className={`${name} font-bold`}>{m[1]}</span>
        <span className={rest}>{ln.slice(idx + m[1].length)}</span>
        {trail ? "\n" : ""}
      </span>
    );
  });
}

/* Beautiful terminal window: mac dots, status chip, copy button, line numbers.
   status: idle | running | ok | error */
export function Terminal({ title = "output", status = "idle", rawText = "", emptyHint = "جاهز… اضغط «تشغيل» لترى النتائج هنا", children, className = "" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(rawText || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard unavailable */ }
  };
  const chip = {
    idle: <span className="inline-flex items-center gap-1 text-slate-400"><Circle className="w-3 h-3" /> جاهز</span>,
    running: <span className="inline-flex items-center gap-1 text-sky-300"><Loader2 className="w-3.5 h-3.5 animate-spin" /> يُشغّل</span>,
    ok: <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> ناجح</span>,
    error: <span className="inline-flex items-center gap-1 text-rose-300"><XCircle className="w-3.5 h-3.5" /> خطأ</span>,
  }[status] || null;
  const hasBody = React.Children.count(children) > 0;
  return (
    <div className={`relative overflow-hidden rounded-[1.25rem] bg-slate-950 ring-1 ring-white/10 shadow-[0_18px_50px_-20px_rgba(2,6,23,0.8)] ${className}`} dir="ltr">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
          <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
        </span>
        <span className="font-mono text-[11px] tracking-wide text-slate-400 truncate">{title}</span>
        <span className="ml-auto flex items-center gap-3 text-[11px] font-bold shrink-0">
          {chip}
          {rawText ? (
            <button onClick={copy} title="نسخ المخرجات" className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/10 transition">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          ) : null}
        </span>
      </div>
      <div className="font-mono text-[13px] leading-6 text-left max-h-80 overflow-auto">
        {status === "running" && !hasBody ? (
          <div className="px-4 py-4 text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-300" /> <span>جارٍ تنفيذ الكود في البيئة المعزولة…</span>
          </div>
        ) : hasBody ? children : (
          <div className="px-4 py-4 text-slate-500">
            <span className="text-emerald-400 font-bold">❯</span> {emptyHint}
            <span className="inline-block w-2 h-4 ml-1.5 align-[-2px] bg-emerald-400/80 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

/* Numbered output lines for Terminal bodies. error=true colors error lines. */
export function TermLines({ text, error = false, okClass = "text-slate-200" }) {
  const lines = String(text ?? "").split("\n");
  return (
    <div className="py-2">
      {lines.map((ln, i) => (
        <div key={i} className="flex px-3 hover:bg-white/[0.03]">
          <span className="w-8 shrink-0 text-right pr-3 text-slate-600 select-none">{i + 1}</span>
          <span className={`flex-1 whitespace-pre-wrap break-all ${error ? "" : okClass}`}>
            {error ? <PyErrorText text={ln} trail={false} /> : (ln || " ")}
          </span>
        </div>
      ))}
    </div>
  );
}
