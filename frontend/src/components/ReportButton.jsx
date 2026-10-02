import React, { useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Flag } from "lucide-react";

/* Small report button — posts to the existing moderation queue (/api/reports). */
export default function ReportButton({ entityType, entityId, className = "" }) {
  const [busy, setBusy] = useState(false);
  const report = async () => {
    const reason = window.prompt("سبب البلاغ (سيصل لفريق الإشراف):");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      await api.post("/reports", { entity_type: entityType, entity_id: entityId, reason: reason.trim() });
      toast.success("وصل بلاغك لفريق الإشراف — شكراً 🙏");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  return (
    <button onClick={report} disabled={busy} title="إبلاغ"
      className={`inline-flex items-center gap-1 text-slate-300 hover:text-rose-500 text-[11px] font-bold transition disabled:opacity-50 ${className}`}>
      <Flag className="w-3.5 h-3.5" /> إبلاغ
    </button>
  );
}
