import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ReportMetadata } from "@/types";
import { useState } from "react";

interface Props {
  metadata: ReportMetadata;
  onChange: (metadata: ReportMetadata) => void;
}

export function MetadataForm({ metadata, onChange }: Props) {
  const [tagInput, setTagInput] = useState("");

  const update = (field: keyof ReportMetadata, value: string | string[]) => {
    onChange({ ...metadata, [field]: value });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !metadata.tags.includes(tag)) {
      update("tags", [...metadata.tags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    update(
      "tags",
      metadata.tags.filter((t) => t !== tag)
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="meta-name">Name</Label>
          <Input
            id="meta-name"
            value={metadata.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Human-readable report name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-owner">Owner</Label>
          <Input
            id="meta-owner"
            value={metadata.owner}
            onChange={(e) => update("owner", e.target.value)}
            placeholder="NetID or name"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="meta-desc">Description</Label>
        <Textarea
          id="meta-desc"
          value={metadata.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What does this report do?"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag and press Enter"
          />
        </div>
        {metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {metadata.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
