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
      title: "Cooking up chaos...",
    });

    const config: ModelConfig = {
      provider: "anthropic",
      model: "claude-opus-4-20250514",
      apiKey,
      trackUsage: true,
    };

    const llm = new MultiProviderLLM(config);
    
    const prompt = `You're about to write the most engagement-baiting tweet possible. Channel pure chaos energy.

MINDSET: You're that guy who says what everyone's thinking but is too scared to tweet. You're simultaneously the smartest and dumbest person in the room. Think: Naval meets a shitposter who just discovered capitalism.

CORE TACTICS:
- Start with an absolute banger that makes people stop scrolling
- State opinions as facts, facts as conspiracies
- Humble brag so hard it loops back to being based
- Make fun of the exact people who will share your tweet
- Drop uncomfortable truths wrapped in comedy
- Use specific numbers that sound made up but aren't
- Write like you just did a line and opened Twitter

FORMATS THAT PRINT:
- "I just realized [obvious thing] and now I can't unsee it"
- "Hot take: [ice cold take that's actually profound]"
- "The real reason [successful thing] works: [oversimplified but true]"
- "Society isn't ready for this conversation but..."
- "[Normal thing] is just [weird comparison] for [demographic]"
- "Imagine still [doing normal thing] in 2025"

LANGUAGE RULES:
- No emojis (you're not a millennial trying to be cool)
- No punctuation except periods (maybe one question mark if perfect)
- Lowercase unless EMPHASIS needed
- Write like you're explaining the matrix to someone still plugged in

The goal: Make them angry enough to quote tweet but true enough they can't refute it.

Keep it under 280 chars. Make it impossible to ignore.

Text to weaponize:
${selectedText}`;

    const viralTweet = await llm.makeViralTweet(selectedText, "engagement", prompt);

    await Clipboard.copy(viralTweet);
    await toast.hide();
    await showHUD("Viral nuke armed and copied");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate chaos",
      message: String(error),
    });
  }
}