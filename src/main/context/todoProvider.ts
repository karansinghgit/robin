import { AppStorage } from "../storage";
import { ContextProvider } from "./types";

export class TodoContextProvider implements ContextProvider {
  constructor(private readonly storage: AppStorage) {}

  async getSummary(): Promise<string> {
    const todos = await this.storage.listTodos();
    if (todos.length === 0) return "";
    const pending = todos.filter((t) => !t.completed).length;
    const done = todos.filter((t) => t.completed).length;
    return `Todos: ${pending} pending, ${done} completed.`;
  }

  async getRelevantContent(query: string): Promise<string> {
    const todos = await this.storage.listTodos();
    if (todos.length === 0) return "";

    // Keyword match: if any query words appear in a todo title, surface those first.
    // If no matches, return all todos. This is the swap point for embeddings later.
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const matched = keywords.length > 0
      ? todos.filter((t) => keywords.some((kw) => t.title.toLowerCase().includes(kw)))
      : [];

    const toDisplay = matched.length > 0 ? matched : todos;
    const lines = toDisplay
      .map((t) => `- [${t.completed ? "x" : " "}] ${t.title} (id:${t.id})`)
      .join("\n");

    return `## Your Todos\n${lines}`;
  }
}
