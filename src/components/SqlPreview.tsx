import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { basicSetup } from "codemirror";
import { EditorState, RangeSetBuilder, Compartment } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate, Decoration, type DecorationSet } from "@codemirror/view";
import { sql } from "@codemirror/lang-sql";
import { Code, ChevronDown, ChevronUp, TriangleAlert, Download, X, Upload } from "lucide-react";

const PARAM_REGEX = /\{\{(\w+)\}\}/g;

function extractParams(sqlText: string): string[] {
  const matches = new Set<string>();
  for (const match of sqlText.matchAll(PARAM_REGEX)) {
    matches.add(match[1]);
  }
  return [...matches];
}

/** Detect the WITH parameters AS (SELECT ...) CTE pattern */
const CTE_REGEX =
  /WITH\s+parameters\s+AS\s*\(\s*SELECT\s+([\s\S]*?)\)\s*(?:,\s*|\n)/i;

interface CteConversion {
  convertedSql: string;
  defaults: Record<string, string>;
  descriptions: Record<string, string>;
}

function parseCteBody(cteBody: string): {
  defaults: Record<string, string>;
  descriptions: Record<string, string>;
} {
  const defaults: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  const lines = cteBody.split("\n");

  let blockComment = "";
  let inBlockComment = false;
  let blockCommentLines: string[] = [];
  let lastParamName: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // --- Multi-line block comment handling ---

    // Opening a block comment (may also close on same line)
    if (!inBlockComment && trimmed.includes("/*")) {
      const openIdx = trimmed.indexOf("/*");
      const afterOpen = trimmed.slice(openIdx + 2);

      if (afterOpen.includes("*/")) {
        // Single-line block comment: /* ... */
        const content = afterOpen.slice(0, afterOpen.indexOf("*/")).trim();
        // Replace leading * from formatted comments
        blockComment = content.replace(/^\*\s*/, "").trim();
        blockCommentLines = [blockComment];
        lastParamName = null;
      } else {
        // Start of multi-line block comment
        inBlockComment = true;
        const content = afterOpen.replace(/^\*?\s*/, "").trim();
        blockCommentLines = content ? [content] : [];
      }

      // Check if the same line also has a param definition after the comment
      const afterComment = trimmed.includes("*/")
        ? trimmed.slice(trimmed.indexOf("*/") + 2)
        : "";
      const paramOnSameLine = afterComment.match(
        /['']((?:[^''])*)['']\s*(?:::[\w\s()]+)?\s*AS\s+(\w+)/i
      );
      if (paramOnSameLine) {
        const paramName = paramOnSameLine[2];
        defaults[paramName] = paramOnSameLine[1];
        lastParamName = paramName;

        const parts: string[] = [];
        if (blockComment) parts.push(blockComment);
        const inlineMatch = afterComment.match(/--\s*(.+)$/);
        if (inlineMatch) parts.push(inlineMatch[1].trim());
        if (parts.length > 0) descriptions[paramName] = parts.join(" — ");
      }
      continue;
    }

    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        // Closing line of multi-line block comment
        const content = trimmed.slice(0, trimmed.indexOf("*/")).replace(/^\*\s*/, "").trim();
        if (content) blockCommentLines.push(content);
        blockComment = blockCommentLines.join(" ").trim();
        inBlockComment = false;
        lastParamName = null;
      } else {
        // Continuation line inside block comment — strip leading * or whitespace
        const content = trimmed.replace(/^\*\s*/, "").trim();
        if (content) blockCommentLines.push(content);
      }
      continue;
    }

    // --- Dash-style section headers: ---- text ---- or -- SECTION NAME ---
    const sectionMatch = trimmed.match(/^--+\s*(.+?)\s*-*$/);
    if (sectionMatch && !trimmed.match(/['']\s*(?:::[\w\s()]+)?\s*AS\s+/i)) {
      // This is a standalone comment line (not a param line with inline comment)
      // Check if it looks like a section header vs a continuation comment
      const content = sectionMatch[1].trim();

      if (lastParamName && !content.match(/^[A-Z\s]{4,}$/) && !content.startsWith("--")) {
        // Continuation comment for the previous param
        if (descriptions[lastParamName]) {
          descriptions[lastParamName] += " " + content;
        } else {
          descriptions[lastParamName] = content;
        }
      } else {
        // Section header — treat as a new block comment
        blockComment = content;
        lastParamName = null;
      }
      continue;
    }

    // --- Param definition line ---
    // Handles: 'value'::type AS name, 'value' AS name (no cast), ''AS name (no space)
    const paramMatch = trimmed.match(
      /['']((?:[^''])*)['']\s*(?:::[\w\s()]+)?\s*AS\s+(\w+)/i
    );
    if (paramMatch) {
      const paramName = paramMatch[2];
      defaults[paramName] = paramMatch[1];
      lastParamName = paramName;

      const parts: string[] = [];
      if (blockComment) parts.push(blockComment);

      const inlineMatch = trimmed.match(/--\s*(.+)$/);
      if (inlineMatch) parts.push(inlineMatch[1].trim());

      if (parts.length > 0) {
        descriptions[paramName] = parts.join(" — ");
      }

      // Don't clear blockComment — it applies to all params in the group
      continue;
    }

    // --- Bare continuation comment line (not a section header, not a param) ---
    const bareInline = trimmed.match(/^--\s*(.+)$/);
    if (bareInline && lastParamName) {
      const content = bareInline[1].trim();
      if (descriptions[lastParamName]) {
        descriptions[lastParamName] += " " + content;
      } else {
        descriptions[lastParamName] = content;
      }
    }
  }

  return { defaults, descriptions };
}

