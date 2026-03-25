import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MetadataForm } from "@/components/MetadataForm";
import { ConfiguredReportForm } from "@/components/ConfiguredReportForm";
import { JsonPreview, buildJson } from "@/components/JsonPreview";
import { localToUtc } from "@/lib/time";
import { validateDefinition, errorsFor, type ValidationErrors } from "@/lib/validation";
import { MermaidPreview } from "@/components/MermaidPreview";
import { FilePlus, FolderOpen, Pencil, Code, ShieldCheck, Download, Plus, GitBranch } from "lucide-react";
import type { ReportDefinition, ConfiguredReport } from "@/types";

function downloadJson(definition: ReportDefinition) {
  const json = JSON.stringify(buildJson(definition), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = definition.id ? `${definition.id}.json` : "report.json";
  a.click();
  URL.revokeObjectURL(url);
}

function emptyReport(): ConfiguredReport {
  return {
    enabled: true,
    database: "METADB",
    sql_file: "",
    schedule: { type: "daily", time: localToUtc("09:00") },
    params: null,
    outputs: [{ service: "box", location: "", filename: "", file_extension: "xlsx" }],
    email_notifications: null,
  };
}

const initialDefinition: ReportDefinition = {
  id: "",
  enabled: true,
  metadata: { name: "", description: "", owner: "", tags: [] },
  reports: [emptyReport()],
};

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}

export function RequiredLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      <span className="text-destructive ml-0.5">*</span>
    </Label>
  );
}

