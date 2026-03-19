import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import "@fontsource/gochi-hand";
import "@fontsource/dm-sans/500.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AssistantMode,
  CLOUD_PROVIDER_IDS,
  ChatAttachment,
  CloudModelCatalogItem,
  CloudProviderId,
  ConversationThread,
  LocalModelCatalogItem,
  OllamaStatus,
  ProviderStatus,
  RobinBridge,
  SaveConfigInput,
  ThreadSummary,
  TodoItem,
  NoteItem,
  UpdateCheckResult
} from "../shared/contracts";

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

const DashboardSquare01Icon = FALLBACK_DASHBOARD_ICON;
const Settings02Icon = FALLBACK_SETTINGS_ICON;

interface CloudProviderMeta {
  id: CloudProviderId;
  label: string;
}

const CLOUD_PROVIDERS: CloudProviderMeta[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
  { id: "perplexity", label: "Perplexity" },
  { id: "openrouter", label: "OpenRouter" }
];

type SidebarTab = "chats" | "todos" | "notes" | "calendar";

type SettingsModeTab = "cloud" | "local";

type SettingsSectionId = "models" | "shortcut" | "updates";

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

function normalizeCloudProviderKeys(
  source?: Partial<Record<CloudProviderId, boolean>>
): Record<CloudProviderId, boolean> {
  return CLOUD_PROVIDER_IDS.reduce((result, id) => {
    result[id] = Boolean(source?.[id]);
    return result;
  }, {} as Record<CloudProviderId, boolean>);
}

function normalizeProviderKeyDrafts(
  source?: Partial<Record<CloudProviderId, string>>
): Record<CloudProviderId, string> {
  return CLOUD_PROVIDER_IDS.reduce((result, id) => {
    result[id] = typeof source?.[id] === "string" ? source[id] ?? "" : "";
    return result;
  }, {} as Record<CloudProviderId, string>);
}

