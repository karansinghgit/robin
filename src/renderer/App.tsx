import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import {
  AssistantMode,
  CLOUD_PROVIDER_IDS,
  CloudProviderId,
  ConversationThread,
  LocalModelCatalogItem,
  OllamaStatus,
  ProviderStatus,
  SaveConfigInput,
  ThreadSummary
} from "../shared/contracts";
import providerPlaceholderLogo from "./assets/provider-logos/placeholder.svg";

const FALLBACK_ADD01_ICON: IconSvgElement = [
  ["path", { d: "M12.001 5.00003V19.002", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M19.002 12.002L4.99998 12.002", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
] as const;

const FALLBACK_DASHBOARD_ICON: IconSvgElement = [
  ["path", { d: "M13.6903 19.4567C13.5 18.9973 13.5 18.4149 13.5 17.25C13.5 16.0851 13.5 15.5027 13.6903 15.0433C13.944 14.4307 14.4307 13.944 15.0433 13.6903C15.5027 13.5 16.0851 13.5 17.25 13.5C18.4149 13.5 18.9973 13.5 19.4567 13.6903C20.0693 13.944 20.556 14.4307 20.8097 15.0433C21 15.5027 21 16.0851 21 17.25C21 18.4149 21 18.9973 20.8097 19.4567C20.556 20.0693 20.0693 20.556 19.4567 20.8097C18.9973 21 18.4149 21 17.25 21C16.0851 21 15.5027 21 15.0433 20.8097C14.4307 20.556 13.944 20.0693 13.6903 19.4567Z", stroke: "currentColor", strokeLinecap: "square", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M13.6903 8.95671C13.5 8.49728 13.5 7.91485 13.5 6.75C13.5 5.58515 13.5 5.00272 13.6903 4.54329C13.944 3.93072 14.4307 3.44404 15.0433 3.1903C15.5027 3 16.0851 3 17.25 3C18.4149 3 18.9973 3 19.4567 3.1903C20.0693 3.44404 20.556 3.93072 20.8097 4.54329C21 5.00272 21 5.58515 21 6.75C21 7.91485 21 8.49728 20.8097 8.95671C20.556 9.56928 20.0693 10.056 19.4567 10.3097C18.9973 10.5 18.4149 10.5 17.25 10.5C16.0851 10.5 15.5027 10.5 15.0433 10.3097C14.4307 10.056 13.944 9.56928 13.6903 8.95671Z", stroke: "currentColor", strokeLinecap: "square", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M3.1903 19.4567C3 18.9973 3 18.4149 3 17.25C3 16.0851 3 15.5027 3.1903 15.0433C3.44404 14.4307 3.93072 13.944 4.54329 13.6903C5.00272 13.5 5.58515 13.5 6.75 13.5C7.91485 13.5 8.49728 13.5 8.95671 13.6903C9.56928 13.944 10.056 14.4307 10.3097 15.0433C10.5 15.5027 10.5 16.0851 10.5 17.25C10.5 18.4149 10.5 18.9973 10.3097 19.4567C10.056 20.0693 9.56928 20.556 8.95671 20.8097C8.49728 21 7.91485 21 6.75 21C5.58515 21 5.00272 21 4.54329 20.8097C3.93072 20.556 3.44404 20.0693 3.1903 19.4567Z", stroke: "currentColor", strokeLinecap: "square", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M3.1903 8.95671C3 8.49728 3 7.91485 3 6.75C3 5.58515 3 5.00272 3.1903 4.54329C3.44404 3.93072 3.93072 3.44404 4.54329 3.1903C5.00272 3 5.58515 3 6.75 3C7.91485 3 8.49728 3 8.95671 3.1903C9.56928 3.44404 10.056 3.93072 10.3097 4.54329C10.5 5.00272 10.5 5.58515 10.5 6.75C10.5 7.91485 10.5 8.49728 10.3097 8.95671C10.056 9.56928 9.56928 10.056 8.95671 10.3097C8.49728 10.5 7.91485 10.5 6.75 10.5C5.58515 10.5 5.00272 10.5 4.54329 10.3097C3.93072 10.056 3.44404 9.56928 3.1903 8.95671Z", stroke: "currentColor", strokeLinecap: "square", strokeLinejoin: "round", strokeWidth: "1.5", key: "3" }]
] as const;

const FALLBACK_SETTINGS_ICON: IconSvgElement = [
  ["path", { d: "M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z", stroke: "currentColor", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M21.011 14.0965C21.5329 13.9558 21.7939 13.8854 21.8969 13.7508C22 13.6163 22 13.3998 22 12.9669V11.0332C22 10.6003 22 10.3838 21.8969 10.2493C21.7938 10.1147 21.5329 10.0443 21.011 9.90358C19.0606 9.37759 17.8399 7.33851 18.3433 5.40087C18.4817 4.86799 18.5509 4.60156 18.4848 4.44529C18.4187 4.28902 18.2291 4.18134 17.8497 3.96596L16.125 2.98673C15.7528 2.77539 15.5667 2.66972 15.3997 2.69222C15.2326 2.71472 15.0442 2.90273 14.6672 3.27873C13.208 4.73448 10.7936 4.73442 9.33434 3.27864C8.95743 2.90263 8.76898 2.71463 8.60193 2.69212C8.43489 2.66962 8.24877 2.77529 7.87653 2.98663L6.15184 3.96587C5.77253 4.18123 5.58287 4.28891 5.51678 4.44515C5.45068 4.6014 5.51987 4.86787 5.65825 5.4008C6.16137 7.3385 4.93972 9.37763 2.98902 9.9036C2.46712 10.0443 2.20617 10.1147 2.10308 10.2492C2 10.3838 2 10.6003 2 11.0332V12.9669C2 13.3998 2 13.6163 2.10308 13.7508C2.20615 13.8854 2.46711 13.9558 2.98902 14.0965C4.9394 14.6225 6.16008 16.6616 5.65672 18.5992C5.51829 19.1321 5.44907 19.3985 5.51516 19.5548C5.58126 19.7111 5.77092 19.8188 6.15025 20.0341L7.87495 21.0134C8.24721 21.2247 8.43334 21.3304 8.6004 21.3079C8.76746 21.2854 8.95588 21.0973 9.33271 20.7213C10.7927 19.2644 13.2088 19.2643 14.6689 20.7212C15.0457 21.0973 15.2341 21.2853 15.4012 21.3078C15.5682 21.3303 15.7544 21.2246 16.1266 21.0133L17.8513 20.034C18.2307 19.8187 18.4204 19.711 18.4864 19.5547C18.5525 19.3984 18.4833 19.132 18.3448 18.5991C17.8412 16.6616 19.0609 14.6226 21.011 14.0965Z", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }]
] as const;

const Add01Icon = FALLBACK_ADD01_ICON;
const DashboardSquare01Icon = FALLBACK_DASHBOARD_ICON;
const Settings02Icon = FALLBACK_SETTINGS_ICON;

interface CloudProviderMeta {
  id: CloudProviderId;
  label: string;
  keyPlaceholder: string;
}

const CLOUD_PROVIDERS: CloudProviderMeta[] = [
  { id: "openai", label: "ChatGPT (OpenAI)", keyPlaceholder: "sk-proj-..." },
  { id: "anthropic", label: "Claude (Anthropic)", keyPlaceholder: "sk-ant-..." },
  { id: "google", label: "Gemini (Google)", keyPlaceholder: "AIza..." },
  { id: "perplexity", label: "Perplexity", keyPlaceholder: "pplx-..." },
  { id: "openrouter", label: "OpenRouter", keyPlaceholder: "sk-or-..." }
];

type SettingsModeTab = "cloud" | "local";

type SettingsSectionId = "models" | "shortcut";

const SHORTCUT_PRESETS = [
  { label: "Cmd/Ctrl + Shift + Space", value: "CommandOrControl+Shift+Space" },
  { label: "Cmd/Ctrl + Shift + K", value: "CommandOrControl+Shift+K" },
  { label: "Cmd/Ctrl + Space", value: "CommandOrControl+Space" },
  { label: "Cmd/Ctrl + Option + Space", value: "CommandOrControl+Alt+Space" }
] as const;

const CATALOG_PROVIDER_GROUP_ORDER = [
  "Meta",
  "Alibaba (Qwen)",
  "Google",
  "Mistral",
  "DeepSeek",
  "Microsoft",
  "Cohere",
  "IBM",
  "Community"
] as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildProviderDrafts(): Record<CloudProviderId, string> {
  return CLOUD_PROVIDER_IDS.reduce((result, id) => {
    result[id] = "";
    return result;
  }, {} as Record<CloudProviderId, string>);
}

function formatModelFootprint(sizeMb: number): string {
  if (sizeMb >= 1024) {
    const gb = sizeMb / 1024;
    return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }
  return `${sizeMb} MB`;
}

function ramFitTier(minRamGb: number, systemMemoryGb?: number): { label: string; tone: "good" | "maybe" | "bad" } {
  if (!systemMemoryGb || systemMemoryGb <= 0) {
    return { label: "Maybe", tone: "maybe" };
  }

  const recommendedLimit = systemMemoryGb * 0.62;
  const maybeLimit = systemMemoryGb * 0.9;

  if (minRamGb <= recommendedLimit) {
    return { label: "Recommended", tone: "good" };
  }
  if (minRamGb <= maybeLimit) {
    return { label: "Maybe", tone: "maybe" };
  }
  return { label: "Not recommended", tone: "bad" };
}

function inferCatalogProviderCategory(item: LocalModelCatalogItem): string {
  const haystack = `${item.title} ${item.model}`.toLowerCase();

  if (/(\bllama\b|\bmeta\b|codellama)/i.test(haystack)) return "Meta";
  if (/\bqwen\b/i.test(haystack)) return "Alibaba (Qwen)";
  if (/\bgemma\b/i.test(haystack)) return "Google";
  if (/\bmistral\b|\bmixtral\b|\bcodestral\b/i.test(haystack)) return "Mistral";
  if (/\bdeepseek\b/i.test(haystack)) return "DeepSeek";
  if (/\bphi\b/i.test(haystack)) return "Microsoft";
  if (/\bcohere\b|\bcommand-r\b/i.test(haystack)) return "Cohere";
  if (/\bgranite\b|\bibm\b/i.test(haystack)) return "IBM";
  return "Community";
}

function RobinIconGlyph({
  icon,
  size = 17,
  strokeWidth = 1.8,
  className
}: {
  icon?: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  if (!icon || !Array.isArray(icon)) {
    return null;
  }

  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    />
  );
}

function IconSettings() {
  return <RobinIconGlyph icon={Settings02Icon} />;
}

function IconSidebar() {
  return <RobinIconGlyph icon={DashboardSquare01Icon} size={16} />;
}

function IconPlus() {
  return <RobinIconGlyph icon={Add01Icon} />;
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 12H18" />
      <path d="M12 6L18 12L12 18" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 12 8" aria-hidden="true" focusable="false">
      <path d="M1.5 1.5L6 6L10.5 1.5" />
    </svg>
  );
}

function modelKey(mode: AssistantMode, model: string): string {
  return `${mode}:${model}`;
}

function parseModelKey(value: string): { mode: AssistantMode; model: string } {
  if (value.startsWith("local:")) return { mode: "local", model: value.slice(6) };
  return { mode: "search", model: value.slice(7) };
}

function shortName(value: string): string {
  const parsed = parseModelKey(value).model;
  return parsed.split("/").pop() || parsed || "—";
}

function safeCitationHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").split("/")[0] || rawUrl;
  }
}

function localStatusText(status: OllamaStatus | null): string {
  if (!status) return "Checking";
  if (status.state === "ready") return status.version ? `Ollama ${status.version}` : "Running";
  if (status.state === "no_model") return "No models pulled";
  if (status.state === "not_running") return "Not running";
  return "Not installed";
}

function ollamaDotClass(status: OllamaStatus | null): string {
  if (!status) return "ollama-dot ollama-dot-off";
  if (status.state === "ready") return "ollama-dot ollama-dot-ready";
  if (status.state === "no_model" || status.state === "not_running") return "ollama-dot ollama-dot-warning";
  return "ollama-dot ollama-dot-off";
}

export function App() {
  const [profileName, setProfileName] = useState("there");
  const [screen, setScreen] = useState<"chat" | "settings">("chat");
  const [settingsMode, setSettingsMode] = useState<SettingsModeTab>("cloud");
  const [settingsSections, setSettingsSections] = useState<Record<SettingsSectionId, boolean>>({
    models: true,
    shortcut: false
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [prompt, setPrompt] = useState("");
  const [shortcutDraft, setShortcutDraft] = useState("CommandOrControl+Shift+Space");
  const [activeModelDraft, setActiveModelDraft] = useState(modelKey("search", "sonar"));
  const [providerKeyDrafts, setProviderKeyDrafts] = useState<Record<CloudProviderId, string>>(() => buildProviderDrafts());
  const [customLocalModelDraft, setCustomLocalModelDraft] = useState("");
  const [localCatalog, setLocalCatalog] = useState<LocalModelCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = activeThread?.messages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const localModels = ollamaStatus?.models ?? [];
  const localModelSet = useMemo(() => new Set(localModels.map((model) => model.toLowerCase())), [localModels]);
  const displayName = profileName.toLowerCase().startsWith("karan") ? "Karan" : profileName;

  const catalogForDisplay = useMemo(() => {
    if (localCatalog.length === 0) {
      return [];
    }

    const memoryBudget = (status?.systemMemoryGb ?? 0) * 0.85;
    if (!memoryBudget) {
      return localCatalog;
    }

    const recommended = localCatalog.filter((item) => item.minRamGb <= memoryBudget);
    const fallback = localCatalog.filter((item) => item.minRamGb > memoryBudget);
    return [...recommended, ...fallback];
  }, [localCatalog, status?.systemMemoryGb]);

  const groupedCatalogForDisplay = useMemo(() => {
    const bucket = new Map<string, LocalModelCatalogItem[]>();
    for (const item of catalogForDisplay) {
      const category = inferCatalogProviderCategory(item);
      const existing = bucket.get(category);
      if (existing) {
        existing.push(item);
      } else {
        bucket.set(category, [item]);
      }
    }

    const order = new Map<string, number>();
    for (const [index, category] of CATALOG_PROVIDER_GROUP_ORDER.entries()) {
      order.set(category, index);
    }

    return Array.from(bucket.entries())
      .sort(([left], [right]) => {
        const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.localeCompare(right);
      })
      .map(([category, items]) => ({ category, items }));
  }, [catalogForDisplay]);

  async function refreshThreads(selectedId?: string) {
    const list = await window.robin.chat.listThreads();
    setThreads(list);
    const id = selectedId ?? activeThread?.id ?? list[0]?.id;
    if (!id) {
      setActiveThread(null);
      return;
    }
    setActiveThread(await window.robin.chat.loadThread(id));
  }

  async function refreshStatus() {
    const [nextStatus, nextOllamaStatus] = await Promise.all([window.robin.providers.getStatus(), window.robin.ollama.detect()]);
    setStatus(nextStatus);
    setOllamaStatus(nextOllamaStatus);
    setShortcutDraft(nextStatus.shortcut);
    setSettingsMode(nextStatus.preferredMode === "local" ? "local" : "cloud");
    setActiveModelDraft(
      nextStatus.preferredMode === "local"
        ? modelKey("local", nextStatus.ollama.selectedModel || nextOllamaStatus.selectedModel || "")
        : modelKey("search", nextStatus.perplexity.model)
    );
  }

  async function loadLocalCatalog(force = false) {
    if (catalogLoading && !force) {
      return;
    }

    try {
      setCatalogLoading(true);
      setCatalogError(null);
      const models = await window.robin.ollama.listCatalog(100);
      setLocalCatalog(models);
    } catch (catalogFetchError) {
      setCatalogError(catalogFetchError instanceof Error ? catalogFetchError.message : "Could not load local model catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const profile = await window.robin.app.getProfile();
        if (isActive) {
          setProfileName(profile.name || "there");
        }
      } catch {
        if (isActive) {
          setProfileName("there");
        }
      }

      try {
        await Promise.all([refreshStatus(), refreshThreads()]);
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Could not load Robin state.");
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (screen !== "settings" || settingsMode !== "local" || localCatalog.length > 0) {
      return;
    }
    void loadLocalCatalog();
  }, [screen, settingsMode, localCatalog.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
        if (screen === "settings") {
          setScreen("chat");
          return;
        }
        void window.robin.app.togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, sidebarOpen]);

  async function persistConfig(patch: SaveConfigInput) {
    try {
      setError(null);
      await window.robin.providers.saveConfig({
        onboardingCompleted: true,
        ...patch
      });
      await refreshStatus();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    }
  }

  async function setPreferredMode(next: SettingsModeTab) {
    setSettingsMode(next);
    if (next === "cloud") {
      const nextCloudModel = status?.perplexity.model || "sonar";
      setActiveModelDraft(modelKey("search", nextCloudModel));
      await persistConfig({
        preferredMode: "search",
        perplexityModel: nextCloudModel
      });
      return;
    }

    const nextLocalModel = status?.ollama.selectedModel || ollamaStatus?.selectedModel || "";
    setActiveModelDraft(modelKey("local", nextLocalModel));
    await persistConfig({
      preferredMode: "local",
      ollamaModel: nextLocalModel
    });
  }

  async function applyModelSelection(nextModelKey: string) {
    const next = parseModelKey(nextModelKey);
    setActiveModelDraft(nextModelKey);
    if (next.mode === "search") {
      await persistConfig({
        preferredMode: "search",
        perplexityModel: next.model || status?.perplexity.model || "sonar"
      });
      return;
    }
    await persistConfig({
      preferredMode: "local",
      ollamaModel: next.model || ollamaStatus?.selectedModel || ""
    });
  }

  async function saveProviderKey(providerId: CloudProviderId) {
    const candidate = providerKeyDrafts[providerId].trim();
    if (!candidate) {
      return;
    }
    await persistConfig({
      providerApiKeys: {
        [providerId]: candidate
      }
    });
    setProviderKeyDrafts((current) => ({
      ...current,
      [providerId]: ""
    }));
  }

  async function saveShortcutDraft(nextShortcut?: string) {
    const shortcut = (nextShortcut ?? shortcutDraft).trim();
    if (!shortcut) {
      setShortcutDraft(status?.shortcut || "CommandOrControl+Shift+Space");
      return;
    }
    try {
      setError(null);
      const result = await window.robin.app.setShortcut(shortcut);
      setShortcutDraft(result.shortcut);
      if (!result.success) {
        setError("Shortcut in use.");
      }
    } catch (shortcutError) {
      setError(shortcutError instanceof Error ? shortcutError.message : "Could not set shortcut.");
    }
  }

  function toggleSettingsSection(sectionId: SettingsSectionId) {
    setSettingsSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId]
    }));
  }

  async function useOrPullLocalModel(model: string) {
    const targetModel = model.trim();
    if (!targetModel) {
      return;
    }

    const installed = localModelSet.has(targetModel.toLowerCase());
    if (installed) {
      await applyModelSelection(modelKey("local", targetModel));
      return;
    }

    try {
      setError(null);
      setPullingModel(targetModel);
      await window.robin.ollama.pullModel(targetModel);
      await refreshStatus();
      await applyModelSelection(modelKey("local", targetModel));
    } catch (pullError) {
      setError(pullError instanceof Error ? pullError.message : `Could not download ${targetModel}.`);
    } finally {
      setPullingModel(null);
    }
  }

  async function handleCustomLocalModelSubmit(event: FormEvent) {
    event.preventDefault();
    const candidate = customLocalModelDraft.trim();
    if (!candidate || pullingModel) {
      return;
    }
    await useOrPullLocalModel(candidate);
    setCustomLocalModelDraft("");
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || isStreaming) return;
    const parsed = parseModelKey(activeModelDraft);
    if (parsed.mode === "local" && !parsed.model) {
      setError("Select or download a local model first.");
      return;
    }
    setError(null);
    setIsStreaming(true);
    const text = prompt.trim();
    setPrompt("");
    await window.robin.chat.streamReply(
      { conversationId: activeThread?.id, mode: parsed.mode, prompt: text },
      {
        onThread: ({ thread }) => {
          setActiveThread({ ...thread });
          void refreshThreads(thread.id);
        },
        onDelta: ({ messageId, delta }) => {
          setActiveThread((current) => current
            ? {
                ...current,
                messages: current.messages.map((message) => (
                  message.id === messageId
                    ? { ...message, content: message.content + delta, status: "streaming" }
                    : message
                ))
              }
            : current);
        },
        onCitations: ({ messageId, citations }) => {
          setActiveThread((current) => current
            ? {
                ...current,
                messages: current.messages.map((message) => (
                  message.id === messageId ? { ...message, citations } : message
                ))
              }
            : current);
        },
        onDone: ({ thread }) => {
          setIsStreaming(false);
          setActiveThread({ ...thread });
          void refreshThreads(thread.id);
        },
        onError: ({ message }) => {
          setIsStreaming(false);
          setError(message);
          void refreshThreads(activeThread?.id);
        }
      }
    );
  }

  function startNewChat() {
    setActiveThread(null);
    setError(null);
    setScreen("chat");
  }

  function selectThread(id: string) {
    setScreen("chat");
    void refreshThreads(id);
  }

  const parsed = parseModelKey(activeModelDraft);

  return (
    <div className="robin-shell">
      <div className="menu-bridge" />

      <div className="toolbar">
        <div className="toolbar-left">
          <button
            className={`tool-btn tool-btn-dashboard${sidebarOpen ? " tool-btn-active" : ""}`}
            title={sidebarOpen ? "Hide chats" : "Show chats"}
            aria-label={sidebarOpen ? "Hide chats" : "Show chats"}
            onClick={() => setSidebarOpen((current) => !current)}
          >
            <IconSidebar />
          </button>
        </div>

        <div className="toolbar-right">
          <button className="tool-btn" title="New chat" onClick={startNewChat}>
            <IconPlus />
          </button>
        </div>
      </div>

      <div className="chat-workspace">
        <aside className={`chat-sidebar${sidebarOpen ? " chat-sidebar-open" : ""}`}>
          <div className="chat-sidebar-head">Chats</div>
          <div className="chat-sidebar-list">
            {threads.length > 0 ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  className={`chat-sidebar-item${activeThread?.id === thread.id ? " chat-sidebar-item-active" : ""}`}
                  onClick={() => selectThread(thread.id)}
                >
                  {thread.title || thread.preview || "Untitled"}
                </button>
              ))
            ) : (
              <p className="chat-sidebar-empty">No conversations yet</p>
            )}
          </div>
          <div className="chat-sidebar-footer">
            <button
              className={`chat-sidebar-settings${screen === "settings" ? " chat-sidebar-settings-active" : ""}`}
              onClick={() => setScreen("settings")}
            >
              <IconSettings />
              <span>Settings</span>
            </button>
            <p className="chat-sidebar-branding">2048 LABS</p>
          </div>
        </aside>

        <div className="chat-main">
          {screen === "settings" ? (
            <>
              <header className="settings-pane-header">
                <h1 className="settings-pane-title">Settings</h1>
              </header>

              {error && <div className="error-banner">{error}</div>}

              <section className="settings-pane-scroll">
                <article className={`settings-accordion${settingsSections.models ? " settings-accordion-open" : ""}`}>
                  <button
                    type="button"
                    className="settings-accordion-trigger"
                    aria-expanded={settingsSections.models}
                    onClick={() => toggleSettingsSection("models")}
                  >
                    <span className="settings-accordion-label">Models</span>
                    <span className={`settings-accordion-arrow${settingsSections.models ? " settings-accordion-arrow-open" : ""}`}>
                      <IconChevron />
                    </span>
                  </button>

                  {settingsSections.models ? (
                    <div className="settings-accordion-content settings-accordion-content-models">
                      <div className="settings-mode-toggle" role="tablist" aria-label="Assistant mode">
                        <button
                          className={`mode-tab${settingsMode === "cloud" ? " mode-tab-active" : ""}`}
                          onClick={() => { void setPreferredMode("cloud"); }}
                        >
                          Cloud
                        </button>
                        <button
                          className={`mode-tab${settingsMode === "local" ? " mode-tab-active" : ""}`}
                          onClick={() => { void setPreferredMode("local"); }}
                        >
                          Local
                        </button>
                      </div>

                      {settingsMode === "cloud" ? (
                        <div className="setting-section setting-section-single">
                          <label className="field-label">Default cloud provider</label>
                          <select
                            className="field-input field-select"
                            value={status?.activeCloudProvider ?? "perplexity"}
                            onChange={(event) => {
                              const providerId = event.target.value as CloudProviderId;
                              void persistConfig({
                                preferredMode: "search",
                                activeCloudProvider: providerId
                              });
                            }}
                          >
                            {CLOUD_PROVIDERS.map((provider) => (
                              <option key={provider.id} value={provider.id}>{provider.label}</option>
                            ))}
                          </select>

                          <p className="setting-title">Provider Keys (BYOK)</p>
                          <div className="provider-grid">
                            {CLOUD_PROVIDERS.map((provider) => {
                              const keySaved = status?.cloudProviderKeys?.[provider.id];
                              return (
                                <article key={provider.id} className="provider-card">
                                  <div className="provider-card-head">
                                    <img className="provider-logo" src={providerPlaceholderLogo} alt={`${provider.label} logo`} />
                                    <div className="provider-copy">
                                      <p className="provider-name">{provider.label}</p>
                                      <p className="provider-state">{keySaved ? "Key saved" : "No key added yet"}</p>
                                    </div>
                                  </div>
                                  <input
                                    className="field-input provider-key-input"
                                    type="password"
                                    placeholder={keySaved ? "Saved" : provider.keyPlaceholder}
                                    value={providerKeyDrafts[provider.id]}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setProviderKeyDrafts((current) => ({
                                        ...current,
                                        [provider.id]: value
                                      }));
                                    }}
                                    onBlur={() => { void saveProviderKey(provider.id); }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        void saveProviderKey(provider.id);
                                      }
                                    }}
                                  />
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="setting-section">
                            <p className="setting-title">Local Runtime</p>
                            <div className="ollama-status">
                              <span className={ollamaDotClass(ollamaStatus)} />
                              <span className="ollama-label">{localStatusText(ollamaStatus)}</span>
                            </div>
                            <p className="setting-note">
                              System RAM detected: {status?.systemMemoryGb ? `${status.systemMemoryGb} GB` : "Unknown"}.
                            </p>

                            <form className="custom-local-model-form" onSubmit={handleCustomLocalModelSubmit}>
                              <label className="field-label">Pull any Ollama model</label>
                              <div className="custom-local-model-row">
                                <input
                                  className="field-input custom-local-model-input"
                                  value={customLocalModelDraft}
                                  placeholder="e.g. qwen2.5:7b"
                                  onChange={(event) => setCustomLocalModelDraft(event.target.value)}
                                />
                                <button
                                  type="submit"
                                  className="inline-action-button"
                                  disabled={!customLocalModelDraft.trim() || Boolean(pullingModel)}
                                >
                                  {pullingModel ? "Downloading..." : "Download"}
                                </button>
                              </div>
                            </form>

                            {localModels.length > 0 ? (
                              <div className="installed-model-list">
                                {localModels.map((model) => {
                                  const isActive = activeModelDraft === modelKey("local", model);
                                  return (
                                    <button
                                      key={model}
                                      className={`local-model-row${isActive ? " local-model-row-active" : ""}`}
                                      onClick={() => { void applyModelSelection(modelKey("local", model)); }}
                                    >
                                      <span className="local-model-name">{model}</span>
                                      {isActive && <span className="local-model-badge">active</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="setting-note setting-note-tight">
                                No local models installed yet.
                              </p>
                            )}

                            <button
                              className="ghost-button"
                              onClick={() => { void window.robin.app.openExternal(ollamaStatus?.downloadUrl ?? "https://ollama.com/download"); }}
                            >
                              Get Ollama
                            </button>
                          </div>

                          <div className="setting-section setting-section-last">
                            <div className="catalog-header-row">
                              <p className="setting-title">Top Local Models</p>
                              <button className="ghost-button" onClick={() => { void loadLocalCatalog(true); }}>
                                Refresh
                              </button>
                            </div>

                            {catalogLoading ? (
                              <p className="setting-note">Loading top local models...</p>
                            ) : catalogError ? (
                              <p className="setting-note">{catalogError}</p>
                            ) : (
                              <div className="catalog-list">
                                {groupedCatalogForDisplay.map((group) => (
                                  <section key={group.category} className="catalog-group">
                                    <div className="catalog-group-head">
                                      <p className="catalog-group-title">{group.category}</p>
                                      <span className="catalog-group-count">{group.items.length}</span>
                                    </div>
                                    <div className="catalog-group-items">
                                      {group.items.map((item) => {
                                        const installed = localModelSet.has(item.model.toLowerCase());
                                        const busy = pullingModel === item.model;
                                        const fit = ramFitTier(item.minRamGb, status?.systemMemoryGb);
                                        return (
                                          <article key={item.id} className="catalog-item">
                                            <div className="catalog-item-head">
                                              <div className="catalog-item-main">
                                                <p className="catalog-item-title">{item.title}</p>
                                                <p className="catalog-item-model">{item.model}</p>
                                              </div>
                                              <button
                                                className="inline-action-button catalog-action-button"
                                                disabled={busy}
                                                onClick={() => { void useOrPullLocalModel(item.model); }}
                                              >
                                                {busy ? "Downloading..." : installed ? "Use" : "Download"}
                                              </button>
                                            </div>
                                            <p className="catalog-item-description">{item.description}</p>
                                            <p className="catalog-item-metrics">
                                              <span className={`ram-fit ram-fit-${fit.tone}`}>{fit.label}</span>
                                              {item.sizeLabel.toUpperCase()} • {formatModelFootprint(item.estimatedSizeMb)} • ~{item.minRamGb} GB RAM • {item.pulls} pulls
                                            </p>
                                          </article>
                                        );
                                      })}
                                    </div>
                                  </section>
                                ))}
                                {groupedCatalogForDisplay.length === 0 ? (
                                  <p className="setting-note">No catalog models available yet.</p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </article>

                <article className={`settings-accordion${settingsSections.shortcut ? " settings-accordion-open" : ""}`}>
                  <button
                    type="button"
                    className="settings-accordion-trigger"
                    aria-expanded={settingsSections.shortcut}
                    onClick={() => toggleSettingsSection("shortcut")}
                  >
                    <span className="settings-accordion-label">Shortcut</span>
                    <span className={`settings-accordion-arrow${settingsSections.shortcut ? " settings-accordion-arrow-open" : ""}`}>
                      <IconChevron />
                    </span>
                  </button>

                  {settingsSections.shortcut ? (
                    <div className="settings-accordion-content">
                      <div className="setting-section setting-section-single setting-section-last">
                        <label className="field-label">Global shortcut</label>
                        <input
                          className="field-input"
                          value={shortcutDraft}
                          onChange={(event) => setShortcutDraft(event.target.value)}
                          onBlur={() => { void saveShortcutDraft(); }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveShortcutDraft();
                            }
                          }}
                        />
                        <p className="setting-note setting-note-tight">
                          Enter an Electron accelerator (example: CommandOrControl+Shift+Space).
                        </p>
                        <div className="shortcut-presets">
                          {SHORTCUT_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              className={`shortcut-chip${shortcutDraft.trim() === preset.value ? " shortcut-chip-active" : ""}`}
                              onClick={() => {
                                setShortcutDraft(preset.value);
                                void saveShortcutDraft(preset.value);
                              }}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              </section>
            </>
          ) : (
            <>
              {error && <div className="error-banner">{error}</div>}

              <section className={`chat-log${messages.length === 0 ? " chat-log-empty" : ""}`}>
                {messages.length > 0 ? (
                  <>
                    {messages.map((message) => (
                      <article
                        key={message.id}
                        className={`chat-msg ${message.role === "user" ? "chat-msg-user" : "chat-msg-assistant"}${message.status === "streaming" ? " chat-msg-streaming" : ""}`}
                      >
                        <span className="chat-msg-role">{message.role === "assistant" ? "Robin" : "You"}</span>
                        <div className="chat-msg-body">
                          {message.content}
                          {message.citations?.length ? (
                            <div className="citation-list">
                              {message.citations.map((citation) => (
                                <button key={citation.url} className="citation" onClick={() => { void window.robin.app.openExternal(citation.url); }}>
                                  <span className="citation-title">{citation.title}</span> — {safeCitationHost(citation.url)}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <span className="chat-msg-time">{formatTime(message.createdAt)}</span>
                      </article>
                    ))}
                    <div ref={chatEndRef} />
                  </>
                ) : (
                  <div className="new-tab-state">
                    <h1 className="greeting-hi">
                      Hi, <span className="greeting-name">{displayName}</span>
                    </h1>
                    <p className="greeting-question">What&apos;s up?</p>
                  </div>
                )}
              </section>

              <form className="composer" onSubmit={handleSend}>
                <div className="composer-box">
                  <textarea
                    className="composer-input"
                    placeholder="Ask Robin..."
                    rows={1}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend(event);
                      }
                    }}
                  />
                  <div className="composer-footer">
                    <div className="composer-meta">
                      <span className={`composer-dot ${parsed.mode === "search" ? "composer-dot-web" : "composer-dot-local"}`} />
                      <span className="composer-model">
                        {isStreaming ? "Thinking..." : `${parsed.mode === "search" ? "Cloud" : "Local"} • ${shortName(activeModelDraft)}`}
                      </span>
                    </div>
                    <button type="submit" className="send-btn" disabled={!prompt.trim() || isStreaming}>
                      <IconSend />
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
