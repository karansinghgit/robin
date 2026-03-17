import {
  ChatMessage,
  ChatStreamEvent,
  ChatStreamRequest,
  Citation,
  ConversationThread,
  ProviderStatus,
  SaveConfigInput
} from "../shared/contracts";
import { SecureConfig } from "./secureConfig";
import { AppStorage, buildThreadTitle } from "./storage";
import { OllamaProvider } from "./providers/ollamaProvider";
import { PerplexityProvider } from "./providers/perplexityProvider";

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

export class ProviderService {
  private readonly ollama = new OllamaProvider();
  private readonly perplexity = new PerplexityProvider();

  constructor(
    private readonly storage: AppStorage,
    private readonly secureConfig: SecureConfig
  ) {}

  async getStatus(): Promise<ProviderStatus> {
    const settings = await this.storage.getSettings();
    const ollama = await this.ollama.detect(
      settings.providers.ollama.baseUrl,
      settings.providers.ollama.model || undefined
    );

    return {
      onboardingCompleted: settings.onboardingCompleted,
      preferredMode: settings.preferredMode,
      shortcut: settings.shortcut,
      perplexity: {
        configured: await this.secureConfig.hasPerplexityApiKey(),
        model: settings.providers.perplexity.model,
        preset: settings.providers.perplexity.preset
      },
      ollama
    };
  }

  async saveConfig(config: SaveConfigInput): Promise<ProviderStatus> {
    if (config.perplexityApiKey) {
      await this.secureConfig.setPerplexityApiKey(config.perplexityApiKey);
    }

    await this.storage.saveSettings((current) => ({
      ...current,
      onboardingCompleted: config.onboardingCompleted ?? current.onboardingCompleted,
      preferredMode: config.preferredMode ?? current.preferredMode,
      shortcut: config.shortcut ?? current.shortcut,
      providers: {
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
    return this.ollama.detect(settings.providers.ollama.baseUrl, settings.providers.ollama.model || undefined);
  }

  async streamChat(
    request: ChatStreamRequest,
    emit: (event: ChatStreamEvent) => void
  ): Promise<void> {
    const settings = await this.storage.getSettings();
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
        const apiKey = await this.secureConfig.getPerplexityApiKey();
        if (!apiKey) {
          throw new Error("Add your Perplexity API key to use Search mode.");
        }
        const result = await this.perplexity.streamReply({
          apiKey,
          model: settings.providers.perplexity.model,
          preset: settings.providers.perplexity.preset,
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
          settings.providers.ollama.baseUrl,
          settings.providers.ollama.model || undefined
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
          baseUrl: settings.providers.ollama.baseUrl,
          model: settings.providers.ollama.model || ollamaStatus.selectedModel,
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
}
