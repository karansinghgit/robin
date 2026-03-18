import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLOUD_PROVIDER_IDS, CloudProviderId, ConversationThread, ThreadSummary } from "../shared/contracts";

export interface SettingsData {
  onboardingCompleted: boolean;
  preferredMode: "search" | "local";
  shortcut: string;
  providers: {
    cloud: {
      activeProvider: CloudProviderId;
    };
    perplexity: {
      model: string;
      preset: string;
    };
    ollama: {
      baseUrl: string;
      model: string;
    };
  };
}

const DEFAULT_SETTINGS: SettingsData = {
  onboardingCompleted: false,
  preferredMode: "search",
  shortcut: "CommandOrControl+Shift+Space",
  providers: {
    cloud: {
      activeProvider: "perplexity"
    },
    perplexity: {
      model: "openai/gpt-5-mini",
      preset: "pro-search"
    },
    ollama: {
      baseUrl: "http://localhost:11434",
      model: ""
    }
  }
};

const CLOUD_PROVIDER_ID_SET = new Set<CloudProviderId>(CLOUD_PROVIDER_IDS);

function normalizeSettings(raw: unknown): SettingsData {
  const source = (raw && typeof raw === "object") ? (raw as Partial<SettingsData>) : {};
  const sourceProviders = (source.providers ?? {}) as Partial<SettingsData["providers"]>;
  const sourceCloud = (sourceProviders.cloud ?? {}) as Partial<SettingsData["providers"]["cloud"]>;
  const sourcePerplexity = (sourceProviders.perplexity ?? {}) as Partial<SettingsData["providers"]["perplexity"]>;
  const sourceOllama = (sourceProviders.ollama ?? {}) as Partial<SettingsData["providers"]["ollama"]>;

  const preferredMode = source.preferredMode === "local" ? "local" : "search";
  const shortcut = typeof source.shortcut === "string" && source.shortcut.trim()
    ? source.shortcut
    : DEFAULT_SETTINGS.shortcut;

  return {
    onboardingCompleted: Boolean(source.onboardingCompleted),
    preferredMode,
    shortcut,
    providers: {
      cloud: {
        activeProvider: typeof sourceCloud.activeProvider === "string" && CLOUD_PROVIDER_ID_SET.has(sourceCloud.activeProvider as CloudProviderId)
          ? sourceCloud.activeProvider as CloudProviderId
          : DEFAULT_SETTINGS.providers.cloud.activeProvider
      },
      perplexity: {
        model: typeof sourcePerplexity.model === "string" && sourcePerplexity.model.trim()
          ? sourcePerplexity.model
          : DEFAULT_SETTINGS.providers.perplexity.model,
        preset: typeof sourcePerplexity.preset === "string" && sourcePerplexity.preset.trim()
          ? sourcePerplexity.preset
          : DEFAULT_SETTINGS.providers.perplexity.preset
      },
      ollama: {
        baseUrl: typeof sourceOllama.baseUrl === "string" && sourceOllama.baseUrl.trim()
          ? sourceOllama.baseUrl
          : DEFAULT_SETTINGS.providers.ollama.baseUrl,
        model: typeof sourceOllama.model === "string"
          ? sourceOllama.model
          : DEFAULT_SETTINGS.providers.ollama.model
      }
    }
  };
}

interface ThreadsFile {
  threads: ConversationThread[];
}

export class AppStorage {
  private readonly rootDir = path.join(app.getPath("userData"), "data");
  private readonly settingsPath = path.join(this.rootDir, "settings.json");
  private readonly threadsPath = path.join(this.rootDir, "threads.json");

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await this.ensureFile(this.settingsPath, DEFAULT_SETTINGS);
    await this.ensureFile<ThreadsFile>(this.threadsPath, { threads: [] });
  }

  async getSettings(): Promise<SettingsData> {
    const raw = await this.readJson<unknown>(this.settingsPath, DEFAULT_SETTINGS);
    const normalized = normalizeSettings(raw);
    await this.writeJson(this.settingsPath, normalized);
    return normalized;
  }

  async saveSettings(updater: (current: SettingsData) => SettingsData): Promise<SettingsData> {
    const current = await this.getSettings();
    const next = updater(current);
    await this.writeJson(this.settingsPath, next);
    return next;
  }

  async listThreads(): Promise<ThreadSummary[]> {
    const threads = await this.getThreads();
    return threads
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((thread) => ({
        id: thread.id,
        title: thread.title,
        mode: thread.mode,
        updatedAt: thread.updatedAt,
        preview: thread.messages.at(-1)?.content ?? ""
      }));
  }

  async loadThread(id: string): Promise<ConversationThread | null> {
    const threads = await this.getThreads();
    return threads.find((thread) => thread.id === id) ?? null;
  }

  async upsertThread(thread: ConversationThread): Promise<void> {
    const threads = await this.getThreads();
    const index = threads.findIndex((item) => item.id === thread.id);
    if (index === -1) {
      threads.push(thread);
    } else {
      threads[index] = thread;
    }
    await this.writeJson(this.threadsPath, { threads });
  }

  private async getThreads(): Promise<ConversationThread[]> {
    const file = await this.readJson<ThreadsFile>(this.threadsPath, { threads: [] });
    return file.threads;
  }

  private async ensureFile<T>(filePath: string, initial: T): Promise<void> {
    try {
      await readFile(filePath, "utf8");
    } catch {
      await this.writeJson(filePath, initial);
    }
  }

  private async readJson<T>(filePath: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export function buildThreadTitle(prompt: string): string {
  const compact = prompt.trim().replace(/\s+/g, " ");
  return compact.length <= 48 ? compact : `${compact.slice(0, 45)}...`;
}
