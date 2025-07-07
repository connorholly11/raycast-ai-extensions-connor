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