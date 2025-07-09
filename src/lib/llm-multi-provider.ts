import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { UsageTracker } from "./usage-tracker";

export type ModelProvider = "gemini" | "openai" | "anthropic" | "deepseek";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey: string;
  trackUsage?: boolean; // Optional flag to enable/disable usage tracking
}

/** Multi-provider LLM abstraction */
export class MultiProviderLLM {
  private geminiClient?: GoogleGenerativeAI;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private deepseekClient?: OpenAI; // DeepSeek uses OpenAI-compatible API
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;

    switch (config.provider) {
      case "gemini":
        this.geminiClient = new GoogleGenerativeAI(config.apiKey);
        break;
      case "openai":
        this.openaiClient = new OpenAI({ apiKey: config.apiKey });
        break;
      case "anthropic":
        this.anthropicClient = new Anthropic({ apiKey: config.apiKey });
        break;
      case "deepseek":
        // DeepSeek uses OpenAI-compatible API
        this.deepseekClient = new OpenAI({
          apiKey: config.apiKey,
          baseURL: "https://api.deepseek.com/v1",
        });
        break;
    }
  }

  /** Helper to clean JSON responses */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks if present
    const match = response.match(/```json\n([\s\S]*?)\n```/);
    if (match) return match[1];

    // Also try without newlines
    const match2 = response.match(/```json([\s\S]*?)```/);
    if (match2) return match2[1].trim();

    return response;
  }

  /** Helper to check if model is O3 reasoning model */
  private isO3Model(model: string): boolean {
    return model === "o3" || model === "o3-high";
  }

  /** Helper to track usage if enabled */
  private async trackUsage(
    command: string,
    inputTokens: number,
    outputTokens: number,
    success: boolean,
    error?: string,
  ): Promise<void> {
    if (this.config.trackUsage !== false) {
      // Default to true
      await UsageTracker.recordUsage({
        provider: this.config.provider,
        model: this.config.model,
        command,
        inputTokens,
        outputTokens,
        success,
        error,
      });
    }
  }

  /** Estimate token count (rough approximation) */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /** Detect a single actionable task; returns the task text or "NONE". */
  async detectAction(text: string): Promise<string> {
    const prompt =
      `Decide if the text contains ONE actionable task.\n` +
      `If yes, reply with the task in imperative mood only.\n` +
      `If no action, reply NONE (exact).\n\n` +
      text;

    let response = "";
    let inputTokens = this.estimateTokens(prompt);
    let outputTokens = 0;
    let success = true;
    let error: string | undefined;

    try {
      switch (this.config.provider) {
        case "gemini":
          const geminiModel = this.geminiClient!.getGenerativeModel({
            model: this.config.model,
          });
          const geminiResult = await geminiModel.generateContent(prompt);
          response = geminiResult.response.text().trim();
          // Gemini doesn't provide token counts in response, so estimate
          outputTokens = this.estimateTokens(response);
          break;

        case "openai":
          const openaiParams: any = {
            model: this.config.model,
            messages: [{ role: "user", content: prompt }],
          };

          // O3 reasoning models use max_completion_tokens and don't support temperature
          if (this.isO3Model(this.config.model)) {
            openaiParams.max_completion_tokens = 256;
            delete openaiParams.max_tokens;
            // O3 doesn't support temperature
          } else {
            openaiParams.max_tokens = 50;
            openaiParams.temperature = 0.3;
          }

          const openaiResult =
            await this.openaiClient!.chat.completions.create(openaiParams);
          response = openaiResult.choices[0].message?.content || "NONE";
          // OpenAI provides token usage
          if (openaiResult.usage) {
            inputTokens = openaiResult.usage.prompt_tokens;
            outputTokens = openaiResult.usage.completion_tokens;
          }
          break;

        case "anthropic":
          const anthropicResult = await this.anthropicClient!.messages.create({
            model: this.config.model,
            max_tokens: 50,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });
          response =
            anthropicResult.content[0].type === "text"
              ? anthropicResult.content[0].text
              : "NONE";
          // Anthropic provides token usage
          if (anthropicResult.usage) {
            inputTokens = anthropicResult.usage.input_tokens;
            outputTokens = anthropicResult.usage.output_tokens;
          }
          break;

        case "deepseek":
          const deepseekResult =
            await this.deepseekClient!.chat.completions.create({
              model: this.config.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 50,
              temperature: 0.3,
            });
          response = deepseekResult.choices[0].message?.content || "NONE";
          if (deepseekResult.usage) {
            inputTokens = deepseekResult.usage.prompt_tokens;
            outputTokens = deepseekResult.usage.completion_tokens;
          }
          break;
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await this.trackUsage(
        "detectAction",
        inputTokens,
        outputTokens,
        success,
        error,
      );
    }

    return response.trim();
  }

  /** Produce a 5-tweet thread from arbitrary text. */
  async makeTweetThread(text: string): Promise<string> {
    const prompt =
      `You are a skilled social-media copywriter.\n` +
      `Rewrite the user's text as an engaging 5-tweet thread.\n` +
      `Rules:\n` +
      `1. Each tweet must be < 280 characters.\n` +
      `2. Use emojis where appropriate.\n` +
      `3. Start with "🧵 1/5:" and number each tweet.\n` +
      `Return ONLY the 5 tweets separated by newlines.\n\n` +
      text;

    let response = "";
    let inputTokens = this.estimateTokens(prompt);
    let outputTokens = 0;
    let success = true;
    let error: string | undefined;

    try {
      switch (this.config.provider) {
        case "gemini":
          const geminiModel = this.geminiClient!.getGenerativeModel({
            model: this.config.model,
          });
          const geminiResult = await geminiModel.generateContent(prompt);
          response = geminiResult.response.text().trim();
          outputTokens = this.estimateTokens(response);
          break;

        case "openai":
          const openaiParams: any = {
            model: this.config.model,
            messages: [{ role: "user", content: prompt }],
          };

          // O3 reasoning models use max_completion_tokens and don't support temperature
          if (this.isO3Model(this.config.model)) {
            openaiParams.max_completion_tokens = 400;
            delete openaiParams.max_tokens;
            // O3 doesn't support temperature
          } else {
            openaiParams.max_tokens = 500;
            openaiParams.temperature = 0.7;
          }

          const openaiResult =
            await this.openaiClient!.chat.completions.create(openaiParams);
          response = openaiResult.choices[0].message?.content || "";
          if (openaiResult.usage) {
            inputTokens = openaiResult.usage.prompt_tokens;
            outputTokens = openaiResult.usage.completion_tokens;
          }
          break;

        case "anthropic":
          const anthropicResult = await this.anthropicClient!.messages.create({
            model: this.config.model,
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          });
          response =
            anthropicResult.content[0].type === "text"
              ? anthropicResult.content[0].text
              : "";
          if (anthropicResult.usage) {
            inputTokens = anthropicResult.usage.input_tokens;
            outputTokens = anthropicResult.usage.output_tokens;
          }
          break;

        case "deepseek":
          const deepseekResult =
            await this.deepseekClient!.chat.completions.create({
              model: this.config.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 500,
              temperature: 0.7,
            });
          response = deepseekResult.choices[0].message?.content || "";
          if (deepseekResult.usage) {
            inputTokens = deepseekResult.usage.prompt_tokens;
            outputTokens = deepseekResult.usage.completion_tokens;
          }
          break;
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await this.trackUsage(
        "makeTweetThread",
        inputTokens,
        outputTokens,
        success,
        error,
      );
    }

    return response.trim();
  }

  /** Generate Anki flashcards from text */
  async generateAnkiCards(
    text: string,
    deckCategories: string[],
  ): Promise<any[]> {
    const systemPrompt = `You are an expert flash-card writer.

Return ONLY valid JSON in this form:
[
  {
    "deckName": "<one of: ${deckCategories.join(", ")}>",
    "front": "Question",
    "back": "Answer",
    "tags": ["tag1","tag2"]
  }
]

Guidelines:
1. Pick the most relevant deck.
2. Extract 1–3 key concepts.
3. Ask understanding questions (why / how).
4. Keep answers concise but complete.`;

    const prompt = systemPrompt + "\n\n" + text;
    let response = "";
    let inputTokens = this.estimateTokens(prompt);
    let outputTokens = 0;
    let success = true;
    let error: string | undefined;

    try {
      switch (this.config.provider) {
        case "gemini":
          const geminiModel = this.geminiClient!.getGenerativeModel({
            model: this.config.model,
          });
          const geminiResult = await geminiModel.generateContent(prompt);
          response = geminiResult.response.text();
          outputTokens = this.estimateTokens(response);
          break;

        case "openai":
          const openaiParams: any = {
            model: this.config.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text },
            ],
            response_format: { type: "json_object" },
          };

          // O3 reasoning models use max_completion_tokens and don't support temperature
          if (this.isO3Model(this.config.model)) {
            openaiParams.max_completion_tokens = 10000; // Extended for O3
            delete openaiParams.max_tokens;
            // O3 doesn't support temperature
          } else {
            openaiParams.max_tokens = 300;
            openaiParams.temperature = 0.3;
          }

          const openaiResult =
            await this.openaiClient!.chat.completions.create(openaiParams);
          response = openaiResult.choices[0].message?.content || "[]";
          if (openaiResult.usage) {
            inputTokens = openaiResult.usage.prompt_tokens;
            outputTokens = openaiResult.usage.completion_tokens;
          }
          break;

        case "anthropic":
          const anthropicResult = await this.anthropicClient!.messages.create({
            model: this.config.model,
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });
          response =
            anthropicResult.content[0].type === "text"
              ? anthropicResult.content[0].text
              : "[]";
          if (anthropicResult.usage) {
            inputTokens = anthropicResult.usage.input_tokens;
            outputTokens = anthropicResult.usage.output_tokens;
          }
          break;

        case "deepseek":
          const deepseekResult =
            await this.deepseekClient!.chat.completions.create({
              model: this.config.model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
              ],
              max_tokens: 300,
              temperature: 0.3,
              response_format: { type: "json_object" },
            });
          response = deepseekResult.choices[0].message?.content || "[]";
          if (deepseekResult.usage) {
            inputTokens = deepseekResult.usage.prompt_tokens;
            outputTokens = deepseekResult.usage.completion_tokens;
          }
          break;
      }

      const jsonStr = this.cleanJsonResponse(response);

      const parsed = JSON.parse(jsonStr);
      // Ensure it's an array
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      console.error("Failed to parse response:", response);
      throw new Error(
        `Failed to parse ${this.config.provider} response as JSON`,
      );
    } finally {
      await this.trackUsage(
        "generateAnkiCards",
        inputTokens,
        outputTokens,
        success,
        error,
      );
    }
  }

  /** Generate a single viral tweet from arbitrary text. */
  async makeViralTweet(text: string, style: "engagement" | "informative" = "engagement", customPrompt?: string): Promise<string> {
    const engagementPrompt = 
      `Write a tweet that will get maximum engagement. Channel Nick Huber or Nikita Bier's style.

Core principles:
- Start with a bold, controversial statement
- Use extreme examples that trigger reactions
- Make people feel smart for agreeing or dumb for disagreeing
- Create an us vs them dynamic
- Use specific numbers when possible
- Make claims that are 80% true but stated as 100% fact
- Write like you're texting a friend who gets your humor
- NO EMOJIS

Format tricks that work:
- "Most people don't realize..."
- "Unpopular opinion: [obviously popular thing]"
- "The difference between X and Y is..."
- "[Successful thing] is just [simple thing] in disguise"
- "I made $X doing Y and here's the secret..."
- "Stop doing X. Start doing Y."

Keep it under 280 chars. Make normies mad and smart people nod.

Text to transform:
` + text;

    const informativePrompt = 
      `Transform the text below into an informative tweet in George Mack style. Educational but not preachy.

IMPORTANT: Create a tweet from the provided text, maintaining its core insight but making it educational and valuable. Length can be whatever serves the content best - from punchy one-liner to detailed thread starter.

Core principles:
- Start with a fascinating fact or insight
- Use clear structure (often numbered points)
- Make complex ideas simple without dumbing them down
- Include specific examples or case studies
- Write like you're explaining to a smart friend
- Apply Feynman technique: explain it so a child could understand the concept
- Use line breaks strategically for readability
- Focus on timeless principles over trending topics
- NO EMOJIS

MULTIMEDIA SUGGESTIONS:
- If the content would benefit from visuals, suggest: [Add photo: description]
- For complex concepts, suggest: [Add diagram: what to illustrate]
- For processes/steps, suggest: [Add video: what to demonstrate]
- For data/stats, suggest: [Add chart: what data to visualize]

Format patterns that work:
- "The [concept] paradox: [explanation]"
- "3 things I learned about X: 1) ... 2) ... 3) ..."
- "[Famous person] did X. The result: Y. The lesson: Z"
- "Everyone talks about X. Nobody talks about Y. Y matters more because..."
- "The [field] principle that changed how I think: [principle + application]"

OUTPUT: A tweet of optimal length for the content. Can be short and punchy or longer if needed. Include multimedia suggestions where they'd enhance understanding.

Text to transform into an informative tweet:
` + text;

    const prompt = customPrompt || (style === "engagement" ? engagementPrompt : informativePrompt);

    let response = "";
    let inputTokens = this.estimateTokens(prompt);
    let outputTokens = 0;
    let success = true;
    let error: string | undefined;

    try {
      switch (this.config.provider) {
        case "gemini":
          const geminiModel = this.geminiClient!.getGenerativeModel({
            model: this.config.model,
          });
          const geminiResult = await geminiModel.generateContent(prompt);
          response = geminiResult.response.text().trim();
          outputTokens = this.estimateTokens(response);
          break;

        case "openai":
          const openaiParams: any = {
            model: this.config.model,
            messages: [{ role: "user", content: prompt }],
          };

          // O3 reasoning models use max_completion_tokens and don't support temperature
          if (this.isO3Model(this.config.model)) {
            openaiParams.max_completion_tokens = 10000; // Extended for O3
            delete openaiParams.max_tokens; // Remove max_tokens for O3
            // O3 doesn't support temperature
          } else {
            openaiParams.max_tokens = 100;
            openaiParams.temperature = 0.8;
          }

          const openaiResult =
            await this.openaiClient!.chat.completions.create(openaiParams);
          response = openaiResult.choices[0].message?.content || "";
          if (openaiResult.usage) {
            inputTokens = openaiResult.usage.prompt_tokens;
            outputTokens = openaiResult.usage.completion_tokens;
          }
          break;

        case "anthropic":
          const anthropicResult = await this.anthropicClient!.messages.create({
            model: this.config.model,
            max_tokens: 100,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
          });
          response =
            anthropicResult.content[0].type === "text"
              ? anthropicResult.content[0].text
              : "";
          if (anthropicResult.usage) {
            inputTokens = anthropicResult.usage.input_tokens;
            outputTokens = anthropicResult.usage.output_tokens;
          }
          break;

        case "deepseek":
          const deepseekResult =
            await this.deepseekClient!.chat.completions.create({
              model: this.config.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 100,
              temperature: 0.8,
            });
          response = deepseekResult.choices[0].message?.content || "";
          if (deepseekResult.usage) {
            inputTokens = deepseekResult.usage.prompt_tokens;
            outputTokens = deepseekResult.usage.completion_tokens;
          }
          break;
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await this.trackUsage(
        "makeViralTweet",
        inputTokens,
        outputTokens,
        success,
        error,
      );
    }

    return response.trim();
  }

  /** Extract multiple actionable tasks from text */
  async extractMultipleTasks(text: string): Promise<string[]> {
    const prompt =
      `Extract ALL actionable tasks from the following text.\n` +
      `An actionable task is something specific that needs to be done.\n` +
      `Return each task on a new line in imperative mood (e.g., "Call John", "Send report", "Review document").\n` +
      `If no actionable tasks are found, return "NONE".\n` +
      `Do not include explanations or numbering, just the tasks.\n\n` +
      `Examples of actionable tasks:\n` +
      `- Call the dentist to schedule appointment\n` +
      `- Review Q4 budget proposal\n` +
      `- Send follow-up email to Sarah\n` +
      `- Update project timeline\n\n` +
      `Examples of non-actionable items (don't include these):\n` +
      `- General observations or facts\n` +
      `- Questions without action\n` +
      `- Past events or completed tasks\n` +
      `- Context or background information\n\n` +
      `Text to analyze:\n` +
      text;

    let response = "";
    let inputTokens = this.estimateTokens(prompt);
    let outputTokens = 0;
    let success = true;
    let error: string | undefined;

    try {
      switch (this.config.provider) {
        case "gemini":
          const geminiModel = this.geminiClient!.getGenerativeModel({
            model: this.config.model,
          });
          const geminiResult = await geminiModel.generateContent(prompt);
          response = geminiResult.response.text().trim();
          outputTokens = this.estimateTokens(response);
          break;

        case "openai":
          const openaiParams: any = {
            model: this.config.model,
            messages: [{ role: "user", content: prompt }],
          };

          // O3 reasoning models use max_completion_tokens and don't support temperature
          if (this.isO3Model(this.config.model)) {
            openaiParams.max_completion_tokens = 512; // For parsing multiple tasks
            delete openaiParams.max_tokens;
            // O3 doesn't support temperature
          } else {
            openaiParams.max_tokens = 500;
            openaiParams.temperature = 0.3;
          }

          const openaiResult =
            await this.openaiClient!.chat.completions.create(openaiParams);
          response = openaiResult.choices[0].message?.content || "NONE";
          if (openaiResult.usage) {
            inputTokens = openaiResult.usage.prompt_tokens;
            outputTokens = openaiResult.usage.completion_tokens;
          }
          break;

        case "anthropic":
          const anthropicResult = await this.anthropicClient!.messages.create({
            model: this.config.model,
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });
          response =
            anthropicResult.content[0].type === "text"
              ? anthropicResult.content[0].text
              : "NONE";
          if (anthropicResult.usage) {
            inputTokens = anthropicResult.usage.input_tokens;
            outputTokens = anthropicResult.usage.output_tokens;
          }
          break;

        case "deepseek":
          const deepseekResult =
            await this.deepseekClient!.chat.completions.create({
              model: this.config.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 500,
              temperature: 0.3,
            });
          response = deepseekResult.choices[0].message?.content || "NONE";
          if (deepseekResult.usage) {
            inputTokens = deepseekResult.usage.prompt_tokens;
            outputTokens = deepseekResult.usage.completion_tokens;
          }
          break;
      }

      // Parse the response
      if (response.trim() === "NONE") {
        return [];
      }

      // Split by newlines and filter out empty lines
      const tasks = response
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !line.match(/^[-•*]/)) // Remove bullet points if any
        .map((line) => line.replace(/^[-•*]\s*/, "")); // Clean up any remaining formatting

      return tasks;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await this.trackUsage(
        "extractMultipleTasks",
        inputTokens,
        outputTokens,
        success,
        error,
      );
    }
  }

  /** Get model display name */
  getModelName(): string {
    return `${this.config.provider}/${this.config.model}`;
  }
}

/** List of supported models */
export const SUPPORTED_MODELS = {
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-pro"],
  openai: [
    "o3",
    "o3-high",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
  anthropic: [
    "claude-3-haiku-20240307",
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-sonnet-latest",
  ],
  deepseek: ["deepseek-chat", "deepseek-coder"],
};
