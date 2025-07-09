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
  provider?: string;
  model?: string;
  style?: "engagement" | "informative";
}

export default async function main() {
  try {
    const {
      apiKey,
      provider = "anthropic",
      model = "claude-3-5-sonnet-latest",
      style = "engagement",
    } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: style === "engagement" ? "Crafting viral tweet..." : "Creating informative tweet...",
    });

    const config: ModelConfig = {
      provider: provider as any,
      model,
      apiKey,
      trackUsage: true,
    };

    const llm = new MultiProviderLLM(config);
    const viralTweet = await llm.makeViralTweet(selectedText, style);

    await Clipboard.copy(viralTweet);
    await toast.hide();
    await showHUD(style === "engagement" ? "Viral tweet copied to clipboard" : "Informative tweet copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate tweet",
      message: String(error),
    });
  }
}
