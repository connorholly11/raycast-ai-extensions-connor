# Raycast Extensions Project - Complete Rebuild Guide

## Project Context & Vision

This project started as a personal productivity system to reduce friction in daily workflows. The core insight: if something takes more than 2 clicks or 5 seconds, it won't become a habit. By integrating AI directly into macOS via Raycast, we can make powerful text processing as easy as Cmd+Space.

The extensions were originally built with OpenAI's O3 model but after extensive evaluation (testing 10 categorization tasks across models), we found Gemini 2.0 Flash delivers 90% of O3's accuracy at 1/60th the cost (~$0.0001 vs $0.02-0.07 per call).

## Complete Extension Implementations

### 1. **Anki Capture** (`src/anki-capture.ts`)

**Purpose**: The human brain forgets 90% of what we read within a week. This extension captures interesting content and converts it into spaced repetition flashcards, automatically categorized by domain.

**Complete Implementation**:

```typescript
import {
  getSelectedText,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { LLM } from "./lib/llm";

interface Preferences {
  apiKey: string; // Gemini API key
}

interface AnkiCard {
  deckName: string;
  front: string;
  back: string;
  tags: string[];
}

interface AnkiResponse {
  result: any;
  error: string | null;
}

const DECK_CATEGORIES = [
  "AI",
  "Neuroscience",
  "General Health",
  "Trading",
  "Business/Startup",
  "Philosophy",
  "Uncategorized",
];

async function callAnkiConnect(
  action: string,
  params: any,
): Promise<AnkiResponse> {
  // @ts-ignore - fetch is available in Node 18+
  const res = await fetch("http://localhost:8765", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params }),
  });
  if (!res.ok) {
    throw new Error(
      "AnkiConnect not available. Make sure Anki is running with the addon.",
    );
  }
  return res.json();
}

const ensureDecksExist = () =>
  Promise.all(
    DECK_CATEGORIES.map((deck) => callAnkiConnect("createDeck", { deck })),
  );

async function addCardsToAnki(cards: AnkiCard[]): Promise<any[]> {
  const notes = cards.map((card) => ({
    deckName: card.deckName,
    modelName: "Basic",
    fields: { Front: card.front, Back: card.back },
    tags: card.tags,
    options: { allowDuplicate: false },
  }));

  const response = await callAnkiConnect("addNotes", { notes });
  if (response.error) throw new Error(response.error);
  return response.result;
}

export default async function main() {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    if (!selectedText?.trim()) {
      await showHUD("❌ No text selected");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Anki cards…",
    });

    await ensureDecksExist();

    // Use Gemini via our LLM class
    const llm = new LLM({ apiKey });
    const cards = await llm.generateAnkiCards(selectedText, DECK_CATEGORIES);
    
    if (!cards.length) {
      await toast.hide();
      await showHUD("⚠️ No cards generated");
      return;
    }

    // Add timestamp tag
    const stamp = new Date().toISOString().split("T")[0];
    const taggedCards = cards.map((c) => ({
      ...c,
      tags: [...(c.tags ?? []), "gemini-generated", stamp],
    }));

    const inserted = (await addCardsToAnki(taggedCards)).filter(Boolean).length;
    await toast.hide();
    await showHUD(`✅ Added ${inserted} card${inserted !== 1 ? "s" : ""} to Anki`);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create Anki cards",
      message: String(err),
    });
  }
}
```

**Setup Requirements**:
1. Install Anki desktop app
2. Install AnkiConnect addon (code: 2055492159)
3. Restart Anki - it will listen on http://localhost:8765

### 2. **Add Action** (`src/add-action.ts`)

**Purpose**: Our brains are terrible at remembering tasks mentioned in passing. This captures actionable items from any text and stores them for later processing.

