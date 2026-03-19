import {
  CLOUD_PROVIDER_IDS,
  CloudProviderId,
  ChatAttachment,
  ChatMessage,
  ChatStreamEvent,
  ChatStreamRequest,
  Citation,
  CloudModelCatalogResult,
  ConversationThread,
  LocalModelCatalogItem,
  ModelDeleteResult,
  ModelPullResult,
  ProviderStatus,
  SaveConfigInput
} from "../shared/contracts";
import { SecureConfig } from "./secureConfig";
import { AppStorage, buildThreadTitle, SettingsData } from "./storage";
import { OllamaProvider } from "./providers/ollamaProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { PerplexityProvider } from "./providers/perplexityProvider";
import { GoogleProvider } from "./providers/googleProvider";
import { OpenRouterProvider } from "./providers/openrouterProvider";
import { CURATED_CLOUD_MODELS } from "./providers/curatedCloudModels";
import { TodoContextProvider } from "./context/todoProvider";
import { NotesContextProvider } from "./context/notesProvider";
import { buildSystemPrompt } from "./context/assembler";
import os from "node:os";
import { createHash } from "node:crypto";

function isoNow(): string {
  return new Date().toISOString();
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  status?: ChatMessage["status"],
  attachments?: ChatAttachment[]
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: isoNow(),
    attachments,
    status
  };
}

function resolveProviderSettings(settings: SettingsData | undefined) {
  const providers = settings?.providers ?? {
    cloud: {
      activeProvider: "openai" as CloudProviderId,
      selectedModels: {} as Partial<Record<CloudProviderId, string[]>>,
      catalogCache: {} as Partial<Record<CloudProviderId, { fetchedAt: string; models: CloudModelCatalogResult["models"] }>>
    },
    perplexity: { model: "openai/gpt-5-mini", preset: "pro-search" },
    ollama: { baseUrl: "http://localhost:11434", model: "" }
  };

  return {
    cloud: {
      activeProvider: providers.cloud?.activeProvider ?? "openai",
      selectedModels: providers.cloud?.selectedModels ?? {},
      catalogCache: providers.cloud?.catalogCache ?? {}
    },
    perplexity: {
      model: providers.perplexity?.model ?? "openai/gpt-5-mini",
      preset: providers.perplexity?.preset ?? "pro-search"
    },
    ollama: {
      baseUrl: providers.ollama?.baseUrl ?? "http://localhost:11434",
      model: providers.ollama?.model ?? ""
    }
  };
}

function prepareMessagesForAPI(messages: ChatMessage[]): ChatMessage[] {
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  return messages.map((msg, i) => {
    if (msg.role === "user" && i !== lastUserIndex && msg.attachments?.length) {
      return { ...msg, attachments: undefined };
    }
    return msg;
  });
}

interface TodoAction {
  type: "create_todo" | "complete_todo" | "uncomplete_todo";
  id?: string;
  title?: string;
}

function parseActions(content: string): { cleanContent: string; actions: TodoAction[] } {
  const actionBlocks = content.match(/<action>[\s\S]*?<\/action>/g) ?? [];
  const actions: TodoAction[] = [];
  for (const block of actionBlocks) {
    const json = block.replace(/<\/?action>/g, "").trim();
    try {
      const parsed = JSON.parse(json) as TodoAction;
      if (parsed.type === "create_todo" || parsed.type === "complete_todo" || parsed.type === "uncomplete_todo") {
        actions.push(parsed);
      }
    } catch {
      // ignore malformed blocks
    }
  }
  const cleanContent = content.replace(/<action>[\s\S]*?<\/action>/g, "").trimEnd();
  return { cleanContent, actions };
}

function truncateContext(messages: ChatMessage[], maxChars = 100_000): ChatMessage[] {
  let total = messages.reduce((sum, m) => sum + m.content.length, 0);
  const result = [...messages];
  while (total > maxChars && result.length > 4) {
    const removed = result.shift()!;
    total -= removed.content.length;
  }
  return result;
}

const MODEL_SETUP_WARNING =
  "You need to configure a model to use Robin. Download a local model or add a cloud provider key in Settings.";
const LOCAL_IMAGE_UNSUPPORTED_WARNING = "Image input is not supported in Local mode yet. Switch to a cloud model.";

