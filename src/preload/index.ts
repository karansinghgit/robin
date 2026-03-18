import { contextBridge, ipcRenderer } from "electron";
import { ChatStreamEvent, ChatStreamRequest, RobinBridge, SaveConfigInput } from "../shared/contracts";

const CHANNELS = {
  togglePanel: "app:toggle-panel",
  openWindow: "app:open-window",
  setShortcut: "app:set-shortcut",
  profile: "app:get-profile",
  openExternal: "app:open-external",
  listThreads: "chat:list-threads",
  loadThread: "chat:load-thread",
  startStream: "chat:stream-start",
  streamEvent: "chat:stream-event",
  providerStatus: "providers:get-status",
  saveConfig: "providers:save-config",
  ollamaDetect: "ollama:detect",
  ollamaCatalog: "ollama:list-catalog",
  ollamaPull: "ollama:pull-model"
} as const;

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
          ipcRenderer.removeListener(CHANNELS.streamEvent, listener);
        }
        if (payload.type === "error") {
          handlers.onError?.(payload);
          ipcRenderer.removeListener(CHANNELS.streamEvent, listener);
        }
      };

      ipcRenderer.on(CHANNELS.streamEvent, listener);
      try {
        await ipcRenderer.invoke(CHANNELS.startStream, { ...request, streamId });
      } catch (error) {
        ipcRenderer.removeListener(CHANNELS.streamEvent, listener);
        throw error;
      }
      return streamId;
    },
    listThreads: async () => ipcRenderer.invoke(CHANNELS.listThreads),
    loadThread: async (id) => ipcRenderer.invoke(CHANNELS.loadThread, id)
  },
  providers: {
    getStatus: async () => ipcRenderer.invoke(CHANNELS.providerStatus),
    saveConfig: async (config: SaveConfigInput) => ipcRenderer.invoke(CHANNELS.saveConfig, config)
  },
  ollama: {
    detect: async () => ipcRenderer.invoke(CHANNELS.ollamaDetect),
    listCatalog: async (limit?: number) => ipcRenderer.invoke(CHANNELS.ollamaCatalog, limit),
    pullModel: async (model: string) => ipcRenderer.invoke(CHANNELS.ollamaPull, model)
  }
};

contextBridge.exposeInMainWorld("robin", bridge);
