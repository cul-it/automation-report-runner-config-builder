import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/App";
import type { Schedule, ScheduleType } from "@/types";
import type { ValidationErrors } from "@/lib/validation";
import { localToUtc, utcToLocal, getTimezoneAbbr } from "@/lib/time";
import { useState } from "react";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface Props {
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
  errors: ValidationErrors | null;
}

export function ScheduleForm({ schedule, onChange, errors }: Props) {
  const [dateInput, setDateInput] = useState("");

  const localTime = utcToLocal(schedule.time);

  const updateType = (value: string | null) => {
    if (!value) return;
    const type = value as ScheduleType;
    const base: Schedule = { type, time: schedule.time };
    if (type === "weekly") base.days = [];
    if (type === "monthly") base.days = [];
    if (type === "dates") base.dates = [];
    onChange(base);
  };

  const updateTime = (localValue: string) => {
    onChange({ ...schedule, time: localToUtc(localValue) });
  };

  const toggleWeekday = (day: string) => {
    const current = (schedule.days as string[]) || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    onChange({ ...schedule, days: updated });
  };

  const updateMonthDays = (value: string) => {
    const days = value
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 31);
    onChange({ ...schedule, days });
  };

  const addDate = () => {
    const date = dateInput.trim();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const current = schedule.dates || [];
      if (!current.includes(date)) {
        onChange({ ...schedule, dates: [...current, date].sort() });
      }
    }
    setDateInput("");
  };

  const removeDate = (date: string) => {
    onChange({
      ...schedule,
      dates: (schedule.dates || []).filter((d) => d !== date),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={schedule.type} onValueChange={updateType}>
            <SelectTrigger>
              <span>{{ daily: "Daily", weekly: "Weekly", monthly: "Monthly", dates: "Specific Dates" }[schedule.type]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="dates">Specific Dates</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-black">
            {{ daily: "Runs every day at the specified time.",
               weekly: "Runs on selected days of the week.",
               monthly: "Runs on specific days of each month.",
               dates: "Runs once on each specified date.",
            }[schedule.type]}
          </p>
        </div>
        <div className="space-y-2">
          <Label>
            Time ({getTimezoneAbbr()})
          </Label>
          <Input
            type="time"
            value={localTime}
            onChange={(e) => updateTime(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Stored as UTC: {schedule.time}
          </p>
        </div>
      </div>

      {schedule.type === "weekly" && (
        <div className="space-y-2">
          <Label>Days</Label>
          <div className={`flex flex-wrap gap-2 ${errors?.["days"] ? "ring-1 ring-destructive rounded p-1" : ""}`}>
            {WEEKDAYS.map((day) => (
              <Badge
                key={day}
                variant={
                  (schedule.days as string[])?.includes(day)
                    ? "default"
                    : "outline"
                }
                className="cursor-pointer capitalize"
                onClick={() => toggleWeekday(day)}
              >
                {day.slice(0, 3)}
              </Badge>
            ))}
          </div>
          <FieldError error={errors?.["days"]} />
        </div>
      )}

      {schedule.type === "monthly" && (
        <div className="space-y-2">
          <Label>Days of month (comma-separated)</Label>
          <Input
            value={(schedule.days as number[])?.join(", ") || ""}
            onChange={(e) => updateMonthDays(e.target.value)}
            placeholder="1, 15"
            className={errors?.["days"] ? "border-destructive" : ""}
          />
          <FieldError error={errors?.["days"]} />
        </div>
      )}

      {schedule.type === "dates" && (
        <div className="space-y-2">
          <Label>Dates</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDate();
                }
              }}
              className={errors?.["dates"] ? "border-destructive" : ""}
            />
            <button
              type="button"
              onClick={addDate}
              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add
            </button>
          </div>
          <FieldError error={errors?.["dates"]} />
          {(schedule.dates || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {schedule.dates!.map((date) => (
                <Badge
                  key={date}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeDate(date)}
                >
                  {date} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
