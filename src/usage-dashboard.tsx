import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { UsageTracker, UsageStats } from "./lib/usage-tracker";
import { formatCost } from "./lib/pricing-config";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface Preferences {
  showEstimates?: boolean;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
}

export default function UsageDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "month" | "all">("month");
  const preferences = getPreferenceValues<Preferences>();

  const loadStats = async () => {
    setLoading(true);
    try {
      let data: UsageStats;
      switch (timeFilter) {
        case "today":
          data = await UsageTracker.getTodayStats();
          break;
        case "month":
          data = await UsageTracker.getCurrentMonthStats();
          break;
        case "all":
          data = await UsageTracker.getStats();
          break;
      }
      setStats(data);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load usage stats",
        message: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [timeFilter]);

  const handleExport = async () => {
    try {
      const csv = await UsageTracker.exportAsCSV();
      const filename = `ai-usage-export-${new Date().toISOString().split("T")[0]}.csv`;
      const filepath = join(homedir(), "Downloads", filename);
      writeFileSync(filepath, csv);
      
      showToast({
        style: Toast.Style.Success,
        title: "Usage data exported",
        message: `Saved to ~/Downloads/${filename}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: String(error),
      });
    }
  };

  const handleClearData = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All Usage Data?",
      message: "This action cannot be undone. All usage history will be permanently deleted.",
      primaryAction: {
        title: "Clear Data",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await UsageTracker.clearRecords();
        showToast({
          style: Toast.Style.Success,
          title: "Usage data cleared",
        });
        loadStats();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear data",
          message: String(error),
        });
      }
    }
  };

  if (!stats) {
    return <List isLoading={loading} />;
  }

  const timeFilterTitle = {
    today: "Today",
    month: "This Month",
    all: "All Time",
  }[timeFilter];

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Period"
          value={timeFilter}
          onChange={(value) => setTimeFilter(value as typeof timeFilter)}
        >
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="This Month" value="month" />
          <List.Dropdown.Item title="All Time" value="all" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Overview - ${timeFilterTitle}`}>
        <List.Item
          title="Total Cost"
          subtitle={formatCost(stats.totalCost)}
          icon={{ source: Icon.BankNote, tintColor: Color.Green }}
          accessories={[
            { text: `${stats.callCount} calls` },
            stats.errorCount > 0 ? { text: `${stats.errorCount} errors`, tooltip: "Failed API calls" } : null,
          ].filter(Boolean)}
        />
        <List.Item
          title="Total Tokens"
          subtitle={`${formatTokens(stats.totalInputTokens + stats.totalOutputTokens)}`}
          icon={{ source: Icon.Text, tintColor: Color.Blue }}
          accessories={[
            { text: `Input: ${formatTokens(stats.totalInputTokens)}` },
            { text: `Output: ${formatTokens(stats.totalOutputTokens)}` },
          ]}
        />
      </List.Section>

      <List.Section title="By Provider">
        {Object.entries(stats.byProvider)
          .sort(([, a], [, b]) => b.cost - a.cost)
          .map(([provider, data]) => (
            <List.Item
              key={provider}
              title={provider.charAt(0).toUpperCase() + provider.slice(1)}
              subtitle={formatCost(data.cost)}
              icon={{ source: Icon.Globe, tintColor: getProviderColor(provider) }}
              accessories={[
                { text: `${data.calls} calls` },
                { text: `${formatTokens(data.inputTokens + data.outputTokens)} tokens` },
              ]}
            />
          ))}
      </List.Section>

      <List.Section title="By Model">
        {Object.entries(stats.byModel)
          .sort(([, a], [, b]) => b.cost - a.cost)
          .map(([model, data]) => (
            <List.Item
              key={model}
              title={model}
              subtitle={formatCost(data.cost)}
              icon={{ source: Icon.Cpu, tintColor: Color.Purple }}
              accessories={[
                { text: `${data.calls} calls` },
                { text: `${formatTokens(data.inputTokens + data.outputTokens)} tokens` },
              ]}
            />
          ))}
      </List.Section>

      <List.Section title="By Command">
        {Object.entries(stats.byCommand)
          .sort(([, a], [, b]) => b.cost - a.cost)
          .map(([command, data]) => (
            <List.Item
              key={command}
              title={formatCommandName(command)}
              subtitle={formatCost(data.cost)}
              icon={{ source: Icon.Terminal, tintColor: Color.Orange }}
              accessories={[{ text: `${data.calls} calls` }]}
            />
          ))}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Export Usage Data"
          subtitle="Download as CSV"
          icon={{ source: Icon.Download, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Export to CSV" onAction={handleExport} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Clear Usage Data"
          subtitle="Delete all usage history"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Clear All Data"
                onAction={handleClearData}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {preferences.showEstimates && (
        <List.Section title="Cost Estimates">
          <List.Item
            title="Projected Monthly Cost"
            subtitle={getProjectedMonthlyCost(stats, timeFilter)}
            icon={{ source: Icon.Calendar, tintColor: Color.Yellow }}
          />
        </List.Section>
      )}
    </List>
  );
}

function getProviderColor(provider: string): Color {
  const colors: Record<string, Color> = {
    openai: Color.Green,
    anthropic: Color.Orange,
    gemini: Color.Blue,
    deepseek: Color.Purple,
  };
  return colors[provider] || Color.SecondaryText;
}

function formatCommandName(command: string): string {
  const names: Record<string, string> = {
    detectAction: "Add Action",
    makeTweetThread: "Tweetify",
    generateAnkiCards: "Anki Capture",
  };
  return names[command] || command;
}

function getProjectedMonthlyCost(stats: UsageStats, timeFilter: string): string {
  if (stats.callCount === 0) return "$0.00";
  
  const now = new Date();
  let daysElapsed: number;
  let daysInMonth: number;
  
  switch (timeFilter) {
    case "today":
      // Project based on today's usage for the whole month
      daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return formatCost(stats.totalCost * daysInMonth);
      
    case "month":
      // Project based on usage so far this month
      daysElapsed = now.getDate();
      daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dailyAverage = stats.totalCost / daysElapsed;
      return formatCost(dailyAverage * daysInMonth);
      
    case "all":
      // Can't project monthly from all-time data meaningfully
      return "N/A";
  }
}