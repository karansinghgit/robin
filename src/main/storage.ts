import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLOUD_PROVIDER_IDS, CloudModelCatalogItem, CloudProviderId, ConversationThread, ThreadSummary } from "../shared/contracts";

export interface SettingsData {
  onboardingCompleted: boolean;
  preferredMode: "search" | "local";
  shortcut: string;
  providers: {
    cloud: {
      activeProvider: CloudProviderId;
      selectedModels: Partial<Record<CloudProviderId, string[]>>;
      catalogCache: Partial<Record<CloudProviderId, { fetchedAt: string; models: CloudModelCatalogItem[] }>>;
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

type LegacySettingsShape = {
  onboardingCompleted?: boolean;
  preferredMode?: "search" | "local";
  shortcut?: string;
  activeCloudProvider?: CloudProviderId;
  perplexityModel?: string;
  perplexityPreset?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
};

const DEFAULT_SETTINGS: SettingsData = {
  onboardingCompleted: false,
  preferredMode: "search",
  shortcut: "CommandOrControl+Shift+Space",
  providers: {
    cloud: {
      activeProvider: "openai",
      selectedModels: {},
      catalogCache: {}
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
  const source = (raw && typeof raw === "object") ? (raw as Partial<SettingsData> & LegacySettingsShape) : {};
  const sourceProviders = (source.providers ?? {}) as Partial<SettingsData["providers"]>;
  const sourceCloud = (sourceProviders.cloud ?? {}) as Partial<SettingsData["providers"]["cloud"]>;
  const sourcePerplexity = (sourceProviders.perplexity ?? {}) as Partial<SettingsData["providers"]["perplexity"]>;
  const sourceOllama = (sourceProviders.ollama ?? {}) as Partial<SettingsData["providers"]["ollama"]>;

  const preferredMode = source.preferredMode === "local" ? "local" : "search";
  const shortcut = typeof source.shortcut === "string" && source.shortcut.trim()
    ? source.shortcut
    : DEFAULT_SETTINGS.shortcut;

  const normalizedSelectedCloudModels = CLOUD_PROVIDER_IDS.reduce((result, providerId) => {
    const rawModels = sourceCloud.selectedModels?.[providerId];
    if (!Array.isArray(rawModels)) {
      return result;
    }

    const normalizedModels = Array.from(
      new Set(
        rawModels
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

    if (normalizedModels.length > 0) {
      result[providerId] = normalizedModels;
    }

    return result;
  }, {} as Partial<Record<CloudProviderId, string[]>>);

  const normalizedCloudCatalogCache = CLOUD_PROVIDER_IDS.reduce((result, providerId) => {
    const rawEntry = sourceCloud.catalogCache?.[providerId];
    if (!rawEntry || typeof rawEntry !== "object") {
      return result;
    }

    const fetchedAt = typeof rawEntry.fetchedAt === "string" ? rawEntry.fetchedAt : "";
    const rawModels = Array.isArray(rawEntry.models) ? rawEntry.models : [];
    const normalizedModels: CloudModelCatalogItem[] = rawModels
      .filter((item): item is CloudModelCatalogItem => Boolean(item && typeof item === "object" && typeof item.id === "string"))
      .map((item) => ({
        id: item.id.trim(),
        modes: Array.isArray(item.modes)
          ? Array.from(
              new Set(
                item.modes
                  .filter((mode): mode is string => typeof mode === "string")
                  .map((mode) => mode.trim())
                  .filter(Boolean)
              )
            )
          : []
      }))
      .filter((item) => item.id.length > 0);

    if (!fetchedAt || normalizedModels.length === 0) {
      return result;
    }

    result[providerId] = {
      fetchedAt,
      models: normalizedModels
    };
    return result;
  }, {} as Partial<Record<CloudProviderId, { fetchedAt: string; models: CloudModelCatalogItem[] }>>);

  return {
    onboardingCompleted: Boolean(source.onboardingCompleted),
    preferredMode,
    shortcut,
    providers: {
      cloud: {
        activeProvider: typeof sourceCloud.activeProvider === "string" && CLOUD_PROVIDER_ID_SET.has(sourceCloud.activeProvider as CloudProviderId)
          ? sourceCloud.activeProvider as CloudProviderId
          : typeof source.activeCloudProvider === "string" && CLOUD_PROVIDER_ID_SET.has(source.activeCloudProvider as CloudProviderId)
            ? source.activeCloudProvider as CloudProviderId
          : DEFAULT_SETTINGS.providers.cloud.activeProvider,
        selectedModels: normalizedSelectedCloudModels,
        catalogCache: normalizedCloudCatalogCache
      },
      perplexity: {
        model: typeof sourcePerplexity.model === "string" && sourcePerplexity.model.trim()
          ? sourcePerplexity.model
          : typeof source.perplexityModel === "string" && source.perplexityModel.trim()
            ? source.perplexityModel
          : DEFAULT_SETTINGS.providers.perplexity.model,
        preset: typeof sourcePerplexity.preset === "string" && sourcePerplexity.preset.trim()
          ? sourcePerplexity.preset
          : typeof source.perplexityPreset === "string" && source.perplexityPreset.trim()
            ? source.perplexityPreset
          : DEFAULT_SETTINGS.providers.perplexity.preset
      },
      ollama: {
        baseUrl: typeof sourceOllama.baseUrl === "string" && sourceOllama.baseUrl.trim()
          ? sourceOllama.baseUrl
          : typeof source.ollamaBaseUrl === "string" && source.ollamaBaseUrl.trim()
            ? source.ollamaBaseUrl
          : DEFAULT_SETTINGS.providers.ollama.baseUrl,
        model: typeof sourceOllama.model === "string"
          ? sourceOllama.model
          : typeof source.ollamaModel === "string"
            ? source.ollamaModel
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
    const next = normalizeSettings(updater(current));
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
        preview: (() => {
          const last = thread.messages.at(-1);
          const text = last?.content ?? "";
          if (text.trim().length > 0) {
            return text;
          }
          if ((last?.attachments?.length ?? 0) > 0) {
            return "Image";
          }
          return "";
        })()
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

  async deleteThread(id: string): Promise<boolean> {
    const threads = await this.getThreads();
    const nextThreads = threads.filter((thread) => thread.id !== id);
    if (nextThreads.length === threads.length) {
      return false;
    }
    await this.writeJson(this.threadsPath, { threads: nextThreads });
    return true;
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
