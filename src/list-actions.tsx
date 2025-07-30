import React from "react";
import { ActionPanel, Action, Detail, List, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { execa } from "execa";

const ADMIN_CAL = "Work"; // Change to your Apple Calendar name

type Item = { task: string; date: string };

async function getItems(): Promise<Item[]> {
  const raw = (await LocalStorage.getItem<string>("actions")) ?? "[]";
  return JSON.parse(raw) as Item[];
}

async function schedule(task: string) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cmd = `
    tell application "Calendar"
      tell calendar "${ADMIN_CAL}"
        make new event with properties {summary:"${task}", start date:date "${today} 15:30", end date:date "${today} 17:00"}
      end tell
    end tell`;
  await execa("osascript", ["-e", cmd]);
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    getItems().then(setItems);
  }, []);

  if (items.length === 0) {
    return <Detail markdown="🎉 No open actions" />;
  }

  return (
    <List searchBarPlaceholder="Filter actions…">
      {items.map((it, idx) => {
        const days = Math.floor(
          (Date.now() - Date.parse(it.date)) / 86_400_000,
        );
        return (
          <List.Item
            key={idx}
            title={it.task}
            subtitle={`${days} day${days !== 1 ? "s" : ""} old`}
            actions={
              <ActionPanel>
                <Action
                  title="Schedule 3:30 – 5 PM Today"
                  onAction={async () => {
                    await schedule(it.task);
                  }}
                />
                <Action
                  title="Mark Done"
                  onAction={async () => {
                    const remaining = items.filter((_, i) => i !== idx);
                    await LocalStorage.setItem(
                      "actions",
                      JSON.stringify(remaining),
                    );
                    setItems(remaining);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
