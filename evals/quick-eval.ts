import { MultiProviderLLM, ModelConfig } from "../src/lib/llm-multi-provider";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

// 20 test cases for evaluation
const TEST_CASES = [
  {
    input: "Neural networks use backpropagation to adjust weights during training. The gradient descent algorithm minimizes the loss function by iteratively updating parameters.",
    description: "AI/ML - Neural Networks"
  },
  {
    input: "The hippocampus plays a crucial role in memory formation. Long-term potentiation strengthens synaptic connections between neurons.",
    description: "Neuroscience - Memory"
  },
  {
    input: "Stop loss orders help limit downside risk. Position sizing determines how much capital to allocate per trade based on risk tolerance.",
    description: "Trading - Risk Management"
  },
  {
    input: "Stoicism teaches us to focus on what we can control. Marcus Aurelius wrote that we suffer more in imagination than reality.",
    description: "Philosophy - Stoicism"
  },
  {
    input: "Regular exercise improves cardiovascular health. Aim for 150 minutes of moderate activity per week to reduce heart disease risk.",
    description: "Health - Exercise"
  },
  {
    input: "Product-market fit is essential for startup success. Focus on solving a real problem for a specific customer segment before scaling.",
    description: "Business - Startups"
  },
  {
    input: "Transformer models use self-attention mechanisms. BERT and GPT revolutionized natural language processing with pre-training approaches.",
    description: "AI - Transformers"
  },
  {
    input: "Dopamine pathways regulate motivation and reward. The ventral tegmental area projects to the nucleus accumbens in the reward circuit.",
    description: "Neuroscience - Dopamine"
  },
  {
    input: "Options Greeks measure sensitivity to various factors. Delta represents the rate of change in option price relative to underlying asset price.",
    description: "Trading - Options"
  },
  {
    input: "Time management techniques like Pomodoro can boost productivity. Break work into 25-minute focused sessions with short breaks.",
    description: "Business - Productivity"
  },
  {
    input: "The weather today is sunny with a high of 75 degrees. Don't forget to bring sunscreen if you're going outside.",
    description: "General - Weather"
  },
  {
    input: "Convolutional neural networks excel at image recognition. The pooling layers reduce spatial dimensions while preserving important features.",
    description: "AI - CNNs"
  },
  {
    input: "Neuroplasticity allows the brain to form new connections throughout life. This is enhanced through learning and deliberate practice.",
    description: "Neuroscience - Plasticity"
  },
  {
    input: "Technical analysis uses chart patterns to predict price movements. Support and resistance levels indicate potential reversal points.",
    description: "Trading - Technical Analysis"
  },
  {
    input: "Intermittent fasting may improve metabolic health. Common protocols include 16:8 or 5:2 eating patterns for weight management.",
    description: "Health - Fasting"
  },
  {
    input: "Reinforcement learning agents learn through trial and error. Q-learning and policy gradient methods optimize decision-making strategies.",
    description: "AI - RL"
  },
  {
    input: "Serotonin affects mood and social behavior. SSRIs work by blocking reuptake of serotonin in synaptic clefts.",
    description: "Neuroscience - Serotonin"
  },
  {
    input: "Diversification reduces portfolio risk. Modern portfolio theory suggests combining uncorrelated assets for optimal risk-return profiles.",
    description: "Trading - Portfolio Theory"
  },
  {
    input: "Kant's categorical imperative states we should act only according to maxims we could will to be universal laws.",
    description: "Philosophy - Kant"
  },
  {
    input: "Venture capital firms invest in high-growth startups. Series A funding typically ranges from $2-15 million for scaling operations.",
    description: "Business - VC"
  }
];

async function evaluateModel(llm: MultiProviderLLM, testCase: typeof TEST_CASES[0]): Promise<string> {
  try {
    const cards = await llm.generateAnkiCards(testCase.input, DECK_CATEGORIES);
    return cards[0]?.deckName || "Uncategorized";
  } catch (error) {
    console.error(`Error for ${llm.getModelName()}: ${error}`);
    return "ERROR";
  }
}

