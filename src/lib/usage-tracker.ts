import { LocalStorage } from "@raycast/api";
import { calculateCost } from "./pricing-config";

export interface UsageRecord {
  timestamp: number;
  provider: string;
  model: string;
  command: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  success: boolean;
  error?: string;
}

export interface UsageStats {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
  errorCount: number;
  byProvider: Record<
    string,
    {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      calls: number;
    }
  >;
  byModel: Record<
    string,
    {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      calls: number;
    }
  >;
  byCommand: Record<
    string,
    {
      cost: number;
      calls: number;
    }
  >;
}

const STORAGE_KEY = "ai-usage-records";
const MAX_RECORDS = 10000; // Keep last 10k records

export class UsageTracker {
  /**
   * Record API usage
   */
  static async recordUsage(
    record: Omit<UsageRecord, "timestamp" | "cost">,
  ): Promise<void> {
    try {
      // Calculate cost
      const cost = calculateCost(
        record.provider,
        record.model,
        record.inputTokens,
        record.outputTokens,
      );

      // Create full record
      const fullRecord: UsageRecord = {
        ...record,
        timestamp: Date.now(),
        cost,
      };

      // Get existing records
      const records = await this.getRecords();
      records.push(fullRecord);

      // Keep only the most recent records
      if (records.length > MAX_RECORDS) {
        records.splice(0, records.length - MAX_RECORDS);
      }

      // Save back to storage
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error("Failed to record usage:", error);
    }
  }

  /**
   * Get all usage records
   */
  static async getRecords(): Promise<UsageRecord[]> {
    try {
      const data = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to get usage records:", error);
      return [];
    }
  }

  /**
   * Get usage statistics
   */
  static async getStats(startDate?: Date, endDate?: Date): Promise<UsageStats> {
    const records = await this.getRecords();

    // Filter by date if provided
    const filteredRecords = records.filter((record) => {
      if (startDate && record.timestamp < startDate.getTime()) return false;
      if (endDate && record.timestamp > endDate.getTime()) return false;
      return true;
    });

    // Initialize stats
    const stats: UsageStats = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      callCount: 0,
      errorCount: 0,
      byProvider: {},
      byModel: {},
      byCommand: {},
    };

    // Calculate stats
    for (const record of filteredRecords) {
      stats.totalCost += record.cost;
      stats.totalInputTokens += record.inputTokens;
      stats.totalOutputTokens += record.outputTokens;
      stats.callCount++;

      if (!record.success) {
        stats.errorCount++;
      }

      // By provider
      if (!stats.byProvider[record.provider]) {
        stats.byProvider[record.provider] = {
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          calls: 0,
        };
      }
      stats.byProvider[record.provider].cost += record.cost;
      stats.byProvider[record.provider].inputTokens += record.inputTokens;
      stats.byProvider[record.provider].outputTokens += record.outputTokens;
      stats.byProvider[record.provider].calls++;

      // By model
      const modelKey = `${record.provider}/${record.model}`;
      if (!stats.byModel[modelKey]) {
        stats.byModel[modelKey] = {
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          calls: 0,
        };
      }
      stats.byModel[modelKey].cost += record.cost;
      stats.byModel[modelKey].inputTokens += record.inputTokens;
      stats.byModel[modelKey].outputTokens += record.outputTokens;
      stats.byModel[modelKey].calls++;

      // By command
      if (!stats.byCommand[record.command]) {
        stats.byCommand[record.command] = {
          cost: 0,
          calls: 0,
        };
      }
      stats.byCommand[record.command].cost += record.cost;
      stats.byCommand[record.command].calls++;
    }

    return stats;
  }

  /**
   * Clear all usage records
   */
  static async clearRecords(): Promise<void> {
    await LocalStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Export usage records as CSV
   */
  static async exportAsCSV(startDate?: Date, endDate?: Date): Promise<string> {
    const records = await this.getRecords();

    // Filter by date if provided
    const filteredRecords = records.filter((record) => {
      if (startDate && record.timestamp < startDate.getTime()) return false;
      if (endDate && record.timestamp > endDate.getTime()) return false;
      return true;
    });

    // Create CSV header
    const headers = [
      "Timestamp",
      "Date",
      "Time",
      "Provider",
      "Model",
      "Command",
      "Input Tokens",
      "Output Tokens",
      "Cost (USD)",
      "Success",
      "Error",
    ];

    // Create CSV rows
    const rows = filteredRecords.map((record) => {
      const date = new Date(record.timestamp);
      return [
        record.timestamp,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        record.provider,
        record.model,
        record.command,
        record.inputTokens,
        record.outputTokens,
        record.cost.toFixed(6),
        record.success ? "Yes" : "No",
        record.error || "",
      ];
    });

    // Combine headers and rows
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    return csv;
  }

  /**
   * Get usage for current month
   */
  static async getCurrentMonthStats(): Promise<UsageStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.getStats(startOfMonth);
  }

  /**
   * Get usage for today
   */
  static async getTodayStats(): Promise<UsageStats> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    return this.getStats(startOfDay);
  }
}
