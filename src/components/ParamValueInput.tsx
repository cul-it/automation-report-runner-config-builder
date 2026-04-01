import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const KEYWORDS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "start_of_fiscal_year", label: "Start of fiscal year" },
  { value: "end_of_fiscal_year", label: "End of fiscal year" },
  { value: "start_of_month", label: "Start of month" },
  { value: "end_of_month", label: "End of month" },
  { value: "start_of_quarter", label: "Start of quarter" },
  { value: "end_of_quarter", label: "End of quarter" },
  { value: "start_of_year", label: "Start of year" },
  { value: "end_of_year", label: "End of year" },
] as const;

const UNITS = [
  { value: "d", label: "Days" },
  { value: "w", label: "Weeks" },
  { value: "m", label: "Months" },
  { value: "y", label: "Years" },
] as const;

type Keyword = (typeof KEYWORDS)[number]["value"];
type Unit = (typeof UNITS)[number]["value"];
type Direction = "+" | "-";

const VARIABLE_REGEX =
  /^\{\{\s*(today|yesterday|start_of_month|end_of_month|start_of_quarter|end_of_quarter|start_of_year|end_of_year|start_of_fiscal_year|end_of_fiscal_year)(\s*([+-])\s*(\d+)([dwmy]))?\s*\}\}$/;

interface Parsed {
  keyword: Keyword;
  direction: Direction;
  amount: number;
  unit: Unit;
  hasOffset: boolean;
}

function parseExpression(value: string): Parsed | null {
  const match = value.trim().match(VARIABLE_REGEX);
  if (!match) return null;
  return {
    keyword: match[1] as Keyword,
    hasOffset: !!match[2],
    direction: (match[3] as Direction) || "-",
    amount: match[4] ? parseInt(match[4], 10) : 1,
    unit: (match[5] as Unit) || "d",
  };
}

function buildExpression(parsed: Parsed): string {
  if (!parsed.hasOffset) return `{{${parsed.keyword}}}`;
  return `{{${parsed.keyword} ${parsed.direction} ${parsed.amount}${parsed.unit}}}`;
}

// --- Pure JS date resolution for preview ---

const QUARTER_START: Record<number, number> = {
  0: 0, 1: 0, 2: 0,     // Jan-Mar → Jan
  3: 3, 4: 3, 5: 3,     // Apr-Jun → Apr
  6: 6, 7: 6, 8: 6,     // Jul-Sep → Jul
  9: 9, 10: 9, 11: 9,   // Oct-Dec → Oct
};

function lastDayOfMonth(year: number, month: number): number {
  // month is 0-indexed
  return new Date(year, month + 1, 0).getDate();
}

function resolveKeyword(keyword: Keyword, ref: Date): Date {
  const y = ref.getFullYear();
  const m = ref.getMonth();

  switch (keyword) {
    case "today":
      return new Date(y, m, ref.getDate());
    case "yesterday":
      return new Date(y, m, ref.getDate() - 1);
    case "start_of_month":
      return new Date(y, m, 1);
    case "end_of_month":
      return new Date(y, m, lastDayOfMonth(y, m));
    case "start_of_quarter": {
      const qm = QUARTER_START[m];
      return new Date(y, qm, 1);
    }
    case "end_of_quarter": {
      const qm = QUARTER_START[m] + 2;
      return new Date(y, qm, lastDayOfMonth(y, qm));
    }
    case "start_of_year":
      return new Date(y, 0, 1);
    case "end_of_year":
      return new Date(y, 11, 31);
    case "start_of_fiscal_year":
      // Fiscal year starts July 1. If before July, FY started last year.
      return m < 6 ? new Date(y - 1, 6, 1) : new Date(y, 6, 1);
    case "end_of_fiscal_year":
      // Fiscal year ends June 30. If before July, FY ends this year.
      return m < 6 ? new Date(y, 5, 30) : new Date(y + 1, 5, 30);
  }
}

function addMonths(date: Date, n: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const targetMonth = m + n;
  const targetDate = new Date(y, targetMonth, 1);
  const maxDay = lastDayOfMonth(targetDate.getFullYear(), targetDate.getMonth());
  return new Date(targetDate.getFullYear(), targetDate.getMonth(), Math.min(d, maxDay));
}

function applyOffset(date: Date, direction: Direction, amount: number, unit: Unit): Date {
  const sign = direction === "+" ? 1 : -1;
  switch (unit) {
    case "d":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + sign * amount);
    case "w":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + sign * amount * 7);
    case "m":
      return addMonths(date, sign * amount);
    case "y":
      return addMonths(date, sign * amount * 12);
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolvePreview(expression: string): string | null {
  const parsed = parseExpression(expression);
  if (!parsed) return null;
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let date = resolveKeyword(parsed.keyword, ref);
  if (parsed.hasOffset) {
    date = applyOffset(date, parsed.direction, parsed.amount, parsed.unit);
  }
  return formatDate(date);
}

function isVariableExpression(value: string): boolean {
  return VARIABLE_REGEX.test(value.trim());
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  variableMode: boolean;
}

export { isVariableExpression, resolvePreview };

export function ParamValueInput({ value, onChange, variableMode }: Props) {
  const parsed = useMemo<Parsed>(() => {
    if (variableMode) {
      const p = parseExpression(value);
      if (p) return p;
    }
    return { keyword: "today", direction: "-", amount: 1, unit: "d", hasOffset: false };
  }, [value, variableMode]);

  const updateParsed = (updates: Partial<Parsed>) => {
    const next = { ...parsed, ...updates };
    onChange(buildExpression(next));
  };

  if (!variableMode) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="static value"
        className="flex-1 min-w-0"
      />
    );
  }

  return (
    <div className="flex gap-1.5 items-center flex-1 min-w-0">
      <Select value={parsed.keyword} onValueChange={(v) => updateParsed({ keyword: v as Keyword })}>
        <SelectTrigger size="sm" className="min-w-[130px]">
          <span>{KEYWORDS.find((k) => k.value === parsed.keyword)?.label}</span>
        </SelectTrigger>
        <SelectContent>
          {KEYWORDS.map((k) => (
            <SelectItem key={k.value} value={k.value}>
              {k.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Switch
          checked={parsed.hasOffset}
          onCheckedChange={(checked) =>
            updateParsed({ hasOffset: checked })
          }
        />
        <span className="text-xs whitespace-nowrap">Time Shift</span>
      </div>

      {parsed.hasOffset && (
        <>
          <Select value={parsed.direction} onValueChange={(v) => updateParsed({ direction: v as Direction })}>
            <SelectTrigger size="sm" className="w-14">
              <span>{parsed.direction === "+" ? "+" : "−"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">−</SelectItem>
              <SelectItem value="+">+</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            min={1}
            value={parsed.amount}
            onChange={(e) => updateParsed({ amount: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 text-center"
          />

          <Select value={parsed.unit} onValueChange={(v) => updateParsed({ unit: v as Unit })}>
            <SelectTrigger size="sm" className="min-w-[80px]">
              <span>{UNITS.find((u) => u.value === parsed.unit)?.label}</span>
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
