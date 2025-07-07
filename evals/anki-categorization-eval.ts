import { MultiProviderLLM, ModelConfig, SUPPORTED_MODELS } from "../src/lib/llm-multi-provider";
import * as fs from "fs";
import * as path from "path";

// Test categories matching the Anki extension
const DECK_CATEGORIES = [
  "AI",
  "Neuroscience", 
  "General Health",
  "Trading",
  "Business/Startup",
  "Philosophy",
  "Uncategorized"
];

// Test cases with expected categorization (based on O3 as ground truth)
const TEST_CASES = [
  {
    input: "Neural networks use backpropagation to adjust weights during training. The gradient descent algorithm minimizes the loss function.",
    expected: "AI",
    description: "AI/ML concept"
  },
  {
    input: "The hippocampus plays a crucial role in memory formation. Long-term potentiation strengthens synaptic connections.",
    expected: "Neuroscience",
    description: "Neuroscience"
  },
  {
    input: "Stop loss orders help limit downside risk. Position sizing determines how much capital to allocate per trade.",
    expected: "Trading",
    description: "Trading"
  },
  {
    input: "Stoicism teaches us to focus on what we can control. Marcus Aurelius wrote that we suffer more in imagination than reality.",
    expected: "Philosophy",
    description: "Philosophy"
  },
  {
    input: "Regular exercise improves cardiovascular health. Aim for 150 minutes of moderate activity per week.",
    expected: "General Health",
    description: "Health/Fitness"
  },
  {
    input: "Product-market fit is essential for startup success. Focus on solving a real problem for a specific customer segment.",
    expected: "Business/Startup",
    description: "Business/Startup"
  },
  {
    input: "Transformer models use self-attention mechanisms. BERT and GPT revolutionized natural language processing.",
    expected: "AI",
    description: "AI - Transformers"
  },
  {
    input: "Dopamine pathways regulate motivation and reward. The ventral tegmental area projects to the nucleus accumbens.",
    expected: "Neuroscience",
    description: "Neuroscience - Dopamine"
  },
  {
    input: "Options Greeks measure sensitivity to various factors. Delta represents the rate of change in option price relative to underlying.",
    expected: "Trading",
    description: "Trading - Options"
  },
  {
    input: "Time management techniques like Pomodoro can boost productivity. Break work into 25-minute focused sessions.",
    expected: "Business/Startup",
    description: "Productivity/Time Management"
  },
  {
    input: "The weather today is sunny with a high of 75 degrees. Don't forget to bring sunscreen.",
    expected: "Uncategorized",
    description: "Non-educational content"
  },
  {
    input: "Convolutional neural networks excel at image recognition. The pooling layers reduce spatial dimensions while preserving features.",
    expected: "AI",
    description: "AI - CNNs"
  },
  {
    input: "Neuroplasticity allows the brain to form new connections throughout life. This is enhanced through learning and practice.",
    expected: "Neuroscience",
    description: "Mixed AI/Neuro - neuroplasticity"
  },
  {
    input: "Technical analysis uses chart patterns to predict price movements. Support and resistance levels indicate potential reversal points.",
    expected: "Trading",
    description: "Trading - Technical Analysis"
  },
  {
    input: "Intermittent fasting may improve metabolic health. Common protocols include 16:8 or 5:2 eating patterns.",
    expected: "General Health",
    description: "Health - Fasting"
  }
];

interface EvalResult {
  model: string;
  testCase: string;
  expected: string;
  actual: string;
  correct: boolean;
  error?: string;
}

async function evaluateModel(llm: MultiProviderLLM, testCase: typeof TEST_CASES[0]): Promise<EvalResult> {
  try {
    const cards = await llm.generateAnkiCards(testCase.input, DECK_CATEGORIES);
    const actualDeck = cards[0]?.deckName || "Uncategorized";
    
    return {
      model: llm.getModelName(),
      testCase: testCase.description,
      expected: testCase.expected,
      actual: actualDeck,
      correct: actualDeck === testCase.expected
    };
  } catch (error) {
    return {
      model: llm.getModelName(),
      testCase: testCase.description,
      expected: testCase.expected,
      actual: "ERROR",
      correct: false,
      error: String(error)
    };
  }
}

