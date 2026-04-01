import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { sql } from "@codemirror/lang-sql";
import { Upload, Download, ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react";
import { convertCteParams, hasCtePattern } from "@/components/SqlPreview";

interface Props {
  onBack: () => void;
}

export function SqlConverter({ onBack }: Props) {
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputViewRef = useRef<EditorView | null>(null);
  const outputViewRef = useRef<EditorView | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [hasCte, setHasCte] = useState(false);
  const [converted, setConverted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editorTheme = EditorView.theme({
    "&": {
      fontSize: "13px",
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
      minHeight: "200px",
    },
  });

  useEffect(() => {
    if (!inputRef.current || inputViewRef.current) return;

    const state = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        sql(),
        editorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const text = update.state.doc.toString();
            setHasCte(hasCtePattern(text));
            setConverted(false);
            setError(null);
          }
        }),
      ],
    });

    inputViewRef.current = new EditorView({ state, parent: inputRef.current });

    return () => {
      inputViewRef.current?.destroy();
      inputViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!outputRef.current || outputViewRef.current) return;

    const state = EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        sql(),
        editorTheme,
        EditorState.readOnly.of(true),
      ],
    });

    outputViewRef.current = new EditorView({ state, parent: outputRef.current });

    return () => {
      outputViewRef.current?.destroy();
      outputViewRef.current = null;
    };
  }, []);

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !inputViewRef.current) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const view = inputViewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConvert = () => {
    const view = inputViewRef.current;
    const outView = outputViewRef.current;
    if (!view || !outView) return;

    const text = view.state.doc.toString();
    const result = convertCteParams(text);

    if (!result) {
      setError("No WITH parameters AS (SELECT ...) CTE pattern found.");
      return;
    }

    outView.dispatch({
      changes: { from: 0, to: outView.state.doc.length, insert: result.convertedSql },
    });

    setConverted(true);
    setError(null);
  };

  const handleSave = () => {
    const outView = outputViewRef.current;
    if (!outView) return;
    const content = outView.state.doc.toString();
    const blob = new Blob([content], { type: "application/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "converted.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              SQL Parameter Converter
            </h1>
            <p className="text-sm text-muted-foreground">
              Convert <code className="bg-muted px-1 rounded text-xs">WITH parameters AS (SELECT ...)</code> CTE
              to <code className="bg-muted px-1 rounded text-xs">{"{{name}}"}</code> template syntax
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Input SQL</h2>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sql,.txt"
                  onChange={handleLoadFile}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-1" />
                  Load File
                </Button>
              </div>
            </div>
            <div ref={inputRef} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Converted SQL</h2>
              {converted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Download className="size-4 mr-1" />
                  Save SQL
                </Button>
              )}
            </div>
            <div ref={outputRef} />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleConvert}
            disabled={!hasCte}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            <RefreshCw className="size-5 mr-2" />
            Convert to template params
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <TriangleAlert className="size-4.5 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800">{error}</span>
          </div>
        )}

        {converted && (
          <div className="flex items-start gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
            <span className="text-sm text-green-800">
              Conversion complete. Review the output and save the converted SQL file.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
