import { ContextProvider } from "./types";

/**
 * Assembles a system prompt from all registered ContextProviders.
 * Returns an empty string if all providers have nothing to contribute.
 */
export async function buildSystemPrompt(
  providers: ContextProvider[],
  userQuery: string
): Promise<string> {
  if (providers.length === 0) return "";

  const sections = await Promise.all(
    providers.map((p) => p.getRelevantContent(userQuery))
  );
  const filled = sections.filter(Boolean);
  if (filled.length === 0) return "";

  return [
    "You are Robin, a personal AI assistant. Use the following context about the user when relevant to their question:",
    ...filled,
    "Answer helpfully. Only reference this context if it is relevant to what the user asked."
  ].join("\n\n");
}