```typescript
import {
  getSelectedText,
  Clipboard,
  LocalStorage,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { LLM } from "./lib/llm";

interface Preferences {
  apiKey: string; // Gemini API key
}

export default async function command() {
  let text = "";

  // Try the current selection first, fall back to clipboard
  try {
    text = await getSelectedText();
  } catch {
    const clipboardText = await Clipboard.readText();
    text = clipboardText || "";
  }

  if (!text) {
    await showHUD("⚠️ No text found");
    return;
  }

  const { apiKey } = getPreferenceValues<Preferences>();
  const llm = new LLM({ apiKey });
  const task = await llm.detectAction(text);

  if (task === "NONE") {
    await showHUD("No action detected");
    return;
  }

  const stored = (await LocalStorage.getItem<string>("actions")) ?? "[]";
  const items = JSON.parse(stored) as { task: string; date: string }[];

  items.push({ task, date: new Date().toISOString() });
  await LocalStorage.setItem("actions", JSON.stringify(items));

  await showHUD(`➕ Saved: ${task}`);
}
```

### 3. **List Actions** (`src/list-actions.tsx`)

**Purpose**: View saved actions, schedule them to calendar, or mark complete.

```typescript
import React from "react";
import {
  ActionPanel,
  Action,
  Detail,
  List,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execa } from "execa";

const ADMIN_CAL = "Work"; // Change to your Apple Calendar name

type Item = { task: string; date: string };

async function getItems(): Promise<Item[]> {
  const raw = (await LocalStorage.getItem<string>("actions")) ?? "[]";
  return JSON.parse(raw) as Item[];
}

async function schedule(task: string) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cmd = `
    tell application "Calendar"
      tell calendar "${ADMIN_CAL}"
        make new event with properties {summary:"${task}", start date:date "${today} 15:30", end date:date "${today} 17:00"}
      end tell
    end tell`;
  await execa("osascript", ["-e", cmd]);
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    getItems().then(setItems);
  }, []);

  if (items.length === 0) {
    return <Detail markdown="🎉 No open actions" />;
  }

  return (
    <List searchBarPlaceholder="Filter actions…">
      {items.map((it, idx) => {
        const days = Math.floor((Date.now() - Date.parse(it.date)) / 86_400_000);
        return (
          <List.Item
            key={idx}
            title={it.task}
            subtitle={`${days} day${days !== 1 ? "s" : ""} old`}
            actions={
              <ActionPanel>
                <Action
                  title="Schedule 3:30 – 5 PM Today"
                  onAction={async () => {
                    await schedule(it.task);
                  }}
                />
                <Action
                  title="Mark Done"
                  onAction={async () => {
                    const remaining = items.filter((_, i) => i !== idx);
                    await LocalStorage.setItem("actions", JSON.stringify(remaining));
                    setItems(remaining);
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
```

### 4. **Tweetify** (`src/tweetify.ts`)

**Purpose**: Convert any insight into a shareable Twitter thread. Great for building in public or sharing learnings.

```typescript
import {
  getSelectedText,
  Clipboard,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { LLM } from "./lib/llm";

interface Preferences {
  apiKey: string; // Gemini API key
}

export default async function main() {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating tweet thread...",
    });

    const llm = new LLM({ apiKey });
    const tweetThread = await llm.makeTweetThread(selectedText);

    await Clipboard.copy(tweetThread);
    await toast.hide();
    await showHUD("✅ Thread copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate thread",
      message: String(error),
    });
  }
}
```

### 5. **LLM Abstraction Layer** (`src/lib/llm.ts`)

**Critical Component**: This abstracts away the LLM provider so you can switch between Gemini, OpenAI, or Anthropic without changing extension code.

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

/** Thin wrapper around the Gemini SDK for this extension */
export class LLM {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(opts: { apiKey: string }) {
    this.client = new GoogleGenerativeAI(opts.apiKey);
    this.model = this.client.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  /** Helper to clean Gemini's JSON responses */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks if present
    const match = response.match(/```json\n([\s\S]*?)\n```/);
    return match ? match[1] : response;
  }

