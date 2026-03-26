import { useEffect, useRef, useMemo } from "react";
import mermaid from "mermaid";
import type { ReportDefinition } from "@/types";
import { utcToLocal, getTimezoneAbbr } from "@/lib/time";

function previewFilename(template: string, defId: string, reportName: string, metadataName: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
  return template
    .replace(/\{id\}/g, defId || "unnamed")
    .replace(/\{current_datetime\}/g, dt)
    .replace(/\{workflow_id\}/g, "a1b2c3d4")
    .replace(/\{name\}/g, reportName || "unnamed")
    .replace(/\{metadata_name\}/g, metadataName || "unnamed");
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { curve: "basis", padding: 20, wrappingWidth: 300, nodeSpacing: 40, rankSpacing: 60 },
  securityLevel: "loose",
});

function esc(s: string): string {
  return s.replace(/"/g, "#quot;").replace(/[[\]{}()<>]/g, " ").replace(/\n/g, " ");
}

function escKeepBraces(s: string): string {
  return s.replace(/"/g, "#quot;").replace(/[[\]()<>]/g, " ").replace(/\n/g, " ");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function scheduleLabel(schedule: ReportDefinition["reports"][0]["schedule"]): string {
  const time = `${utcToLocal(schedule.time)} ${getTimezoneAbbr()}`;
  switch (schedule.type) {
    case "daily":
      return `Runs daily at ${time}`;
    case "weekly": {
      const raw = (schedule.days as string[]) || [];
      if (raw.length === 0) return `Runs weekly, no days selected, at ${time}`;
      const days = raw.map(d => capitalize(d));
      const list = days.length <= 2 ? days.join(" and ") : days.slice(0, -1).join(", ") + ", and " + days[days.length - 1];
      return `Runs every ${list} at ${time}`;
    }
    case "monthly": {
      const raw = (schedule.days as number[]) || [];
      if (raw.length === 0) return `Runs monthly, no days selected, at ${time}`;
      const days = raw.map(ordinal);
      const list = days.length <= 2 ? days.join(" and ") : days.slice(0, -1).join(", ") + ", and " + days[days.length - 1];
      return `Runs monthly on the ${list} at ${time}`;
    }
    case "dates": {
      const dates = schedule.dates || [];
      if (dates.length === 0) return `Runs on specific dates, none selected`;
      if (dates.length <= 3) return `Runs on ${dates.join(", ")} at ${time}`;
      return `Runs on ${dates.length} scheduled dates at ${time}`;
    }
  }
}

function buildMermaid(def: ReportDefinition): string {
  const lines: string[] = ["flowchart TD"];
  const id = esc(def.id || "Unnamed");

  const owner = esc(def.metadata.owner || "—");
  const status = def.enabled ? "Enabled" : "DISABLED";

  const defDisabled = !def.enabled;

  lines.push(`  START(["<b>${id}</b><br/><i>Owner:</i> ${owner}<br/><i>Status:</i> ${status}"])`);
  lines.push(`  style START fill:${defDisabled ? "#9ca3af" : "#3b82f6"},color:#fff,stroke:${defDisabled ? "#6b7280" : "#2563eb"}`);

  if (def.reports.length === 0) {
    lines.push(`  START --> NONE["No reports configured"]`);
    return lines.join("\n");
  }

  def.reports.forEach((r, i) => {
    const name = esc(r.name || `Report ${i + 1}`);
    const reportId = `RPT${i}`;
    const schedId = `SCHED${i}`;
    const sqlId = `SQL${i}`;
    const sqlFile = esc(r.sql_file || "no sql file");
    const db = esc(r.database);
    const reportStatus = r.enabled ? "Enabled" : "DISABLED";
    const dim = defDisabled || !r.enabled;

    // Report
    lines.push(`  START --> ${reportId}["<b>${name}</b><br/><i>Status:</i> ${reportStatus}"]`);
    lines.push(`  style ${reportId} fill:${dim ? "#9ca3af" : "#8b5cf6"},color:#fff,stroke:${dim ? "#6b7280" : "#7c3aed"}`);

    // Schedule (belongs to report)
    lines.push(`  ${reportId} -->|scheduled at| ${schedId}(("${scheduleLabel(r.schedule)}"))`);
    lines.push(`  style ${schedId} fill:${dim ? "#9ca3af" : "#f59e0b"},color:#fff,stroke:${dim ? "#6b7280" : "#d97706"}`);

    // Database query
    const paramEntries = r.params ? Object.entries(r.params) : [];
    const paramsLabel = paramEntries.length > 0
      ? `<br/><i>Params:</i> ${paramEntries.map(([k, v]) => `${esc(k)}=${esc(v)}`).join(", ")}`
      : "";
    lines.push(`  ${schedId} -->|queries| ${sqlId}[("<b>${db}</b><br/><i>File:</i> ${sqlFile}${paramsLabel}")]`);
    lines.push(`  style ${sqlId} fill:${dim ? "#9ca3af" : "#7c3aed"},color:#fff,stroke:${dim ? "#6b7280" : "#6d28d9"}`);

    // Outputs
    const outputIds: string[] = [];
    r.outputs.forEach((o, j) => {
      const outId = `OUT${i}x${j}`;
      outputIds.push(outId);
      const svc = o.service === "box" ? "Box" : "S3";
      const loc = esc(o.location || "no destination");
      const fname = escKeepBraces(o.filename || "no filename");
      const ext = o.file_extension || "xlsx";
      const preview = esc(previewFilename(o.filename || "no filename", def.id, name, def.metadata.name));
      lines.push(`  ${sqlId} -->|saves to| ${outId}[["<b>${svc}</b><br/><i>Location:</i> ${loc}<br/><i>Template:</i> ${fname}.${ext}<br/><i>Preview:</i> ${preview}.${ext}"]]`);
      lines.push(`  style ${outId} fill:${dim ? "#9ca3af" : "#10b981"},color:#fff,stroke:${dim ? "#6b7280" : "#059669"}`);
    });

    // Email — linked from outputs so they sit below
    if (r.email_notifications && r.email_notifications.length > 0) {
      r.email_notifications.forEach((e, j) => {
        const emailId = `EMAIL${i}x${j}`;
        const recipients = e.recipients.length > 0 ? esc(e.recipients.join(", ")) : "none";
        const msg = e.message ? esc(e.message.slice(0, 40)) + (e.message.length > 40 ? "..." : "") : "—";
        const notifyOn = { all: "Always", completed: "On Completion", error: "On Error" }[e.notify_on || "all"];
        const parentId = outputIds.length > 0 ? outputIds[outputIds.length - 1] : sqlId;
        lines.push(`  ${parentId} -->|notifies| ${emailId}("<b>Email</b><br/><i>To:</i> ${recipients}<br/><i>When:</i> ${notifyOn}<br/><i>Message:</i> ${msg}")`);
        lines.push(`  style ${emailId} fill:${dim ? "#9ca3af" : "#ec4899"},color:#fff,stroke:${dim ? "#6b7280" : "#db2777"}`);
      });
    }
  });

  return lines.join("\n");
}

interface Props {
  definition: ReportDefinition;
}

let renderCounter = 0;

export function MermaidPreview({ definition }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagram = useMemo(() => buildMermaid(definition), [definition]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderDiagram = async () => {
      // Use a unique ID each render to avoid mermaid's DOM caching
      const id = `mermaid-${++renderCounter}`;
      // Clean up any leftover temp elements from previous renders
      document.getElementById(id)?.remove();

      try {
        const { svg } = await mermaid.render(id, diagram);
        el.innerHTML = svg;
      } catch (err) {
        console.error("Mermaid render error:", err);
        el.innerHTML = `<pre class="text-destructive p-4 text-sm whitespace-pre-wrap">Failed to render diagram.\n\nGenerated markup:\n${diagram}</pre>`;
      }
    };

    renderDiagram();
  }, [diagram]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-[#3b82f6]" /> Definition</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-[#f59e0b]" /> Schedule</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-[#8b5cf6]" /> Query</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-[#10b981]" /> Output</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-[#ec4899]" /> Email</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-[#9ca3af]" /> Disabled</span>
      </div>
      <div
        ref={containerRef}
        className="overflow-auto rounded-md border p-6 bg-white min-h-[300px]"
      />
    </div>
  );
}
