/**
 * Pricing configuration for AI providers
 * Prices are per 1K tokens unless otherwise specified
 * Last updated: 2025-01-17
 */

export interface TokenPricing {
  input: number;  // Cost per 1K input tokens in USD
  output: number; // Cost per 1K output tokens in USD
}

export interface ModelPricing {
  [model: string]: TokenPricing;
}

export const PROVIDER_PRICING: Record<string, ModelPricing> = {
  openai: {
    "gpt-4o": {
      input: 0.005,  // $5 per 1M tokens
      output: 0.02   // $20 per 1M tokens
    },
    "gpt-4o-mini": {
      input: 0.0006,  // $0.60 per 1M tokens
      output: 0.0024  // $2.40 per 1M tokens
    },
    "gpt-4.1": {
      input: 0.002,  // $2 per 1M tokens
      output: 0.008  // $8 per 1M tokens
    },
    "gpt-4.1-mini": {
      input: 0.0004,  // $0.40 per 1M tokens
      output: 0.0016  // $1.60 per 1M tokens
    },
    "gpt-4.1-nano": {
      input: 0.0001,  // $0.10 per 1M tokens
      output: 0.0004  // $0.40 per 1M tokens
    },
    "o3": {
      input: 0.002,  // $2 per 1M tokens
      output: 0.008  // $8 per 1M tokens
    },
    "o4-mini": {
      input: 0.0011,  // $1.10 per 1M tokens
      output: 0.0044  // $4.40 per 1M tokens
    }
  },
  anthropic: {
    "claude-3-haiku-20240307": {
      input: 0.00025,  // $0.25 per 1M tokens
      output: 0.00125  // $1.25 per 1M tokens
    },
    "claude-3-5-haiku-latest": {
      input: 0.0008,  // $0.80 per 1M tokens
      output: 0.004   // $4 per 1M tokens
    },
    "claude-sonnet-4-20250514": {
      input: 0.003,  // $3 per 1M tokens
      output: 0.015  // $15 per 1M tokens
    },
    "claude-opus-4-20250514": {
      input: 0.015,  // $15 per 1M tokens
      output: 0.075  // $75 per 1M tokens
    }
  },
  gemini: {
    "gemini-2.0-flash": {
      input: 0.0001,  // $0.10 per 1M tokens
      output: 0.0004  // $0.40 per 1M tokens
    },
    "gemini-1.5-flash": {
      input: 0.000075,  // $0.075 per 1M tokens
      output: 0.0003    // $0.30 per 1M tokens
    },
    "gemini-1.5-pro": {
      input: 0.00125,  // $1.25 per 1M tokens
      output: 0.005    // $5 per 1M tokens
    }
  },
  deepseek: {
    "deepseek-chat": {
      input: 0.00027,  // $0.27 per 1M tokens
      output: 0.0011   // $1.10 per 1M tokens
    },
    "deepseek-reasoner": {
      input: 0.00055,  // $0.55 per 1M tokens
      output: 0.00219  // $2.19 per 1M tokens
    }
  }
};

/**
 * Get pricing for a specific model
 */
export function getModelPricing(provider: string, model: string): TokenPricing | null {
  const providerPricing = PROVIDER_PRICING[provider];
  if (!providerPricing) return null;
  
  return providerPricing[model] || null;
}

/**
 * Calculate cost based on token usage
 */
export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(provider, model);
  if (!pricing) return 0;
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}