async function runEvaluation() {
  // Load API keys from environment
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!geminiKey || !openaiKey || !anthropicKey) {
    console.error("Please set GEMINI_API_KEY, OPENAI_API_KEY, and ANTHROPIC_API_KEY environment variables");
    process.exit(1);
  }

  const models: ModelConfig[] = [
    // OpenAI models
    { provider: "openai", model: "o3", apiKey: openaiKey },
    { provider: "openai", model: "gpt-4.1", apiKey: openaiKey },
    { provider: "openai", model: "gpt-4.1-mini", apiKey: openaiKey },
    { provider: "openai", model: "gpt-4o", apiKey: openaiKey },
    { provider: "openai", model: "gpt-4o-mini", apiKey: openaiKey },
    { provider: "openai", model: "gpt-4-turbo", apiKey: openaiKey },
    { provider: "openai", model: "gpt-3.5-turbo", apiKey: openaiKey },
    
    // Gemini models
    { provider: "gemini", model: "gemini-2.0-flash", apiKey: geminiKey },
    { provider: "gemini", model: "gemini-1.5-pro", apiKey: geminiKey },
    { provider: "gemini", model: "gemini-2.0-pro", apiKey: geminiKey },
    
    // Anthropic models
    { provider: "anthropic", model: "claude-3-haiku-20240307", apiKey: anthropicKey },
    { provider: "anthropic", model: "claude-sonnet-4-20250514", apiKey: anthropicKey },
    { provider: "anthropic", model: "claude-opus-4-20250514", apiKey: anthropicKey },
    { provider: "anthropic", model: "claude-3-5-sonnet-latest", apiKey: anthropicKey }
  ];

  const results: EvalResult[] = [];
  
  // Run O3 first as baseline
  console.log("Running O3 baseline evaluation...");
  const o3Model = new MultiProviderLLM(models[0]);
  const o3Results: EvalResult[] = [];
  
  for (const testCase of TEST_CASES) {
    const result = await evaluateModel(o3Model, testCase);
    o3Results.push(result);
    console.log(`O3 - ${testCase.description}: ${result.actual}`);
  }

  // Update expected values based on O3 results
  for (let i = 0; i < TEST_CASES.length; i++) {
    TEST_CASES[i].expected = o3Results[i].actual;
  }

  // Evaluate all models
  for (const modelConfig of models) {
    console.log(`\nEvaluating ${modelConfig.provider}/${modelConfig.model}...`);
    const llm = new MultiProviderLLM(modelConfig);
    
    for (const testCase of TEST_CASES) {
      const result = await evaluateModel(llm, testCase);
      results.push(result);
      
      const status = result.correct ? "✅" : "❌";
      console.log(`${status} ${testCase.description}: ${result.actual} (expected: ${result.expected})`);
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate summary report
  const modelAccuracy: Record<string, { correct: number; total: number }> = {};
  
  for (const result of results) {
    if (!modelAccuracy[result.model]) {
      modelAccuracy[result.model] = { correct: 0, total: 0 };
    }
    modelAccuracy[result.model].total++;
    if (result.correct) {
      modelAccuracy[result.model].correct++;
    }
  }

  // Create markdown report
  let report = "# Anki Categorization Evaluation Results\n\n";
  report += `Evaluated ${TEST_CASES.length} test cases across ${models.length} models.\n\n`;
  report += "## Model Accuracy (vs O3 baseline)\n\n";
  report += "| Model | Accuracy | Correct/Total | Cost per 1000 calls |\n";
  report += "|-------|----------|---------------|--------------------|\n";
  
  const sortedModels = Object.entries(modelAccuracy).sort((a, b) => {
    const accuracyA = a[1].correct / a[1].total;
    const accuracyB = b[1].correct / b[1].total;
    return accuracyB - accuracyA;
  });

  const costEstimates: Record<string, string> = {
    "openai/o3": "$20-70",
    "openai/gpt-4.1": "$2.00",
    "openai/gpt-4.1-mini": "$0.40",
    "openai/gpt-4o": "$2.50",
    "openai/gpt-4o-mini": "$0.15",
    "openai/gpt-4-turbo": "$10.00",
    "openai/gpt-3.5-turbo": "$0.50",
    "gemini/gemini-2.0-flash": "$0.06",
    "gemini/gemini-1.5-pro": "$1.25",
    "gemini/gemini-2.0-pro": "$1.25",
    "anthropic/claude-3-haiku-20240307": "$0.25",
    "anthropic/claude-sonnet-4-20250514": "$3.00",
    "anthropic/claude-opus-4-20250514": "$15.00",
    "anthropic/claude-3-5-sonnet-latest": "$3.00"
  };

  for (const [model, stats] of sortedModels) {
    const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
    const cost = costEstimates[model] || "Unknown";
    report += `| ${model} | ${accuracy}% | ${stats.correct}/${stats.total} | ~$${cost} |\n`;
  }

  report += "\n## Detailed Results by Test Case\n\n";
  
  for (const testCase of TEST_CASES) {
    report += `### ${testCase.description}\n`;
    report += `**Input:** "${testCase.input.substring(0, 100)}..."\n\n`;
    report += `**O3 Categorization:** ${testCase.expected}\n\n`;
    report += "| Model | Result | Match |\n";
    report += "|-------|--------|-------|\n";
    
    const testResults = results.filter(r => r.testCase === testCase.description);
    for (const result of testResults) {
      const match = result.correct ? "✅" : "❌";
      report += `| ${result.model} | ${result.actual} | ${match} |\n`;
    }
    report += "\n";
  }

  report += "## Key Findings\n\n";
  report += "1. **Best Value**: Models with >90% accuracy at <$1/1000 calls\n";
  report += "2. **Most Accurate**: Models matching O3 100% of the time\n";
  report += "3. **Cost vs Accuracy**: Diminishing returns above 90% accuracy\n";

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const outputDir = path.join(__dirname, "..", "evals", "results");
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, `anki-eval-${timestamp}.md`),
    report
  );

  fs.writeFileSync(
    path.join(outputDir, `anki-eval-${timestamp}.json`),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n✅ Evaluation complete! Results saved to ${outputDir}`);
  console.log("\nTop performers by accuracy:");
  
  for (const [model, stats] of sortedModels.slice(0, 5)) {
    const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
    console.log(`  ${model}: ${accuracy}% (${stats.correct}/${stats.total})`);
  }
}

// Run the evaluation
if (require.main === module) {
  runEvaluation().catch(console.error);
}