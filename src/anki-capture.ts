import {
  getSelectedText,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { LLM } from "./lib/llm";

interface Preferences {
  apiKey: string; // Gemini API key
}

interface AnkiCard {
  deckName: string;
  front: string;
  back: string;
  tags: string[];
}

interface AnkiResponse {
  result: any;
  error: string | null;
}

const DECK_CATEGORIES = [
  "AI",
  "Neuroscience",
  "General Health",
  "Trading",
  "Business/Startup",
  "Philosophy",
  "Uncategorized",
];

async function callAnkiConnect(
  action: string,
  params: any,
): Promise<AnkiResponse> {
  // @ts-ignore - fetch is available in Node 18+
  const res = await fetch("http://localhost:8765", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params }),
  });
  if (!res.ok) {
    throw new Error(
      "AnkiConnect not available. Make sure Anki is running with the addon.",
    );
  }
  return res.json() as Promise<AnkiResponse>;
}

const ensureDecksExist = () =>
  Promise.all(
    DECK_CATEGORIES.map((deck) => callAnkiConnect("createDeck", { deck })),
  );

async function addCardsToAnki(cards: AnkiCard[]): Promise<any[]> {
  const notes = cards.map((card) => ({
    deckName: card.deckName,
    modelName: "Basic",
    fields: { Front: card.front, Back: card.back },
    tags: card.tags,
    options: { allowDuplicate: false },
  }));

  const response = await callAnkiConnect("addNotes", { notes });
  if (response.error) throw new Error(response.error);
  return response.result;
}

export default async function main() {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    const selectedText = await getSelectedText();

    if (!selectedText?.trim()) {
      await showHUD("❌ No text selected");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Anki cards…",
    });

    await ensureDecksExist();

    // Use Gemini via our LLM class
    const llm = new LLM({ apiKey });
    const cards = await llm.generateAnkiCards(selectedText, DECK_CATEGORIES);
    
    if (!cards.length) {
      await toast.hide();
      await showHUD("⚠️ No cards generated");
      return;
    }

    // Add timestamp tag
    const stamp = new Date().toISOString().split("T")[0];
    const taggedCards = cards.map((c) => ({
      ...c,
      tags: [...(c.tags ?? []), "gemini-generated", stamp],
    }));

    const inserted = (await addCardsToAnki(taggedCards)).filter(Boolean).length;
    await toast.hide();
    await showHUD(`✅ Added ${inserted} card${inserted !== 1 ? "s" : ""} to Anki`);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create Anki cards",
      message: String(err),
    });
  }
}