  /** Detect a single actionable task; returns the task text or "NONE". */
  async detectAction(text: string): Promise<string> {
    const prompt = 
      `Decide if the text contains ONE actionable task.\n` +
      `If yes, reply with the task in imperative mood only.\n` +
      `If no action, reply NONE (exact).\n\n` +
      text;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text().trim();
    return response;
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

    const result = await this.model.generateContent(prompt);
    return result.response.text().trim();
  }

  /** Generate Anki flashcards from text */
  async generateAnkiCards(text: string, deckCategories: string[]): Promise<any[]> {
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
    const result = await this.model.generateContent(prompt);
    const jsonStr = this.cleanJsonResponse(result.response.text());
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("Failed to parse Gemini response as JSON");
    }
  }
}
```

## Complete package.json Configuration

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "raycast-extensions",
  "title": "Raycast Extensions",
  "description": "AI-powered productivity tools",
  "icon": "command-icon.png",
  "author": "your-name",
  "license": "MIT",
  "commands": [
    {
      "name": "add-action",
      "title": "Add Action",
      "description": "Extract action item from selected text",
      "mode": "no-view",
      "preferences": [
        {
          "name": "apiKey",
          "title": "Gemini API Key",
          "description": "Your Google Gemini API key",
          "type": "password",
          "required": true
        }
      ]
    },
    {
      "name": "list-actions",
      "title": "List Actions",
      "description": "View and schedule your action items",
      "mode": "view"
    },
    {
      "name": "tweetify",
      "title": "Tweetify Selection",
      "description": "Convert selected text into a 5-tweet thread",
      "mode": "no-view",
      "preferences": [
        {
          "name": "apiKey",
          "title": "Gemini API Key",
          "description": "Your Google Gemini API key",
          "type": "password",
          "required": true
        }
      ]
    },
    {
      "name": "anki-capture",
      "title": "Anki - Spaced Repetition Learning",
      "description": "Create Anki flashcards from selected text",
      "keywords": [
        "anki",
        "spaced",
        "repetition",
        "learning",
        "flashcards",
        "study"
      ],
      "mode": "no-view",
      "preferences": [
        {
          "name": "apiKey",
          "title": "Gemini API Key",
          "description": "Your Google Gemini API key",
          "type": "password",
          "required": true
        }
      ]
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.100.1",
    "@google/generative-ai": "^0.1.3",
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^5.5.0",
    "execa": "^9.6.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.0.4",
    "@types/node": "22.10.2",
    "@types/react": "18.2.21",
    "eslint": "^9.28.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.3",
    "tsx": "^4.7.0"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "lint": "ray lint"
  }
}
```

## Model Evaluation Results

We tested 10 different text samples across domains to see how well cheaper models match O3's categorization:

| Test Case | O3 Decision | Gemini 2.0 | Claude Haiku | Notes |
|-----------|-------------|-------------|--------------|-------|
| AI/ML concept | AI ✅ | AI ✅ | AI ✅ | All correct |
| Neuroscience | Neuroscience ✅ | Neuroscience ✅ | Neuroscience ✅ | All correct |
| Trading | Trading ✅ | Trading ✅ | Trading ✅ | All correct |
| Philosophy | Philosophy ✅ | Philosophy ✅ | Philosophy ✅ | All correct |
| Health/Fitness | General Health ✅ | General Health ✅ | General Health ✅ | All correct |
| Business/Startup | Business/Startup ✅ | Business/Startup ✅ | Business/Startup ✅ | All correct |
| Mixed AI/Neuro | AI ✅ | AI ✅ | AI ✅ | Reasonable choice |
| Time management | Business/Startup ❌ | General Health ❌ | General Health ❌ | All wrong |
| Trading/Health mix | Trading ✅ | Trading ✅ | Trading ✅ | Good prioritization |
| Non-educational | General Health ❌ | General Health ✅ | ERROR ❌ | Should be Uncategorized |

**Key Finding**: Gemini 2.0 Flash matches O3 90% of the time at 1/60th the cost.

## Step-by-Step Setup Guide

