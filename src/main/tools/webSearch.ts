import { ToolExecutor } from "./types";

const SEARCH_TIMEOUT_MS = 10_000;

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

export function createWebSearchTool(braveApiKey: string): ToolExecutor {
  return {
    definition: {
      name: "web_search",
      description: "Search the web for current information. Use this when the user asks about recent events, facts, or topics that require up-to-date data.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
          count: { type: "number", description: "Number of results (1-10, default 5)" }
        },
        required: ["query"]
      }
    },

    async execute(args: Record<string, unknown>): Promise<string> {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) {
        return "Error: No search query provided.";
      }

      const count = Math.min(Math.max(typeof args.count === "number" ? args.count : 5, 1), 10);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

        const params = new URLSearchParams({ q: query, count: String(count) });
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
          method: "GET",
          headers: {
            "X-Subscription-Token": braveApiKey,
            Accept: "application/json"
          },
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return "Error: Brave Search API key is invalid. Check your key in Settings.";
          }
          return `Error: Search failed (HTTP ${response.status}).`;
        }

        const data = (await response.json()) as BraveSearchResponse;
        const results = data.web?.results ?? [];

        if (results.length === 0) {
          return `No results found for "${query}".`;
        }

        return results
          .map((r, i) => `${i + 1}. ${r.title ?? "Untitled"}\n   ${r.url ?? ""}\n   ${r.description ?? ""}`)
          .join("\n\n");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return "Error: Search timed out.";
        }
        return `Error: ${error instanceof Error ? error.message : "Search failed."}`;
      }
    }
  };
}
