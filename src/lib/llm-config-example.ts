import { MultiProviderLLM, ModelConfig } from "./llm-multi-provider";

/**
 * Example configurations for different model providers
 * 
 * To use a different model in your extensions:
 * 1. Import MultiProviderLLM instead of LLM
 * 2. Create a config object with your desired provider/model
 * 3. Pass it to the MultiProviderLLM constructor
 */

// Current default - Gemini 2.0 Flash
export const DEFAULT_CONFIG: ModelConfig = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  apiKey: process.env.GEMINI_API_KEY || ""
};

// High accuracy option - GPT-4.1
export const HIGH_ACCURACY_CONFIG: ModelConfig = {
  provider: "openai", 
  model: "gpt-4.1",
  apiKey: process.env.OPENAI_API_KEY || ""
};

// Budget option - GPT-4.1-mini
export const BUDGET_CONFIG: ModelConfig = {
  provider: "openai",
  model: "gpt-4.1-mini", 
  apiKey: process.env.OPENAI_API_KEY || ""
};

// Fast option - Claude 3 Haiku
export const FAST_CONFIG: ModelConfig = {
  provider: "anthropic",
  model: "claude-3-haiku-20240307",
  apiKey: process.env.ANTHROPIC_API_KEY || ""
};

// Latest Claude option - Sonnet 4
export const CLAUDE_LATEST_CONFIG: ModelConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  apiKey: process.env.ANTHROPIC_API_KEY || ""
};

// Maximum accuracy - O3 (expensive)
export const MAX_ACCURACY_CONFIG: ModelConfig = {
  provider: "openai",
  model: "o3",
  apiKey: process.env.OPENAI_API_KEY || ""
};

/**
 * Example usage in an extension:
 * 
 * import { MultiProviderLLM } from "./lib/llm-multi-provider";
 * import { BUDGET_CONFIG } from "./lib/llm-config-example";
 * 
 * const llm = new MultiProviderLLM({
 *   provider: "openai",
 *   model: "gpt-4o-mini",
 *   apiKey: apiKey  // from Raycast preferences
 * });
 * 
 * const cards = await llm.generateAnkiCards(text, categories);
 */