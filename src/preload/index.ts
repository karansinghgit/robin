import { contextBridge, ipcRenderer } from "electron";
import { ChatStreamEvent, ChatStreamRequest, RobinBridge, SaveConfigInput } from "../shared/contracts";

const CHANNELS = {
  togglePanel: "app:toggle-panel",
  openWindow: "app:open-window",
  setShortcut: "app:set-shortcut",
  profile: "app:get-profile",
  version: "app:get-version",
  checkUpdates: "app:check-updates",
  openExternal: "app:open-external",
  listThreads: "chat:list-threads",
  loadThread: "chat:load-thread",
  deleteThread: "chat:delete-thread",
  stopStream: "chat:stream-stop",
  startStream: "chat:stream-start",
  streamEvent: "chat:stream-event",
  providerStatus: "providers:get-status",
  saveConfig: "providers:save-config",
  listCloudModels: "providers:list-cloud-models",
  ollamaDetect: "ollama:detect",
  ollamaCatalog: "ollama:list-catalog",
  ollamaPull: "ollama:pull-model",
  ollamaDelete: "ollama:delete-model",
  todosList: "todos:list",
  todosCreate: "todos:create",
  todosUpdate: "todos:update",
  todosReorder: "todos:reorder",
  todosDelete: "todos:delete",
  notesList: "notes:list",
  notesCreate: "notes:create",
  notesUpdate: "notes:update",
  notesDelete: "notes:delete"
} as const;

const activeStreamListeners = new Map<string, (_event: Electron.IpcRendererEvent, payload: ChatStreamEvent) => void>();

function clearStreamListener(streamId: string) {
  const listener = activeStreamListeners.get(streamId);
  if (!listener) {
    return;
  }
  ipcRenderer.removeListener(CHANNELS.streamEvent, listener);
  activeStreamListeners.delete(streamId);
}

const bridge: RobinBridge = {
  app: {
    togglePanel: async () => {
      await ipcRenderer.invoke(CHANNELS.togglePanel);
    },
    openWindow: async () => {
      await ipcRenderer.invoke(CHANNELS.openWindow);
    },
    setShortcut: async (accelerator) => ipcRenderer.invoke(CHANNELS.setShortcut, accelerator),
    getProfile: async () => ipcRenderer.invoke(CHANNELS.profile),
    getVersion: async () => ipcRenderer.invoke(CHANNELS.version),
    checkForUpdates: async () => ipcRenderer.invoke(CHANNELS.checkUpdates),
    openExternal: async (url) => {
      await ipcRenderer.invoke(CHANNELS.openExternal, url);
    }
  },
  chat: {
    streamReply: async (request: ChatStreamRequest, handlers = {}) => {
      const streamId = crypto.randomUUID();
      const listener = (_event: Electron.IpcRendererEvent, payload: ChatStreamEvent) => {
        if (payload.streamId !== streamId) {
          return;
        }
        if (payload.type === "thread") {
          handlers.onThread?.(payload);
        }
        if (payload.type === "delta") {
          handlers.onDelta?.(payload);
        }
        if (payload.type === "citations") {
          handlers.onCitations?.(payload);
        }
        if (payload.type === "done") {
          handlers.onDone?.(payload);
          clearStreamListener(streamId);
        }
        if (payload.type === "error") {
          handlers.onError?.(payload);
          clearStreamListener(streamId);
        }
        if (payload.type === "context_update") {
          handlers.onContextUpdate?.(payload);
        }
      };

      ipcRenderer.on(CHANNELS.streamEvent, listener);
      activeStreamListeners.set(streamId, listener);
      try {
        await ipcRenderer.invoke(CHANNELS.startStream, { ...request, streamId });
      } catch (error) {
        clearStreamListener(streamId);
        throw error;
      }
      return streamId;
    },
    listThreads: async () => ipcRenderer.invoke(CHANNELS.listThreads),
    loadThread: async (id) => ipcRenderer.invoke(CHANNELS.loadThread, id),
    deleteThread: async (id) => ipcRenderer.invoke(CHANNELS.deleteThread, id),
    stopStream: async (payload) => {
      const streamId = payload?.streamId?.trim();
      if (streamId) {
        clearStreamListener(streamId);
      } else {
        for (const activeStreamId of Array.from(activeStreamListeners.keys())) {
          clearStreamListener(activeStreamId);
        }
      }
      await ipcRenderer.invoke(CHANNELS.stopStream, payload ?? {});
    }
  },
  providers: {
    getStatus: async () => ipcRenderer.invoke(CHANNELS.providerStatus),
    saveConfig: async (config: SaveConfigInput) => ipcRenderer.invoke(CHANNELS.saveConfig, config),
    listCloudModels: async (provider) => ipcRenderer.invoke(CHANNELS.listCloudModels, provider)
  },
  ollama: {
    detect: async () => ipcRenderer.invoke(CHANNELS.ollamaDetect),
    listCatalog: async (limit?: number) => ipcRenderer.invoke(CHANNELS.ollamaCatalog, limit),
    pullModel: async (model: string) => ipcRenderer.invoke(CHANNELS.ollamaPull, model),
    deleteModel: async (model: string) => ipcRenderer.invoke(CHANNELS.ollamaDelete, model)
  },
  todos: {
    list: async () => ipcRenderer.invoke(CHANNELS.todosList),
    create: async (title: string) => ipcRenderer.invoke(CHANNELS.todosCreate, title),
    update: async (id: string, changes) => ipcRenderer.invoke(CHANNELS.todosUpdate, id, changes),
    reorder: async (orderedIds: string[]) => ipcRenderer.invoke(CHANNELS.todosReorder, orderedIds),
    delete: async (id: string) => ipcRenderer.invoke(CHANNELS.todosDelete, id)
  },
  notes: {
    list: async () => ipcRenderer.invoke(CHANNELS.notesList),
    create: async (title: string) => ipcRenderer.invoke(CHANNELS.notesCreate, title),
    update: async (id: string, changes) => ipcRenderer.invoke(CHANNELS.notesUpdate, id, changes),
    delete: async (id: string) => ipcRenderer.invoke(CHANNELS.notesDelete, id)
  }
};

contextBridge.exposeInMainWorld("robin", bridge);
