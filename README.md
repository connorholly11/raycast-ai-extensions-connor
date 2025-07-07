# Raycast AI Extensions

AI-powered productivity tools for Raycast that integrate with Google Gemini to automate common tasks.

## Features

### 1. **Add Action** - Extract actionable tasks from any text
- Automatically detects action items in selected text
- Stores tasks locally for later processing
- Falls back to clipboard if no text is selected

### 2. **List Actions** - View and manage your tasks
- See all saved action items with age
- Schedule tasks directly to Apple Calendar
- Mark tasks as complete

### 3. **Tweetify** - Convert text into Twitter threads
- Transforms any text into a 5-tweet thread
- Automatically formats with proper numbering
- Copies to clipboard for easy posting

### 4. **Anki Capture** - Create spaced repetition flashcards
- Converts selected text into Anki flashcards
- Auto-categorizes into appropriate decks
- Supports multiple knowledge domains

## Installation & Setup

### Prerequisites
1. **Install Raycast CLI**
   ```bash
   npm install -g @raycast/api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npx ray build -e dist --skip-types
   ```

### Configuration

1. **Get API Key**
   - Get an OpenAI API key from https://platform.openai.com/api-keys
   - Each command will prompt for the API key on first use
   - Keys are stored securely in Raycast preferences
   - The extension uses GPT-4.1-mini for optimal cost/performance

2. **For Anki Capture**
   - Install [Anki desktop app](https://apps.ankiweb.net/)
   - Install AnkiConnect addon: Tools → Add-ons → Get Add-ons → Code: `2055492159`
   - Restart Anki (must be running when using the command)

3. **For List Actions (Calendar integration)**
   - Update the `ADMIN_CAL` constant in `src/list-actions.tsx` to match your calendar name

## Usage

### Without Development Mode

Once built, your extensions are permanently available in Raycast:

1. **Open Raycast** (Cmd+Space or your custom hotkey)

2. **Search for commands**:
   - "Add Action" - Extract action from selected text
   - "List Actions" - View and schedule saved actions
   - "Tweetify Selection" - Convert text to tweet thread
   - "Anki - Spaced Repetition Learning" - Create flashcards

3. **First time using each command**:
   - Enter your Gemini API key when prompted
   - The key is stored securely and only needed once

**Troubleshooting**: If commands don't appear:
- Restart Raycast: `Cmd+Q` in Raycast, then reopen
- Or run `ray develop` once to register them

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Architecture

The project uses a modular architecture with:
- **LLM abstraction layer** (`src/lib/llm.ts`) - Handles all AI interactions
- **Individual command files** - Each extension is self-contained
- **GPT-4.1-mini** - Provides fast, cost-effective AI processing with excellent categorization

## Available Commands & Models

### Current Configuration
All commands use **OpenAI GPT-4.1-mini** by default (configured in `src/lib/llm.ts`)

### Commands
1. **Add Action** - Detects and saves actionable tasks from text
2. **List Actions** - View, schedule to calendar, or mark tasks complete  
3. **Tweetify Selection** - Creates 5-tweet threads with emojis
4. **Anki - Spaced Repetition Learning** - Generates categorized flashcards

### Supported Models
The LLM abstraction layer supports switching between:
- **Google Gemini**: `gemini-2.0-flash` (default), `gemini-1.5-pro`, `gemini-2.0-pro`
- **OpenAI**: `o3`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-haiku-20240307`, `claude-sonnet-4-20250514`, `claude-opus-4-20250514`, `claude-3-5-sonnet-latest`

To switch models, modify the model initialization in `src/lib/llm.ts:10`

## Cost Optimization

Using GPT-4.1-mini keeps costs very reasonable:
- Action Detection: ~$0.00002 per call ($0.40/1M tokens)
- Tweet Generation: ~$0.0002 per call
- Anki Cards: ~$0.00012 per call

At 100 calls/day, expect ~$1.20/month in API costs.

## Model Evaluation

### Anki Categorization Performance

We evaluated how well different models match O3's categorization decisions across 15 test cases spanning AI, Neuroscience, Trading, Philosophy, Health, and Business topics.

#### Running Evaluations

```bash
# Set API keys
export GEMINI_API_KEY="your-key"
export OPENAI_API_KEY="your-key"  
export ANTHROPIC_API_KEY="your-key"

# Run evaluation
npm run eval
```

#### Results Summary (vs O3 baseline)

| Model | Accuracy | Cost/1K calls | Recommendation |
|-------|----------|---------------|----------------|
| **gemini-2.0-flash** | ~90% | $0.06 | ✅ **Best Value** |
| gpt-4.1-mini | ~88% | $0.40 | Excellent budget option |
| gpt-4o-mini | ~85% | $0.15 | Good budget option |
| claude-3-haiku | ~85% | $0.25 | Fast & capable |
| gpt-4.1 | ~97% | $2.00 | Best accuracy/cost ratio |
| gpt-4o | ~95% | $2.50 | High accuracy |
| claude-sonnet-4 | ~96% | $3.00 | Latest Claude |
| claude-opus-4 | ~98% | $15.00 | Top Anthropic model |
| o3 (baseline) | 100% | $20-70 | Most accurate |

#### Key Findings

1. **Gemini 2.0 Flash** provides the best accuracy-to-cost ratio at 90% match rate for 1/300th the cost of O3
2. Models above $3/1K calls show diminishing returns with only 5% accuracy improvement
3. For production use, gpt-4.1-mini provides the best balance of cost and performance
4. O3 should be reserved for cases requiring maximum accuracy

The full evaluation framework is in `evals/anki-categorization-eval.ts` with detailed test cases and results saved to `evals/results/`.

## Quick Model Reference

### Pricing (per 1M tokens)
- **GPT-4.1**: $2 in / $8 out (1M context)
- **GPT-4.1-mini**: $0.40 in / $1.60 out (1M context) 
- **Claude Sonnet 4**: $3 in / $15 out (200K context)
- **Claude Opus 4**: $15 in / $75 out (200K context)
- **Gemini 2.0 Flash**: $0.075 in / $0.30 out (1M context)

### Performance Benchmarks
- **GPT-4.1**: ~88 MMLU, tops coding leaderboards
- **GPT-4.1-mini**: ~83 MMLU, above Gemini 2.0 Flash (78 MMLU)
- **Claude Sonnet 4**: 73% on SWE-bench (vs 72% for v3.5)
- **Claude Opus 4**: Anthropic's top model, excels at long-context tasks