function normalizeSelectedCloudModels(
  source?: Partial<Record<CloudProviderId, string[]>>
): Record<CloudProviderId, string[]> {
  return CLOUD_PROVIDER_IDS.reduce((result, id) => {
    const candidate = source?.[id];
    if (!Array.isArray(candidate)) {
      result[id] = [];
      return result;
    }
    result[id] = Array.from(
      new Set(
        candidate
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
    return result;
  }, {} as Record<CloudProviderId, string[]>);
}

function buildCloudProviderStateMap<T>(factory: (providerId: CloudProviderId) => T): Record<CloudProviderId, T> {
  return CLOUD_PROVIDER_IDS.reduce((result, providerId) => {
    result[providerId] = factory(providerId);
    return result;
  }, {} as Record<CloudProviderId, T>);
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

function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 5H19V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19H5V14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 5L13.5 10.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19L10.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 12H18" />
      <path d="M12 6L18 12L12 18" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="8" height="8" rx="1.3" ry="1.3" />
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

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" ry="2.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M20.5 15L15.5 11L11 15.5L9 13.8L3.5 18.4" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 12C20 16.4183 16.4183 20 12 20C10.8053 20 9.66834 19.7467 8.64478 19.2908L4 20L5.07146 16.1278C4.39443 14.9129 4 13.5028 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <path d="M14 7H20" />
      <path d="M14 17H20" />
      <rect x="4" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" />
      <path d="M20 12V6C20 4.89543 19.1046 4 18 4H16" />
      <path d="M8 9H12" />
      <path d="M8 13H16" />
      <path d="M8 17H14" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10H20" />
      <path d="M8 3V7" />
      <path d="M16 3V7" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 13L9 17L19 7" />
    </svg>
  );
}

interface DropdownOption {
  value: string;
  label: string;
  group?: string;
}

function ThemedDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled,
  compact = false,
  borderless = false,
  menuDirection = "down",
  className
}: {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  borderless?: boolean;
  menuDirection?: "down" | "up";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? placeholder;
  const renderedOptions: React.ReactNode[] = [];
  let activeGroup = "";

  for (const option of options) {
    if (option.group && option.group !== activeGroup) {
      activeGroup = option.group;
      renderedOptions.push(
        <div key={`group-${option.group}`} className="themed-dropdown-group">{option.group}</div>
      );
    }
    renderedOptions.push(
      <button
        key={option.value}
        type="button"
        className={`themed-dropdown-option${option.value === value ? " themed-dropdown-option-active" : ""}`}
        onClick={() => {
          onChange(option.value);
          setOpen(false);
        }}
      >
        {option.label}
      </button>
    );
  }

  return (
    <div ref={rootRef} className={`themed-dropdown${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className={
          `themed-dropdown-trigger${open ? " themed-dropdown-trigger-open" : ""}`
          + `${compact ? " themed-dropdown-trigger-compact" : ""}`
          + `${borderless ? " themed-dropdown-trigger-borderless" : ""}`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`themed-dropdown-label${selected ? "" : " themed-dropdown-label-placeholder"}`}>{label}</span>
        <span className={`themed-dropdown-arrow${open ? " themed-dropdown-arrow-open" : ""}`}>
          <IconChevron />
        </span>
      </button>
      {open ? (
        <div
          className={`themed-dropdown-menu${menuDirection === "up" ? " themed-dropdown-menu-up" : ""}`}
          role="listbox"
        >
          {renderedOptions.length > 0 ? renderedOptions : (
            <div className="themed-dropdown-empty">No options available</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ErrorBanner({
  message,
  onClose
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-banner-text">{message}</p>
      <button
        type="button"
        className="error-banner-close"
        aria-label="Dismiss error"
        title="Dismiss"
        onClick={onClose}
      >
        <IconClose />
      </button>
    </div>
  );
}

function modelKey(mode: AssistantMode, model: string): string {
  return `${mode}:${model}`;
}

function cloudComposerValue(provider: CloudProviderId, model: string): string {
  return `cloud:${provider}:${encodeURIComponent(model)}`;
}

function localComposerValue(model: string): string {
  return `local:${model}`;
}

function parseComposerValue(value: string): (
  | { mode: "local"; model: string }
  | { mode: "search"; provider: CloudProviderId; model: string }
  | { mode: "unknown" }
) {
  if (value.startsWith("local:")) {
    return { mode: "local", model: value.slice(6) };
  }

  if (!value.startsWith("cloud:")) {
    return { mode: "unknown" };
  }

  const segments = value.split(":");
  const providerRaw = segments[1] ?? "";
  const provider = CLOUD_PROVIDER_IDS.find((providerId) => providerId === providerRaw);
  if (!provider) {
    return { mode: "unknown" };
  }

  const encodedModel = segments.slice(2).join(":");
  let model = encodedModel;
  try {
    model = decodeURIComponent(encodedModel);
  } catch {
    model = encodedModel;
  }

  if (!model.trim()) {
    return { mode: "unknown" };
  }

  return {
    mode: "search",
    provider,
    model
  };
}

function parseModelKey(value: string): { mode: AssistantMode; model: string } {
  if (value.startsWith("local:")) return { mode: "local", model: value.slice(6) };
  return { mode: "search", model: value.slice(7) };
}

function shortName(value: string): string {
  const parsed = parseModelKey(value).model;
  return parsed.split("/").pop() || parsed || "—";
}

function resolveCloudProviderId(raw: string, fallback: CloudProviderId = "openai"): CloudProviderId {
  const normalized = raw.trim().toLowerCase();
  const found = CLOUD_PROVIDER_IDS.find((providerId) => providerId === normalized);
  return found ?? fallback;
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
  if (status.state === "ready") {
    if (!status.version) return "Running";
    const cleaned = status.version
      .replace(/^ollama\s+version\s+is\s+/i, "")
      .replace(/^ollama\s+version\s+/i, "")
      .replace(/^version\s+/i, "")
      .trim();
    return cleaned ? `Ollama ${cleaned}` : "Running";
  }
  if (status.state === "no_model") return "No models pulled";
  if (status.state === "not_running") return "Not running";
  return "Not installed";
}

const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download/";
const MAX_IMAGE_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function ollamaDotClass(status: OllamaStatus | null): string {
  if (!status) return "ollama-dot ollama-dot-off";
  if (status.state === "ready") return "ollama-dot ollama-dot-ready";
  if (status.state === "no_model" || status.state === "not_running") return "ollama-dot ollama-dot-warning";
  return "ollama-dot ollama-dot-off";
}

function errorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : "";
  const message = raw
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();

  if (!message) {
    return fallback;
  }

  if (/fetch failed/i.test(message)) {
    return "Could not reach Ollama. Start Ollama and retry.";
  }

  if (
    /chat is not wired yet/i.test(message) ||
    /providers:list-cloud-models/i.test(message) ||
    /configure a model to use robin/i.test(message)
  ) {
    return "Add a cloud API key in Settings or switch to Local mode.";
  }

  if (/does not support image input|no endpoints found that support image input/i.test(message)) {
    return "Selected model does not support image input. Choose a vision-capable model or send text only.";
  }

  if (/quota exceeded|rate[-\s]?limit|billing details|retry in/i.test(message)) {
    return "Provider quota or rate limit reached. Check your plan/usage and retry.";
  }

  if (message.length > 420) {
    return `${message.slice(0, 417).trimEnd()}...`;
  }

  return message;
}

function getRobinBridge(): RobinBridge {
  const bridge = (window as unknown as { robin?: RobinBridge }).robin;
  if (!bridge) {
    throw new Error("Robin desktop bridge is unavailable. Please restart Robin.");
  }
  return bridge;
}

export function App() {
  const [profileName, setProfileName] = useState("there");
  const [screen, setScreen] = useState<"chat" | "settings">("chat");
  const [settingsMode, setSettingsMode] = useState<SettingsModeTab>("cloud");
  const [settingsSections, setSettingsSections] = useState<Record<SettingsSectionId, boolean>>({
    models: true,
    shortcut: false,
    updates: false
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chats");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState("");
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitleDraft, setNoteTitleDraft] = useState("");
  const [noteContentDraft, setNoteContentDraft] = useState("");
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [prompt, setPrompt] = useState("");
  const [shortcutDraft, setShortcutDraft] = useState("CommandOrControl+Shift+Space");
  const [activeModelDraft, setActiveModelDraft] = useState(modelKey("search", ""));
  const [providerKeyDrafts, setProviderKeyDrafts] = useState<Record<CloudProviderId, string>>(() => buildProviderDrafts());
  const [selectedCloudModelsDraft, setSelectedCloudModelsDraft] = useState<Record<CloudProviderId, string[]>>(() => normalizeSelectedCloudModels());
  const [openRouterModelDraft, setOpenRouterModelDraft] = useState("");
  const [customLocalModelDraft, setCustomLocalModelDraft] = useState("");
  const [localCatalog, setLocalCatalog] = useState<LocalModelCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cloudModelsByProvider, setCloudModelsByProvider] = useState<Record<CloudProviderId, CloudModelCatalogItem[]>>(
    () => buildCloudProviderStateMap(() => [])
  );
  const [cloudModelsLoadingByProvider, setCloudModelsLoadingByProvider] = useState<Record<CloudProviderId, boolean>>(
    () => buildCloudProviderStateMap(() => false)
  );
  const [cloudModelsErrorByProvider, setCloudModelsErrorByProvider] = useState<Record<CloudProviderId, string | null>>(
    () => buildCloudProviderStateMap(() => null)
  );
  const [cloudModelDraft, setCloudModelDraft] = useState("");
  const [cloudModeDraft, setCloudModeDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);
  const [localModelNotice, setLocalModelNotice] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<{ toolName: string; status: "calling" | "complete" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState("");
  const [updatesChecking, setUpdatesChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const streamWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamSequenceRef = useRef(0);
  const activeStreamIdRef = useRef<string | null>(null);
  const pendingDeltasRef = useRef(new Map<string, string>());
  const deltaFrameRef = useRef<number | null>(null);
  const messages = activeThread?.messages ?? [];

  function applyPendingDeltas() {
    if (pendingDeltasRef.current.size === 0) {
      return;
    }

    const deltaByMessageId = new Map(pendingDeltasRef.current);
    pendingDeltasRef.current.clear();
    setActiveThread((current) => current
      ? {
          ...current,
          messages: current.messages.map((message) => {
            const queued = deltaByMessageId.get(message.id);
            if (!queued) {
              return message;
            }
            return {
              ...message,
              content: message.content + queued,
              status: "streaming"
            };
          })
        }
      : current);
  }

  function flushPendingDeltas() {
    if (deltaFrameRef.current !== null) {
      cancelAnimationFrame(deltaFrameRef.current);
      deltaFrameRef.current = null;
    }
    applyPendingDeltas();
  }

  function queueDelta(messageId: string, delta: string) {
    const existing = pendingDeltasRef.current.get(messageId) ?? "";
    pendingDeltasRef.current.set(messageId, existing + delta);
    if (deltaFrameRef.current !== null) {
      return;
    }
    deltaFrameRef.current = window.requestAnimationFrame(() => {
      deltaFrameRef.current = null;
      applyPendingDeltas();
    });
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const localModels = ollamaStatus?.models ?? [];
  const localModelSet = useMemo(() => new Set(localModels.map((model) => model.toLowerCase())), [localModels]);
  const configuredCloudProviders = useMemo(
    () => CLOUD_PROVIDERS.filter((provider) => Boolean(status?.cloudProviderKeys?.[provider.id])),
    [status?.cloudProviderKeys]
  );
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
    const robin = getRobinBridge();
    const list = await robin.chat.listThreads();
    setThreads(list);

    const hasPreferred = Boolean(selectedId && list.some((thread) => thread.id === selectedId));
    const hasCurrent = Boolean(activeThread?.id && list.some((thread) => thread.id === activeThread.id));
    const id = hasPreferred
      ? selectedId
      : hasCurrent
        ? activeThread?.id
        : list[0]?.id;

    if (!id) {
      setActiveThread(null);
      return;
    }
    setActiveThread(await robin.chat.loadThread(id));
  }

  async function refreshStatus() {
    const robin = getRobinBridge();
    const [rawStatus, nextOllamaStatus] = await Promise.all([robin.providers.getStatus(), robin.ollama.detect()]);
    const nextStatus: ProviderStatus = {
      ...rawStatus,
      cloudProviderKeys: normalizeCloudProviderKeys(rawStatus.cloudProviderKeys),
      providerApiKeys: normalizeProviderKeyDrafts(rawStatus.providerApiKeys),
      selectedCloudModels: normalizeSelectedCloudModels(rawStatus.selectedCloudModels)
    };
    setStatus(nextStatus);
    setProviderKeyDrafts(nextStatus.providerApiKeys);
    setSelectedCloudModelsDraft(nextStatus.selectedCloudModels);
    setOllamaStatus(nextOllamaStatus);
    setShortcutDraft(nextStatus.shortcut);
    setSettingsMode(nextStatus.preferredMode === "local" ? "local" : "cloud");
    const hasActiveCloudKey = Boolean(nextStatus.cloudProviderKeys?.[nextStatus.activeCloudProvider]);
    setActiveModelDraft(
      nextStatus.preferredMode === "local"
        ? modelKey("local", nextStatus.ollama.selectedModel || nextOllamaStatus.selectedModel || "")
        : modelKey("search", hasActiveCloudKey ? nextStatus.activeCloudProvider : "")
    );
  }

  async function loadLocalCatalog(force = false) {
    if (catalogLoading && !force) {
      return;
    }

    try {
      setCatalogLoading(true);
      setCatalogError(null);
      const robin = getRobinBridge();
      const models = await robin.ollama.listCatalog(100);
      setLocalCatalog(models);
    } catch (catalogFetchError) {
      setCatalogError(errorMessage(catalogFetchError, "Could not load local model catalog."));
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadCloudModels(provider: CloudProviderId) {
    if (cloudModelsLoadingByProvider[provider]) {
      return;
    }

    if (provider === "openrouter") {
      setCloudModelsByProvider((current) => ({
        ...current,
        openrouter: []
      }));
      setCloudModelsErrorByProvider((current) => ({
        ...current,
        openrouter: null
      }));
      return;
    }

    try {
      setCloudModelsLoadingByProvider((current) => ({
        ...current,
        [provider]: true
      }));
      setCloudModelsErrorByProvider((current) => ({
        ...current,
        [provider]: null
      }));
      const result = await getRobinBridge().providers.listCloudModels(provider);
      const nextModels = result.models;
      setCloudModelsByProvider((current) => ({
        ...current,
        [provider]: nextModels
      }));

      const activeSelection = parseModelKey(activeModelDraft);
      const activeProvider = activeSelection.mode === "search"
        ? CLOUD_PROVIDER_IDS.find((providerId) => providerId === activeSelection.model.trim().toLowerCase())
        : undefined;

      if (activeProvider === provider) {
        const selectedIds = new Set(selectedCloudModelsDraft[provider] ?? []);
        const selectableModels = nextModels.filter((model) => selectedIds.has(model.id));
        const nextSelectedModel = selectableModels.find((model) => model.id === cloudModelDraft)?.id ?? selectableModels[0]?.id ?? "";
        setCloudModelDraft(nextSelectedModel);
        const modeOptions = selectableModels.find((model) => model.id === nextSelectedModel)?.modes ?? [];
        if (provider === "openai") {
          const nextSelectedMode = modeOptions.find((mode) => mode === cloudModeDraft) ?? modeOptions[0] ?? "";
          setCloudModeDraft(nextSelectedMode);
        } else {
          setCloudModeDraft("");
        }
      }
    } catch (cloudModelsFetchError) {
      setCloudModelsByProvider((current) => ({
        ...current,
        [provider]: []
      }));
      const activeSelection = parseModelKey(activeModelDraft);
      const activeProvider = activeSelection.mode === "search"
        ? CLOUD_PROVIDER_IDS.find((providerId) => providerId === activeSelection.model.trim().toLowerCase())
        : undefined;
      if (activeProvider === provider) {
        setCloudModelDraft("");
        if (provider === "openai") {
          setCloudModeDraft("");
        }
      }
      setCloudModelsErrorByProvider((current) => ({
        ...current,
        [provider]: errorMessage(cloudModelsFetchError, "Could not load cloud models.")
      }));
    } finally {
      setCloudModelsLoadingByProvider((current) => ({
        ...current,
        [provider]: false
      }));
    }
  }

  async function loadTodos() {
    try {
      const list = await getRobinBridge().todos.list();
      setTodos(list);
    } catch {
      // Silently fail — todos are non-critical
    }
  }

  async function createTodo() {
    const title = newTodoTitle.trim();
    if (!title) return;
    setNewTodoTitle("");
    try {
      const todo = await getRobinBridge().todos.create(title);
      setTodos((current) => [...current, todo]);
    } catch {
      setNewTodoTitle(title);
    }
  }

  async function toggleTodo(id: string, completed: boolean) {
    setTodos((current) => current.map((t) => t.id === id ? { ...t, completed } : t));
    try {
      await getRobinBridge().todos.update(id, { completed });
    } catch {
      setTodos((current) => current.map((t) => t.id === id ? { ...t, completed: !completed } : t));
    }
  }

  async function saveTodoTitle(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) {
      setEditingTodoId(null);
      return;
    }
    setTodos((current) => current.map((t) => t.id === id ? { ...t, title: trimmed } : t));
    setEditingTodoId(null);
    try {
      await getRobinBridge().todos.update(id, { title: trimmed });
    } catch {
      // Revert on failure
      await loadTodos();
    }
  }

  async function deleteTodoItem(id: string) {
    setTodos((current) => current.filter((t) => t.id !== id));
    try {
      await getRobinBridge().todos.delete(id);
    } catch {
      await loadTodos();
    }
  }

  async function handleTodoDrop(targetId: string) {
    if (!draggedTodoId || draggedTodoId === targetId) {
      setDraggedTodoId(null);
      setDragOverTodoId(null);
      return;
    }
    const reordered = [...todos];
    const fromIndex = reordered.findIndex((t) => t.id === draggedTodoId);
    const toIndex = reordered.findIndex((t) => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setTodos(reordered);
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    try {
      await getRobinBridge().todos.reorder(reordered.map((t) => t.id));
    } catch {
      await loadTodos();
    }
  }

  async function loadNotes() {
    try {
      const list = await getRobinBridge().notes.list();
      setNotes(list);
    } catch { /* ignore */ }
  }

  async function createNote() {
    try {
      const note = await getRobinBridge().notes.create("Untitled");
      setNotes((prev) => [note, ...prev]);
      setActiveNoteId(note.id);
      setNoteTitleDraft(note.title);
      setNoteContentDraft(note.content);
    } catch { /* ignore */ }
  }

  async function saveNote(id: string, title: string, content: string) {
    try {
      const updated = await getRobinBridge().notes.update(id, { title, content });
      if (updated) {
        setNotes((prev) => prev.map((n) => n.id === id ? updated : n).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      }
    } catch { /* ignore */ }
  }

  async function deleteNote(id: string) {
    try {
      await getRobinBridge().notes.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const robin = getRobinBridge();
      try {
        const profile = await robin.app.getProfile();
        if (isActive) {
          setProfileName(profile.name || "there");
        }
      } catch {
        if (isActive) {
          setProfileName("there");
        }
      }

      try {
        const version = await robin.app.getVersion();
        if (isActive) {
          setAppVersion(version);
        }
      } catch {
        if (isActive) {
          setAppVersion("");
        }
      }

      try {
        await Promise.all([refreshStatus(), refreshThreads()]);
      } catch (loadError) {
        if (isActive) {
          setError(errorMessage(loadError, "Could not load Robin state."));
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
    if (!status?.cloudProviderKeys) {
      return;
    }

    for (const providerId of CLOUD_PROVIDER_IDS) {
      if (providerId === "openrouter") {
        continue;
      }
      if (!status.cloudProviderKeys[providerId]) {
        continue;
      }
      void loadCloudModels(providerId);
    }
  }, [
    status?.cloudProviderKeys?.openai,
    status?.cloudProviderKeys?.anthropic,
    status?.cloudProviderKeys?.google,
    status?.cloudProviderKeys?.perplexity,
    status?.cloudProviderKeys?.openrouter
  ]);

  useEffect(() => {
    const parsed = parseModelKey(activeModelDraft);
    const provider = parsed.mode === "search"
      ? CLOUD_PROVIDER_IDS.find((providerId) => providerId === parsed.model.trim().toLowerCase())
      : undefined;

    if (!provider) {
      return;
    }

    const selectedIds = selectedCloudModelsDraft[provider] ?? [];
    const selectedIdSet = new Set(selectedIds);
    const providerModels = cloudModelsByProvider[provider] ?? [];
    const selectableModels = provider === "openrouter"
      ? selectedIds.map((modelId) => ({ id: modelId, modes: [] }))
      : providerModels.filter((model) => selectedIdSet.has(model.id));

    if (selectableModels.length === 0) {
      if (cloudModelDraft) {
        setCloudModelDraft("");
      }
      if (provider === "openai" && cloudModeDraft) {
        setCloudModeDraft("");
      }
      return;
    }

    const stillSelected = selectableModels.find((model) => model.id === cloudModelDraft);
    if (!stillSelected) {
      const first = selectableModels[0];
      setCloudModelDraft(first.id);
      if (provider === "openai") {
        setCloudModeDraft(first.modes[0] ?? "");
      } else if (cloudModeDraft) {
        setCloudModeDraft("");
      }
      return;
    }

    if (provider === "openai" && !stillSelected.modes.includes(cloudModeDraft)) {
      setCloudModeDraft(stillSelected.modes[0] ?? "");
    }
  }, [activeModelDraft, cloudModelsByProvider, selectedCloudModelsDraft, cloudModelDraft, cloudModeDraft]);

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
        try {
          void getRobinBridge().app.togglePanel();
        } catch (bridgeError) {
          setError(errorMessage(bridgeError, "Robin desktop bridge is unavailable. Please restart Robin."));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, sidebarOpen]);

  useEffect(() => () => {
    if (streamWatchdogRef.current) {
      clearTimeout(streamWatchdogRef.current);
      streamWatchdogRef.current = null;
    }
    if (deltaFrameRef.current !== null) {
      cancelAnimationFrame(deltaFrameRef.current);
      deltaFrameRef.current = null;
    }
    pendingDeltasRef.current.clear();
  }, []);

  async function stopPendingResponse(nextError?: string, refreshAfterStop = true) {
    streamSequenceRef.current += 1;
    const activeStreamId = activeStreamIdRef.current;
    activeStreamIdRef.current = null;
    flushPendingDeltas();
    if (streamWatchdogRef.current) {
      clearTimeout(streamWatchdogRef.current);
      streamWatchdogRef.current = null;
    }
    setIsStreaming(false); setToolStatus(null);
    if (typeof nextError === "string") {
      setError(nextError);
    } else {
      setError(null);
    }
    setActiveThread((current) => current
      ? {
          ...current,
          messages: current.messages.flatMap((message) => {
            if (message.status !== "streaming") {
              return [message];
            }

            const emptyAssistant =
              message.role === "assistant"
              && message.content.trim().length === 0
              && (message.attachments?.length ?? 0) === 0;

            if (emptyAssistant) {
              return [];
            }

            return [{ ...message, status: "complete" }];
          })
        }
      : current);
    try {
      await getRobinBridge().chat.stopStream({
        streamId: activeStreamId ?? undefined,
        threadId: activeThread?.id
      });
      if (refreshAfterStop) {
        await refreshThreads(activeThread?.id);
      }
    } catch {
      // Ignore stream-stop bridge failures to keep the UI responsive.
    }
  }

  async function persistConfig(patch: SaveConfigInput) {
    try {
      setError(null);
      await getRobinBridge().providers.saveConfig({
        onboardingCompleted: true,
        ...patch
      });
      await refreshStatus();
    } catch (saveError) {
      setError(errorMessage(saveError, "Could not save settings."));
    }
  }

  async function setPreferredMode(next: SettingsModeTab) {
    setSettingsMode(next);
    if (next === "cloud") {
      const hasSavedActiveCloudProvider = status
        ? Boolean(status.cloudProviderKeys?.[status.activeCloudProvider])
        : false;
      const nextCloudProvider = hasSavedActiveCloudProvider
        ? status?.activeCloudProvider
        : configuredCloudProviders[0]?.id;
      setActiveModelDraft(modelKey("search", nextCloudProvider ?? ""));
      await persistConfig(nextCloudProvider
        ? {
            preferredMode: "search",
            activeCloudProvider: nextCloudProvider
          }
        : {
            preferredMode: "search"
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
    if (next.mode === "search" && !next.model) {
      setActiveModelDraft(modelKey("search", ""));
      await persistConfig({
        preferredMode: "search"
      });
      return;
    }
    if (next.mode === "local" && next.model && !localModelSet.has(next.model.toLowerCase())) {
      setError(`${next.model} is not downloaded yet. Download it first, then activate.`);
      return;
    }
    setActiveModelDraft(nextModelKey);
    if (next.mode === "search") {
      const nextCloudProvider = CLOUD_PROVIDER_IDS.find((providerId) => providerId === next.model.trim().toLowerCase());
      if (!nextCloudProvider) {
        setError("Select a valid cloud provider.");
        return;
      }
      setActiveModelDraft(modelKey("search", nextCloudProvider));
      await persistConfig({
        preferredMode: "search",
        activeCloudProvider: nextCloudProvider
      });
      return;
    }
    await persistConfig({
      preferredMode: "local",
      ollamaModel: next.model || ollamaStatus?.selectedModel || ""
    });
  }

  async function applyComposerSelection(nextValue: string) {
    const parsedSelection = parseComposerValue(nextValue);
    if (parsedSelection.mode === "unknown") {
      setError("Select a valid model.");
      return;
    }

    if (parsedSelection.mode === "local") {
      await applyModelSelection(modelKey("local", parsedSelection.model));
      return;
    }

    const provider = parsedSelection.provider;
    const modelId = parsedSelection.model;
    setError(null);
    setActiveModelDraft(modelKey("search", provider));
    setCloudModelDraft(modelId);

    const modeOptions = (cloudModelsByProvider[provider] ?? []).find((model) => model.id === modelId)?.modes ?? [];
    if (provider === "openai") {
      const nextMode = modeOptions.find((mode) => mode === cloudModeDraft) ?? modeOptions[0] ?? "";
      setCloudModeDraft(nextMode);
    } else {
      setCloudModeDraft("");
    }

    await persistConfig({
      preferredMode: "search",
      activeCloudProvider: provider
    });
  }

  async function saveProviderKey(providerId: CloudProviderId) {
    await persistConfig({
      providerApiKeys: {
        [providerId]: providerKeyDrafts[providerId]
      }
    });
  }

  async function toggleSelectedCloudModel(providerId: CloudProviderId, modelId: string) {
    const current = selectedCloudModelsDraft[providerId] ?? [];
    const next = current.includes(modelId)
      ? current.filter((item) => item !== modelId)
      : [...current, modelId];

    setSelectedCloudModelsDraft((prev) => ({
      ...prev,
      [providerId]: next
    }));

    await persistConfig({
      selectedCloudModels: {
        [providerId]: next
      }
    });
  }

  async function addOpenRouterModel() {
    const candidate = openRouterModelDraft.trim();
    if (!candidate) {
      return;
    }

    const current = selectedCloudModelsDraft.openrouter ?? [];
    if (current.includes(candidate)) {
      setOpenRouterModelDraft("");
      return;
    }

    const next = [...current, candidate];
    setSelectedCloudModelsDraft((prev) => ({
      ...prev,
      openrouter: next
    }));
    setOpenRouterModelDraft("");

    await persistConfig({
      selectedCloudModels: {
        openrouter: next
      }
    });
  }

  async function removeOpenRouterModel(modelId: string) {
    const current = selectedCloudModelsDraft.openrouter ?? [];
    const next = current.filter((entry) => entry !== modelId);
    setSelectedCloudModelsDraft((prev) => ({
      ...prev,
      openrouter: next
    }));

    if (cloudModelDraft === modelId && selectedCloudProvider === "openrouter") {
      setCloudModelDraft(next[0] ?? "");
    }

    await persistConfig({
      selectedCloudModels: {
        openrouter: next
      }
    });
  }

  async function saveShortcutDraft(nextShortcut?: string) {
    const shortcut = (nextShortcut ?? shortcutDraft).trim();
    if (!shortcut) {
      setShortcutDraft(status?.shortcut || "CommandOrControl+Shift+Space");
      return;
    }
    try {
      setError(null);
      const result = await getRobinBridge().app.setShortcut(shortcut);
      setShortcutDraft(result.shortcut);
      if (!result.success) {
        setError("Shortcut in use.");
      }
    } catch (shortcutError) {
      setError(errorMessage(shortcutError, "Could not set shortcut."));
    }
  }

  function toggleSettingsSection(sectionId: SettingsSectionId) {
    setSettingsSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId]
    }));
  }

  async function checkForUpdatesNow() {
    try {
      setUpdateError(null);
      setUpdatesChecking(true);
      const result = await getRobinBridge().app.checkForUpdates();
      setUpdateInfo(result);
      if (!appVersion) {
        setAppVersion(result.currentVersion);
      }
    } catch (updatesError) {
      setUpdateError(errorMessage(updatesError, "Could not check updates."));
    } finally {
      setUpdatesChecking(false);
    }
  }

  async function useOrPullLocalModel(model: string) {
    const targetModel = model.trim();
    if (!targetModel) {
      return;
    }
    setLocalModelNotice(null);

    if (ollamaStatus?.state === "not_installed") {
      setError("Ollama is not installed yet. Opening download page.");
      try {
        await getRobinBridge().app.openExternal(OLLAMA_DOWNLOAD_URL);
      } catch {
        // Ignore browser-open failures and keep UI guidance visible.
      }
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
      await getRobinBridge().ollama.pullModel(targetModel);
      const robin = getRobinBridge();
      const nextOllamaStatus = await robin.ollama.detect();
      setOllamaStatus(nextOllamaStatus);

      if (!nextOllamaStatus.models.some((modelName) => modelName.toLowerCase() === targetModel.toLowerCase())) {
        throw new Error(`Download for ${targetModel} is not complete yet. Please retry in a moment.`);
      }

      setLocalModelNotice(`${targetModel} downloaded and ready.`);
      await refreshStatus();
      await applyModelSelection(modelKey("local", targetModel));
    } catch (pullError) {
      setError(errorMessage(pullError, `Could not download ${targetModel}.`));
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

  async function deleteLocalModel(model: string) {
    const targetModel = model.trim();
    if (!targetModel) {
      return;
    }

    try {
      setError(null);
      setLocalModelNotice(null);
      setDeletingModel(targetModel);
      await getRobinBridge().ollama.deleteModel(targetModel);

      const robin = getRobinBridge();
      const nextOllamaStatus = await robin.ollama.detect();
      setOllamaStatus(nextOllamaStatus);

      const parsed = parseModelKey(activeModelDraft);
      if (parsed.mode === "local" && parsed.model.toLowerCase() === targetModel.toLowerCase()) {
        const fallbackModel = nextOllamaStatus.selectedModel || "";
        await applyModelSelection(modelKey("local", fallbackModel));
      } else {
        await refreshStatus();
      }
      setLocalModelNotice(`${targetModel} deleted.`);
    } catch (deleteError) {
      setError(errorMessage(deleteError, `Could not delete ${targetModel}.`));
    } finally {
      setDeletingModel(null);
    }
  }

  async function addImagesFromFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.toLowerCase().startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Only image files are supported.");
      return;
    }

    const remainingSlots = MAX_IMAGE_ATTACHMENTS - pendingAttachments.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`);
      return;
    }

    const accepted = imageFiles.slice(0, remainingSlots);
    const nextAttachments: ChatAttachment[] = [];

    for (const file of accepted) {
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`"${file.name}" is too large. Use images under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`);
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name || "image",
          mimeType: file.type || "image/png",
          dataUrl
        });
      } catch {
        setError(`Could not read "${file.name}".`);
      }
    }

    if (nextAttachments.length > 0) {
      setError(null);
      setPendingAttachments((current) => [...current, ...nextAttachments]);
    }

    if (imageFiles.length > accepted.length) {
      setError(`Only ${MAX_IMAGE_ATTACHMENTS} images can be attached at once.`);
    }
  }

  function removePendingAttachment(attachmentId: string) {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  async function sendPrompt() {
    if (!prompt.trim() && pendingAttachments.length === 0) return;
    if (isStreaming) {
      setError("Response in progress. Press Stop first.");
      return;
    }
    const parsed = parseModelKey(activeModelDraft);
    const selectedCloudProvider = parsed.mode === "search"
      ? CLOUD_PROVIDER_IDS.find((providerId) => providerId === parsed.model.trim().toLowerCase())
      : undefined;

    if (parsed.mode === "search" && !selectedCloudProvider) {
      setError("Select a cloud model first.");
      return;
    }
    if (selectedCloudProvider) {
      const selectedModels = selectedCloudModelsDraft[selectedCloudProvider] ?? [];
      if (selectedModels.length === 0) {
        setError("Select at least one cloud model in Settings first.");
        return;
      }
      if (!cloudModelDraft || !selectedModels.includes(cloudModelDraft)) {
        setError("Pick one of your selected cloud models.");
        return;
      }
    }
    if (parsed.mode === "local" && ollamaStatus?.state === "not_installed") {
      setError("Ollama is not installed yet. Opening download page.");
      try {
        await getRobinBridge().app.openExternal(OLLAMA_DOWNLOAD_URL);
      } catch {
        // Ignore browser-open failures and keep UI guidance visible.
      }
      return;
    }
    if (parsed.mode === "local" && !parsed.model) {
      setError("Select or download a local model first.");
      return;
    }
    if (parsed.mode === "local" && pendingAttachments.length > 0) {
      setError("Image input is not supported in Local mode yet.");
      return;
    }
    setError(null);
    const streamToken = streamSequenceRef.current + 1;
    streamSequenceRef.current = streamToken;
    if (streamWatchdogRef.current) {
      clearTimeout(streamWatchdogRef.current);
    }
    streamWatchdogRef.current = setTimeout(() => {
      if (streamToken !== streamSequenceRef.current) {
        return;
      }
      void stopPendingResponse("Model response timed out. Press Stop and retry.");
    }, 30000);
    setIsStreaming(true);
    const text = prompt.trim();
    const outgoingAttachments = pendingAttachments;
    setPrompt("");
    setPendingAttachments([]);
    try {
      const streamId = await getRobinBridge().chat.streamReply(
        {
          conversationId: activeThread?.id,
          mode: parsed.mode,
          prompt: text,
          attachments: outgoingAttachments.length > 0 ? outgoingAttachments : undefined,
          cloudProvider: selectedCloudProvider,
          cloudModel: selectedCloudProvider ? cloudModelDraft || undefined : undefined,
          cloudMode: selectedCloudProvider === "openai" ? cloudModeDraft || undefined : undefined
        },
        {
          onThread: ({ thread }) => {
            if (streamToken !== streamSequenceRef.current) {
              return;
            }
            setActiveThread({ ...thread });
          },
          onDelta: ({ messageId, delta }) => {
            if (streamToken !== streamSequenceRef.current) {
              return;
            }
            queueDelta(messageId, delta);
          },
          onCitations: ({ messageId, citations }) => {
            if (streamToken !== streamSequenceRef.current) {
              return;
            }
            setActiveThread((current) => current
              ? {
                  ...current,
                  messages: current.messages.map((message) => (
                    message.id === messageId ? { ...message, citations } : message
                  ))
                }
              : current);
          },
          onContextUpdate: ({ todos: updatedTodos }) => {
            setTodos(updatedTodos);
          },
          onToolStatus: ({ toolName, status }) => {
            if (status === "calling") {
              setToolStatus({ toolName, status });
            } else {
              setToolStatus(null);
            }
          },
          onDone: ({ thread }) => {
            if (streamToken !== streamSequenceRef.current) {
              return;
            }
            flushPendingDeltas();
            setIsStreaming(false); setToolStatus(null);
            activeStreamIdRef.current = null;
            if (streamWatchdogRef.current) {
              clearTimeout(streamWatchdogRef.current);
              streamWatchdogRef.current = null;
            }
            setActiveThread({ ...thread });
            void refreshThreads(thread.id);
          },
          onError: ({ message }) => {
            if (streamToken !== streamSequenceRef.current) {
              return;
            }
            flushPendingDeltas();
            setIsStreaming(false); setToolStatus(null);
            activeStreamIdRef.current = null;
            if (streamWatchdogRef.current) {
              clearTimeout(streamWatchdogRef.current);
              streamWatchdogRef.current = null;
            }
            setError(errorMessage(new Error(message), "Could not complete request."));
            void refreshThreads(activeThread?.id);
          }
        }
      );
      if (streamToken === streamSequenceRef.current) {
        activeStreamIdRef.current = streamId;
      } else {
        await getRobinBridge().chat.stopStream({
          streamId,
          threadId: activeThread?.id
        });
      }
    } catch (streamError) {
      if (streamToken !== streamSequenceRef.current) {
        return;
      }
      flushPendingDeltas();
      setIsStreaming(false); setToolStatus(null);
      activeStreamIdRef.current = null;
      if (streamWatchdogRef.current) {
        clearTimeout(streamWatchdogRef.current);
        streamWatchdogRef.current = null;
      }
      setPrompt(text);
      setPendingAttachments(outgoingAttachments);
      setError(errorMessage(streamError, "Could not start chat. Please retry."));
    }
  }

  function handleComposerSubmit(event: FormEvent) {
    event.preventDefault();
    void sendPrompt();
  }

  async function startNewChat() {
    if (isStreaming) {
      await stopPendingResponse(undefined, false);
    }
    setActiveThread(null);
    setError(null);
    setPendingAttachments([]);
    setScreen("chat");
  }

  async function selectThread(id: string) {
    if (isStreaming) {
      await stopPendingResponse(undefined, false);
    }
    setScreen("chat");
    await refreshThreads(id);
  }

  async function deleteThread(id: string) {
    try {
      setError(null);
      await getRobinBridge().chat.deleteThread(id);
      if (activeThread?.id === id) {
        setActiveThread(null);
      }
      await refreshThreads();
    } catch (deleteError) {
      setError(errorMessage(deleteError, "Could not delete chat."));
    }
  }

  const parsed = parseModelKey(activeModelDraft);
  const selectedCloudProvider = parsed.mode === "search"
    ? CLOUD_PROVIDER_IDS.find((providerId) => providerId === parsed.model.trim().toLowerCase())
    : undefined;
  const isOpenAISelected = selectedCloudProvider === "openai";
  const isCloudProviderSelected = Boolean(selectedCloudProvider);
  const selectedCloudProviderModels = selectedCloudProvider
    ? cloudModelsByProvider[selectedCloudProvider] ?? []
    : [];
  const selectedCloudProviderModelsLoading = selectedCloudProvider
    ? cloudModelsLoadingByProvider[selectedCloudProvider]
    : false;
  const selectedCloudProviderModelsError = selectedCloudProvider
    ? cloudModelsErrorByProvider[selectedCloudProvider]
    : null;
  const selectedPinnedModels = selectedCloudProvider ? selectedCloudModelsDraft[selectedCloudProvider] ?? [] : [];
  const selectedPinnedModelSet = new Set(selectedPinnedModels);
  const visibleCloudModels = selectedCloudProviderModels.filter((model) => selectedPinnedModelSet.has(model.id));
  const selectedCloudModel = visibleCloudModels.find((model) => model.id === cloudModelDraft);
  const cloudModeOptions: DropdownOption[] = (selectedCloudModel?.modes ?? []).map((mode) => ({
    value: mode,
    label: mode.toUpperCase()
  }));
  const composerCloudModelOptions = useMemo(() => {
    const options: DropdownOption[] = [];

    for (const provider of CLOUD_PROVIDERS) {
      if (!status?.cloudProviderKeys?.[provider.id]) {
        continue;
      }

      const selectedIds = selectedCloudModelsDraft[provider.id] ?? [];
      if (selectedIds.length === 0) {
        continue;
      }

      const loadedModels = cloudModelsByProvider[provider.id] ?? [];
      const availableIds = new Set(loadedModels.map((model) => model.id));

      for (const modelId of selectedIds) {
        if (loadedModels.length > 0 && !availableIds.has(modelId)) {
          continue;
        }
        options.push({
          value: cloudComposerValue(provider.id, modelId),
          label: modelId,
          group: "Cloud"
        });
      }
    }

    return options;
  }, [status?.cloudProviderKeys, selectedCloudModelsDraft, cloudModelsByProvider]);

  const composerLocalOptions = localModels.map((model) => ({
    value: localComposerValue(model),
    label: model,
    group: "Local"
  }));

  const composerOptions: DropdownOption[] = [
    ...composerCloudModelOptions,
    ...composerLocalOptions
  ];

  const hasComposerOptions = composerOptions.length > 0;
  const composerSelectValue = (() => {
    if (parsed.mode === "local") {
      const localValue = localComposerValue(parsed.model);
      return composerOptions.some((option) => option.value === localValue) ? localValue : "";
    }
    if (selectedCloudProvider && cloudModelDraft) {
      const cloudValue = cloudComposerValue(selectedCloudProvider, cloudModelDraft);
      return composerOptions.some((option) => option.value === cloudValue) ? cloudValue : "";
    }
    return "";
  })();
  const settingsCloudOptions: DropdownOption[] = CLOUD_PROVIDERS.map((provider) => ({
    value: provider.id,
    label: provider.label
  }));
  const settingsCloudValue = (() => {
    if (!status) {
      return "";
    }
    if (status.cloudProviderKeys?.[status.activeCloudProvider]) {
      return status.activeCloudProvider;
    }
    return "";
  })();

  return (
    <div className="robin-shell">
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

        <button
          type="button"
          className="toolbar-brand"
          title="New chat"
          aria-label="New chat"
          onClick={() => { void startNewChat(); }}
        >
          robin
        </button>

        <div className="toolbar-right">
          <button
            className="tool-btn"
            title="Open in window"
            aria-label="Open in window"
            onClick={() => { void getRobinBridge().app.openWindow(); }}
          >
            <IconExpand />
          </button>
        </div>
      </div>

      <div className="chat-workspace">
        <aside className={`chat-sidebar${sidebarOpen ? " chat-sidebar-open" : ""}`}>
          <div className="sidebar-nav-grid">
            <button
              type="button"
              className={`sidebar-nav-cell${screen === "chat" && sidebarTab === "chats" ? " sidebar-nav-cell-active" : ""}`}
              onClick={() => { setSidebarTab("chats"); setScreen("chat"); }}
            >
              <IconChat />
              <span>Chats</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-cell${sidebarTab === "todos" ? " sidebar-nav-cell-active" : ""}`}
              onClick={() => { setSidebarTab("todos"); setScreen("chat"); void loadTodos(); }}
            >
              <IconTodo />
              <span>Todos</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-cell${sidebarTab === "notes" ? " sidebar-nav-cell-active" : ""}`}
              onClick={() => { setSidebarTab("notes"); setScreen("chat"); void loadNotes(); }}
            >
              <IconNote />
              <span>Notes</span>
            </button>
            <button
              type="button"
              className="sidebar-nav-cell sidebar-nav-cell-disabled"
            >
              <IconCalendar />
              <span>Calendar</span>
              <span className="sidebar-nav-soon">soon</span>
            </button>
          </div>

          <div className="chat-sidebar-head-row">
            <div className="chat-sidebar-head">Chats</div>
            <button
              type="button"
              className="chat-sidebar-new"
              title="New chat"
              aria-label="New chat"
              onClick={() => { void startNewChat(); setSidebarTab("chats"); }}
            >
              <IconPlus />
            </button>
          </div>
          <div className="chat-sidebar-list">
            {threads.length > 0 ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  className={`chat-sidebar-item${activeThread?.id === thread.id && sidebarTab === "chats" ? " chat-sidebar-item-active" : ""}`}
                  onClick={() => { void selectThread(thread.id); setSidebarTab("chats"); setScreen("chat"); }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (!window.confirm("Delete this chat?")) {
                      return;
                    }
                    void deleteThread(thread.id);
                  }}
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

              {error ? (
                <ErrorBanner message={error} onClose={() => setError(null)} />
              ) : null}

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
                          <ThemedDropdown
                            className="settings-cloud-dropdown"
                            value={settingsCloudValue}
                            options={settingsCloudOptions}
                            placeholder="Select cloud provider"
                            onChange={(nextValue) => {
                              const providerId = resolveCloudProviderId(nextValue);
                              setActiveModelDraft(modelKey("search", providerId));
                              void persistConfig({
                                preferredMode: "search",
                                activeCloudProvider: providerId
                              });
                            }}
                          />

                          <p className="setting-title">Provider Keys (BYOK)</p>
                          <div className="provider-list">
                            {CLOUD_PROVIDERS.map((provider) => {
                              return (
                                <article key={provider.id} className="provider-row">
                                  <div className="provider-row-label">
                                    <p className="provider-name">{provider.label}</p>
                                  </div>
                                  <input
                                    className="field-input provider-key-input"
                                    type="text"
                                    placeholder="No key added yet"
                                    value={providerKeyDrafts[provider.id]}
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
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

                          <div className="settings-cloud-models-panel">
                            <p className="setting-title setting-title-sub">Models Visible In Chat</p>
                            <div className="settings-cloud-provider-groups">
                              {CLOUD_PROVIDERS.map((provider) => {
                                const keyConfigured = Boolean(status?.cloudProviderKeys?.[provider.id]);
                                const selectedForProvider = selectedCloudModelsDraft[provider.id] ?? [];
                                const providerModels = cloudModelsByProvider[provider.id] ?? [];
                                const providerModelsLoading = cloudModelsLoadingByProvider[provider.id];
                                const providerModelsError = cloudModelsErrorByProvider[provider.id];
                                const isOpenRouter = provider.id === "openrouter";

                                return (
                                  <section key={provider.id} className="settings-cloud-provider-group">
                                    <p className="settings-cloud-provider-name">{provider.label}</p>
                                    {!keyConfigured ? (
                                      <p className="setting-note setting-note-tight">Add valid API key first.</p>
                                    ) : isOpenRouter ? (
                                      <>
                                        <form
                                          className="settings-openrouter-form"
                                          onSubmit={(event) => {
                                            event.preventDefault();
                                            void addOpenRouterModel();
                                          }}
                                        >
                                          <input
                                            className="field-input settings-openrouter-input"
                                            value={openRouterModelDraft}
                                            placeholder="e.g. openai/gpt-5.2-mini"
                                            autoCapitalize="off"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            onChange={(event) => setOpenRouterModelDraft(event.target.value)}
                                          />
                                          <button
                                            type="submit"
                                            className="inline-action-button"
                                            disabled={!openRouterModelDraft.trim()}
                                          >
                                            Add
                                          </button>
                                        </form>
                                        {selectedForProvider.length === 0 ? (
                                          <p className="setting-note setting-note-tight">Add model IDs you want in chat.</p>
                                        ) : (
                                          <div className="settings-openrouter-model-list">
                                            {selectedForProvider.map((modelId) => (
                                              <div key={modelId} className="settings-openrouter-model-row">
                                                <span>{modelId}</span>
                                                <button
                                                  type="button"
                                                  className="settings-openrouter-remove"
                                                  onClick={() => { void removeOpenRouterModel(modelId); }}
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    ) : providerModelsLoading ? (
                                      <p className="setting-note setting-note-tight">Loading available models...</p>
                                    ) : providerModelsError ? (
                                      <p className="setting-note setting-note-tight">{providerModelsError}</p>
                                    ) : providerModels.length === 0 ? (
                                      <p className="setting-note setting-note-tight">No models found for this key.</p>
                                    ) : (
                                      <div className="settings-cloud-model-list">
                                        {providerModels.map((model) => {
                                          const checked = selectedForProvider.includes(model.id);
                                          return (
                                            <label key={model.id} className={`settings-cloud-model-item${checked ? " settings-cloud-model-item-active" : ""}`}>
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => { void toggleSelectedCloudModel(provider.id, model.id); }}
                                              />
                                              <span>{model.id}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </section>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="setting-section setting-section-first-after-tabs">
                            <div className="local-runtime-strip">
                              <div className="ollama-status">
                                <span className={ollamaDotClass(ollamaStatus)} />
                                <span className="ollama-label">{localStatusText(ollamaStatus)}</span>
                              </div>
                              <p className="setting-note setting-note-tight">
                                RAM: {status?.systemMemoryGb ? `${status.systemMemoryGb} GB` : "Unknown"}
                              </p>
                              <button
                                className="ghost-button"
                                onClick={() => { void getRobinBridge().app.openExternal(ollamaStatus?.downloadUrl ?? OLLAMA_DOWNLOAD_URL); }}
                              >
                                Get Ollama
                              </button>
                            </div>

                            <form className="custom-local-model-form" onSubmit={handleCustomLocalModelSubmit}>
                              <label className="field-label">Download a model</label>
                              <div className="custom-local-model-row">
                                <input
                                  className="field-input custom-local-model-input"
                                  value={customLocalModelDraft}
                                  placeholder="e.g. qwen2.5:7b"
                                  autoCapitalize="off"
                                  autoCorrect="off"
                                  spellCheck={false}
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
                              <p className="setting-title setting-title-sub">Installed</p>
                            ) : null}
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
                            {localModelNotice ? (
                              <p className="setting-note setting-note-success">{localModelNotice}</p>
                            ) : null}
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
                                        const deleting = deletingModel === item.model;
                                        const fit = ramFitTier(item.minRamGb, status?.systemMemoryGb);
                                        return (
                                          <article key={item.id} className="catalog-item">
                                            <div className="catalog-item-main">
                                              <p className="catalog-item-title">{item.title}</p>
                                            </div>
                                            <p className="catalog-item-metrics">
                                              <span className={`ram-fit ram-fit-${fit.tone}`}>{fit.label}</span>
                                              <span>{formatModelFootprint(item.estimatedSizeMb)} download</span>
                                              <span>~{item.minRamGb} GB RAM</span>
                                            </p>
                                            <div className="catalog-item-actions">
                                              <button
                                                className="inline-action-button catalog-action-button"
                                                disabled={busy || deleting}
                                                onClick={() => { void useOrPullLocalModel(item.model); }}
                                              >
                                                {busy ? "Downloading..." : installed ? "Use" : "Download"}
                                              </button>
                                              {installed ? (
                                                <button
                                                  className="inline-action-button catalog-action-button catalog-action-button-danger"
                                                  disabled={busy || deleting}
                                                  onClick={() => { void deleteLocalModel(item.model); }}
                                                >
                                                  {deleting ? "Deleting..." : "Delete"}
                                                </button>
                                              ) : null}
                                            </div>
                                            <p className="catalog-item-recommendation">Recommendation: {fit.label}</p>
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
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
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

                <article className={`settings-accordion${settingsSections.updates ? " settings-accordion-open" : ""}`}>
                  <button
                    type="button"
                    className="settings-accordion-trigger"
                    aria-expanded={settingsSections.updates}
                    onClick={() => toggleSettingsSection("updates")}
                  >
                    <span className="settings-accordion-label">Updates</span>
                    <span className={`settings-accordion-arrow${settingsSections.updates ? " settings-accordion-arrow-open" : ""}`}>
                      <IconChevron />
                    </span>
                  </button>

                  {settingsSections.updates ? (
                    <div className="settings-accordion-content">
                      <div className="setting-section setting-section-single setting-section-last">
                        <p className="setting-note setting-note-tight">
                          Current version: {appVersion || "Unknown"}
                        </p>
                        <div className="updates-actions">
                          <button
                            type="button"
                            className="inline-action-button"
                            disabled={updatesChecking}
                            onClick={() => { void checkForUpdatesNow(); }}
                          >
                            {updatesChecking ? "Checking..." : "Check for updates"}
                          </button>
                          {updateInfo?.updateAvailable && (updateInfo.downloadUrl || updateInfo.releaseUrl) ? (
                            <button
                              type="button"
                              className="inline-action-button"
                              onClick={() => {
                                const target = updateInfo.downloadUrl || updateInfo.releaseUrl;
                                if (target) {
                                  void getRobinBridge().app.openExternal(target);
                                }
                              }}
                            >
                              Download update
                            </button>
                          ) : null}
                        </div>
                        {updateInfo ? (
                          updateInfo.updateAvailable ? (
                            <p className="setting-note setting-note-tight">
                              Update available: {updateInfo.latestVersion}
                            </p>
                          ) : (
                            <p className="setting-note setting-note-tight">
                              You are up to date.
                            </p>
                          )
                        ) : null}
                        {updateError ? (
                          <p className="setting-note setting-note-tight">{updateError}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              </section>
            </>
          ) : sidebarTab === "todos" ? (
            <div className="todo-main-panel">
              <header className="todo-main-header">
                <h1 className="todo-main-title">Todos</h1>
              </header>
              <div className="todo-main-add-row">
                <input
                  className="todo-main-add-input"
                  placeholder="Add a todo..."
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void createTodo();
                    }
                  }}
                />
              </div>
              <div className="todo-main-list">
                {todos.length > 0 ? (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`todo-main-item${dragOverTodoId === todo.id ? " todo-main-item-drag-over" : ""}`}
                      draggable
                      onDragStart={() => setDraggedTodoId(todo.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTodoId(todo.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverTodoId === todo.id) setDragOverTodoId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        void handleTodoDrop(todo.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTodoId(null);
                        setDragOverTodoId(null);
                      }}
                    >
                      <button
                        type="button"
                        className={`todo-check${todo.completed ? " todo-check-done" : ""}`}
                        onClick={() => { void toggleTodo(todo.id, !todo.completed); }}
                      >
                        {todo.completed && <IconCheck />}
                      </button>
                      {editingTodoId === todo.id ? (
                        <input
                          className="todo-main-edit-input"
                          value={editingTodoTitle}
                          autoFocus
                          onChange={(e) => setEditingTodoTitle(e.target.value)}
                          onBlur={() => { void saveTodoTitle(todo.id, editingTodoTitle); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveTodoTitle(todo.id, editingTodoTitle);
                            }
                            if (e.key === "Escape") {
                              setEditingTodoId(null);
                            }
                          }}
                        />
                      ) : (
                        <span
                          className={`todo-main-title${todo.completed ? " todo-main-title-done" : ""}`}
                          onClick={() => {
                            setEditingTodoId(todo.id);
                            setEditingTodoTitle(todo.title);
                          }}
                        >
                          {todo.title}
                        </span>
                      )}
                      <button
                        type="button"
                        className="todo-main-delete"
                        title="Delete"
                        onClick={() => { void deleteTodoItem(todo.id); }}
                      >
                        <IconClose />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="todo-main-empty">No todos yet</p>
                )}
              </div>
            </div>
          ) : sidebarTab === "notes" ? (
            <div className="notes-main-panel">
              {activeNoteId === null ? (
                <>
                  <header className="notes-main-header">
                    <h1 className="notes-main-title">Notes</h1>
                    <button type="button" className="notes-new-btn" onClick={() => { void createNote(); }}>+ New</button>
                  </header>
                  <div className="notes-list">
                    {notes.length > 0 ? notes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        className="notes-list-item"
                        onClick={() => {
                          setActiveNoteId(note.id);
                          setNoteTitleDraft(note.title);
                          setNoteContentDraft(note.content);
                        }}
                      >
                        <span className="notes-list-item-title">{note.title || "Untitled"}</span>
                        <span className="notes-list-item-preview">{note.content.slice(0, 80) || "Empty note"}</span>
                      </button>
                    )) : (
                      <p className="notes-empty">No notes yet</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <header className="notes-editor-header">
                    <button type="button" className="notes-back-btn" onClick={() => { setActiveNoteId(null); }}>← Back</button>
                    <button type="button" className="notes-delete-btn" onClick={() => { void deleteNote(activeNoteId); }}>Delete</button>
                  </header>
                  <input
                    className="notes-title-input"
                    value={noteTitleDraft}
                    onChange={(e) => setNoteTitleDraft(e.target.value)}
                    onBlur={() => { void saveNote(activeNoteId, noteTitleDraft, noteContentDraft); }}
                    placeholder="Title"
                  />
                  <textarea
                    className="notes-content-area"
                    value={noteContentDraft}
                    onChange={(e) => setNoteContentDraft(e.target.value)}
                    onBlur={() => { void saveNote(activeNoteId, noteTitleDraft, noteContentDraft); }}
                    placeholder="Write in markdown..."
                  />
                </>
              )}
            </div>
          ) : sidebarTab === "calendar" ? (
            <div className="coming-soon-main">
              <p className="coming-soon-label">Calendar coming soon</p>
            </div>
          ) : (
            <>
              {error ? (
                <ErrorBanner message={error} onClose={() => setError(null)} />
              ) : null}

              <section className={`chat-log${messages.length === 0 ? " chat-log-empty" : ""}`}>
                {messages.length > 0 ? (
                  <>
                    {messages.map((message) => (
                      <article
                        key={message.id}
                        className={`chat-msg ${message.role === "user" ? "chat-msg-user" : "chat-msg-assistant"}${message.status === "streaming" ? " chat-msg-streaming" : ""}`}
                      >
                        <div className="chat-msg-body">
                          {message.attachments?.length ? (
                            <div className="chat-msg-attachments">
                              {message.attachments.map((attachment) => (
                                <img
                                  key={attachment.id}
                                  className="chat-msg-attachment"
                                  src={attachment.dataUrl}
                                  alt={attachment.name || "Image attachment"}
                                />
                              ))}
                            </div>
                          ) : null}
                          {message.role === "assistant" ? (
                            <div className="md-content">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            message.content || null
                          )}
                          {message.citations?.length ? (
                            <div className="citation-list">
                              {message.citations.map((citation) => (
                                <button key={citation.url} className="citation" onClick={() => { void getRobinBridge().app.openExternal(citation.url); }}>
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
                    <div className="bat-signal" aria-hidden="true">
                      <div className="bat-signal-beam" />
                      <div className="bat-signal-beam-soft" />
                    </div>
                    <h1 className="greeting-hi">
                      Hi, <span className="greeting-name">{displayName}</span>
                    </h1>
                    <p className="greeting-question">What&apos;s up?</p>
                  </div>
                )}
              </section>

              {toolStatus && (
                <div className="tool-status-bar">
                  {toolStatus.toolName === "web_search" ? "Searching the web..." : toolStatus.toolName === "fetch_url" ? "Fetching page..." : `Using ${toolStatus.toolName}...`}
                </div>
              )}

              <form className="composer" onSubmit={handleComposerSubmit}>
                <div className="composer-box">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="composer-file-input"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      void addImagesFromFiles(files);
                    }}
                  />
                  <textarea
                    className="composer-input"
                    placeholder="Ask Robin..."
                    rows={1}
                    value={prompt}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) => setPrompt(event.target.value)}
                    onPaste={(event) => {
                      const pastedImages = Array.from(event.clipboardData?.files ?? [])
                        .filter((file) => file.type.toLowerCase().startsWith("image/"));
                      if (pastedImages.length > 0) {
                        event.preventDefault();
                        void addImagesFromFiles(pastedImages);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendPrompt();
                      }
                    }}
                  />
                  {pendingAttachments.length > 0 ? (
                    <div className="composer-attachments">
                      {pendingAttachments.map((attachment) => (
                        <div key={attachment.id} className="composer-attachment-chip">
                          <img
                            className="composer-attachment-thumb"
                            src={attachment.dataUrl}
                            alt={attachment.name || "Attached image"}
                          />
                          <button
                            type="button"
                            className="composer-attachment-remove"
                            aria-label="Remove image"
                            onClick={() => removePendingAttachment(attachment.id)}
                          >
                            <IconClose />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="composer-footer">
                    <div className="composer-controls-row">
                      <button
                        type="button"
                        className="composer-media-btn"
                        aria-label="Attach image"
                        title="Attach image"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <IconImage />
                      </button>
                      <ThemedDropdown
                        className="composer-dropdown"
                        value={composerSelectValue}
                        options={composerOptions}
                        placeholder={hasComposerOptions ? "Select model" : "No models configured"}
                        disabled={!hasComposerOptions}
                        compact
                        borderless
                        menuDirection="up"
                        onChange={(nextValue) => { void applyComposerSelection(nextValue); }}
                      />
                      {isOpenAISelected ? (
                        <ThemedDropdown
                          className="composer-cloud-mode-dropdown"
                          value={cloudModeDraft}
                          options={cloudModeOptions}
                          placeholder="Mode"
                          compact
                          borderless
                          menuDirection="up"
                          onChange={setCloudModeDraft}
                        />
                      ) : null}
                      <button
                        type={isStreaming ? "button" : "submit"}
                        className={`send-btn${isStreaming ? " send-btn-stop" : ""}`}
                        disabled={isStreaming ? false : (!prompt.trim() && pendingAttachments.length === 0)}
                        aria-label={isStreaming ? "Stop response" : "Send message"}
                        title={isStreaming ? "Stop response" : "Send message"}
                        onClick={() => {
                          if (isStreaming) {
                            void stopPendingResponse();
                          }
                        }}
                      >
                        {isStreaming ? <IconStop /> : <IconSend />}
                      </button>
                    </div>
                    {isCloudProviderSelected ? (
                      selectedCloudProviderModelsLoading ? (
                        <div className="composer-cloud-notes">
                          <p className="composer-cloud-note">Loading models...</p>
                        </div>
                      ) : selectedCloudProviderModelsError ? (
                        <div className="composer-cloud-notes">
                          <p className="composer-cloud-note composer-cloud-note-error">{selectedCloudProviderModelsError}</p>
                        </div>
                      ) : selectedPinnedModels.length === 0 ? (
                        <div className="composer-cloud-notes">
                          <p className="composer-cloud-note">Pick your cloud models in Settings.</p>
                        </div>
                      ) : null
                    ) : null}
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
