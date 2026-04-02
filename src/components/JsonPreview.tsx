import { Button } from "@/components/ui/button";
import type { ReportDefinition } from "@/types";
import { useState, useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";


interface Props {
  definition: ReportDefinition;
}

export function buildJson(definition: ReportDefinition): object {
  return {
    id: definition.id,
    enabled: definition.enabled,
    metadata: {
      name: definition.metadata.name,
      description: definition.metadata.description,
      owner: definition.metadata.owner,
      tags: definition.metadata.tags,
    },
    reports: definition.reports.map((r) => {
      const report: Record<string, unknown> = {
        enabled: r.enabled,
        database: r.database,
        sql_file: r.sql_file,
        schedule: r.schedule,
        params: r.params
          ? Object.fromEntries(
              Object.entries(r.params).map(([k, v]) => [k, v.value])
            )
          : null,
        outputs: r.outputs.map((o) => {
          const out: Record<string, unknown> = {
            service: o.service,
            location: o.location,
            filename: o.filename,
            file_extension: o.file_extension,
          };
          if (o.ssm_key) out.ssm_key = o.ssm_key;
          return out;
        }),
        email_notifications: r.email_notifications,
      };
      if (r.name) report.name = r.name;
      return report;
    }),
  };
}

export function JsonPreview({ definition }: Props) {
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const jsonStr = JSON.stringify(buildJson(definition), null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!editorRef.current) return;

    if (viewRef.current) {
      // Update content when definition changes
      const current = viewRef.current.state.doc.toString();
      if (current !== jsonStr) {
        viewRef.current.dispatch({
          changes: { from: 0, to: current.length, insert: jsonStr },
        });
      }
      return;
    }

    const state = EditorState.create({
      doc: jsonStr,
      extensions: [
        basicSetup,
        json(),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.theme({
          "&": {
            fontSize: "15px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            maxHeight: "600px",
          },
          ".cm-scroller": {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            overflow: "auto",
          },
          ".cm-activeLine": { backgroundColor: "transparent" },
          ".cm-cursor": { display: "none" },
        }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: editorRef.current });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [jsonStr]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy JSON"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Read-only preview - copy this JSON into your config file.
        </span>
      </div>
      <div ref={editorRef} />
    </div>
  );
}
