import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  showHUD,
  getSelectedText,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { LLM } from "./lib/llm";

interface Preferences {
  apiKey: string;
}

interface ExtractedTask {
  id: string;
  task: string;
  selected: boolean;
}

export default function Command() {
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [originalText, setOriginalText] = useState("");

  useEffect(() => {
    extractTasks();
  }, []);

  async function extractTasks() {
    try {
      let text = "";
      
      // Try selected text first, fall back to clipboard
      try {
        text = await getSelectedText();
      } catch {
        const clipboardText = await Clipboard.readText();
        text = clipboardText || "";
      }

      if (!text) {
        await showHUD("⚠️ No text found");
        setIsLoading(false);
        return;
      }

      setOriginalText(text);

      await showToast({
        style: Toast.Style.Animated,
        title: "Extracting tasks...",
      });

      const { apiKey } = getPreferenceValues<Preferences>();
      const llm = new LLM({ apiKey });
      
      // Use the new method we'll add to LLM
      const extractedTasks = await llm.extractMultipleTasks(text);

      if (extractedTasks.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No tasks found",
          message: "Could not extract any actionable tasks from the text",
        });
        setIsLoading(false);
        return;
      }

      // Convert to our format with IDs and selection state
      const tasksWithIds = extractedTasks.map((task, index) => ({
        id: `task-${Date.now()}-${index}`,
        task,
        selected: true,
      }));

      setTasks(tasksWithIds);
      setIsLoading(false);

      await showToast({
        style: Toast.Style.Success,
        title: `Found ${extractedTasks.length} task${extractedTasks.length > 1 ? 's' : ''}`,
        message: "Review and press Enter or ⌘S to save selected tasks",
      });
    } catch (error) {
      console.error("Error extracting tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to extract tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  }

  async function saveSelectedTasks() {
    const selectedTasks = tasks.filter(t => t.selected);
    
    if (selectedTasks.length === 0) {
      await showHUD("⚠️ No tasks selected");
      return;
    }

    try {
      // Get existing actions
      const stored = (await LocalStorage.getItem<string>("actions")) ?? "[]";
      const existingActions = JSON.parse(stored) as { task: string; date: string }[];

      // Add new tasks
      const newActions = selectedTasks.map(t => ({
        task: t.task,
        date: new Date().toISOString(),
      }));

      const allActions = [...existingActions, ...newActions];
      await LocalStorage.setItem("actions", JSON.stringify(allActions));

      await showHUD(`✅ Saved ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error("Error saving tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function toggleTask(taskId: string) {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, selected: !t.selected } : t
    ));
  }

  function selectAll() {
    setTasks(tasks.map(t => ({ ...t, selected: true })));
  }

  function deselectAll() {
    setTasks(tasks.map(t => ({ ...t, selected: false })));
  }

  const selectedCount = tasks.filter(t => t.selected).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tasks..."
      navigationTitle={`Extract Tasks - ${selectedCount}/${tasks.length} selected`}
    >
      {tasks.length > 0 ? (
        <>
          <List.Section title="Extracted Tasks" subtitle={`${selectedCount} of ${tasks.length} selected`}>
            {tasks.map((task) => (
              <List.Item
                key={task.id}
                title={task.task}
                icon={task.selected ? Icon.CheckCircle : Icon.Circle}
                accessories={[
                  { text: task.selected ? "Selected" : "", icon: task.selected ? Icon.Check : undefined }
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Save Selected Tasks"
                      icon={Icon.Download}
                      onAction={saveSelectedTasks}
                    />
                    <Action
                      title={task.selected ? "Deselect Task" : "Select Task"}
                      icon={task.selected ? Icon.Circle : Icon.CheckCircle}
                      shortcut={{ modifiers: [], key: "space" }}
                      onAction={() => toggleTask(task.id)}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Select All"
                        icon={Icon.CheckCircle}
                        shortcut={{ modifiers: ["cmd"], key: "a" }}
                        onAction={selectAll}
                      />
                      <Action
                        title="Deselect All"
                        icon={Icon.Circle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        onAction={deselectAll}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          
          {originalText.length < 500 && (
            <List.Section title="Original Text">
              <List.Item
                title="Source"
                subtitle={originalText.substring(0, 100) + (originalText.length > 100 ? "..." : "")}
                accessories={[{ text: `${originalText.length} chars` }]}
              />
            </List.Section>
          )}
        </>
      ) : (
        !isLoading && (
          <List.EmptyView
            title="No Tasks Found"
            description="Could not extract any actionable tasks from the selected text"
            icon={Icon.ExclamationMark}
          />
        )
      )}
    </List>
  );
}