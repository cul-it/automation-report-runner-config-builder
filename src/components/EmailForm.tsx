import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RequiredLabel, FieldError } from "@/App";
import type { EmailNotification, NotificationType } from "@/types";
import type { ValidationErrors } from "@/lib/validation";
import { useState } from "react";

interface Props {
  notifications: EmailNotification[] | null;
  onChange: (notifications: EmailNotification[] | null) => void;
  errors: ValidationErrors | null;
}

export function EmailForm({ notifications, onChange, errors }: Props) {
  const [recipientInputs, setRecipientInputs] = useState<
    Record<number, string>
  >({});

  const list = notifications || [];

  const add = () => {
    onChange([...list, { recipients: [], message: "", notify_on: "all" }]);
  };

  const remove = (index: number) => {
    const updated = list.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : null);
  };

  const updateMessage = (index: number, message: string) => {
    onChange(list.map((n, i) => (i === index ? { ...n, message } : n)));
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
                Remove
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
              <RequiredLabel>Message</RequiredLabel>
              <Textarea
                value={notif.message}
                onChange={(e) => updateMessage(index, e.target.value)}
                placeholder="Your report is ready."
                rows={2}
                className={messageErr ? "border-destructive" : ""}
              />
              <FieldError error={messageErr} />
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add}>
        + Add Notification
      </Button>
    </div>
  );
}