function convertCteParams(sqlText: string): CteConversion | null {
  const cteMatch = sqlText.match(CTE_REGEX);
  if (!cteMatch) return null;

  const { defaults, descriptions } = parseCteBody(cteMatch[1]);

  // Replace literal values in the CTE with {{param_name}} placeholders
  let converted = sqlText;
  for (const [paramName, defaultValue] of Object.entries(defaults)) {
    // Match 'value'[::type] AS param_name — replace only the quoted value
    const pattern = new RegExp(
      `([''])${defaultValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1(\\s*(?:::[\\w\\s()]+)?\\s*AS\\s+${paramName})`,
      "i"
    );
    converted = converted.replace(pattern, `'{{${paramName}}}'$2`);
  }

  return { convertedSql: converted, defaults, descriptions };
}

export { convertCteParams, hasCtePattern, extractParams };

function hasCtePattern(sqlText: string): boolean {
  return CTE_REGEX.test(sqlText);
}

/** Build decorations for all {{param}} occurrences */
const paramMark = Decoration.mark({ class: "cm-sql-param" });

function buildParamDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc.toString();
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = regex.exec(doc)) !== null) {
    builder.add(match.index, match.index + match[0].length, paramMark);
  }
  return builder.finish();
}

function paramHighlightPlugin(onHover: (param: string | null) => void) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildParamDecorations(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildParamDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        mouseover(event: MouseEvent, view: EditorView) {
          const target = event.target as HTMLElement;
          if (target.closest(".cm-sql-param")) {
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos !== null) {
              const doc = view.state.doc.toString();
              const regex = /\{\{(\w+)\}\}/g;
              let match;
              while ((match = regex.exec(doc)) !== null) {
                if (pos >= match.index && pos <= match.index + match[0].length) {
                  onHover(match[1]);
                  return;
                }
              }
            }
          }
          onHover(null);
        },
        mouseout(event: MouseEvent) {
          const related = event.relatedTarget as HTMLElement | null;
          if (!related?.closest(".cm-sql-param")) {
            onHover(null);
          }
        },
      },
    }
  );
}

const paramTheme = EditorView.baseTheme({
  ".cm-sql-param": {
    backgroundColor: "hsl(250 80% 95%)",
    borderRadius: "3px",
    padding: "0 2px",
    cursor: "pointer",
    transition: "background-color 150ms",
  },
  ".cm-sql-param:hover": {
    backgroundColor: "hsl(250 80% 85%)",
  },
});

interface Props {
  params: Record<string, { value: string; description?: string }> | null;
  sqlFile: string;
  onParamsDetected: (
    paramKeys: string[],
    defaults?: Record<string, string>,
    descriptions?: Record<string, string>
  ) => void;
  onHoverParam?: (param: string | null) => void;
  onClear?: () => void;
}

