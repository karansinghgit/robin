import {
  CLOUD_PROVIDER_IDS,
  CloudProviderId,
  ChatMessage,
  ChatStreamEvent,
  ChatStreamRequest,
  Citation,
  ConversationThread,
  LocalModelCatalogItem,
  ModelPullResult,
  ProviderStatus,
  SaveConfigInput
} from "../shared/contracts";
import { SecureConfig } from "./secureConfig";
import { AppStorage, buildThreadTitle, SettingsData } from "./storage";
import { OllamaProvider } from "./providers/ollamaProvider";
import { PerplexityProvider } from "./providers/perplexityProvider";
import os from "node:os";

function isoNow(): string {
  return new Date().toISOString();
}

function createMessage(role: ChatMessage["role"], content: string, status?: ChatMessage["status"]): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: isoNow(),
    status
  };
}

function resolveProviderSettings(settings: SettingsData | undefined) {
  const providers = settings?.providers ?? {
    cloud: { activeProvider: "perplexity" as CloudProviderId },
    perplexity: { model: "openai/gpt-5-mini", preset: "pro-search" },
    ollama: { baseUrl: "http://localhost:11434", model: "" }
  };

  return {
    cloud: {
      activeProvider: providers.cloud?.activeProvider ?? "perplexity"
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

export class ProviderService {
  private readonly ollama = new OllamaProvider();
  private readonly perplexity = new PerplexityProvider();

  constructor(
    private readonly storage: AppStorage,
    private readonly secureConfig: SecureConfig
  ) {}

  async getStatus(): Promise<ProviderStatus> {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    const cloudProviderKeys = await this.secureConfig.getConfiguredProviderMap();
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
        if (typeof candidate === "string" && candidate.trim()) {
          saves.push(this.secureConfig.setProviderApiKey(providerId, candidate));
        }
      }
      if (saves.length > 0) {
        await Promise.all(saves);
      }
    }

    await this.storage.saveSettings((current) => ({
      ...current,
      onboardingCompleted: config.onboardingCompleted ?? current.onboardingCompleted,
      preferredMode: config.preferredMode ?? current.preferredMode,
      shortcut: config.shortcut ?? current.shortcut,
      providers: {
        cloud: {
          activeProvider: config.activeCloudProvider ?? current.providers.cloud.activeProvider
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
      throw new Error(`Could not reach Ollama at ${ollamaStatus.baseUrl}. Start the Ollama app and retry.`);
    }

    return this.ollama.pullModel(ollamaStatus.baseUrl || providers.ollama.baseUrl, model);
  }

  async streamChat(
    request: ChatStreamRequest,
    emit: (event: ChatStreamEvent) => void
  ): Promise<void> {
    const settings = await this.storage.getSettings();
    const providers = resolveProviderSettings(settings);
    const currentThread =
      request.conversationId ? await this.storage.loadThread(request.conversationId) : null;
    const userMessage = createMessage("user", request.prompt, "complete");
    const assistantMessage = createMessage("assistant", "", "streaming");
    const thread: ConversationThread = currentThread ?? {
      id: crypto.randomUUID(),
      title: buildThreadTitle(request.prompt),
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

    try {
      if (request.mode === "search") {
        const activeCloudProvider = providers.cloud.activeProvider;
        if (activeCloudProvider !== "perplexity") {
          throw new Error(`${this.providerLabel(activeCloudProvider)} chat is not wired yet. For now, use Perplexity in Cloud mode or switch to Local.`);
        }

        const apiKey = await this.secureConfig.getProviderApiKey("perplexity");
        if (!apiKey) {
          throw new Error(
            "You need to configure a model to use Robin. You either need to download a model to run locally, or Bring Your Own Key from ChatGPT / Claude / Gemini / Perplexity."
          );
        }
        const result = await this.perplexity.streamReply({
          apiKey,
          model: providers.perplexity.model,
          preset: providers.perplexity.preset,
          messages: thread.messages.filter((message) => message.id !== assistantMessage.id),
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
      } else {
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
        const result = await this.ollama.streamReply({
          baseUrl: providers.ollama.baseUrl,
          model: providers.ollama.model || ollamaStatus.selectedModel,
          messages: thread.messages.filter((message) => message.id !== assistantMessage.id),
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

      assistantMessage.status = "complete";
      assistantMessage.citations = finalCitations;
      thread.updatedAt = isoNow();
      await this.storage.upsertThread(thread);

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

  private providerLabel(providerId: CloudProviderId): string {
    switch (providerId) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "google":
        return "Google";
      case "perplexity":
        return "Perplexity";
      case "openrouter":
        return "OpenRouter";
      default:
        return "Cloud provider";
    }
  }
}
