import { ContextProvider } from "./types";

function currentDateTimeBlock(): string {
  const now = new Date();
  const formatted = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  return `Current date and time: ${formatted}`;
}

const ACTION_INSTRUCTIONS = `\
If the user asks you to create, complete, or uncomplete a todo, append one or more JSON action blocks at the very end of your response (after all text):
<action>{"type":"create_todo","title":"..."}</action>
<action>{"type":"complete_todo","id":"..."}</action>
<action>{"type":"uncomplete_todo","id":"..."}</action>
Only output action blocks when the user explicitly asks you to modify their todos. Never fabricate todo IDs.`;

/**
 * Assembles a system prompt from all registered ContextProviders.
 * Always includes date/time and action instructions.
 * Returns an empty string only if no context data exists and no providers contribute.
 */
export async function buildSystemPrompt(
  providers: ContextProvider[],
  userQuery: string
): Promise<string> {
  const sections = await Promise.all(
    providers.map((p) => p.getRelevantContent(userQuery))
  );
  const filled = sections.filter(Boolean);

  const parts: string[] = [
    "You are Robin, a personal AI assistant.",
    currentDateTimeBlock()
  ];

  if (filled.length > 0) {
    parts.push("Use the following context about the user when relevant to their question:");
    parts.push(...filled);
  }

  parts.push(ACTION_INSTRUCTIONS);
  parts.push("Answer helpfully and concisely.");

  return parts.join("\n\n");
}
