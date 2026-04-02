import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATE_VARS = [
  { value: "id", description: "Report definition ID" },
  { value: "current_datetime", description: "Timestamp when the report runs" },
  { value: "metadata_name", description: "Name from definition metadata" },
  { value: "name", description: "Name of the configured report" },
  { value: "workflow_id", description: "Unique workflow execution ID" },
  { value: "error_msg", description: "Error message if the report failed" },
  { value: "box_urls", description: "Box URLs for uploaded report files" },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

export function TemplateInput({
  value,
  onChange,
  placeholder,
  className,
  multiline = false,
  rows,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const [insertPos, setInsertPos] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = TEMPLATE_VARS.filter((v) =>
    v.value.toLowerCase().includes(filter.toLowerCase())
  );

  const close = useCallback(() => {
    setShowDropdown(false);
    setFilter("");
    setInsertPos(null);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown, close]);

  const insertVariable = (varName: string) => {
    const el = inputRef.current;
    if (!el || insertPos === null) return;

    // Replace from the `{` that triggered the dropdown through current cursor
    const before = value.slice(0, insertPos);
    const after = value.slice(el.selectionStart ?? insertPos);
    const inserted = `{${varName}}`;
    const newValue = before + inserted + after;
    onChange(newValue);
    close();

    // Restore cursor position after React re-render
    const cursorPos = insertPos + inserted.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertVariable(filtered[highlightIndex].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart ?? newValue.length;

    // Find the last unmatched `{` before the cursor
    const beforeCursor = newValue.slice(0, cursorPos);
    const lastOpen = beforeCursor.lastIndexOf("{");

    if (lastOpen !== -1 && !beforeCursor.slice(lastOpen).includes("}")) {
      const typed = beforeCursor.slice(lastOpen + 1);
      setFilter(typed);
      setInsertPos(lastOpen);
      setHighlightIndex(0);
      setShowDropdown(true);
    } else {
      close();
    }
  };

  const sharedProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    className,
  };

  return (
    <div className="relative">
      {multiline ? (
        <Textarea {...sharedProps} rows={rows} />
      ) : (
        <Input {...sharedProps} />
      )}
      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {filtered.map((v, i) => (
            <button
              key={v.value}
              type="button"
              className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-sm text-left cursor-default ${
                i === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                insertVariable(v.value);
              }}
            >
              <code className="font-mono text-xs">{`{${v.value}}`}</code>
              <span className="text-xs text-muted-foreground truncate">
                {v.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Resolve template variables for preview */
export function previewTemplate(
  template: string,
  context: {
    id?: string;
    name?: string;
    metadataName?: string;
  }
): string {
  if (!template) return "";
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
  return template
    .replace(/\{id\}/g, context.id || "my-report")
    .replace(/\{current_datetime\}/g, dt)
    .replace(/\{metadata_name\}/g, context.metadataName || "My Report")
    .replace(/\{name\}/g, context.name || "report-1")
    .replace(/\{workflow_id\}/g, "a1b2c3d4")
    .replace(/\{error_msg\}/g, "N/A")
    .replace(/\{box_urls\}/g, "https://cornell.box.com/s/abc123");
}
