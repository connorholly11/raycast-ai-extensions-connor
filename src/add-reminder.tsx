import { Action, ActionPanel, Form, LocalStorage, showHUD, popToRoot } from "@raycast/api";
import { useState } from "react";

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

async function saveReminder(reminder: Reminder) {
  const reminders = await getReminders();
  reminders.push(reminder);
  await LocalStorage.setItem("reminders", JSON.stringify(reminders));
}

function getNextDueDate(frequency: string, startDate: Date = new Date()): Date {
  const date = new Date(startDate);
  
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

export default function Command() {
  const [isLoading, setLoading] = useState(false);

  async function handleSubmit(values: Form.Values) {
    setLoading(true);
    
    const firstDue = values.firstDue ? new Date(values.firstDue) : getNextDueDate(values.frequency);
    
    const reminder: Reminder = {
      id: Date.now().toString(),
      title: values.title,
      frequency: values.frequency,
      nextDue: firstDue.toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    await saveReminder(reminder);
    await showHUD("✅ Reminder added");
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Reminder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField 
        id="title" 
        title="Title" 
        placeholder="e.g., Dentist appointment, Oil change"
        autoFocus
      />
      
      <Form.Dropdown id="frequency" title="Frequency" defaultValue="monthly">
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="quarterly" title="Quarterly (3 months)" />
        <Form.Dropdown.Item value="semi-annual" title="Semi-Annual (6 months)" />
        <Form.Dropdown.Item value="annual" title="Annual" />
      </Form.Dropdown>
      
      <Form.DatePicker
        id="firstDue"
        title="First Due Date (Optional)"
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}