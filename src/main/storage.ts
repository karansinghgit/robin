import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ConversationThread, ThreadSummary } from "../shared/contracts";

export interface SettingsData {
  onboardingCompleted: boolean;
  preferredMode: "search" | "local";
  shortcut: string;
  providers: {
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
    return this.readJson<SettingsData>(this.settingsPath, DEFAULT_SETTINGS);
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
