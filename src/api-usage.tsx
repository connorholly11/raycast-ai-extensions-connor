import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Color,
  Icon,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getModelPricing, formatCost } from "./lib/pricing-config";

interface Preferences {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

interface UsageData {
  provider: string;
  current_cost: number;
  tokens_used: {
    input: number;
    output: number;
  };
  period?: string;
  models?: Record<string, { input: number; output: number }>;
  error?: string;
}

async function fetchOpenAIUsage(apiKey: string): Promise<UsageData> {
  try {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const response = await fetch(
      `https://api.openai.com/v1/usage?date=${firstDay.toISOString().split("T")[0]}&date=${tomorrow.toISOString().split("T")[0]}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    let totalCost = 0;
    let totalInput = 0;
    let totalOutput = 0;
    const modelUsage: Record<string, { input: number; output: number }> = {};

    // OpenAI returns daily usage data
    data.data?.forEach((day: any) => {
      day.usage?.forEach((usage: any) => {
        const model = usage.snapshot_id;
        const inputTokens = usage.n_context_tokens_total || 0;
        const outputTokens = usage.n_generated_tokens_total || 0;

        if (!modelUsage[model]) {
          modelUsage[model] = { input: 0, output: 0 };
        }

        modelUsage[model].input += inputTokens;
        modelUsage[model].output += outputTokens;

        totalInput += inputTokens;
        totalOutput += outputTokens;

        const pricing = getModelPricing("openai", model);
        if (pricing) {
          totalCost +=
            (inputTokens / 1000) * pricing.input +
            (outputTokens / 1000) * pricing.output;
        }
      });
    });

    return {
      provider: "OpenAI",
      current_cost: totalCost,
      tokens_used: { input: totalInput, output: totalOutput },
      period: `${firstDay.toLocaleDateString()} - ${today.toLocaleDateString()}`,
      models: modelUsage,
    };
  } catch (error) {
    return {
      provider: "OpenAI",
      current_cost: 0,
      tokens_used: { input: 0, output: 0 },
      error: error instanceof Error ? error.message : "Failed to fetch usage",
    };
  }
}

async function fetchAnthropicUsage(apiKey: string): Promise<UsageData> {
  try {
    // Anthropic doesn't have a direct usage API endpoint
    // We'll track usage locally through API responses
    const storedUsage = await LocalStorage.getItem<string>("anthropic_usage");
    const usage = storedUsage
      ? JSON.parse(storedUsage)
      : { input: 0, output: 0, cost: 0 };

    return {
      provider: "Anthropic",
      current_cost: usage.cost || 0,
      tokens_used: { input: usage.input || 0, output: usage.output || 0 },
      period: "Current month (tracked locally)",
    };
  } catch (error) {
    return {
      provider: "Anthropic",
      current_cost: 0,
      tokens_used: { input: 0, output: 0 },
      error: "Usage tracking requires API calls to be made through this app",
    };
  }
}

async function fetchGoogleUsage(apiKey: string): Promise<UsageData> {
  try {
    // Google Cloud requires complex authentication for billing API
    // For now, we'll provide a placeholder
    return {
      provider: "Google Gemini",
      current_cost: 0,
      tokens_used: { input: 0, output: 0 },
      error: "Google Cloud Billing API requires OAuth setup",
    };
  } catch (error) {
    return {
      provider: "Google Gemini",
      current_cost: 0,
      tokens_used: { input: 0, output: 0 },
      error: error instanceof Error ? error.message : "Failed to fetch usage",
    };
  }
}

async function fetchDeepSeekUsage(apiKey: string): Promise<UsageData> {
  try {
    // DeepSeek API usage endpoint
    const response = await fetch("https://api.deepseek.com/user/balance", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();

    // DeepSeek returns balance info
    const balance = data.balance || 0;
    const totalSpent = data.total_spent || 0;

    return {
      provider: "DeepSeek",
      current_cost: totalSpent,
      tokens_used: { input: 0, output: 0 }, // DeepSeek doesn't provide token breakdown
      period: "Total usage",
    };
  } catch (error) {
    return {
      provider: "DeepSeek",
      current_cost: 0,
      tokens_used: { input: 0, output: 0 },
      error: error instanceof Error ? error.message : "Failed to fetch usage",
    };
  }
}

export default function Command() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchAllUsage() {
      setLoading(true);
      const results: UsageData[] = [];

      if (preferences.OPENAI_API_KEY) {
        results.push(await fetchOpenAIUsage(preferences.OPENAI_API_KEY));
      }

      if (preferences.ANTHROPIC_API_KEY) {
        results.push(await fetchAnthropicUsage(preferences.ANTHROPIC_API_KEY));
      }

      if (preferences.GOOGLE_API_KEY) {
        results.push(await fetchGoogleUsage(preferences.GOOGLE_API_KEY));
      }

      if (preferences.DEEPSEEK_API_KEY) {
        results.push(await fetchDeepSeekUsage(preferences.DEEPSEEK_API_KEY));
      }

      setUsageData(results);
      setLoading(false);
    }

    fetchAllUsage();
  }, []);

  const totalCost = usageData.reduce((sum, data) => sum + data.current_cost, 0);
  const totalTokens = usageData.reduce(
    (sum, data) => ({
      input: sum.input + data.tokens_used.input,
      output: sum.output + data.tokens_used.output,
    }),
    { input: 0, output: 0 },
  );

  return (
    <List isLoading={loading} navigationTitle="API Usage">
      <List.Section title="Summary">
        <List.Item
          title="Total Cost"
          subtitle={formatCost(totalCost)}
          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          accessories={[
            { text: `${(totalTokens.input / 1_000_000).toFixed(2)}M input` },
            { text: `${(totalTokens.output / 1_000_000).toFixed(2)}M output` },
          ]}
        />
      </List.Section>

      <List.Section title="Provider Breakdown">
        {usageData.map((data) => (
          <List.Item
            key={data.provider}
            title={data.provider}
            subtitle={data.error || formatCost(data.current_cost)}
            icon={{
              source: data.error ? Icon.ExclamationMark : Icon.CheckCircle,
              tintColor: data.error ? Color.Red : Color.Green,
            }}
            accessories={
              data.error
                ? []
                : [
                    { text: data.period || "" },
                    {
                      text: `${(data.tokens_used.input / 1_000).toFixed(0)}K input`,
                    },
                    {
                      text: `${(data.tokens_used.output / 1_000).toFixed(0)}K output`,
                    },
                  ]
            }
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    showToast({
                      title: "Refreshing usage data...",
                      style: Toast.Style.Animated,
                    });
                  }}
                />
                {data.models && (
                  <Action.Push
                    title="View Model Breakdown"
                    icon={Icon.List}
                    target={
                      <List navigationTitle={`${data.provider} Models`}>
                        {Object.entries(data.models).map(([model, usage]) => {
                          const pricing = getModelPricing(
                            data.provider.toLowerCase(),
                            model,
                          );
                          const cost = pricing
                            ? (usage.input / 1000) * pricing.input +
                              (usage.output / 1000) * pricing.output
                            : 0;

                          return (
                            <List.Item
                              key={model}
                              title={model}
                              subtitle={formatCost(cost)}
                              accessories={[
                                {
                                  text: `${(usage.input / 1_000).toFixed(0)}K input`,
                                },
                                {
                                  text: `${(usage.output / 1_000).toFixed(0)}K output`,
                                },
                              ]}
                            />
                          );
                        })}
                      </List>
                    }
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Cost Projections">
        {totalCost > 0 && (
          <>
            <List.Item
              title="Daily Average"
              subtitle={formatCost(totalCost / new Date().getDate())}
              icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
            />
            <List.Item
              title="Monthly Projection"
              subtitle={formatCost((totalCost / new Date().getDate()) * 30)}
              icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
              accessories={[
                {
                  text: totalCost > 100 ? "High usage" : "Normal usage",
                  icon:
                    totalCost > 100 ? Icon.ExclamationMark : Icon.CheckCircle,
                },
              ]}
            />
          </>
        )}
      </List.Section>
    </List>
  );
}
