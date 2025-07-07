import { getSelectedText, Clipboard, showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Preferences {
  apiKey: string;
}

const IMPROVE_PROMPT_SYSTEM = `You are an expert prompt engineer. Your task is to refine prompts for clarity and effectiveness, ensuring future AI instances can understand and execute them successfully.

Analyze the prompt and improve it by:

1. CLARITY - Make ambiguous instructions explicit:
   - Specify exact deliverables and formats
   - Define technical terms or domain-specific language
   - Clarify pronouns and references

2. CONTEXT - Add essential background a future AI needs:
   - What is the goal/purpose?
   - What constraints or requirements exist?
   - What should be prioritized?

3. STRUCTURE - Organize complex requests:
   - Break multi-part tasks into clear steps
   - Highlight dependencies between tasks
   - Specify order of operations if it matters

4. EDGE CASES - Anticipate potential confusion:
   - What assumptions might an AI make incorrectly?
   - What common pitfalls should be avoided?
   - What validation or verification is needed?

5. ACTIONABILITY - Ensure the AI knows exactly what to do:
   - Start with a clear directive
   - Include success criteria
   - Specify any required tools or approaches

PRESERVE the original intent and tone. Don't over-engineer simple requests.
FOCUS on making the prompt foolproof for a fresh AI instance with no prior context.

Return only the improved prompt, no explanations.`;

export default async function Command() {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    if (!selectedText || selectedText.trim() === "") {
      await showHUD("❌ No text selected");
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Improving prompt...",
    });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `${IMPROVE_PROMPT_SYSTEM}

Original prompt to improve:
"""
${selectedText}
"""`;

    const result = await model.generateContent(prompt);
    const improvedPrompt = result.response.text();

    if (!improvedPrompt) {
      throw new Error("No response from AI");
    }

    // Copy to clipboard
    await Clipboard.copy(improvedPrompt);
    
    await showToast({
      style: Toast.Style.Success,
      title: "Prompt improved!",
      message: "Copied to clipboard",
    });

    await showHUD("✅ Improved prompt copied!");

  } catch (error) {
    console.error("Error improving prompt:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to improve prompt",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}