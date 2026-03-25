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

export interface OutputDestination {
  service: "box" | "s3";
  location: string;
  filename: string;
  ssm_key?: string | null;
}

export interface EmailNotification {
  recipients: string[];
  message: string;
}

export interface ConfiguredReport {
  name?: string;
  enabled: boolean;
  database: string;
  sql_file: string;
  schedule: Schedule;
  params: Record<string, string> | null;
  outputs: OutputDestination[];
  email_notifications: EmailNotification[] | null;
}

export interface ReportDefinition {
  id: string;
  enabled: boolean;
  metadata: ReportMetadata;
  reports: ConfiguredReport[];
}
