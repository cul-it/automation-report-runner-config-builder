import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ParamValueInput, isVariableExpression, resolvePreview } from "./ParamValueInput";
import { Trash2, CalendarClock, CaseUpper } from "lucide-react";
import { useState, useEffect } from "react";

type ParamEntry = { value: string; description?: string };

interface Props {
  title?: string;
  params: Record<string, ParamEntry> | null;
  onChange: (params: Record<string, ParamEntry> | null) => void;
  highlightedParam?: string | null;
  descriptions?: Record<string, string>;
}

interface ParamRow {
  key: string;
  value: string;
  description: string;
  variableMode: boolean;
}

function toRows(params: Record<string, ParamEntry> | null): ParamRow[] {
  if (!params) return [];
  return Object.entries(params).map(([key, entry]) => ({
    key,
    value: entry.value,
    description: entry.description ?? "",
    variableMode: isVariableExpression(entry.value),
  }));
}

function toRecord(rows: ParamRow[]): Record<string, ParamEntry> | null {
  if (rows.length === 0) return null;
  const record: Record<string, ParamEntry> = {};
  for (const row of rows) {
    if (row.key.trim()) {
      const entry: ParamEntry = { value: row.value };
      if (row.description.trim()) entry.description = row.description;
      record[row.key] = entry;
    }
  }
  return Object.keys(record).length > 0 ? record : null;
}

export function ParamsForm({ title, params, onChange, highlightedParam, descriptions }: Props) {
  const [rows, setRows] = useState<ParamRow[]>(() => toRows(params));

  // Sync from parent when params change externally (undo/redo, import)
  useEffect(() => {
    setRows(toRows(params));
  }, [params]);

  const commitRows = (updated: ParamRow[]) => {
    setRows(updated);
    onChange(toRecord(updated));
  };

  const add = () => {
    commitRows([...rows, { key: "", value: "", description: "", variableMode: false }]);
  };

  const updateRow = (index: number, field: "key" | "value" | "description", val: string) => {
    const updated = rows.map((r, i) => i === index ? { ...r, [field]: val } : r);
    setRows(updated);
    onChange(toRecord(updated));
  };

  const toggleMode = (index: number) => {
    const row = rows[index];
    const newMode = !row.variableMode;
    const newValue = newMode ? "{{today}}" : "";
    const updated = rows.map((r, i) =>
      i === index ? { ...r, variableMode: newMode, value: newValue } : r
    );
    setRows(updated);
    onChange(toRecord(updated));
  };

  const remove = (index: number) => {
    commitRows(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex justify-between items-center">
          <h4 className="text-base font-semibold">{title}</h4>
          <Button variant="outline" size="sm" onClick={add}>
            + Add Parameter
          </Button>
        </div>
      )}
      {rows.map((row, index) => (
        <div key={index} className="space-y-1">
          <div
            className={`flex gap-2 items-center rounded-md px-1 -mx-1 transition-colors ${
              highlightedParam && row.key === highlightedParam
                ? "bg-purple-100 ring-1 ring-purple-300"
                : ""
            }`}
          >
            <Input
              value={row.key}
              onChange={(e) => updateRow(index, "key", e.target.value)}
              placeholder="param_name"
              className="font-mono flex-1 min-w-0"
            />
            <ParamValueInput
              value={row.value}
              onChange={(val) => updateRow(index, "value", val)}
              variableMode={row.variableMode}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleMode(index)}
              className="shrink-0"
              title={row.variableMode ? "Switch to static value" : "Switch to dynamic date"}
            >
              {row.variableMode ? (
                <CaseUpper className="size-4.5" />
              ) : (
                <CalendarClock className="size-4.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="text-destructive hover:text-destructive shrink-0"
            >
              <Trash2 className="size-4.5" />
            </Button>
          </div>
          {row.variableMode && (
            <p className="text-xs font-mono pl-1">
              preview: {resolvePreview(row.value) ?? "—"}
            </p>
          )}
          <Input
            value={row.description || descriptions?.[row.key] || ""}
            onChange={(e) => updateRow(index, "description", e.target.value)}
            placeholder="description (optional)"
            className="text-xs h-6"
          />
        </div>
      ))}
      {!title && (
        <Button variant="outline" size="sm" onClick={add}>
          + Add Parameter
        </Button>
      )}
      <details className="text-sm text-black">
        <summary className="cursor-pointer font-medium text-base">
          How parameters work
        </summary>
        <div className="mt-2 space-y-3">
          <p>
            Parameters define values that get substituted into your SQL query at runtime. Each parameter is a key-value pair where the key matches a <code className="font-mono">{"{{"}variable{"}}"}</code> in your query.
          </p>
          <p>
            Values can be static (set to a string literal) or can be dynamic date expressions. Toggle between modes using the <span className="inline-flex items-center align-text-bottom"><CalendarClock className="size-3.5" /></span> and <span className="inline-flex items-center align-text-bottom"><CaseUpper className="size-3.5" /></span> button.
          </p>
        </div>
      </details>
    </div>
  );
}
