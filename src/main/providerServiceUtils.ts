import { ChatMessage } from "../shared/contracts";

export interface TodoAction {
  type: "create_todo" | "complete_todo" | "uncomplete_todo";
  id?: string;
  title?: string;
}

export function prepareMessagesForAPI(messages: ChatMessage[]): ChatMessage[] {
  let lastUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      lastUserIndex = index;
      break;
    }
  }

  return messages.map((message, index) => {
    if (
      message.role === "user" &&
      index !== lastUserIndex &&
      message.attachments?.length
    ) {
      return { ...message, attachments: undefined };
    }
    return message;
  });
}

export function parseActions(content: string): {
  cleanContent: string;
  actions: TodoAction[];
} {
  const actionBlocks = content.match(/<action>[\s\S]*?<\/action>/g) ?? [];
  const actions: TodoAction[] = [];

  for (const block of actionBlocks) {
    const json = block.replace(/<\/?action>/g, "").trim();
    try {
      const parsed = JSON.parse(json) as TodoAction;
      if (
        parsed.type === "create_todo" ||
        parsed.type === "complete_todo" ||
        parsed.type === "uncomplete_todo"
      ) {
        actions.push(parsed);
      }
    } catch {
      // Ignore malformed action blocks and keep the visible response intact.
    }
  }

  const cleanContent = content
    .replace(/<action>[\s\S]*?<\/action>/g, "")
    .trimEnd();
  return { cleanContent, actions };
}

export function truncateContext(
  messages: ChatMessage[],
  maxChars = 100_000
): ChatMessage[] {
  let total = messages.reduce(
    (sum, message) => sum + message.content.length,
    0
  );
  const result = [...messages];

  while (total > maxChars && result.length > 4) {
    const removed = result.shift();
    if (!removed) {
      break;
    }
    total -= removed.content.length;
  }

  return result;
}

export function extractUrls(content: string): string[] {
  const matches = content.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return Array.from(
    new Set(matches.map((entry) => entry.trim().replace(/[.,!?;:]+$/, "")))
  );
}

export function isWeatherQuery(content: string): boolean {
  return /\b(weather|forecast|temperature|rain|humidity|wind)\b/i.test(
    content
  );
}

export function requiresLiveWebSearch(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    /\b(latest|current|currently|right now|today|tonight|this morning|this evening|now|news|forecast|live score|stock price|price today)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  return isWeatherQuery(normalized);
}
