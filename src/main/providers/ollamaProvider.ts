import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ChatMessage, Citation, LocalModelCatalogItem, ModelPullResult, OllamaStatus } from "../../shared/contracts";

const execFileAsync = promisify(execFile);
const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";
const OLLAMA_LIBRARY_URL = "https://ollama.com/library?sort=popular";
const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000;

interface PullProgressChunk {
  status?: string;
  completed?: number;
  total?: number;
  digest?: string;
  error?: string;
}

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(input: string): string {
  return decodeHtml(input.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseParamBillions(sizeToken: string): number {
  const normalized = sizeToken.trim().toLowerCase();
  const match = normalized.match(/^([\d.]+)\s*([mb])$/);
  if (!match) {
    return 0;
  }

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  if (match[2] === "m") {
    return numeric / 1000;
  }

  return numeric;
}

function buildModelDownloadEstimate(paramsBillions: number): { estimatedSizeMb: number; minRamGb: number } {
  const estimatedSizeMb = Math.max(256, Math.round(paramsBillions * 520));
  const minRamGb = Math.max(2, Math.round(((estimatedSizeMb / 1024) * 1.45 + 0.5) * 10) / 10);
  return { estimatedSizeMb, minRamGb };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildBaseUrlCandidates(baseUrl: string): string[] {
  const normalized = normalizeBaseUrl(baseUrl);
  const candidates = [normalized];

  try {
    const url = new URL(normalized);
    if (url.hostname === "localhost") {
      const fallback = new URL(url.toString());
      fallback.hostname = "127.0.0.1";
      candidates.push(normalizeBaseUrl(fallback.toString()));
    } else if (url.hostname === "127.0.0.1") {
      const fallback = new URL(url.toString());
      fallback.hostname = "localhost";
      candidates.push(normalizeBaseUrl(fallback.toString()));
    }
  } catch {
    // Keep original base URL only if parsing fails.
  }

  return Array.from(new Set(candidates));
}

function formatReachabilityError(baseUrl: string): string {
  return `Could not reach Ollama at ${normalizeBaseUrl(baseUrl)}. Open Ollama (or run 'ollama serve') and try again.`;
}

export class OllamaProvider {
  private catalogCache: { loadedAt: number; items: LocalModelCatalogItem[] } | null = null;

  async detect(baseUrl: string, selectedModel?: string): Promise<OllamaStatus> {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    const installed = await this.isInstalled();
    if (!installed) {
      return {
        state: "not_installed",
        baseUrl: normalizedBaseUrl,
        models: [],
        selectedModel,
        downloadUrl: OLLAMA_DOWNLOAD_URL
      };
    }

    const version = await this.getVersion();

    for (const candidate of buildBaseUrlCandidates(normalizedBaseUrl)) {
      try {
        const response = await fetch(`${candidate}/api/tags`);
        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
        const models = (payload.models ?? [])
          .map((item) => item.name ?? item.model ?? "")
          .filter(Boolean);

        return {
          state: models.length > 0 ? "ready" : "no_model",
          baseUrl: candidate,
          models,
          selectedModel: selectedModel || models[0],
          version,
          downloadUrl: OLLAMA_DOWNLOAD_URL
        };
      } catch {
        continue;
      }
    }

    return {
      state: "not_running",
      baseUrl: normalizedBaseUrl,
      models: [],
      selectedModel,
      version,
      downloadUrl: OLLAMA_DOWNLOAD_URL
    };
  }

  async streamReply(input: {
    baseUrl: string;
    model: string;
    messages: ChatMessage[];
    onDelta: (delta: string) => void;
  }): Promise<{ citations: Citation[] }> {
    let response: Response | null = null;
    for (const candidate of buildBaseUrlCandidates(input.baseUrl)) {
      try {
        const nextResponse = await fetch(`${candidate}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: input.model,
            messages: input.messages.map((message) => ({
              role: message.role,
              content: message.content
            })),
            stream: true
          })
        });
        response = nextResponse;
        if (response.ok && response.body) {
          break;
        }
      } catch {
        continue;
      }
    }

    if (!response) {
      throw new Error(formatReachabilityError(input.baseUrl));
    }

    if (!response.ok || !response.body) {
      throw new Error("Ollama did not return a streaming response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const chunk = JSON.parse(trimmed) as { message?: { content?: string } };
        const delta = chunk.message?.content ?? "";
        if (delta) {
          input.onDelta(delta);
        }
      }
    }

    if (buffer.trim()) {
      const chunk = JSON.parse(buffer) as { message?: { content?: string } };
      const delta = chunk.message?.content ?? "";
      if (delta) {
        input.onDelta(delta);
      }
    }

    return { citations: [] };
  }

  async listCatalog(limit = 100): Promise<LocalModelCatalogItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const now = Date.now();

    if (this.catalogCache && now - this.catalogCache.loadedAt < CATALOG_CACHE_TTL_MS) {
      return this.catalogCache.items.slice(0, safeLimit);
    }

    const response = await fetch(OLLAMA_LIBRARY_URL);
    if (!response.ok) {
      throw new Error("Could not fetch Ollama model catalog.");
    }

    const html = await response.text();
    const blocks = html.match(/<li x-test-model[\s\S]*?<\/li>/g) ?? [];
    const dedupe = new Set<string>();
    const items: LocalModelCatalogItem[] = [];

    for (const block of blocks) {
      const nameMatch =
        block.match(/x-test-model-title[^>]*title="([^"]+)"/)?.[1]
        ?? block.match(/href="\/library\/([^":?#"]+)"/)?.[1];
      const modelName = nameMatch?.trim();
      if (!modelName || dedupe.has(modelName)) {
        continue;
      }

      const sizeMatches = Array.from(block.matchAll(/x-test-size[^>]*>([^<]+)</g))
        .map((match) => normalizeText(match[1]))
        .filter(Boolean);
      const uniqueSizes = Array.from(new Set(sizeMatches));
      const sizeChoices = uniqueSizes
        .map((sizeLabel) => ({ sizeLabel, paramsBillions: parseParamBillions(sizeLabel) }))
        .filter((entry) => entry.paramsBillions > 0)
        .sort((left, right) => left.paramsBillions - right.paramsBillions);

      const smallest = sizeChoices[0] ?? { sizeLabel: "latest", paramsBillions: 7 };
      const selectedTag = smallest.sizeLabel.toLowerCase() === "latest" ? "latest" : smallest.sizeLabel;
      const modelTag = `${modelName}:${selectedTag}`;
      const descriptionMatch = block.match(/<p class="max-w-lg break-words text-neutral-800 text-md">([\s\S]*?)<\/p>/)?.[1] ?? "";
      const pulls = normalizeText(block.match(/x-test-pull-count>([^<]+)</)?.[1] ?? "—");
      const { estimatedSizeMb, minRamGb } = buildModelDownloadEstimate(smallest.paramsBillions);

      items.push({
        id: modelTag,
        model: modelTag,
        title: modelName,
        description: normalizeText(descriptionMatch) || "Open model from the Ollama library.",
        sizeLabel: selectedTag,
        sizes: uniqueSizes,
        paramsBillions: Number(smallest.paramsBillions.toFixed(3)),
        estimatedSizeMb,
        minRamGb,
        pulls: pulls || "—",
        sourceUrl: `https://ollama.com/library/${encodeURIComponent(modelName)}`
      });
      dedupe.add(modelName);

      if (items.length >= 100) {
        break;
      }
    }

    this.catalogCache = {
      loadedAt: now,
      items
    };

    return items.slice(0, safeLimit);
  }

  async pullModel(baseUrl: string, model: string): Promise<ModelPullResult> {
    const targetModel = model.trim();
    if (!targetModel) {
      throw new Error("Model name is required.");
    }

    let response: Response | null = null;
    for (const candidate of buildBaseUrlCandidates(baseUrl)) {
      try {
        const nextResponse = await fetch(`${candidate}/api/pull`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: targetModel,
            stream: true
          })
        });
        response = nextResponse;
        if (response.ok && response.body) {
          break;
        }
      } catch {
        continue;
      }
    }

    if (!response) {
      throw new Error(formatReachabilityError(baseUrl));
    }

    if (!response.ok || !response.body) {
      throw new Error(`Could not start downloading ${targetModel}. Check that Ollama is running.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const result: ModelPullResult = {
      model: targetModel,
      status: "Starting download..."
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        const chunk = JSON.parse(trimmed) as PullProgressChunk;
        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.status) {
          result.status = chunk.status;
        }
        if (typeof chunk.completed === "number") {
          result.completedBytes = chunk.completed;
        }
        if (typeof chunk.total === "number") {
          result.totalBytes = chunk.total;
        }
        if (chunk.digest) {
          result.digest = chunk.digest;
        }
      }
    }

    if (buffer.trim()) {
      const chunk = JSON.parse(buffer.trim()) as PullProgressChunk;
      if (chunk.error) {
        throw new Error(chunk.error);
      }
      if (chunk.status) {
        result.status = chunk.status;
      }
      if (typeof chunk.completed === "number") {
        result.completedBytes = chunk.completed;
      }
      if (typeof chunk.total === "number") {
        result.totalBytes = chunk.total;
      }
      if (chunk.digest) {
        result.digest = chunk.digest;
      }
    }

    return result;
  }

  private async isInstalled(): Promise<boolean> {
    const command = process.platform === "win32" ? "where" : "which";
    try {
      const result = await execFileAsync(command, ["ollama"]);
      return Boolean(result.stdout.trim());
    } catch {
      return false;
    }
  }

  private async getVersion(): Promise<string | undefined> {
    try {
      const result = await execFileAsync("ollama", ["--version"]);
      return result.stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }
}
