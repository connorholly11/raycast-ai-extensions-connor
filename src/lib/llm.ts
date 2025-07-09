import { MultiProviderLLM, ModelConfig } from "./llm-multi-provider";

/** Thin wrapper that uses MultiProviderLLM with default OpenAI settings */
export class LLM {
  private multiLLM: MultiProviderLLM;

  constructor(opts: { apiKey: string }) {
    // Default to OpenAI gpt-4.1-mini for backward compatibility
    const config: ModelConfig = {
      provider: "openai",
      model: "gpt-4.1-mini",
      apiKey: opts.apiKey,
      trackUsage: true,
    };
    this.multiLLM = new MultiProviderLLM(config);
  }

  /** Detect a single actionable task; returns the task text or "NONE". */
  async detectAction(text: string): Promise<string> {
    return this.multiLLM.detectAction(text);
  }

  /** Produce a 5-tweet thread from arbitrary text. */
  async makeTweetThread(text: string): Promise<string> {
    return this.multiLLM.makeTweetThread(text);
  }

  /** Generate a single viral tweet from arbitrary text. */
  async makeViralTweet(text: string, style: "engagement" | "informative" = "engagement", customPrompt?: string): Promise<string> {
    return this.multiLLM.makeViralTweet(text, style, customPrompt);
  }

  /** Generate Anki flashcards from text */
  async generateAnkiCards(
    text: string,
    deckCategories: string[],
  ): Promise<any[]> {
    return this.multiLLM.generateAnkiCards(text, deckCategories);
  }

  /** Extract multiple actionable tasks from text */
  async extractMultipleTasks(text: string): Promise<string[]> {
    return this.multiLLM.extractMultipleTasks(text);
  }
}
