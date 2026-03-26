import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { RequiredLabel, FieldError } from "@/App";
import type { OutputDestination } from "@/types";
import type { ValidationErrors } from "@/lib/validation";

function previewFilename(template: string, definitionId: string, reportName: string, metadataName: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const currentDatetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
  return template
    .replace(/\{id\}/g, definitionId || "unnamed")
    .replace(/\{current_datetime\}/g, currentDatetime)
    .replace(/\{workflow_id\}/g, "a1b2c3d4")
    .replace(/\{name\}/g, reportName || "unnamed")
    .replace(/\{metadata_name\}/g, metadataName || "unnamed");
}

interface Props {
  outputs: OutputDestination[];
  onChange: (outputs: OutputDestination[]) => void;
  errors: ValidationErrors | null;
  definitionId: string;
  reportName: string;
  metadataName: string;
}

const TEMPLATE_VARS = ["id", "current_datetime", "metadata_name", "name", "workflow_id"];

function FilenameInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    const cursor = e.target.selectionStart ?? v.length;
    const beforeCursor = v.slice(0, cursor);
    setShowSuggestions(beforeCursor.endsWith("{"));
  };

  const insertVar = (varName: string) => {
    const input = inputRef.current;
    if (!input) return;
    const cursor = input.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const newValue = beforeCursor.slice(0, -1) + `{${varName}}` + afterCursor;
    onChange(newValue);
    setShowSuggestions(false);
    requestAnimationFrame(() => {
      const newCursor = beforeCursor.length - 1 + varName.length + 2;
      input.focus();
      input.setSelectionRange(newCursor, newCursor);
    });
  };

  return (
    <div className="space-y-2 relative">
      <RequiredLabel>Filename</RequiredLabel>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="report_{current_datetime}"
        className={error ? "border-destructive" : ""}
      />
      <FieldError error={error} />
      {showSuggestions && (
        <ul className="absolute z-10 top-full mt-1 w-full border rounded-md bg-background shadow-md">
          {TEMPLATE_VARS.map((v) => (
            <li
              key={v}
              className="px-3 py-2 cursor-pointer hover:bg-muted font-mono text-sm"
              onMouseDown={() => insertVar(v)}
            >
              {`{${v}}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OutputForm({ outputs, onChange, errors, definitionId, reportName, metadataName }: Props) {
  const update = (index: number, field: keyof OutputDestination, value: string | null) => {
    if (value === null) return;
    const updated = outputs.map((o, i) =>
      i === index ? { ...o, [field]: value } : o
    );
    onChange(updated);
  };

  const remove = (index: number) =>
    onChange(outputs.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      {outputs.map((output, index) => {
        const locationErr = errors?.[`outputs.${index}.location`];
        const filenameErr = errors?.[`outputs.${index}.filename`];

        return (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold font-mono">
                {output.filename
                  ? `${previewFilename(output.filename, definitionId, reportName, metadataName)}.${output.file_extension}`
                  : `Output ${index + 1}`}
              </span>
              {outputs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={output.service}
                  onValueChange={(v) => update(index, "service", v)}
                >
                  <SelectTrigger>
                    <span>{output.service === "box" ? "Box" : "S3"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="s3">S3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <RequiredLabel>{output.service === "box" ? "Folder ID" : "Bucket/Prefix"}</RequiredLabel>
                <Input
                  value={output.location}
                  onChange={(e) => update(index, "location", e.target.value)}
                  placeholder={
                    output.service === "box" ? "372744092795" : "bucket/prefix"
                  }
                  className={locationErr ? "border-destructive" : ""}
                />
                <FieldError error={locationErr} />
              </div>
              <FilenameInput
                value={output.filename}
                onChange={(v) => update(index, "filename", v)}
                error={filenameErr}
              />
              <div className="space-y-2">
                <Label>Extension</Label>
                <Select
                  value={output.file_extension}
                  onValueChange={(v) => update(index, "file_extension", v)}
                >
                  <SelectTrigger>
                    <span>.{output.file_extension}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">.xlsx</SelectItem>
                    <SelectItem value="xls">.xls</SelectItem>
                    <SelectItem value="csv">.csv</SelectItem>
                    <SelectItem value="tsv">.tsv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {output.service === "s3" && (
              <div className="space-y-2">
                <Label>SSM Key <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={output.ssm_key || ""}
                  onChange={(e) => update(index, "ssm_key", e.target.value || null)}
                  placeholder="/path/to/ssm/secret"
                  className="font-mono"
                />
                <p className="text-sm text-black">
                  Only required if the S3 bucket is not accessible by the default automation IAM user.
                </p>
              </div>
            )}
          </div>
        );
      })}
      <details className="text-sm text-black">
        <summary className="cursor-pointer font-medium text-base">
          Filename variables
        </summary>
        <ul className="mt-2 ml-4 list-disc space-y-1">
          <li><code className="font-mono font-semibold">{"{id}"}</code> — Report definition ID</li>
          <li><code className="font-mono font-semibold">{"{current_datetime}"}</code> — Timestamp when the report runs, formatted as <code className="font-mono">YYYY-MM-DD_HH_mm</code> (e.g. <code className="font-mono">2026-03-24_17_25</code>)</li>
          <li><code className="font-mono font-semibold">{"{metadata_name}"}</code> — Name from the report definition metadata</li>
          <li><code className="font-mono font-semibold">{"{name}"}</code> — Name of this configured report</li>
          <li><code className="font-mono font-semibold">{"{workflow_id}"}</code> — Unique identifier assigned to each workflow execution, useful for tracing and deduplication</li>
        </ul>
      </details>
    </div>
  );
}
