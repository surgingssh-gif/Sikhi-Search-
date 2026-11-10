import { createContext, useContext } from "react";
import type { Story } from "./stories";

/**
 * Opens a story's preview: its opening paragraphs, with a link through to the
 * publisher. The sheet itself lives in components/StoryPreview.
 */
export const PreviewContext = createContext<((story: Story) => void) | null>(null);

export function usePreview(): (story: Story) => void {
  const open = useContext(PreviewContext);
  if (!open) throw new Error("usePreview needs a PreviewProvider");
  return open;
}
