import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { ReportDefinition } from "@/types";
import { useState } from "react";


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
        params: r.params,
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

  const json = JSON.stringify(buildJson(definition), null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy JSON"}
        </Button>
      </div>
      <ScrollArea className="h-[600px] rounded-md border">
        <pre className="p-4 text-sm font-mono">{json}</pre>
      </ScrollArea>
    </div>
  );
}
