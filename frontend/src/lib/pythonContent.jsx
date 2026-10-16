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
  const lines = code.replace(/\n$/, "").split("\n");
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard unavailable */ }
  };
  return (
    <div dir="ltr" className="group/code my-6 overflow-hidden rounded-[1.4rem] shadow-[0_24px_60px_-20px_rgba(13,17,23,0.55)] ring-1 ring-slate-900/20">
      {/* header bar */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#161b22] via-[#1c2330] to-[#161b22] px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_8px_rgba(255,95,87,0.6)]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_8px_rgba(254,188,46,0.6)]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_8px_rgba(40,200,64,0.6)]" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#3776AB] to-[#255a85] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow">
          <span className="text-sm">🐍</span> {title}
        </span>
        <span className="hidden text-[11px] font-bold text-slate-500 sm:inline" dir="rtl">{lines.length} {lines.length === 1 ? "سطر" : "أسطر"}</span>
        <button onClick={copy}
          className={`mr-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-extrabold transition-all active:scale-95 ${copied ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"}`}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "تم النسخ ✓" : "نسخ الكود"}
        </button>
      </div>
      {/* code body with line numbers */}
      <div className="overflow-x-auto bg-[#0d1117] [scrollbar-width:thin]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((ln, i) => (
              <tr key={i} className="transition-colors hover:bg-white/[0.04]">
                <td className="w-12 select-none border-r border-white/5 bg-white/[0.02] px-3 py-0 text-right align-top font-mono text-[11px] leading-[1.9] text-slate-600">
                  {i + 1}
                </td>
                <td className="px-4 py-0 align-top whitespace-pre font-mono text-[13px] leading-[1.9] sm:text-[13.5px]" style={{ fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace" }}>
                  <code>{highlightPython(ln || " ")}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* footer glow */}
      <div className="h-1 bg-gradient-to-r from-[#3776AB] via-[#FFD43B] to-[#3776AB]" />
    </div>
  );
}

/* ═══════════ tiny article markdown (ChatGPT-style) ═══════════ */
function inline(text) {
  const parts = [];
  // **bold**, *italic*, ~~strike~~, `code`, [link](url)
  const re = /(\*\*[^*]+\*\*|~~[^~]+~~|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={k++} className="font-extrabold text-slate-900">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("~~")) parts.push(<del key={k++} className="text-slate-500">{t.slice(2, -2)}</del>);
    else if (t.startsWith("*")) parts.push(<em key={k++} className="text-slate-800">{t.slice(1, -1)}</em>);
    else if (t.startsWith("[")) {
      const lm = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (lm) parts.push(<a key={k++} href={lm[2]} target="_blank" rel="noreferrer" className="font-bold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700">{lm[1]}</a>);
      else parts.push(<span key={k++}>{t}</span>);
    }
    else parts.push(<code key={k++} dir="ltr" className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[0.85em] text-amber-300" style={{ fontFamily: "'JetBrains Mono',Consolas,monospace" }}>{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts;
}

export function renderArticle(content) {
  const nodes = [];
  let k = 0;
  // Robust fenced-block parser: pairs ``` openers with closers sequentially.
  // An unclosed opener renders everything after it as code (like ChatGPT does).
  const fenceRe = /```(\w*)/g;
  let lastIdx = 0, m;
  const fences = [];
  while ((m = fenceRe.exec(content))) fences.push({ idx: m.index, lang: m[1] || "", end: m.index + m[0].length });
  let i = 0;
  while (i < fences.length) {
    const open = fences[i];
    // text before opener
    const before = content.slice(lastIdx, open.idx);
    if (before.trim()) nodes.push(...renderText(before, k++));
    // find closer: next fence whose line-start is a bare closer OR any next fence
    let closeIdx = -1;
    for (let j = i + 1; j < fences.length; j++) {
      closeIdx = j;
      break; // the very next fence closes this block
    }
    if (closeIdx === -1) {
      // unclosed: rest of content is code
      const code = content.slice(open.end).replace(/^\n/, "");
      nodes.push(<PythonCode key={`c${k++}`} code={code} title={open.lang || "python"} />);
      lastIdx = content.length;
      break;
    }
    const close = fences[closeIdx];
    const code = content.slice(open.end, close.idx).replace(/^\n/, "").replace(/\n$/, "");
    nodes.push(<PythonCode key={`c${k++}`} code={code} title={open.lang || "python"} />);
    lastIdx = close.end;
    i = closeIdx + 1;
  }
  const tail = content.slice(lastIdx);
  if (tail.trim()) nodes.push(...renderText(tail, k++));
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
  // table: | a | b | \n |---|---|
  const isTableRow = (l) => /^\|.*\|$/.test(l.trim());
  const isTableSep = (l) => /^\|[\s:|-]+\|$/.test(l.trim());
  let ti = 0;
  while (ti < lines.length) {
    const raw = lines[ti], line = raw.trim();
    if (isTableRow(line) && ti + 1 < lines.length && isTableSep(lines[ti + 1])) {
      flushPara(); flushList();
      const headers = line.split("|").slice(1, -1).map((c) => c.trim());
      ti += 2;
      const rows = [];
      while (ti < lines.length && isTableRow(lines[ti].trim())) {
        rows.push(lines[ti].trim().split("|").slice(1, -1).map((c) => c.trim()));
        ti++;
      }
      nodes.push(
        <div key={`${base}t${k++}`} className="my-5 overflow-x-auto rounded-2xl ring-1 ring-slate-200">
          <table className="w-full min-w-[420px] border-collapse bg-white text-[13.5px] sm:text-sm">
            <thead>
              <tr style={{ background: `linear-gradient(135deg,${"#3776AB"},${"#255a85"})` }}>
                {headers.map((h, i) => <th key={i} className="border-b border-white/20 px-4 py-3 text-right font-extrabold text-white">{inline(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-slate-50/70" : "bg-white"}>
                  {r.map((c, ci) => <td key={ci} className="border-b border-slate-100 px-4 py-2.5 text-slate-700">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    ti++;
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