function LandingScreen({ onNew, onLoad }: { onNew: () => void; onLoad: (def: ReportDefinition) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const def: ReportDefinition = {
          id: parsed.id ?? "",
          enabled: parsed.enabled ?? true,
          metadata: {
            name: parsed.metadata?.name ?? "",
            description: parsed.metadata?.description ?? "",
            owner: parsed.metadata?.owner ?? "",
            tags: parsed.metadata?.tags ?? [],
          },
          reports: (parsed.reports ?? []).map((r: any) => ({
            name: r.name,
            enabled: r.enabled ?? true,
            database: r.database ?? "METADB",
            sql_file: r.sql_file ?? "",
            schedule: r.schedule ?? { type: "daily", time: "09:00" },
            params: r.params ?? null,
            outputs: (r.outputs ?? []).map((o: any) => ({
              service: o.service ?? "box",
              location: o.location ?? "",
              filename: o.filename ?? "",
              file_extension: o.file_extension ?? "xlsx",
              ssm_key: o.ssm_key ?? null,
            })),
            email_notifications: r.email_notifications
              ? r.email_notifications.map((n: any) => ({
                  recipients: n.recipients ?? [],
                  message: n.message ?? "",
                  notify_on: n.notify_on ?? "all",
                }))
              : null,
          })),
        };
        if (def.reports.length === 0) {
          def.reports = [emptyReport()];
        }
        onLoad(def);
      } catch {
        alert("Failed to parse JSON file. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            CUL Automation
          </h1>
          <h2 className="text-2xl font-bold tracking-tight">
            Report Runner Config Builder
          </h2>
        </div>
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={onNew}>
            <FilePlus className="size-5" />
            Create New
          </Button>
          <Button size="lg" variant="outline" className="rounded-md" onClick={() => fileRef.current?.click()}>
            <FolderOpen className="size-5" />
            Open Existing
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  );
}

function Editor({ definition, setDefinition }: { definition: ReportDefinition; setDefinition: (d: ReportDefinition) => void }) {
  const [errors, setErrors] = useState<ValidationErrors | null>(null);
  const [dirty, setDirty] = useState(false);

  const hasErrors = errors !== null && Object.keys(errors).length > 0;
  const isValid = errors !== null && Object.keys(errors).length === 0 && !dirty;

  const runValidation = () => {
    const result = validateDefinition(definition);
    setErrors(result.errors);
    setDirty(false);
  };

  const markDirtyAndSet = (next: ReportDefinition) => {
    if (errors !== null) setDirty(true);
    setDefinition(next);
  };

  const updateReport = (index: number, report: ConfiguredReport) => {
    const updated = definition.reports.map((r, i) =>
      i === index ? report : r
    );
    markDirtyAndSet({ ...definition, reports: updated });
  };

  const addReport = () => {
    markDirtyAndSet({
      ...definition,
      reports: [...definition.reports, emptyReport()],
    });
  };

  const removeReport = (index: number) => {
    markDirtyAndSet({
      ...definition,
      reports: definition.reports.filter((_, i) => i !== index),
    });
  };

  const errorList = errors ? Object.values(errors) : [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            CUL Automation Report Runner Config Builder
          </h1>
          <p className="mt-1">
            Generate a report.json file that controls the scheduling of your reports.
          </p>
        </div>

        <Tabs defaultValue="editor">
          <div className="flex items-center justify-between">
            <TabsList className="h-12 p-1">
              <TabsTrigger value="editor" className="px-6 py-2 text-base"><Pencil className="size-4" /> Editor</TabsTrigger>
              <TabsTrigger value="flow" className="px-6 py-2 text-base"><GitBranch className="size-4" /> Flow</TabsTrigger>
              <TabsTrigger value="json" className="px-6 py-2 text-base"><Code className="size-4" /> JSON</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3">
              {isValid && (
                <Badge className="px-3 py-1 text-sm h-auto bg-green-600 text-white">
                  <ShieldCheck className="size-4" />
                  Valid
                </Badge>
              )}
              {hasErrors && (
                <Badge
                  variant="destructive"
                  className="px-3 py-1 text-sm h-auto"
                >
                  {`${errorList.length} issue${errorList.length === 1 ? "" : "s"}`}
                </Badge>
              )}
              {!isValid && (
                <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={runValidation}>
                  <ShieldCheck className="size-4" />
                  {hasErrors || dirty ? "Re-validate" : "Validate"}
                </Button>
              )}
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                onClick={() => downloadJson(definition)}
                disabled={hasErrors}
              >
                <Download className="size-4" />
                Download Config
              </Button>
            </div>
          </div>

          <TabsContent value="editor" className="space-y-6 mt-6">
            {hasErrors && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <h3 className="text-base font-semibold text-destructive mb-3">
                    Validation Issues ({errorList.length})
                  </h3>
                  {(() => {
                    const general: string[] = [];
                    const byReport: Record<number, string[]> = {};
                    for (const [key, msg] of Object.entries(errors!)) {
                      const match = key.match(/^reports\.(\d+)\./);
                      if (match) {
                        const idx = parseInt(match[1], 10);
                        (byReport[idx] ??= []).push(msg);
                      } else {
                        general.push(msg);
                      }
                    }
                    return (
                      <div className="space-y-3">
                        {general.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-1">General</p>
                            <ul className="space-y-1">
                              {general.map((err, i) => (
                                <li key={i} className="bg-destructive/10 text-destructive rounded px-3 py-2 text-sm">{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Object.entries(byReport).map(([idx, msgs]) => {
                          const report = definition.reports[parseInt(idx, 10)];
                          const label = report?.name || `Report ${parseInt(idx, 10) + 1}`;
                          return (
                            <div key={idx}>
                              <p className="text-sm font-semibold mb-1">{label}</p>
                              <ul className="space-y-1">
                                {msgs.map((err, i) => (
                                  <li key={i} className="bg-destructive/10 text-destructive rounded px-3 py-2 text-sm">{err}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Report Definition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="space-y-2 w-1/2">
                    <RequiredLabel htmlFor="report-id">ID</RequiredLabel>
                    <Input
                      id="report-id"
                      value={definition.id}
                      onChange={(e) =>
                        markDirtyAndSet({ ...definition, id: e.target.value })
                      }
                      placeholder="MCR222"
                      className={errors?.["id"] ? "border-destructive" : ""}
                    />
                    <FieldError error={errors?.["id"]} />
                  </div>
                  <div className="flex items-center gap-3 mt-8">
                    <Switch
                      checked={definition.enabled}
                      onCheckedChange={(checked) =>
                        markDirtyAndSet({ ...definition, enabled: checked })
                      }
                    />
                    <Label>
                      {definition.enabled ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optional Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <MetadataForm
                  metadata={definition.metadata}
                  onChange={(metadata) =>
                    markDirtyAndSet({ ...definition, metadata })
                  }
                />
              </CardContent>
            </Card>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Configured Reports</h2>
                <Button variant="outline" onClick={addReport}>
                  <Plus className="size-4" />
                  Add Report
                </Button>
              </div>

              {definition.reports.map((report, index) => (
                <ConfiguredReportForm
                  key={index}
                  report={report}
                  index={index}
                  canRemove={definition.reports.length > 1}
                  onChange={(r) => updateReport(index, r)}
                  onRemove={() => removeReport(index)}
                  errors={errors ? errorsFor(errors, `reports.${index}`) : null}
                  definitionId={definition.id}
                  metadataName={definition.metadata.name}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="flow" className="mt-6">
            <MermaidPreview definition={definition} />
          </TabsContent>

          <TabsContent value="json" className="mt-6">
            <JsonPreview definition={definition} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function App() {
  const [definition, setDefinition] = useState<ReportDefinition | null>(null);

  if (!definition) {
    return (
      <LandingScreen
        onNew={() => setDefinition(initialDefinition)}
        onLoad={(def) => setDefinition(def)}
      />
    );
  }

  return <Editor definition={definition} setDefinition={setDefinition} />;
}

export default App;
