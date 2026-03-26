import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  params: Record<string, string> | null;
  onChange: (params: Record<string, string> | null) => void;
}

export function ParamsForm({ params, onChange }: Props) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = params ? Object.entries(params) : [];

  const add = () => {
    const key = newKey.trim();
    if (!key) return;
    onChange({ ...params, [key]: newValue });
    setNewKey("");
    setNewValue("");
  };

  const updateKey = (oldKey: string, newKeyName: string) => {
    if (!params) return;
    const updated: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      updated[k === oldKey ? newKeyName : k] = v;
    }
    onChange(updated);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...params, [key]: value });
  };

  const remove = (key: string) => {
    if (!params) return;
    const { [key]: _, ...rest } = params;
    onChange(Object.keys(rest).length > 0 ? rest : null);
  };

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <Input
                value={key}
                onChange={(e) => updateKey(key, e.target.value)}
                placeholder="param_name"
                className="font-mono"
              />
              <Input
                value={value}
                onChange={(e) => updateValue(key, e.target.value)}
                placeholder="value"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(key)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="space-y-1 flex-1">
          <Label className="text-xs">Key</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="start_date"
            className="font-mono"
          />
        </div>
        <div className="space-y-1 flex-1">
          <Label className="text-xs">Value</Label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="default value"
          />
        </div>
        <Button variant="outline" size="sm" onClick={add} className="shrink-0">
          + Add
        </Button>
      </div>
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