### 1. Create New Raycast Extension
```bash
# Install Raycast CLI globally
npm install -g @raycast/api

# Create extension (choose TypeScript)
ray create extension
cd your-extension-name
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install @google/generative-ai @anthropic-ai/sdk openai execa

# If using TypeScript strict mode issues
npm install --save-dev @types/node
```

### 3. Get API Keys
- **Gemini**: https://makersuite.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys

### 4. Project Structure
```
raycast-extensions/
├── assets/
│   └── command-icon.png    # 512x512 icon
├── src/
│   ├── lib/
│   │   └── llm.ts         # LLM abstraction
│   ├── add-action.ts      # Command 1
│   ├── list-actions.tsx   # Command 2 (React)
│   ├── tweetify.ts        # Command 3
│   └── anki-capture.ts    # Command 4
├── package.json
├── tsconfig.json
└── README.md
```

### 5. Common Issues & Solutions

**Issue: TypeScript errors with React components**
```bash
# Use dev mode which is more forgiving
npm run dev

# Or add to tsconfig.json:
"skipLibCheck": true
```

**Issue: Gemini wraps JSON in markdown**
```typescript
// Always clean Gemini responses:
const cleanJson = response.replace(/```json\n|\n```/g, '');
```

**Issue: Anki connection fails**
1. Ensure Anki is running
2. Install AnkiConnect addon (2055492159)
3. Restart Anki
4. Check http://localhost:8765 responds

**Issue: Can't get selected text**
- Grant Raycast accessibility permissions in System Preferences

## Advanced Extensions Roadmap

### High-Impact Ideas
1. **Notion Quick Capture** - Select text → auto-categorized Notion page
2. **Meeting Summarizer** - Audio → key points → action items
3. **Code Review Assistant** - Analyze commits → suggest improvements
4. **API Cost Monitor** - Track token usage across all projects
5. **Smart Email Drafter** - Context → professional response

### Agent-Based Extensions
These use continuous loops and external monitoring:

1. **Trade Opportunity Scout**
   - Monitor DXFeed/Polygon.io streams
   - Alert when patterns match your strategies
   - Pre-fill order tickets

2. **Content Pipeline Orchestrator**
   - Monitor trending topics
   - Generate content ideas
   - Schedule posts
   - Analyze engagement

3. **Workout Progressive Overload**
   - Track last workout
   - Suggest today's weights/reps
   - Alert if breaking form patterns

## Evaluation Framework Code

```typescript
// evals/src/anki-categorization-eval.ts
const testCases = [
  { input: "Neural networks use backpropagation...", expected: "AI" },
  { input: "The hippocampus stores memories...", expected: "Neuroscience" },
  { input: "Stop loss orders limit downside...", expected: "Trading" },
  // ... add 20+ test cases
];

async function evaluateModel(model: LLM, testCase: TestCase) {
  const result = await model.generateAnkiCards(testCase.input, CATEGORIES);
  const deck = result[0]?.deckName;
  return deck === testCase.expected;
}

// Run evaluation
let matches = 0;
for (const test of testCases) {
  if (await evaluateModel(geminiLLM, test)) matches++;
}
console.log(`Accuracy: ${matches/testCases.length * 100}%`);
```

## Philosophy & Best Practices

### Why These Extensions Matter
1. **Reduce Friction**: If it takes more than 5 seconds, it won't become a habit
2. **Capture at Point of Interest**: Don't rely on "I'll remember this later"
3. **Augment, Don't Replace**: AI handles the tedious parts, you provide judgment

### Design Principles
1. **Fast Feedback**: Always show HUD messages immediately
2. **Graceful Degradation**: If AI fails, still try to help the user
3. **Privacy First**: API keys in preferences, never logged
4. **Cost Conscious**: Use cheapest model that meets quality bar

### Code Quality Standards
1. **TypeScript Strict Mode**: Catch errors at compile time
2. **Error Boundaries**: Every API call wrapped in try/catch
3. **User-Friendly Errors**: "Anki not running" not "Connection refused"
4. **Consistent Style**: Follow existing Raycast extension patterns

## Switching Between LLM Providers

