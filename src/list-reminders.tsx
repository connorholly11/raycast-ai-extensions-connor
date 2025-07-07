import {
  ActionPanel,
  Action,
  Detail,
  List,
  LocalStorage,
  showHUD,
  Color,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";

type Reminder = {
  id: string;
  title: string;
  frequency: string;
  nextDue: string;
  createdAt: string;
};

async function getReminders(): Promise<Reminder[]> {
  const raw = (await LocalStorage.getItem<string>("reminders")) ?? "[]";
  return JSON.parse(raw) as Reminder[];
}

async function updateReminder(id: string, nextDue: string) {
  const reminders = await getReminders();
  const updated = reminders.map(r => 
    r.id === id ? { ...r, nextDue } : r
  );
  await LocalStorage.setItem("reminders", JSON.stringify(updated));
}

async function deleteReminder(id: string) {
  const reminders = await getReminders();
  const filtered = reminders.filter(r => r.id !== id);
  await LocalStorage.setItem("reminders", JSON.stringify(filtered));
}

function getNextDueDate(frequency: string, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "semi-annual":
      date.setMonth(date.getMonth() + 6);
      break;
    case "annual":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date;
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getItemIcon(days: number) {
  if (days < 0) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (days === 0) return { source: Icon.Clock, tintColor: Color.Orange };
  if (days <= 7) return { source: Icon.Calendar, tintColor: Color.Yellow };
  return { source: Icon.Calendar, tintColor: Color.Green };
}

export default function Command() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await getReminders();
    setReminders(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!loading && reminders.length === 0) {
    return <Detail markdown="✅ No reminders set up yet" />;
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter reminders…">
      {reminders
        .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
        .map((reminder) => {
          const days = getDaysUntil(reminder.nextDue);
          const dueDate = new Date(reminder.nextDue);
          
          let subtitle = "";
          if (days < 0) {
            subtitle = `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
          } else if (days === 0) {
            subtitle = "Due today";
          } else {
            subtitle = `Due in ${days} day${days !== 1 ? "s" : ""}`;
          }

          return (
            <List.Item
              key={reminder.id}
              title={reminder.title}
              subtitle={subtitle}
              icon={getItemIcon(days)}
              accessories={[
                { text: reminder.frequency },
                { date: dueDate }
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Mark Done"
                    icon={Icon.Checkmark}
                    onAction={async () => {
                      const nextDue = getNextDueDate(reminder.frequency, new Date());
                      await updateReminder(reminder.id, nextDue.toISOString());
                      await showHUD("✅ Marked as done");
                      await refresh();
                    }}
                  />
                  <Action
                    title="Snooze 1 Week"
                    icon={Icon.Clock}
                    onAction={async () => {
                      const snoozed = new Date(reminder.nextDue);
                      snoozed.setDate(snoozed.getDate() + 7);
                      await updateReminder(reminder.id, snoozed.toISOString());
                      await showHUD("😴 Snoozed for 1 week");
                      await refresh();
                    }}
                  />
                  <Action
                    title="Delete Reminder"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await deleteReminder(reminder.id);
                      await showHUD("🗑️ Reminder deleted");
                      await refresh();
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