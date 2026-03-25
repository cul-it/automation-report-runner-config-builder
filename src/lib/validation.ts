import type { ReportDefinition } from "@/types";

// Errors keyed by field path, e.g. "id", "reports.0.sql_file", "reports.0.outputs.1.filename"
export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
}

export function validateDefinition(def: ReportDefinition): ValidationResult {
  const errors: ValidationErrors = {};

  if (!def.id.trim()) {
    errors["id"] = "Report Definition ID is required.";
  }

  if (def.reports.length === 0) {
    errors["reports"] = "At least one configured report is required.";
  }

  def.reports.forEach((r, i) => {
    const p = `reports.${i}`;

    if (!r.sql_file.trim()) {
      errors[`${p}.sql_file`] = "SQL file is required.";
    }

    if (!r.database.trim()) {
      errors[`${p}.database`] = "Database is required.";
    }

    if (r.schedule.type === "weekly" && (!r.schedule.days || r.schedule.days.length === 0)) {
      errors[`${p}.schedule.days`] = "Weekly schedule requires at least one day selected.";
    }

    if (r.schedule.type === "monthly" && (!r.schedule.days || r.schedule.days.length === 0)) {
      errors[`${p}.schedule.days`] = "Monthly schedule requires at least one day of month.";
    }

    if (r.schedule.type === "dates" && (!r.schedule.dates || r.schedule.dates.length === 0)) {
      errors[`${p}.schedule.dates`] = "Specific dates schedule requires at least one date.";
    }

    if (r.outputs.length === 0) {
      errors[`${p}.outputs`] = "At least one output is required.";
    }

    if (r.email_notifications) {
      r.email_notifications.forEach((n, j) => {
        const np = `${p}.email_notifications.${j}`;
        if (n.recipients.length === 0) {
          errors[`${np}.recipients`] = "At least one recipient is required.";
        }
        if (!n.message.trim()) {
          errors[`${np}.message`] = "Message is required.";
        }
        if (!n.notify_on) {
          errors[`${np}.notify_on`] = "Notify on is required.";
        }
      });
    }

    r.outputs.forEach((o, j) => {
      const op = `${p}.outputs.${j}`;
      if (!o.location.trim()) {
        errors[`${op}.location`] = "Destination is required.";
      }
      if (!o.filename.trim()) {
        errors[`${op}.filename`] = "Filename is required.";
      }
    });
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Get errors for a given prefix, stripping the prefix from keys */
export function errorsFor(errors: ValidationErrors, prefix: string): ValidationErrors {
  const result: ValidationErrors = {};
  const p = prefix + ".";
  for (const [key, val] of Object.entries(errors)) {
    if (key.startsWith(p)) {
      result[key.slice(p.length)] = val;
    }
  }
  return result;
}
