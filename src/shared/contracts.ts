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

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
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
  attachments?: ChatAttachment[];
  cloudProvider?: CloudProviderId;
  cloudModel?: string;
  cloudMode?: string;
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

export interface ModelDeleteResult {
  model: string;
  status: string;
}

export interface ProviderStatus {
  onboardingCompleted: boolean;
  preferredMode: AssistantMode;
  shortcut: string;
  systemMemoryGb: number;
  activeCloudProvider: CloudProviderId;
  cloudProviderKeys: Record<CloudProviderId, boolean>;
  providerApiKeys: Record<CloudProviderId, string>;
  selectedCloudModels: Record<CloudProviderId, string[]>;
  perplexity: {
    configured: boolean;
    model: string;
    preset: string;
  };
  ollama: OllamaStatus;
}

export interface CloudModelCatalogItem {
  id: string;
  modes: string[];
}

export interface CloudModelCatalogResult {
  provider: CloudProviderId;
  models: CloudModelCatalogItem[];
}

export interface AppProfile {
  name: string;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  downloadUrl?: string;
  publishedAt?: string;
  checkedAt: string;
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
  selectedCloudModels?: Partial<Record<CloudProviderId, string[]>>;
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
    }
  | {
      streamId: string;
      type: "context_update";
      todos: TodoItem[];
    };

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface RobinBridge {
  app: {
    togglePanel: () => Promise<void>;
    openWindow: () => Promise<void>;
    setShortcut: (accelerator: string) => Promise<{ success: boolean; shortcut: string }>;
    openExternal: (url: string) => Promise<void>;
    getProfile: () => Promise<AppProfile>;
    getVersion: () => Promise<string>;
    checkForUpdates: () => Promise<UpdateCheckResult>;
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
        onContextUpdate: (event: Extract<ChatStreamEvent, { type: "context_update" }>) => void;
      }>
    ) => Promise<string>;
    listThreads: () => Promise<ThreadSummary[]>;
    loadThread: (id: string) => Promise<ConversationThread | null>;
    deleteThread: (id: string) => Promise<boolean>;
    stopStream: (payload?: { streamId?: string; threadId?: string }) => Promise<void>;
  };
  providers: {
    getStatus: () => Promise<ProviderStatus>;
    saveConfig: (config: SaveConfigInput) => Promise<ProviderStatus>;
    listCloudModels: (provider: CloudProviderId) => Promise<CloudModelCatalogResult>;
  };
  ollama: {
    detect: () => Promise<OllamaStatus>;
    listCatalog: (limit?: number) => Promise<LocalModelCatalogItem[]>;
    pullModel: (model: string) => Promise<ModelPullResult>;
    deleteModel: (model: string) => Promise<ModelDeleteResult>;
  };
  todos: {
    list: () => Promise<TodoItem[]>;
    create: (title: string) => Promise<TodoItem>;
    update: (id: string, changes: Partial<Pick<TodoItem, "title" | "completed" | "order">>) => Promise<TodoItem | null>;
    reorder: (orderedIds: string[]) => Promise<TodoItem[]>;
    delete: (id: string) => Promise<boolean>;
  };
  notes: {
    list: () => Promise<NoteItem[]>;
    create: (title: string) => Promise<NoteItem>;
    update: (id: string, changes: Partial<Pick<NoteItem, "title" | "content">>) => Promise<NoteItem | null>;
    delete: (id: string) => Promise<boolean>;
  };
}