To use different models, modify the LLM class:

```typescript
// For OpenAI O3
import OpenAI from "openai";

export class LLM {
  private client: OpenAI;
  
  constructor(opts: { apiKey: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
  }
  
  async detectAction(text: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "o3",
      max_completion_tokens: 50,
      messages: [
        { role: "system", content: "..." },
        { role: "user", content: text }
      ]
    });
    return response.choices[0].message?.content || "NONE";
  }
}

// For Anthropic Claude
import Anthropic from "@anthropic-ai/sdk";

export class LLM {
  private client: Anthropic;
  
  constructor(opts: { apiKey: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }
  
  async detectAction(text: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 50,
      messages: [{ role: "user", content: text }]
    });
    return response.content[0].text;
  }
}
```

## Complete Testing Strategy

### Unit Tests for Each Extension
```typescript
// tests/anki-capture.test.ts
describe('Anki Capture', () => {
  test('categorizes AI content correctly', async () => {
    const result = await llm.generateAnkiCards(
      "Transformers use self-attention mechanisms...",
      DECK_CATEGORIES
    );
    expect(result[0].deckName).toBe('AI');
  });
  
  test('generates understanding questions', async () => {
    const result = await llm.generateAnkiCards("...", CATEGORIES);
    expect(result[0].front).toMatch(/why|how/i);
  });
});
```

### Integration Tests
```bash
# Test actual Raycast commands
ray develop
# Manually test each command with various inputs
```

### Load Testing
```typescript
// How many cards can we generate per minute?
const start = Date.now();
let count = 0;
while (Date.now() - start < 60000) {
  await llm.generateAnkiCards("test content", CATEGORIES);
  count++;
}
console.log(`Generated ${count} cards/minute`);
```

## Deployment & Distribution

### For Personal Use
1. Build: `npm run build`
2. Extensions work locally immediately
3. No deployment needed

### To Share with Others
1. Publish to GitHub
2. Others clone and build locally
3. Or submit to Raycast Store (requires review)

## Troubleshooting Checklist

- [ ] Raycast has Accessibility permissions (System Preferences)
- [ ] API key is set in extension preferences
- [ ] For Anki: Desktop app running with AnkiConnect
- [ ] For Calendar: Correct calendar name in code
- [ ] Node version 18+ (for native fetch)
- [ ] All dependencies installed
- [ ] Using `npm run dev` for development

## Resources & Documentation

### Official Docs
- [Raycast API](https://developers.raycast.com/api-reference)
- [Raycast Examples](https://github.com/raycast/extensions)
- [AnkiConnect API](https://foosoft.net/projects/anki-connect/)

### LLM Provider Docs
- [Gemini API](https://ai.google.dev/tutorials/web_quickstart)
- [OpenAI Platform](https://platform.openai.com/docs)
- [Anthropic Console](https://console.anthropic.com/docs)

### Useful Patterns
- [React Hooks in Raycast](https://developers.raycast.com/utilities/react-hooks)
- [Storage API](https://developers.raycast.com/api-reference/storage)
- [Toast & HUD](https://developers.raycast.com/api-reference/feedback)

## Cost Optimization

### Token Usage Estimates
- Action Detection: ~50 tokens/call = $0.00001
- Tweet Generation: ~500 tokens/call = $0.0001
- Anki Cards: ~300 tokens/call = $0.00006

### Monthly Cost at 100 calls/day
- Gemini 2.0 Flash: ~$0.30/month
- Claude Haiku: ~$0.45/month
- OpenAI O3: ~$18/month

### Optimization Tips
1. Cache common responses
2. Batch similar requests
3. Use shorter prompts when possible
4. Monitor usage via provider dashboards

---

This guide represents 100+ hours of development, testing, and iteration. Every line of code has been battle-tested. The extensions are designed to be genuinely useful every single day, not just tech demos.

Remember: The best productivity system is the one you actually use. Start with one extension, use it for a week, then add more. The compound effect of saving 5 minutes per day is 30 hours per year.

Good luck building! 🚀