export type AssistantMode = "search" | "local";

export const CLOUD_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "perplexity",
  "openrouter"
] as const;

export type CloudProviderId = (typeof CLOUD_PROVIDER_IDS)[number];

export type MessageRole = "system" | "user" | "assistant";

export interface Citation {
  title: string;
  url: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  citations?: Citation[];
  status?: "streaming" | "complete" | "error";
}

export interface ConversationThread {
  id: string;
  title: string;
  mode: AssistantMode;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ThreadSummary {
  id: string;
  title: string;
  mode: AssistantMode;
  updatedAt: string;
  preview: string;
}

export interface ChatStreamRequest {
  conversationId?: string;
  mode: AssistantMode;
  prompt: string;
  streamId?: string;
}

export interface OllamaStatus {
  state: "not_installed" | "not_running" | "no_model" | "ready";
  baseUrl: string;
  models: string[];
  selectedModel?: string;
  version?: string;
  downloadUrl: string;
}

export interface LocalModelCatalogItem {
  id: string;
  model: string;
  title: string;
  description: string;
  sizeLabel: string;
  sizes: string[];
  paramsBillions: number;
  estimatedSizeMb: number;
  minRamGb: number;
  pulls: string;
  sourceUrl: string;
}

export interface ModelPullResult {
  model: string;
  status: string;
  completedBytes?: number;
  totalBytes?: number;
  digest?: string;
}

export interface ProviderStatus {
  onboardingCompleted: boolean;
  preferredMode: AssistantMode;
  shortcut: string;
  systemMemoryGb: number;
  activeCloudProvider: CloudProviderId;
  cloudProviderKeys: Record<CloudProviderId, boolean>;
  perplexity: {
    configured: boolean;
    model: string;
    preset: string;
  };
  ollama: OllamaStatus;
}

export interface AppProfile {
  name: string;
}

export interface SaveConfigInput {
  onboardingCompleted?: boolean;
  preferredMode?: AssistantMode;
  shortcut?: string;
  perplexityApiKey?: string;
  perplexityModel?: string;
  perplexityPreset?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  activeCloudProvider?: CloudProviderId;
  providerApiKeys?: Partial<Record<CloudProviderId, string>>;
}

export type ChatStreamEvent =
  | {
      streamId: string;
      type: "thread";
      thread: ConversationThread;
      messageId: string;
    }
  | {
      streamId: string;
      type: "delta";
      threadId: string;
      messageId: string;
      delta: string;
    }
  | {
      streamId: string;
      type: "citations";
      threadId: string;
      messageId: string;
      citations: Citation[];
    }
  | {
      streamId: string;
      type: "done";
      thread: ConversationThread;
      messageId: string;
    }
  | {
      streamId: string;
      type: "error";
      message: string;
      threadId?: string;
      messageId?: string;
    };

export interface RobinBridge {
  app: {
    togglePanel: () => Promise<void>;
    setShortcut: (accelerator: string) => Promise<{ success: boolean; shortcut: string }>;
    openExternal: (url: string) => Promise<void>;
    getProfile: () => Promise<AppProfile>;
  };
  chat: {
    streamReply: (
      request: ChatStreamRequest,
      handlers?: Partial<{
        onThread: (event: Extract<ChatStreamEvent, { type: "thread" }>) => void;
        onDelta: (event: Extract<ChatStreamEvent, { type: "delta" }>) => void;
        onCitations: (event: Extract<ChatStreamEvent, { type: "citations" }>) => void;
        onDone: (event: Extract<ChatStreamEvent, { type: "done" }>) => void;
        onError: (event: Extract<ChatStreamEvent, { type: "error" }>) => void;
      }>
    ) => Promise<string>;
    listThreads: () => Promise<ThreadSummary[]>;
    loadThread: (id: string) => Promise<ConversationThread | null>;
  };
  providers: {
    getStatus: () => Promise<ProviderStatus>;
    saveConfig: (config: SaveConfigInput) => Promise<ProviderStatus>;
  };
  ollama: {
    detect: () => Promise<OllamaStatus>;
    listCatalog: (limit?: number) => Promise<LocalModelCatalogItem[]>;
    pullModel: (model: string) => Promise<ModelPullResult>;
  };
}
