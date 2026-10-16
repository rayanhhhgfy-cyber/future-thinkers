import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

/* ═══════════ Python syntax highlighter (hand-rolled, no deps) ═══════════ */
const KEYWORDS = new Set(
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" ")
);
const BUILTINS = new Set(
  "print len range str int float bool list dict set tuple input open enumerate zip map filter sum min max abs round sorted reversed type isinstance super self cls".split(" ")
);

const C = {
  keyword: "#c678dd",
  string: "#98c379",
  comment: "#7f848e",
  number: "#d19a66",
  builtin: "#56b6c2",
  func: "#61afef",
  defname: "#e5c07b",
  decorator: "#e5c07b",
  plain: "#e6e9f0",
};

const MASTER = new RegExp(
  [
    "(#[^\\n]*)",
    "((?:[fFrRbBuU]{0,2})(?:\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?'''|\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*'))",
    "(@[A-Za-z_][\\w.]*)",
    "(\\b\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?j?\\b)",
    "([A-Za-z_][A-Za-z0-9_]*)",
    "([ \\t\\n\\r]+)",
    "(.{1})",
  ].join("|"),
  "g"
);

export function highlightPython(code) {
  const out = [];
  let m, k = 0, expectDef = false;
  MASTER.lastIndex = 0;
  while ((m = MASTER.exec(code))) {
    const [full, comment, str, deco, num, ident, ws, other] = m;
    const key = k++;
    if (ws) { out.push(<span key={key}>{ws}</span>); continue; }
    if (comment) { out.push(<span key={key} style={{ color: C.comment, fontStyle: "italic" }}>{comment}</span>); continue; }
    if (str) { out.push(<span key={key} style={{ color: C.string }}>{str}</span>); continue; }
    if (deco) { out.push(<span key={key} style={{ color: C.decorator }}>{deco}</span>); continue; }
    if (num) { out.push(<span key={key} style={{ color: C.number }}>{num}</span>); continue; }
    if (ident) {
      let color = C.plain;
      if (KEYWORDS.has(ident)) { color = C.keyword; expectDef = ident === "def" || ident === "class"; }
      else if (expectDef) { color = C.defname; expectDef = false; }
      else if (BUILTINS.has(ident)) { color = C.builtin; }
      else {
        const rest = code.slice(MASTER.lastIndex);
        if (/^\s*\(/.test(rest)) color = C.func;
      }
      out.push(<span key={key} style={color === C.plain ? undefined : { color }}>{ident}</span>);
      continue;
    }
    out.push(<span key={key} style={{ color: "#9aa3b2" }}>{other}</span>);
  }
  return out;
}

export function PythonCode({ code, title = "python" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard unavailable */ }
  };
  return (
    <div dir="ltr" className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">{title}</span>
        <button onClick={copy} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-white/10 hover:text-white">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-left text-[13px] leading-[1.75] sm:text-sm" style={{ fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace" }}>
        <code>{highlightPython(code.replace(/\n$/, ""))}</code>
      </pre>
    </div>
  );
}

/* ═══════════ tiny article markdown ═══════════ */
function inline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={k++} className="font-extrabold text-slate-900">{t.slice(2, -2)}</strong>);
    else parts.push(<code key={k++} dir="ltr" className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[0.85em] text-amber-300" style={{ fontFamily: "'JetBrains Mono',Consolas,monospace" }}>{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts;
}

export function renderArticle(content) {
  const nodes = [];
  // split out fenced code blocks first
  const chunks = content.split(/```(\w*)\n?/);
  // chunks: [text, lang, code, text, lang, code, ...]
  let k = 0;
  for (let i = 0; i < chunks.length; i += 3) {
    const text = chunks[i] || "";
    const lang = chunks[i + 1];
    const code = chunks[i + 2];
    if (text.trim()) nodes.push(...renderText(text, k++));
    if (code !== undefined) nodes.push(<PythonCode key={`c${k++}`} code={code} title={lang || "code"} />);
  }
  return nodes;
}

function renderText(text, base) {
  const lines = text.split("\n");
  const nodes = [];
  let k = 0, para = [], list = [], listType = null;
  const flushPara = () => {
    if (para.length) {
      nodes.push(<p key={`${base}p${k++}`} className="my-4 text-[16px] leading-[2] text-slate-700 sm:text-[17px]">{inline(para.join(" "))}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      const Tag = listType === "ol" ? "ol" : "ul";
      nodes.push(
        <Tag key={`${base}l${k++}`} className={listType === "ol" ? "my-4 list-decimal space-y-2 pr-6" : "my-4 space-y-2 pr-1"}>
          {list.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.9] text-slate-700 sm:text-base">
              {listType === "ol" ? null : <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
              <span>{inline(it)}</span>
            </li>
          ))}
        </Tag>
      );
      list = []; listType = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith("### ")) { flushPara(); flushList(); nodes.push(<h4 key={`${base}h${k++}`} className="mb-2 mt-7 font-head text-lg font-extrabold text-slate-900 sm:text-xl">{inline(line.slice(4))}</h4>); continue; }
    if (line.startsWith("## ")) { flushPara(); flushList(); nodes.push(<h3 key={`${base}h${k++}`} className="mb-2 mt-8 flex items-center gap-2 font-head text-xl font-extrabold text-slate-900 sm:text-2xl"><span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />{inline(line.slice(3))}</h3>); continue; }
    if (line.startsWith("# ")) { flushPara(); flushList(); nodes.push(<h2 key={`${base}h${k++}`} className="mb-3 mt-8 font-head text-2xl font-black text-slate-900 sm:text-3xl">{inline(line.slice(2))}</h2>); continue; }
    if (/^---+$/.test(line)) { flushPara(); flushList(); nodes.push(<hr key={`${base}r${k++}`} className="my-8 border-slate-200" />); continue; }
    if (line.startsWith("> ")) { flushPara(); flushList(); nodes.push(<blockquote key={`${base}q${k++}`} className="my-5 rounded-2xl border-r-4 border-amber-400 bg-amber-50 px-5 py-4 text-[15px] leading-[1.9] text-amber-900">{inline(line.slice(2))}</blockquote>); continue; }
    const olm = line.match(/^(\d+)[.)]\s+(.*)/);
    if (olm) { flushPara(); if (listType !== "ol") { flushList(); listType = "ol"; } list.push(olm[2]); continue; }
    if (/^[-*]\s+/.test(line)) { flushPara(); if (listType !== "ul") { flushList(); listType = "ul"; } list.push(line.replace(/^[-*]\s+/, "")); continue; }
    if (listType) flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return nodes;
}