export class ProviderService {
  private readonly ollama = new OllamaProvider();
  private readonly openai = new OpenAIProvider();
  private readonly perplexity = new PerplexityProvider();
  private readonly google = new GoogleProvider();
  private readonly openrouter = new OpenRouterProvider();
  private readonly providerKeyValidationCache = new Map<CloudProviderId, {
    keyHash: string;
    valid: boolean;
    checkedAt: number;
  }>();

  constructor(
    private readonly storage: AppStorage,
    private readonly secureConfig: SecureConfig
  ) {}

  private get contextProviders() {
    return [
      new TodoContextProvider(this.storage),
      new NotesContextProvider(this.storage)
    ];
  }

  private keyHash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async validateProviderKeyRemote(provider: CloudProviderId, apiKey: string): Promise<boolean> {
    try {
      if (provider === "openai") {
        const response = await this.fetchWithTimeout("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });
        return response.ok;
      }

      if (provider === "google") {
        const response = await this.fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { method: "GET" }
        );
        return response.ok;
      }

      if (provider === "anthropic") {
        const response = await this.fetchWithTimeout("https://api.anthropic.com/v1/models", {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          }
        });
        return response.ok;
      }

      if (provider === "perplexity") {
        const response = await this.fetchWithTimeout("https://api.perplexity.ai/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });
        return response.ok;
      }

      if (provider === "openrouter") {
        const response = await this.fetchWithTimeout("https://openrouter.ai/api/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });
        return response.ok;
      }
    } catch {
      return false;
    }

    return false;
  }

  private async isProviderKeyValid(provider: CloudProviderId, apiKey: string): Promise<boolean> {
    const keyHash = this.keyHash(apiKey);
    const cached = this.providerKeyValidationCache.get(provider);
    if (cached && cached.keyHash === keyHash && (Date.now() - cached.checkedAt) < 10 * 60 * 1000) {
      return cached.valid;
    }

    const valid = await this.validateProviderKeyRemote(provider, apiKey);
    this.providerKeyValidationCache.set(provider, {
      keyHash,
      valid,
      checkedAt: Date.now()
    });
    return valid;
  }

  private async getValidProviderMap(providerApiKeys: Record<CloudProviderId, string>): Promise<Record<CloudProviderId, boolean>> {
    const checks = await Promise.all(
      CLOUD_PROVIDER_IDS.map(async (providerId) => {
        const apiKey = providerApiKeys[providerId]?.trim();
        if (!apiKey) {
          return [providerId, false] as const;
        }
        const valid = await this.isProviderKeyValid(providerId, apiKey);
        return [providerId, valid] as const;
      })
    );

    return checks.reduce((result, [providerId, valid]) => {
      result[providerId] = valid;
      return result;
    }, {} as Record<CloudProviderId, boolean>);
  }

  async getStatus(): Promise<ProviderStatus> {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    const providerApiKeys = await this.secureConfig.getProviderApiKeys();
    const cloudProviderKeys = await this.getValidProviderMap(providerApiKeys);
    const ollama = await this.ollama.detect(
      providers.ollama.baseUrl,
      providers.ollama.model || undefined
    );

    return {
      onboardingCompleted: settings.onboardingCompleted,
      preferredMode: settings.preferredMode,
      shortcut: settings.shortcut,
      systemMemoryGb: Number((os.totalmem() / (1024 ** 3)).toFixed(1)),
      activeCloudProvider: providers.cloud.activeProvider,
      cloudProviderKeys,
      providerApiKeys,
      selectedCloudModels: CLOUD_PROVIDER_IDS.reduce((result, providerId) => {
        const selected = providers.cloud.selectedModels?.[providerId];
        result[providerId] = Array.isArray(selected) ? selected : [];
        return result;
      }, {} as Record<CloudProviderId, string[]>),
      perplexity: {
        configured: cloudProviderKeys.perplexity,
        model: providers.perplexity.model,
        preset: providers.perplexity.preset
      },
      ollama
    };
  }

  async saveConfig(config: SaveConfigInput): Promise<ProviderStatus> {
    if (config.perplexityApiKey) {
      await this.secureConfig.setProviderApiKey("perplexity", config.perplexityApiKey);
    }

    if (config.providerApiKeys) {
      const saves: Array<Promise<void>> = [];
      for (const providerId of CLOUD_PROVIDER_IDS) {
        const candidate = config.providerApiKeys[providerId];
        if (typeof candidate === "string") {
          const normalized = candidate.trim();
          if (normalized) {
            saves.push(this.secureConfig.setProviderApiKey(providerId, normalized));
          } else {
            saves.push(this.secureConfig.clearProviderApiKey(providerId));
          }
        }
      }
      if (saves.length > 0) {
        await Promise.all(saves);
      }
      this.providerKeyValidationCache.clear();
    }

    await this.storage.saveSettings((current) => ({
      ...current,
      onboardingCompleted: config.onboardingCompleted ?? current.onboardingCompleted,
      preferredMode: config.preferredMode ?? current.preferredMode,
      shortcut: config.shortcut ?? current.shortcut,
      providers: {
        cloud: {
          activeProvider: config.activeCloudProvider ?? current.providers.cloud.activeProvider,
          selectedModels: (() => {
            const selectedFromConfig = config.selectedCloudModels;
            if (!selectedFromConfig) {
              return current.providers.cloud.selectedModels;
            }

            const next: Partial<Record<CloudProviderId, string[]>> = {
              ...(current.providers.cloud.selectedModels ?? {})
            };

            for (const providerId of CLOUD_PROVIDER_IDS) {
              const candidate = selectedFromConfig[providerId];
              if (!Array.isArray(candidate)) {
                continue;
              }
              const normalized = Array.from(
                new Set(
                  candidate
                    .filter((value): value is string => typeof value === "string")
                    .map((value) => value.trim())
                    .filter(Boolean)
                )
              );
              if (normalized.length > 0) {
                next[providerId] = normalized;
              } else {
                delete next[providerId];
              }
            }

            return next;
          })(),
          catalogCache: current.providers.cloud.catalogCache ?? {}
        },
        perplexity: {
          model: config.perplexityModel ?? current.providers.perplexity.model,
          preset: config.perplexityPreset ?? current.providers.perplexity.preset
        },
        ollama: {
          baseUrl: config.ollamaBaseUrl ?? current.providers.ollama.baseUrl,
          model: config.ollamaModel ?? current.providers.ollama.model
        }
      }
    }));

    return this.getStatus();
  }

  async detectOllama() {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    return this.ollama.detect(providers.ollama.baseUrl, providers.ollama.model || undefined);
  }

  async listOllamaCatalog(limit = 100): Promise<LocalModelCatalogItem[]> {
    return this.ollama.listCatalog(limit);
  }

  async pullOllamaModel(model: string): Promise<ModelPullResult> {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    const ollamaStatus = await this.ollama.detect(
      providers.ollama.baseUrl,
      providers.ollama.model || undefined
    );

    if (ollamaStatus.state === "not_installed") {
      throw new Error("Ollama is not installed yet. Install it from ollama.com/download and retry.");
    }
    if (ollamaStatus.state === "not_running") {
      throw new Error(`Could not reach Ollama at ${ollamaStatus.baseUrl}. Open Ollama (or run 'ollama serve') and retry.`);
    }

    return this.ollama.pullModel(ollamaStatus.baseUrl || providers.ollama.baseUrl, model);
  }

  async deleteOllamaModel(model: string): Promise<ModelDeleteResult> {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    const ollamaStatus = await this.ollama.detect(
      providers.ollama.baseUrl,
      providers.ollama.model || undefined
    );

    if (ollamaStatus.state === "not_installed") {
      throw new Error("Ollama is not installed yet.");
    }
    if (ollamaStatus.state === "not_running") {
      throw new Error(`Could not reach Ollama at ${ollamaStatus.baseUrl}. Open Ollama (or run 'ollama serve') and retry.`);
    }

    return this.ollama.deleteModel(ollamaStatus.baseUrl || providers.ollama.baseUrl, model);
  }

  async listCloudModels(provider: CloudProviderId): Promise<CloudModelCatalogResult> {
    const apiKey = await this.secureConfig.getProviderApiKey(provider);
    if (!apiKey) {
      throw new Error(MODEL_SETUP_WARNING);
    }
    const valid = await this.isProviderKeyValid(provider, apiKey);
    if (!valid) {
      throw new Error("Add a valid API key in Settings.");
    }

    if (provider === "openrouter") {
      return {
        provider,
        models: []
      };
    }

    return {
      provider,
      models: CURATED_CLOUD_MODELS[provider] ?? []
    };
  }

  async streamChat(
    request: ChatStreamRequest,
    emit: (event: ChatStreamEvent) => void
  ): Promise<void> {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    const currentThread =
      request.conversationId ? await this.storage.loadThread(request.conversationId) : null;
    const userMessage = createMessage("user", request.prompt, "complete", request.attachments);
    const assistantMessage = createMessage("assistant", "", "streaming");
    const seedTitle = request.prompt.trim() || (request.attachments?.length ? "Image" : "New chat");
    const thread: ConversationThread = currentThread ?? {
      id: crypto.randomUUID(),
      title: buildThreadTitle(seedTitle),
      mode: request.mode,
      createdAt: isoNow(),
      updatedAt: isoNow(),
      messages: []
    };

    thread.mode = request.mode;
    thread.updatedAt = isoNow();
    thread.messages.push(userMessage, assistantMessage);
    await this.storage.upsertThread(thread);

    const streamId = request.streamId ?? crypto.randomUUID();
    emit({
      streamId,
      type: "thread",
      thread,
      messageId: assistantMessage.id
    });

    let finalCitations: Citation[] = [];
    const systemPrompt = await buildSystemPrompt(this.contextProviders, request.prompt);

    try {
      if (request.mode === "search") {
        const requestedCloudProvider = request.cloudProvider ?? providers.cloud.activeProvider;
        const streamMessages = truncateContext(
          prepareMessagesForAPI(
            thread.messages.filter((message) => message.id !== assistantMessage.id)
          )
        );

        if (requestedCloudProvider === "openai") {
          const apiKey = await this.secureConfig.getProviderApiKey("openai");
          if (!apiKey) {
            throw new Error(MODEL_SETUP_WARNING);
          }

          const preferredSelectedOpenAIModel = providers.cloud.selectedModels.openai?.[0];
          await this.openai.streamReply({
            apiKey,
            model: request.cloudModel?.trim() || preferredSelectedOpenAIModel || "gpt-5-mini",
            mode: request.cloudMode?.trim() || undefined,
            messages: streamMessages,
            systemPrompt: systemPrompt || undefined,
            onDelta: (delta) => {
              assistantMessage.content += delta;
              emit({
                streamId,
                type: "delta",
                threadId: thread.id,
                messageId: assistantMessage.id,
                delta
              });
            }
          });
          finalCitations = [];
        } else if (requestedCloudProvider === "perplexity") {
          const apiKey = await this.secureConfig.getProviderApiKey("perplexity");
          if (!apiKey) {
            throw new Error(MODEL_SETUP_WARNING);
          }
          const preferredSelectedPerplexityModel = providers.cloud.selectedModels.perplexity?.[0];
          const result = await this.perplexity.streamReply({
            apiKey,
            model: request.cloudModel?.trim() || preferredSelectedPerplexityModel || providers.perplexity.model,
            preset: providers.perplexity.preset,
            messages: streamMessages,
            systemPrompt: systemPrompt || undefined,
            onDelta: (delta) => {
              assistantMessage.content += delta;
              emit({
                streamId,
                type: "delta",
                threadId: thread.id,
                messageId: assistantMessage.id,
                delta
              });
            }
          });
          finalCitations = result.citations;
        } else if (requestedCloudProvider === "google") {
          const apiKey = await this.secureConfig.getProviderApiKey("google");
          if (!apiKey) {
            throw new Error(MODEL_SETUP_WARNING);
          }

          const preferredSelectedGoogleModel = providers.cloud.selectedModels.google?.[0];
          await this.google.streamReply({
            apiKey,
            model: request.cloudModel?.trim() || preferredSelectedGoogleModel || "gemini-2.5-flash",
            messages: streamMessages,
            systemPrompt: systemPrompt || undefined,
            onDelta: (delta) => {
              assistantMessage.content += delta;
              emit({
                streamId,
                type: "delta",
                threadId: thread.id,
                messageId: assistantMessage.id,
                delta
              });
            }
          });
          finalCitations = [];
        } else if (requestedCloudProvider === "openrouter") {
          const apiKey = await this.secureConfig.getProviderApiKey("openrouter");
          if (!apiKey) {
            throw new Error(MODEL_SETUP_WARNING);
          }

          const preferredSelectedOpenRouterModel = providers.cloud.selectedModels.openrouter?.[0];
          const model = request.cloudModel?.trim() || preferredSelectedOpenRouterModel;
          if (!model) {
            throw new Error("Add an OpenRouter model ID in Settings first.");
          }

          await this.openrouter.streamReply({
            apiKey,
            model,
            messages: streamMessages,
            systemPrompt: systemPrompt || undefined,
            onDelta: (delta) => {
              assistantMessage.content += delta;
              emit({
                streamId,
                type: "delta",
                threadId: thread.id,
                messageId: assistantMessage.id,
                delta
              });
            }
          });
          finalCitations = [];
        } else {
          throw new Error(MODEL_SETUP_WARNING);
        }
      } else {
        if ((request.attachments?.length ?? 0) > 0) {
          throw new Error(LOCAL_IMAGE_UNSUPPORTED_WARNING);
        }
        const ollamaStatus = await this.ollama.detect(
          providers.ollama.baseUrl,
          providers.ollama.model || undefined
        );
        if (ollamaStatus.state === "not_installed") {
          throw new Error("Ollama is not installed yet.");
        }
        if (ollamaStatus.state === "not_running") {
          throw new Error("Ollama is installed but not running.");
        }
        if (ollamaStatus.state === "no_model" || !ollamaStatus.selectedModel) {
          throw new Error("Download an Ollama model before using Local mode.");
        }
        const preferredLocalModel = providers.ollama.model?.trim();
        const resolvedLocalModel = preferredLocalModel && ollamaStatus.models.includes(preferredLocalModel)
          ? preferredLocalModel
          : ollamaStatus.selectedModel;

        if (!resolvedLocalModel) {
          throw new Error("Download an Ollama model before using Local mode.");
        }
        const result = await this.ollama.streamReply({
          baseUrl: providers.ollama.baseUrl,
          model: resolvedLocalModel,
          messages: truncateContext(
            thread.messages.filter((message) => message.id !== assistantMessage.id)
          ),
          systemPrompt: systemPrompt || undefined,
          onDelta: (delta) => {
            assistantMessage.content += delta;
            emit({
              streamId,
              type: "delta",
              threadId: thread.id,
              messageId: assistantMessage.id,
              delta
            });
          }
        });
        finalCitations = result.citations;
      }

      // Parse and execute any action blocks the model appended
      const { cleanContent, actions } = parseActions(assistantMessage.content);
      if (actions.length > 0 && !cleanContent) {
        // Model output only action blocks with no text — synthesise a confirmation
        const summaries = actions.map((a) => {
          if (a.type === "create_todo") return `Created todo: "${a.title}"`;
          if (a.type === "complete_todo") return "Marked todo as done.";
          if (a.type === "uncomplete_todo") return "Marked todo as not done.";
          return "Done.";
        });
        assistantMessage.content = summaries.join(" ");
      } else {
        assistantMessage.content = cleanContent;
      }
      for (const action of actions) {
        if (action.type === "create_todo" && action.title) {
          await this.storage.createTodo(action.title);
        } else if (action.type === "complete_todo" && action.id) {
          await this.storage.updateTodo(action.id, { completed: true });
        } else if (action.type === "uncomplete_todo" && action.id) {
          await this.storage.updateTodo(action.id, { completed: false });
        }
      }

      assistantMessage.status = "complete";
      assistantMessage.citations = finalCitations;
      thread.updatedAt = isoNow();
      await this.storage.upsertThread(thread);

      if (actions.length > 0) {
        const updatedTodos = await this.storage.listTodos();
        emit({ streamId, type: "context_update", todos: updatedTodos });
      }

      if (finalCitations.length > 0) {
        emit({
          streamId,
          type: "citations",
          threadId: thread.id,
          messageId: assistantMessage.id,
          citations: finalCitations
        });
      }

      emit({
        streamId,
        type: "done",
        thread,
        messageId: assistantMessage.id
      });
    } catch (error) {
      assistantMessage.status = "error";
      assistantMessage.content = assistantMessage.content || "I hit a snag before I could finish that.";
      thread.updatedAt = isoNow();
      await this.storage.upsertThread(thread);
      emit({
        streamId,
        type: "error",
        threadId: thread.id,
        messageId: assistantMessage.id,
        message: error instanceof Error ? error.message : "Unknown provider error."
      });
    }
  }

}
