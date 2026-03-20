import { ToolExecutor } from "./types";

const MAX_CONTENT_CHARS = 30_000;
const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "Robin/1.0 (Personal AI Assistant)";

function stripHtml(html: string): string {
  // Remove script/style/noscript blocks entirely
  let text = html.replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Prefer article/main content if present
  const articleMatch = text.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
  if (articleMatch) {
    text = articleMatch[2];
  }
  // Convert block elements to newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

export const fetchUrlTool: ToolExecutor = {
  definition: {
    name: "fetch_url",
    description: "Fetch the content of a web page at the given URL and return its text. Use this when the user shares a URL or asks about the content of a specific web page.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to fetch" }
      },
      required: ["url"]
    }
  },

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = typeof args.url === "string" ? args.url.trim() : "";
    if (!url) {
      return "Error: No URL provided.";
    }

    try {
      new URL(url); // validate
    } catch {
      return `Error: Invalid URL "${url}".`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html, application/json, text/plain, */*"
        },
        signal: controller.signal,
        redirect: "follow"
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return `Error: HTTP ${response.status} ${response.statusText}`;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();

      let text: string;
      if (contentType.includes("text/html")) {
        const title = extractTitle(raw);
        const body = stripHtml(raw);
        text = title ? `Title: ${title}\n\n${body}` : body;
      } else {
        text = raw;
      }

      if (text.length > MAX_CONTENT_CHARS) {
        text = text.slice(0, MAX_CONTENT_CHARS) + "\n\n[content truncated]";
      }

      return text || "(Page returned empty content)";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return `Error: Request timed out after ${FETCH_TIMEOUT_MS / 1000}s.`;
      }
      return `Error: ${error instanceof Error ? error.message : "Failed to fetch URL."}`;
    }
  }
};