async function runQuickEval() {
  const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!geminiKey || !openaiKey || !anthropicKey) {
    console.error("Missing API keys. Please check .env file");
    process.exit(1);
  }

  // Models to test
  const models: ModelConfig[] = [
    { provider: "openai", model: "o3", apiKey: openaiKey },  // O3 as baseline
    { provider: "openai", model: "gpt-4.1-mini", apiKey: openaiKey },
    { provider: "anthropic", model: "claude-3-haiku-20240307", apiKey: anthropicKey },
    { provider: "gemini", model: "gemini-2.0-flash", apiKey: geminiKey }
  ];

  console.log("🚀 Running Anki Categorization Evaluation\n");
  console.log("Testing 20 samples across 4 models...\n");

  // First, get O3's categorizations as ground truth
  console.log("Step 1: Getting O3 baseline categorizations...");
  const o3Model = new MultiProviderLLM(models[0]);
  const o3Results: Record<number, string> = {};
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    process.stdout.write(`\r  Processing ${i + 1}/20...`);
    const result = await evaluateModel(o3Model, TEST_CASES[i]);
    o3Results[i] = result;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
  console.log("\n✅ O3 baseline complete\n");

  // Now test the other models
  const results: Record<string, { matches: number; results: string[] }> = {};
  
  for (let modelIdx = 1; modelIdx < models.length; modelIdx++) {
    const modelConfig = models[modelIdx];
    const llm = new MultiProviderLLM(modelConfig);
    const modelName = llm.getModelName();
    
    console.log(`Step ${modelIdx + 1}: Testing ${modelName}...`);
    results[modelName] = { matches: 0, results: [] };
    
    for (let i = 0; i < TEST_CASES.length; i++) {
      process.stdout.write(`\r  Processing ${i + 1}/20...`);
      const result = await evaluateModel(llm, TEST_CASES[i]);
      results[modelName].results.push(result);
      
      if (result === o3Results[i]) {
        results[modelName].matches++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
    
    const accuracy = (results[modelName].matches / TEST_CASES.length * 100).toFixed(1);
    console.log(`\n✅ Complete - Accuracy: ${accuracy}% (${results[modelName].matches}/20 match O3)\n`);
  }

  // Print detailed results
  console.log("\n📊 EVALUATION RESULTS\n");
  console.log("=".repeat(80));
  
  // Summary table
  console.log("\nACCURACY SUMMARY (vs O3 baseline):");
  console.log("-".repeat(50));
  
  for (const [model, data] of Object.entries(results)) {
    const accuracy = (data.matches / TEST_CASES.length * 100).toFixed(1);
    console.log(`${model.padEnd(35)} ${accuracy}% (${data.matches}/20)`);
  }
  
  // Detailed comparison
  console.log("\n\nDETAILED COMPARISON:");
  console.log("-".repeat(80));
  console.log("Test Case".padEnd(30) + "O3".padEnd(15) + "4.1-mini".padEnd(15) + "Haiku".padEnd(15) + "Gemini 2.0");
  console.log("-".repeat(80));
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testName = TEST_CASES[i].description.substring(0, 28).padEnd(30);
    const o3Result = o3Results[i].padEnd(15);
    const gpt41mini = results["openai/gpt-4.1-mini"]?.results[i] || "N/A";
    const haiku = results["anthropic/claude-3-haiku-20240307"]?.results[i] || "N/A";
    const gemini = results["gemini/gemini-2.0-flash"]?.results[i] || "N/A";
    
    const gpt41miniDisplay = (gpt41mini === o3Results[i] ? "✅ " : "❌ ") + gpt41mini.substring(0, 12);
    const haikuDisplay = (haiku === o3Results[i] ? "✅ " : "❌ ") + haiku.substring(0, 12);
    const geminiDisplay = (gemini === o3Results[i] ? "✅ " : "❌ ") + gemini.substring(0, 12);
    
    console.log(`${testName}${o3Result}${gpt41miniDisplay.padEnd(15)}${haikuDisplay.padEnd(15)}${geminiDisplay}`);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n✨ Evaluation complete!");
}

// Run the evaluation
if (require.main === module) {
  runQuickEval().catch(console.error);
}