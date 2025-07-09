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
    
    const informativeTweet = await llm.makeViralTweet(selectedText, "informative");
    
    console.log("Generated tweet:", informativeTweet);
    
    if (!informativeTweet || informativeTweet.trim() === "") {
      throw new Error("Empty response from AI model");
    }

    await Clipboard.copy(informativeTweet);
    await toast.hide();
    await showHUD("Wisdom packaged and copied");
  } catch (error) {
    console.error("Informative tweet error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate insight",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}