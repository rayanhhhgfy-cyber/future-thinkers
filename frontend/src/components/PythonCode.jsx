import React, { useRef } from "react";

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

export function PyErrorText({ text, tone = "dark" }) {
  const plain = tone === "dark" ? "text-rose-200" : "text-rose-700";
  const name = tone === "dark" ? "text-rose-400" : "text-red-600";
  const rest = tone === "dark" ? "text-rose-100" : "text-rose-800";
  const lines = String(text ?? "").split("\n");
  return lines.map((ln, i) => {
    const m = ln.match(ERR_NAME);
    if (!m) return <span key={i} className={plain}>{ln}{"\n"}</span>;
    const idx = ln.indexOf(m[1]);
    return (
      <span key={i}>
        <span className={plain}>{ln.slice(0, idx)}</span>
        <span className={`${name} font-bold`}>{m[1]}</span>
        <span className={rest}>{ln.slice(idx + m[1].length)}</span>
        {"\n"}
      </span>
    );
  });
}
