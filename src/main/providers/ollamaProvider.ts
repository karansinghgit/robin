import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ChatMessage, Citation, OllamaStatus } from "../../shared/contracts";

const execFileAsync = promisify(execFile);
const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";

export class OllamaProvider {
  async detect(baseUrl: string, selectedModel?: string): Promise<OllamaStatus> {
    const installed = await this.isInstalled();
    if (!installed) {
      return {
        state: "not_installed",
        baseUrl,
        models: [],
        selectedModel,
        downloadUrl: OLLAMA_DOWNLOAD_URL
      };
    }

    const version = await this.getVersion();

    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        return {
          state: "not_running",
          baseUrl,
          models: [],
          selectedModel,
          version,
          downloadUrl: OLLAMA_DOWNLOAD_URL
        };
      }

      const payload = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
      const models = (payload.models ?? [])
        .map((item) => item.name ?? item.model ?? "")
        .filter(Boolean);

      return {
        state: models.length > 0 ? "ready" : "no_model",
        baseUrl,
        models,
        selectedModel: selectedModel || models[0],
        version,
        downloadUrl: OLLAMA_DOWNLOAD_URL
      };
    } catch {
      return {
        state: "not_running",
        baseUrl,
        models: [],
        selectedModel,
        version,
        downloadUrl: OLLAMA_DOWNLOAD_URL
      };
    }
  }

  async streamReply(input: {
    baseUrl: string;
    model: string;
    messages: ChatMessage[];
    onDelta: (delta: string) => void;
  }): Promise<{ citations: Citation[] }> {
    const response = await fetch(`${input.baseUrl}/api/chat`, {
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
