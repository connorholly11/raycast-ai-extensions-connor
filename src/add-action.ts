import { open, showHUD } from "@raycast/api";

export default async function command() {
  // Redirect to the extract-tasks command which provides the approval UI
  await open(
    "raycast://extensions/connorholly/raycast-extensions/extract-tasks",
  );
  await showHUD("Opening task extraction with approval...");
}
