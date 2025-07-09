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
}

export default async function main() {
  try {
    const {
      apiKey,
      provider = "anthropic",
      model = "claude-3-5-sonnet-latest",
    } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Crafting viral tweet...",
    });

    const config: ModelConfig = {
      provider: provider as any,
      model,
      apiKey,
      trackUsage: true,
    };

    const llm = new MultiProviderLLM(config);
    const viralTweet = await llm.makeViralTweet(selectedText);

    await Clipboard.copy(viralTweet);
    await toast.hide();
    await showHUD("🔥 Viral tweet copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate tweet",
      message: String(error),
    });
  }
}
