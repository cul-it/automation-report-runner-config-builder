import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScheduleForm } from "./ScheduleForm";
import { ParamsForm } from "./ParamsForm";
import { OutputForm } from "./OutputForm";
import { EmailForm } from "./EmailForm";
import { RequiredLabel, FieldError } from "@/App";
import { Label } from "@/components/ui/label";
import { errorsFor, type ValidationErrors } from "@/lib/validation";
import { Trash2 } from "lucide-react";
import type { ConfiguredReport } from "@/types";

interface Props {
  report: ConfiguredReport;
  index: number;
  canRemove: boolean;
  onChange: (report: ConfiguredReport) => void;
  onRemove: () => void;
  errors: ValidationErrors | null;
  definitionId: string;
  metadataName: string;
}

export function ConfiguredReportForm({
  report,
  index,
  canRemove,
  onChange,
  onRemove,
  errors,
  definitionId,
  metadataName,
}: Props) {
  const update = <K extends keyof ConfiguredReport>(
    field: K,
    value: ConfiguredReport[K]
  ) => {
    onChange({ ...report, [field]: value });
  };

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
{report.name || `Report ${index + 1}`}
          </h3>
          <div className="flex items-center gap-2">
            <Switch
              checked={report.enabled}
              onCheckedChange={(checked) => update("enabled", checked)}
            />
            <span className="text-sm text-muted-foreground">
              {report.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={report.name || ""}
              onChange={(e) => update("name", e.target.value || undefined)}
              placeholder="Optional unique name"
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel>SQL File</RequiredLabel>
            <Input
              value={report.sql_file}
              onChange={(e) => update("sql_file", e.target.value)}
              placeholder="query.sql"
              className={errors?.["sql_file"] ? "border-destructive" : ""}
            />
            <FieldError error={errors?.["sql_file"]} />
          </div>
          <div className="space-y-2">
            <RequiredLabel>Database</RequiredLabel>
            <Input
              value={report.database}
              disabled
              className={errors?.["database"] ? "border-destructive" : ""}
            />
            <FieldError error={errors?.["database"]} />
          </div>
        </div>

      <div className="border rounded-lg p-4">
        <h4 className="text-base font-semibold mb-3">Schedule</h4>
          <ScheduleForm
            schedule={report.schedule}
            onChange={(s) => update("schedule", s)}
            errors={errors ? errorsFor(errors, "schedule") : null}
          />
        </div>

      <div className="border rounded-lg p-4">
        <ParamsForm
          title="SQL Parameters"
          params={report.params}
          onChange={(p) => update("params", p)}
        />
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-base font-semibold">Outputs</h4>
          <Button variant="outline" size="sm" onClick={() => update("outputs", [...report.outputs, { service: "box", location: "", filename: "", file_extension: "xlsx" }])}>
            + Add Output
          </Button>
        </div>
        <OutputForm
          outputs={report.outputs}
          onChange={(o) => update("outputs", o)}
          errors={errors}
          definitionId={definitionId}
          reportName={report.name || ""}
          metadataName={metadataName}
        />
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-base font-semibold">Email Notifications</h4>
          <Button variant="outline" size="sm" onClick={() => update("email_notifications", [...(report.email_notifications || []), { recipients: [], subject: "", message: "", notify_on: "all" as const }])}>
            + Add Notification
          </Button>
        </div>
        <EmailForm
          notifications={report.email_notifications}
          onChange={(n) => update("email_notifications", n)}
          errors={errors}
        />
      </div>
    </div>
  );
}
