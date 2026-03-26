import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  title?: string;
  params: Record<string, string> | null;
  onChange: (params: Record<string, string> | null) => void;
}

interface ParamRow {
  key: string;
  value: string;
}

function toRows(params: Record<string, string> | null): ParamRow[] {
  if (!params) return [];
  return Object.entries(params).map(([key, value]) => ({ key, value }));
}

function toRecord(rows: ParamRow[]): Record<string, string> | null {
  if (rows.length === 0) return null;
  const record: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.trim()) record[row.key] = row.value;
  }
  return Object.keys(record).length > 0 ? record : null;
}

export function ParamsForm({ title, params, onChange }: Props) {
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
    commitRows([...rows, { key: "", value: "" }]);
  };

  const updateRow = (index: number, field: "key" | "value", val: string) => {
    const updated = rows.map((r, i) => i === index ? { ...r, [field]: val } : r);
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
        <div key={index} className="flex gap-2 items-center">
          <Input
            value={row.key}
            onChange={(e) => updateRow(index, "key", e.target.value)}
            placeholder="param_name"
            className="font-mono"
          />
          <Input
            value={row.value}
            onChange={(e) => updateRow(index, "value", e.target.value)}
            placeholder="value"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => remove(index)}
            className="text-destructive hover:text-destructive shrink-0"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {!title && (
        <Button variant="outline" size="sm" onClick={add}>
          + Add Parameter
        </Button>
      )}
      <details className="text-sm text-black">
        <summary className="cursor-pointer font-medium text-base">
          How SQL parameters work
        </summary>
        <div className="mt-2 space-y-2">
          <p>
            Define key-value pairs here. They are passed to the SQL query at runtime via psycopg's safe parameterized execution — values are never interpolated directly into the SQL string.
          </p>
          <p>
            In your SQL file, reference parameters using the <code className="font-mono">%(<i>key</i>)s</code> syntax:
          </p>
          <pre className="bg-muted rounded p-3 font-mono text-sm overflow-x-auto">
{`SELECT * FROM reports
WHERE created_at >= %(start_date)s
  AND tenant_id = %(tenant)s`}
          </pre>
          <p>
            All values are stored as strings in the JSON config. psycopg handles type coercion automatically based on the column types in the database.
          </p>
        </div>
      </details>
    </div>
  );
}