export function SqlPreview({ params, sqlFile, onParamsDetected, onHoverParam, onClear }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readOnlyComp = useRef(new Compartment());
  const [open, setOpen] = useState(false);
  const [detectedParams, setDetectedParams] = useState<string[]>([]);
  const [converted, setConverted] = useState(false);
  const prevParamKeysRef = useRef<string[]>([]);
  const isRenamingRef = useRef(false);

  const onParamsDetectedRef = useRef(onParamsDetected);
  onParamsDetectedRef.current = onParamsDetected;

  const onHoverParamRef = useRef(onHoverParam);
  onHoverParamRef.current = onHoverParam;

  const isConvertingRef = useRef(false);

  const handleDocChange = useCallback((sqlText: string) => {
    // Skip updates during a rename or auto-convert dispatch
    if (isRenamingRef.current || isConvertingRef.current) return;

    // Auto-convert CTE params on paste / file load
    if (hasCtePattern(sqlText)) {
      const result = convertCteParams(sqlText);
      if (result && result.convertedSql !== sqlText) {
        const view = viewRef.current;
        if (view) {
          isConvertingRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: result.convertedSql },
          });
          view.dispatch({
            effects: readOnlyComp.current.reconfigure(EditorState.readOnly.of(true)),
          });
          isConvertingRef.current = false;
          const paramKeys = extractParams(result.convertedSql);
          setDetectedParams(paramKeys);
          prevParamKeysRef.current = paramKeys;
          setConverted(true);
          onParamsDetectedRef.current(paramKeys, result.defaults, result.descriptions);
          return;
        }
      }
    }

    const found = extractParams(sqlText);
    setDetectedParams(found);
    onParamsDetectedRef.current(found);
  }, []);

  // Sync param renames from form → SQL (only when converted/read-only)
  useEffect(() => {
    if (!converted || !viewRef.current) return;
    const currentKeys = params ? Object.keys(params) : [];
    const prevKeys = prevParamKeysRef.current;

    if (prevKeys.length > 0 && prevKeys.length === currentKeys.length) {
      const removed = prevKeys.filter((k) => !currentKeys.includes(k));
      const added = currentKeys.filter((k) => !prevKeys.includes(k));

      if (removed.length === 1 && added.length === 1) {
        const oldName = removed[0];
        const newName = added[0];
        const view = viewRef.current;
        const doc = view.state.doc.toString();
        const updated = doc.replace(
          new RegExp(`\\{\\{${oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`, "g"),
          `{{${newName}}}`
        );
        if (updated !== doc) {
          isRenamingRef.current = true;
          view.dispatch({
            changes: { from: 0, to: doc.length, insert: updated },
          });
          isRenamingRef.current = false;
          setDetectedParams(extractParams(updated));
        }
      }
    }

    prevParamKeysRef.current = currentKeys;
  }, [params, converted]);

  useEffect(() => {
    if (!open || !editorRef.current) return;
    if (viewRef.current) return;

    const state = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        sql(),
        paramHighlightPlugin((param) => onHoverParamRef.current?.(param)),
        paramTheme,
        readOnlyComp.current.of(EditorState.readOnly.of(false)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleDocChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            fontSize: "15px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          },
          "&.cm-focused": {
            outline: "none",
            borderColor: "hsl(var(--ring))",
            boxShadow: "0 0 0 3px hsl(var(--ring) / 0.5)",
          },
          ".cm-scroller": {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          },
          ".cm-content": {
            minHeight: "120px",
          },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [open, handleDocChange]);

  const handleClear = () => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readOnlyComp.current.reconfigure(EditorState.readOnly.of(false)),
    });
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "" },
    });

    setConverted(false);

    setDetectedParams([]);
    prevParamKeysRef.current = [];
    onClear?.();
  };

  const handleSave = () => {
    const view = viewRef.current;
    if (!view) return;
    const content = view.state.doc.toString();
    const blob = new Blob([content], { type: "application/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sqlFile || "";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewRef.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    };
    reader.readAsText(file);
    // Reset so the same file can be loaded again
    e.target.value = "";
  };

  const currentParamKeys = params ? Object.keys(params) : [];
  const rawMissing = detectedParams.filter((p) => !currentParamKeys.includes(p));
  const rawExtra = currentParamKeys.filter((p) => !detectedParams.includes(p));
  // If exactly one param was added and one removed, it's a pending rename — suppress flicker
  const isPendingRename = converted && rawMissing.length === 1 && rawExtra.length === 1;
  const missing = isPendingRename ? [] : rawMissing;
  const extra = isPendingRename ? [] : rawExtra;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Code className="size-4.5" />
        Parse existing SQL to detect params
        {open ? (
          <ChevronUp className="size-4.5" />
        ) : (
          <ChevronDown className="size-4.5" />
        )}
      </button>

      {open && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <TriangleAlert className="size-4.5 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-sm text-amber-800">
              This SQL is not saved in the config. It is provided only to assist with detecting and converting parameters.
            </span>
          </div>
          {converted && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
              <span className="text-sm text-green-800">
                Conversion complete. Save the converted SQL to your report repository.
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Download className="size-4.5 mr-1" />
                  Save SQL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <X className="size-4.5 mr-1" />
                  Clear Query
                </Button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql,.txt"
            onChange={handleLoadFile}
            className="hidden"
          />
          {!converted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4.5 mr-1" />
              Load SQL File
            </Button>
          )}
          <div ref={editorRef} />


          {detectedParams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center text-sm">
              <span className="text-muted-foreground">Detected:</span>
              {detectedParams.map((p) => (
                <Badge
                  key={p}
                  variant={missing.includes(p) ? "destructive" : "secondary"}
                  className="font-mono text-xs"
                >
                  {p}
                </Badge>
              ))}
            </div>
          )}

          {missing.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">
                {missing.length} param{missing.length > 1 ? "s" : ""} not yet
                defined
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onParamsDetected(detectedParams)}
              >
                Add missing
              </Button>
            </div>
          )}

          {extra.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {extra.length} defined param{extra.length > 1 ? "s" : ""} not
              found in SQL:{" "}
              <span className="font-mono">{extra.join(", ")}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
