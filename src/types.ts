export type ScheduleType = "daily" | "weekly" | "monthly" | "dates";

export interface Schedule {
  type: ScheduleType;
  time: string; // HH:MM in UTC
  days?: (string | number)[];
  dates?: string[];
}

export interface ReportMetadata {
  name: string;
  description: string;
  owner: string;
  tags: string[];
}

export type FileExtension = "xlsx" | "xls" | "csv" | "tsv";

export interface OutputDestination {
  service: "box" | "s3";
  location: string;
  filename: string;
  file_extension: FileExtension;
  ssm_key?: string | null;
}

export type NotificationType = "all" | "completed" | "error";

export interface EmailNotification {
  recipients: string[];
  subject: string;
  message: string;
  notify_on: NotificationType;
}

export interface ConfiguredReport {
  name?: string;
  enabled: boolean;
  database: string;
  sql_file: string;
  schedule: Schedule;
  params: Record<string, { value: string; description?: string }> | null;
  outputs: OutputDestination[];
  email_notifications: EmailNotification[] | null;
}

export interface ReportDefinition {
  id: string;
  enabled: boolean;
  metadata: ReportMetadata;
  reports: ConfiguredReport[];
}
