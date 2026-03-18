import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { AssistantMode, ConversationThread, OllamaStatus, ProviderStatus, SaveConfigInput, ThreadSummary } from "../shared/contracts";
import brandLogoIcon from "../../assets/image.png";

const { Add01Icon, DashboardSquare01Icon, SentIcon, Settings02Icon } = require("@hugeicons/core-free-icons") as Record<string, IconSvgElement>;

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
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
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
  return <RobinIconGlyph icon={Settings02Icon as IconSvgElement} />;
}

function IconSidebar() {
  return <RobinIconGlyph icon={DashboardSquare01Icon as IconSvgElement} size={16} />;
}

function IconPlus() {
  return <RobinIconGlyph icon={Add01Icon as IconSvgElement} />;
}

function IconSend() {
  return <RobinIconGlyph icon={SentIcon as IconSvgElement} size={14} strokeWidth={2} />;
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
          <span className="toolbar-name">Robin</span>
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
