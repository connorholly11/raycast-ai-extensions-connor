import {
  getSelectedText,
  Clipboard,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { MultiProviderLLM, ModelConfig } from "./lib/llm-multi-provider";

interface Preferences {
  apiKey: string;
}

export default async function main() {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Crafting wisdom...",
    });

    const config: ModelConfig = {
      provider: "openai",
      model: "o3",
      apiKey,
      trackUsage: true,
    };

    const llm = new MultiProviderLLM(config);
    
    const prompt = `Transform this into a high-value informative tweet. Think George Mack meets James Clear.

CORE PRINCIPLES:
- Lead with insight, not opinion
- Make complexity simple without dumbing it down
- Use concrete examples and specific details
- Structure for maximum clarity and retention
- Write timeless content, not reactive takes
- Assume reader is smart but busy

EFFECTIVE FORMATS:
- "The [X] Framework: [clear explanation with steps]"
- "[Number] lessons from [specific situation]: 1) ... 2) ... 3) ..."
- "What [expert/company] knows that most don't: [insight]"
- "The hidden reason [phenomenon] happens: [explanation]"
- "[Common belief] is wrong. Here's what actually works: [truth]"
- "How [successful example] really [achieved outcome]: [breakdown]"

STRUCTURAL ELEMENTS:
- Use line breaks to aid scanning
- Number points when listing multiple items
- Include one specific stat or example
- End with actionable insight
- No emojis or gimmicks

WRITING STYLE:
- Clear, precise language
- Active voice
- Short sentences
- One idea per line
- Zero fluff

Goal: Make readers save this to reference later. Pack maximum insight into minimum words.

Keep under 280 chars. Optimize for bookmark-ability.

Text to distill:
${selectedText}`;

    const informativeTweet = await llm.makeViralTweet(selectedText, "informative", prompt);

    await Clipboard.copy(informativeTweet);
    await toast.hide();
    await showHUD("Wisdom packaged and copied");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate insight",
      message: String(error),
    });
  }
}