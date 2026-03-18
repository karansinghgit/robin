import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { AssistantMode, ConversationThread, OllamaStatus, ProviderStatus, SaveConfigInput, ThreadSummary } from "../shared/contracts";
import brandLogoIcon from "../../assets/image.png";

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

const FALLBACK_SENT_ICON: IconSvgElement = [
  ["path", { d: "M21.0477 3.05293C18.8697 0.707363 2.48648 6.4532 2.50001 8.551C2.51535 10.9299 8.89809 11.6617 10.6672 12.1581C11.7311 12.4565 12.016 12.7625 12.2613 13.8781C13.3723 18.9305 13.9301 21.4435 15.2014 21.4996C17.2278 21.5892 23.1733 5.342 21.0477 3.05293Z", stroke: "currentColor", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M11.4999 12.5L14.9999 9", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
] as const;

const FALLBACK_SETTINGS_ICON: IconSvgElement = [
  ["path", { d: "M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z", stroke: "currentColor", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M21.011 14.0965C21.5329 13.9558 21.7939 13.8854 21.8969 13.7508C22 13.6163 22 13.3998 22 12.9669V11.0332C22 10.6003 22 10.3838 21.8969 10.2493C21.7938 10.1147 21.5329 10.0443 21.011 9.90358C19.0606 9.37759 17.8399 7.33851 18.3433 5.40087C18.4817 4.86799 18.5509 4.60156 18.4848 4.44529C18.4187 4.28902 18.2291 4.18134 17.8497 3.96596L16.125 2.98673C15.7528 2.77539 15.5667 2.66972 15.3997 2.69222C15.2326 2.71472 15.0442 2.90273 14.6672 3.27873C13.208 4.73448 10.7936 4.73442 9.33434 3.27864C8.95743 2.90263 8.76898 2.71463 8.60193 2.69212C8.43489 2.66962 8.24877 2.77529 7.87653 2.98663L6.15184 3.96587C5.77253 4.18123 5.58287 4.28891 5.51678 4.44515C5.45068 4.6014 5.51987 4.86787 5.65825 5.4008C6.16137 7.3385 4.93972 9.37763 2.98902 9.9036C2.46712 10.0443 2.20617 10.1147 2.10308 10.2492C2 10.3838 2 10.6003 2 11.0332V12.9669C2 13.3998 2 13.6163 2.10308 13.7508C2.20615 13.8854 2.46711 13.9558 2.98902 14.0965C4.9394 14.6225 6.16008 16.6616 5.65672 18.5992C5.51829 19.1321 5.44907 19.3985 5.51516 19.5548C5.58126 19.7111 5.77092 19.8188 6.15025 20.0341L7.87495 21.0134C8.24721 21.2247 8.43334 21.3304 8.6004 21.3079C8.76746 21.2854 8.95588 21.0973 9.33271 20.7213C10.7927 19.2644 13.2088 19.2643 14.6689 20.7212C15.0457 21.0973 15.2341 21.2853 15.4012 21.3078C15.5682 21.3303 15.7544 21.2246 16.1266 21.0133L17.8513 20.034C18.2307 19.8187 18.4204 19.711 18.4864 19.5547C18.5525 19.3984 18.4833 19.132 18.3448 18.5991C17.8412 16.6616 19.0609 14.6226 21.011 14.0965Z", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }]
] as const;

const Add01Icon = FALLBACK_ADD01_ICON;
const DashboardSquare01Icon = FALLBACK_DASHBOARD_ICON;
const SentIcon = FALLBACK_SENT_ICON;
const Settings02Icon = FALLBACK_SETTINGS_ICON;

const WEB_MODEL_CANDIDATES = [
  "sonar",
  "sonar-pro",
  "sonar-reasoning",
  "sonar-reasoning-pro",
  "r1-1776",
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  return <RobinIconGlyph icon={SentIcon} size={14} strokeWidth={2} />;
}

/* ── Helpers ────────────────────────────────────── */

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

function localStatusText(s: OllamaStatus | null): string {
  if (!s) return "Checking";
  if (s.state === "ready") return s.version ? `Ollama ${s.version}` : "Running";
  if (s.state === "no_model") return "No models pulled";
  if (s.state === "not_running") return "Not running";
  return "Not installed";
}

function ollamaDotClass(s: OllamaStatus | null): string {
  if (!s) return "ollama-dot ollama-dot-off";
  if (s.state === "ready") return "ollama-dot ollama-dot-ready";
  if (s.state === "no_model" || s.state === "not_running") return "ollama-dot ollama-dot-warning";
  return "ollama-dot ollama-dot-off";
}

/* ── App ────────────────────────────────────────── */

export function App() {
  const [profileName, setProfileName] = useState("there");
  const [screen, setScreen] = useState<"chat" | "settings">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [prompt, setPrompt] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [shortcutDraft, setShortcutDraft] = useState("CommandOrControl+Shift+Space");
  const [activeModelDraft, setActiveModelDraft] = useState(modelKey("search", "sonar"));
  const [customModelDraft, setCustomModelDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = activeThread?.messages ?? [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const modelOptions = useMemo(() => {
    const opts = new Map<string, string>();
    const curPplx = status?.perplexity.model || "sonar";
    const curLocal = status?.ollama.selectedModel || "";
    for (const m of WEB_MODEL_CANDIDATES) opts.set(modelKey("search", m), m);
    opts.set(modelKey("search", curPplx), curPplx);
    for (const m of ollamaStatus?.models ?? []) opts.set(modelKey("local", m), m);
    if (curLocal) opts.set(modelKey("local", curLocal), curLocal);
    return Array.from(opts.entries()).map(([value, label]) => ({ value, label }));
  }, [status?.perplexity.model, status?.ollama.selectedModel, ollamaStatus?.models]);

  async function refreshThreads(selectedId?: string) {
    const list = await window.robin.chat.listThreads();
    setThreads(list);
    const id = selectedId ?? activeThread?.id ?? list[0]?.id;
    if (!id) { setActiveThread(null); return; }
    setActiveThread(await window.robin.chat.loadThread(id));
  }

  async function refreshStatus() {
    const [s, o] = await Promise.all([window.robin.providers.getStatus(), window.robin.ollama.detect()]);
    setStatus(s);
    setOllamaStatus(o);
    setShortcutDraft(s.shortcut);
    setActiveModelDraft(
      s.preferredMode === "local"
        ? modelKey("local", s.ollama.selectedModel || o.selectedModel || "")
        : modelKey("search", s.perplexity.model)
    );
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
      } catch (e) {
        if (isActive) {
          setError(e instanceof Error ? e.message : "Could not load Robin state.");
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sidebarOpen) { setSidebarOpen(false); return; }
        if (screen === "settings") { setScreen("chat"); return; }
        void window.robin.app.togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, sidebarOpen]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const shortRes = await window.robin.app.setShortcut(shortcutDraft.trim());
      const parsed = parseModelKey(activeModelDraft);
      const model = customModelDraft.trim() || parsed.model;
      const payload: SaveConfigInput = {
        onboardingCompleted: true,
        preferredMode: parsed.mode,
        shortcut: shortRes.shortcut,
      };
      if (parsed.mode === "search") payload.perplexityModel = model || status?.perplexity.model;
      else payload.ollamaModel = model || ollamaStatus?.selectedModel || undefined;
      if (apiKeyDraft.trim()) payload.perplexityApiKey = apiKeyDraft.trim();
      await window.robin.providers.saveConfig(payload);
      setApiKeyDraft("");
      setCustomModelDraft("");
      setScreen("chat");
      if (!shortRes.success) setError("Shortcut in use.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setIsSaving(false);
      await refreshStatus();
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || isStreaming) return;
    const parsed = parseModelKey(activeModelDraft);
    if (parsed.mode === "local" && !parsed.model) { setError("Select a local model first."); return; }
    setError(null);
    setIsStreaming(true);
    const text = prompt.trim();
    setPrompt("");
    await window.robin.chat.streamReply(
      { conversationId: activeThread?.id, mode: parsed.mode, prompt: text },
      {
        onThread: ({ thread }) => { setActiveThread({ ...thread }); void refreshThreads(thread.id); },
        onDelta: ({ messageId, delta }) => {
          setActiveThread((c) => c ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, content: m.content + delta, status: "streaming" } : m) } : c);
        },
        onCitations: ({ messageId, citations }) => {
          setActiveThread((c) => c ? { ...c, messages: c.messages.map((m) => m.id === messageId ? { ...m, citations } : m) } : c);
        },
        onDone: ({ thread }) => { setIsStreaming(false); setActiveThread({ ...thread }); void refreshThreads(thread.id); },
        onError: ({ message }) => { setIsStreaming(false); setError(message); void refreshThreads(activeThread?.id); },
      }
    );
  }

  function startNewChat() {
    setActiveThread(null);
    setError(null);
  }

  function handleBrandClick() {
    setSidebarOpen(false);
    startNewChat();
  }

  function selectThread(id: string) {
    void refreshThreads(id);
  }

  const parsed = parseModelKey(activeModelDraft);
  const localModels = ollamaStatus?.models ?? [];
  const displayName = profileName.toLowerCase().startsWith("karan") ? "Karan" : profileName;

  /* ── Settings screen ─────────────────────── */

  if (screen === "settings") {
    return (
      <div className="robin-shell">
        <div className="menu-bridge" />
        <header className="screen-header">
          <button className="text-button" onClick={() => setScreen("chat")}>Back</button>
          <h1 className="screen-title">Settings</h1>
          <button className="primary-button" disabled={isSaving} onClick={() => { void handleSave(); }}>
            {isSaving ? "Saving" : "Save"}
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="settings-scroll">
          <div className="setting-section">
            <p className="setting-title">Model</p>
            <label className="field-label">Active model</label>
            <select className="field-input field-select" value={activeModelDraft} onChange={(e) => setActiveModelDraft(e.target.value)}>
              <optgroup label="Web (Perplexity)">
                {modelOptions.filter((o) => o.value.startsWith("search:")).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
              {modelOptions.some((o) => o.value.startsWith("local:")) && (
                <optgroup label="Local (Ollama)">
                  {modelOptions.filter((o) => o.value.startsWith("local:")).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <label className="field-label">Custom model ID</label>
            <input className="field-input" value={customModelDraft} placeholder="Override" onChange={(e) => setCustomModelDraft(e.target.value)} />
          </div>

          <div className="setting-section">
            <p className="setting-title">Local Runtime</p>
            <div className="ollama-status">
              <span className={ollamaDotClass(ollamaStatus)} />
              <span className="ollama-label">{localStatusText(ollamaStatus)}</span>
            </div>
            {localModels.length > 0 ? (
              <div className="local-models-grid">
                {localModels.map((m) => {
                  const key = modelKey("local", m);
                  const active = activeModelDraft === key;
                  return (
                    <button key={m} className={`local-model-row${active ? " local-model-row-active" : ""}`} onClick={() => setActiveModelDraft(key)}>
                      <span className="local-model-name">{m}</span>
                      {active && <span className="local-model-badge">active</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="setting-note setting-note-tight">
                {ollamaStatus?.state === "ready" || ollamaStatus?.state === "no_model" ? "Run ollama pull <model>" : "Install Ollama for local models."}
              </p>
            )}
            <button className="ghost-button" onClick={() => { void window.robin.app.openExternal(ollamaStatus?.downloadUrl ?? "https://ollama.com/download"); }}>
              Get Ollama
            </button>
          </div>

          <div className="setting-section">
            <p className="setting-title">Credentials</p>
            <label className="field-label">Perplexity API key</label>
            <input className="field-input" type="password" placeholder={status?.perplexity.configured ? "Saved" : "pplx-..."} value={apiKeyDraft} onChange={(e) => setApiKeyDraft(e.target.value)} />
          </div>

          <div className="setting-section">
            <p className="setting-title">App</p>
            <label className="field-label">Global shortcut</label>
            <input className="field-input" value={shortcutDraft} onChange={(e) => setShortcutDraft(e.target.value)} />
          </div>
        </section>
      </div>
    );
  }

  /* ── Chat screen ─────────────────────────── */

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

        <button className="toolbar-brand toolbar-brand-button" title="New chat" onClick={handleBrandClick}>
          <div className="toolbar-logo">
            <img className="toolbar-logo-img" src={brandLogoIcon} alt="" aria-hidden="true" />
          </div>
        </button>

        <div className="toolbar-right">
          <button className="tool-btn" title="Settings" onClick={() => setScreen("settings")}>
            <IconSettings />
          </button>
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
              threads.map((t) => (
                <button
                  key={t.id}
                  className={`chat-sidebar-item${activeThread?.id === t.id ? " chat-sidebar-item-active" : ""}`}
                  onClick={() => selectThread(t.id)}
                >
                  {t.title || t.preview || "Untitled"}
                </button>
              ))
            ) : (
              <p className="chat-sidebar-empty">No conversations yet</p>
            )}
          </div>
        </aside>

        <div className="chat-main">
          {error && <div className="error-banner">{error}</div>}

          <section className={`chat-log${messages.length === 0 ? " chat-log-empty" : ""}`}>
            {messages.length > 0 ? (
              <>
                {messages.map((msg) => (
                  <article
                    key={msg.id}
                    className={`chat-msg ${msg.role === "user" ? "chat-msg-user" : "chat-msg-assistant"}${msg.status === "streaming" ? " chat-msg-streaming" : ""}`}
                  >
                    <span className="chat-msg-role">{msg.role === "assistant" ? "Robin" : "You"}</span>
                    <div className="chat-msg-body">
                      {msg.content}
                      {msg.citations?.length ? (
                        <div className="citation-list">
                          {msg.citations.map((c) => (
                            <button key={c.url} className="citation" onClick={() => { void window.robin.app.openExternal(c.url); }}>
                              <span className="citation-title">{c.title}</span> — {safeCitationHost(c.url)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="chat-msg-time">{formatTime(msg.createdAt)}</span>
                  </article>
                ))}
                <div ref={chatEndRef} />
              </>
            ) : (
              <div className="new-tab-state">
                <div className="spotlight-scene" aria-hidden="true">
                  <div className="spotlight-haze" />
                  <div className="spotlight-beam" />
                  <div className="spotlight-logo-wrap">
                    <img className="spotlight-logo-img" src={brandLogoIcon} alt="" />
                  </div>
                </div>
                <h1 className="greeting-hi">
                  Hi, <span className="greeting-name">{displayName}</span>
                </h1>
                <p className="greeting-question">What&apos;s up?</p>
                <p className="greeting-prompt">Ask Anything</p>
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
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(e); }
                }}
              />
              <div className="composer-footer">
                <div className="composer-meta">
                  <span className={`composer-dot ${parsed.mode === "search" ? "composer-dot-web" : "composer-dot-local"}`} />
                  <span className="composer-model">
                    {isStreaming ? "Thinking..." : `${parsed.mode === "search" ? "Web" : "Local"} \u00b7 ${shortName(activeModelDraft)}`}
                  </span>
                </div>
                <button type="submit" className="send-btn" disabled={!prompt.trim() || isStreaming}>
                  <IconSend />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
