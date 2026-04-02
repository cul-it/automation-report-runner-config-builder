import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RequiredLabel, FieldError } from "@/App";
import { TemplateInput, previewTemplate } from "./TemplateInput";
import type { EmailNotification, NotificationType } from "@/types";
import type { ValidationErrors } from "@/lib/validation";
import { useState } from "react";

interface Props {
  notifications: EmailNotification[] | null;
  onChange: (notifications: EmailNotification[] | null) => void;
  errors: ValidationErrors | null;
  definitionId?: string;
  reportName?: string;
  metadataName?: string;
}

export function EmailForm({ notifications, onChange, errors, definitionId, reportName, metadataName }: Props) {
  const [recipientInputs, setRecipientInputs] = useState<
    Record<number, string>
  >({});

  const list = notifications || [];

  const remove = (index: number) => {
    const updated = list.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : null);
  };

  const updateField = (index: number, field: "subject" | "message", value: string) => {
    onChange(list.map((n, i) => (i === index ? { ...n, [field]: value } : n)));
  };

  const addRecipient = (index: number) => {
    const email = (recipientInputs[index] || "").trim();
    if (email && !list[index].recipients.includes(email)) {
      const updated = list.map((n, i) =>
        i === index ? { ...n, recipients: [...n.recipients, email] } : n
      );
      onChange(updated);
    }
    setRecipientInputs({ ...recipientInputs, [index]: "" });
  };

  const removeRecipient = (notifIndex: number, email: string) => {
    const updated = list.map((n, i) =>
      i === notifIndex
        ? { ...n, recipients: n.recipients.filter((r) => r !== email) }
        : n
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {list.map((notif, index) => {
        const recipientsErr = errors?.[`email_notifications.${index}.recipients`];
        const subjectErr = errors?.[`email_notifications.${index}.subject`];
        const messageErr = errors?.[`email_notifications.${index}.message`];
        const notifyOnErr = errors?.[`email_notifications.${index}.notify_on`];

        return (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Notification {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4.5" />
              </Button>
            </div>
            <div className="space-y-2">
              <RequiredLabel>Notify On</RequiredLabel>
              <Select
                value={notif.notify_on}
                onValueChange={(v) => {
                  if (!v) return;
                  const updated = list.map((n, i) =>
                    i === index ? { ...n, notify_on: v as NotificationType } : n
                  );
                  onChange(updated);
                }}
              >
                <SelectTrigger className={notifyOnErr ? "border-destructive" : ""}>
                  <span>{{ all: "Always", completed: "On Completion", error: "On Error" }[notif.notify_on]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Always</SelectItem>
                  <SelectItem value="completed">On Completion</SelectItem>
                  <SelectItem value="error">On Error</SelectItem>
                </SelectContent>
              </Select>
              <FieldError error={notifyOnErr} />
            </div>
            <div className="space-y-2">
              <RequiredLabel>Recipients</RequiredLabel>
              <div className="flex gap-2">
                <Input
                  value={recipientInputs[index] || ""}
                  onChange={(e) =>
                    setRecipientInputs({
                      ...recipientInputs,
                      [index]: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRecipient(index);
                    }
                  }}
                  placeholder="email@cornell.edu"
                  className={recipientsErr ? "border-destructive" : ""}
                />
              </div>
              <FieldError error={recipientsErr} />
              {notif.recipients.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {notif.recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeRecipient(index, email)}
                    >
                      {email} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <RequiredLabel>Subject</RequiredLabel>
              <TemplateInput
                value={notif.subject}
                onChange={(v) => updateField(index, "subject", v)}
                placeholder="Report Ready: {id}"
                className={subjectErr ? "border-destructive" : ""}
              />
              {notif.subject && (
                <p className="text-xs text-muted-foreground truncate">
                  Preview: {previewTemplate(notif.subject, { id: definitionId, name: reportName, metadataName })}
                </p>
              )}
              <FieldError error={subjectErr} />
            </div>
            <div className="space-y-2">
              <RequiredLabel>Message</RequiredLabel>
              <TemplateInput
                value={notif.message}
                onChange={(v) => updateField(index, "message", v)}
                placeholder="Your report is ready."
                multiline
                rows={2}
                className={messageErr ? "border-destructive" : ""}
              />
              {notif.message && (
                <p className="text-xs text-muted-foreground">
                  Preview: {previewTemplate(notif.message, { id: definitionId, name: reportName, metadataName })}
                </p>
              )}
              <FieldError error={messageErr} />
            </div>
          </div>
        );
      })}
      <details className="text-sm text-black">
        <summary className="cursor-pointer font-medium text-base">
          Template variables
        </summary>
        <p className="mt-1 mb-2">These variables work in both the subject and the message.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><code className="font-mono font-semibold">{"{id}"}</code> — Report definition ID</li>
          <li><code className="font-mono font-semibold">{"{current_datetime}"}</code> — Timestamp when the report runs</li>
          <li><code className="font-mono font-semibold">{"{metadata_name}"}</code> — Name from the report definition metadata</li>
          <li><code className="font-mono font-semibold">{"{name}"}</code> — Name of the configured report</li>
          <li><code className="font-mono font-semibold">{"{workflow_id}"}</code> — Unique workflow execution identifier</li>
          <li><code className="font-mono font-semibold">{"{error_msg}"}</code> — Error message if the report failed</li>
        </ul>
      </details>
    </div>
  );
}
