import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AssistantMode,
  ConversationThread,
  OllamaStatus,
  ProviderStatus,
  ThreadSummary
} from "../shared/contracts";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function relativeTime(iso: string): string {
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    Math.round((new Date(iso).getTime() - Date.now()) / 3600000),
    "hour"
  );
}

function StatusBadge({ mode }: { mode: AssistantMode }) {
  return (
    <span
      className={
        mode === "search"
          ? "rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-800"
          : "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-800"
      }
    >
      {mode === "search" ? "Search" : "Local"}
    </span>
  );
}

function EmptyState({ onModeSelect }: { onModeSelect: (mode: AssistantMode) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 inline-flex rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-500 shadow-sm">
        Your menu bar sidekick
      </div>
      <h2 className="font-display text-3xl text-ink">What do you want to get done today?</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
        Use Search for cited, web-grounded answers or Local for private Ollama-backed chat.
      </p>
      <div className="mt-6 flex gap-3">
        <button className="button button-primary" onClick={() => onModeSelect("search")}>
          Start with Search
        </button>
        <button className="button button-secondary" onClick={() => onModeSelect("local")}>
          Use Local mode
        </button>
      </div>
    </div>
  );
}

function Onboarding({
  status,
  ollamaStatus,
  apiKey,
  setApiKey,
  onSaveSearch,
  onContinueLocal,
  onDownloadOllama,
  saveState
}: {
  status: ProviderStatus | null;
  ollamaStatus: OllamaStatus | null;
  apiKey: string;
  setApiKey: (value: string) => void;
  onSaveSearch: () => void;
  onContinueLocal: () => void;
  onDownloadOllama: () => void;
  saveState: "idle" | "saving";
}) {
  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-5">
      <section className="glass-panel animate-fade-up p-5">
        <p className="eyebrow">First Run</p>
        <h1 className="mt-2 font-display text-3xl text-ink">Robin is ready to help.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pick the path that gets you moving right away. Search uses your Perplexity API key.
          Local mode uses Ollama on your machine.
        </p>
      </section>

      <section className="glass-panel grid gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Option One</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Use web search with your API key</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Best if you want cited answers immediately and do not want to install a local model.
            </p>
          </div>
          <StatusBadge mode="search" />
        </div>
        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            Perplexity API Key
          </span>
          <input
            className="input"
            placeholder="pplx-..."
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <button className="button button-primary" disabled={!apiKey || saveState === "saving"} onClick={onSaveSearch}>
          {saveState === "saving" ? "Saving..." : status?.perplexity.configured ? "Update key" : "Save and continue"}
        </button>
      </section>

      <section className="glass-panel grid gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Option Two</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Set up local Ollama</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Best if you want local or private chat. Robin can detect Ollama, but v1 does not install or manage it for you.
            </p>
          </div>
          <StatusBadge mode="local" />
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
          <p className="text-sm font-medium text-ink">
            {ollamaStatus?.state === "ready" && "Ollama is ready."}
            {ollamaStatus?.state === "no_model" && "Ollama is running, but no model is installed yet."}
            {ollamaStatus?.state === "not_running" && "Ollama is installed, but not running."}
            {ollamaStatus?.state === "not_installed" && "Ollama is not installed yet."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {ollamaStatus?.state === "ready" &&
              `Available models: ${ollamaStatus.models.join(", ")}`}
            {ollamaStatus?.state === "no_model" &&
              "Install Ollama, then run a model such as `ollama run llama3.2` or pull a model from the Ollama library."}
            {ollamaStatus?.state === "not_running" &&
              "Start Ollama locally so Robin can connect to http://localhost:11434."}
            {ollamaStatus?.state === "not_installed" &&
              "Download Ollama, install it, and run one model before coming back here."}
          </p>
          <button
            className="mt-3 inline-flex text-sm font-medium text-pine underline decoration-pine/40 underline-offset-4"
            onClick={onDownloadOllama}
          >
            Download Ollama
          </button>
        </div>

        <button className="button button-secondary" onClick={onContinueLocal}>
          Continue with Local mode
        </button>
      </section>
    </div>
  );
}

export function App() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [mode, setMode] = useState<AssistantMode>("search");
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState("CommandOrControl+Shift+Space");

  const messages = activeThread?.messages ?? [];

  const sortedThreads = useMemo(
    () => threads.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [threads]
  );

  async function refreshThreads(selectedId?: string) {
    const nextThreads = await window.robin.chat.listThreads();
    setThreads(nextThreads);

    const targetId = selectedId ?? activeThread?.id ?? nextThreads[0]?.id;
    if (targetId) {
      const thread = await window.robin.chat.loadThread(targetId);
      setActiveThread(thread);
    }
  }

  async function refreshStatus() {
    const [nextStatus, nextOllama] = await Promise.all([
      window.robin.providers.getStatus(),
      window.robin.ollama.detect()
    ]);
    setStatus(nextStatus);
    setOllamaStatus(nextOllama);
    setMode(nextStatus.preferredMode);
    setShortcutDraft(nextStatus.shortcut);
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([refreshStatus(), refreshThreads()]);
    })();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void window.robin.app.togglePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function selectThread(id: string) {
    const thread = await window.robin.chat.loadThread(id);
    setActiveThread(thread);
    if (thread) {
      setMode(thread.mode);
    }
  }

  async function handleSaveSearch() {
    setSaveState("saving");
    setError(null);
    try {
      const next = await window.robin.providers.saveConfig({
        onboardingCompleted: true,
        preferredMode: "search",
        perplexityApiKey: apiKey
      });
      setStatus(next);
      setMode("search");
      setApiKey("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your API key.");
    } finally {
      setSaveState("idle");
    }
  }

  async function handleContinueLocal() {
    const next = await window.robin.providers.saveConfig({
      onboardingCompleted: true,
      preferredMode: "local",
      ollamaModel: ollamaStatus?.selectedModel
    });
    setStatus(next);
    setMode("local");
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || isStreaming) {
      return;
    }

    setError(null);
    setIsStreaming(true);
    const currentPrompt = prompt.trim();
    setPrompt("");

    await window.robin.chat.streamReply(
      {
        conversationId: activeThread?.id,
        mode,
        prompt: currentPrompt
      },
      {
        onThread: ({ thread }) => {
          setActiveThread({ ...thread });
          void refreshThreads(thread.id);
        },
        onDelta: ({ messageId, delta }) => {
          setActiveThread((current) => {
            if (!current) {
              return current;
            }
            return {
              ...current,
              messages: current.messages.map((message) =>
                message.id === messageId
                  ? { ...message, content: message.content + delta, status: "streaming" }
                  : message
              )
            };
          });
        },
        onCitations: ({ messageId, citations }) => {
          setActiveThread((current) => {
            if (!current) {
              return current;
            }
            return {
              ...current,
              messages: current.messages.map((message) =>
                message.id === messageId ? { ...message, citations } : message
              )
            };
          });
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

  async function handleSaveSettings() {
    setError(null);
    try {
      const shortcutResult = await window.robin.app.setShortcut(shortcutDraft);
      const next = await window.robin.providers.saveConfig({
        preferredMode: mode,
        shortcut: shortcutResult.shortcut
      });
      setStatus(next);
      setShortcutDraft(next.shortcut);
      setShowSettings(false);
      if (!shortcutResult.success) {
        setError("That shortcut could not be registered, so Robin kept the previous one.");
      }
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Could not save settings.");
    }
  }

  const needsOnboarding = status ? !status.onboardingCompleted : true;

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.22),_transparent_32%),linear-gradient(180deg,_#f7f3ea_0%,_#f1e8dc_52%,_#dfe9e4_100%)] p-3 font-body text-ink">
      <div className="relative flex h-full overflow-hidden rounded-[32px] border border-white/80 bg-white/50 shadow-panel backdrop-blur-2xl">
        <aside className="hidden w-[154px] border-r border-white/60 bg-white/35 p-3 md:flex md:flex-col">
          <div className="rounded-[24px] bg-white/80 p-3 shadow-sm">
            <p className="eyebrow">Robin</p>
            <h1 className="mt-2 font-display text-xl">Sidekick</h1>
            <p className="mt-2 text-xs leading-5 text-slate-500">Always one shortcut away.</p>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 p-2">
            <button
              className={`mode-pill ${mode === "search" ? "mode-pill-active" : ""}`}
              onClick={() => setMode("search")}
            >
              Search
            </button>
            <button
              className={`mode-pill ${mode === "local" ? "mode-pill-active" : ""}`}
              onClick={() => setMode("local")}
            >
              Local
            </button>
          </div>

          <button className="button button-secondary mt-3" onClick={() => setShowSettings((current) => !current)}>
            {showSettings ? "Close settings" : "Settings"}
          </button>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <p className="eyebrow px-2">Recent</p>
            <div className="mt-2 grid gap-2">
              {sortedThreads.map((thread) => (
                <button
                  key={thread.id}
                  className={`thread-card ${activeThread?.id === thread.id ? "thread-card-active" : ""}`}
                  onClick={() => {
                    void selectThread(thread.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge mode={thread.mode} />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      {relativeTime(thread.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-left text-sm font-medium text-slate-700">{thread.title}</p>
                  <p className="mt-1 line-clamp-2 text-left text-xs leading-5 text-slate-500">{thread.preview}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-white/60 px-5 py-4">
            <div>
              <p className="eyebrow">Today</p>
              <h2 className="font-display text-2xl text-ink">
                {needsOnboarding ? "Get Robin configured" : "What do you want to get done today?"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge mode={mode} />
              <button className="button button-ghost" onClick={() => setActiveThread(null)}>
                New chat
              </button>
            </div>
          </header>

          {showSettings && status ? (
            <section className="border-b border-white/60 bg-white/55 px-5 py-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label className="grid gap-2">
                  <span className="eyebrow">Global Shortcut</span>
                  <input className="input" value={shortcutDraft} onChange={(event) => setShortcutDraft(event.target.value)} />
                </label>
                <button className="button button-primary" onClick={handleSaveSettings}>
                  Save settings
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Search uses {status.perplexity.model}. Local mode points at {status.ollama.baseUrl}.
              </p>
            </section>
          ) : null}

          {error ? (
            <div className="mx-5 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">
            {needsOnboarding ? (
              <Onboarding
                status={status}
                ollamaStatus={ollamaStatus}
                apiKey={apiKey}
                setApiKey={setApiKey}
                onSaveSearch={() => {
                  void handleSaveSearch();
                }}
                onContinueLocal={() => {
                  void handleContinueLocal();
                }}
                onDownloadOllama={() => {
                  void window.robin.app.openExternal(ollamaStatus?.downloadUrl ?? "https://ollama.com/download");
                }}
                saveState={saveState}
              />
            ) : activeThread ? (
              <div className="flex h-full flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message-card ${
                        message.role === "user"
                          ? "ml-10 border-transparent bg-ink text-white"
                          : "mr-10 bg-white/80 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-current/60">
                          {message.role === "assistant" ? "Robin" : "You"}
                        </p>
                        <span className="text-xs text-current/60">{formatTime(message.createdAt)}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                      {message.citations?.length ? (
                        <div className="mt-4 grid gap-2">
                          {message.citations.map((citation) => (
                            <button
                              key={citation.url}
                              className="rounded-2xl border border-slate-200/70 bg-slate-50/90 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-pine/30 hover:text-pine"
                              onClick={() => {
                                void window.robin.app.openExternal(citation.url);
                              }}
                            >
                              <span className="block font-medium text-slate-800">{citation.title}</span>
                              <span className="mt-1 block truncate">{citation.url}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                <form className="border-t border-white/60 px-5 py-4" onSubmit={handleSend}>
                  <div className="rounded-[28px] border border-white/80 bg-white/75 p-3 shadow-sm">
                    <textarea
                      className="min-h-[88px] w-full resize-none border-none bg-transparent text-sm leading-7 text-ink outline-none placeholder:text-slate-400"
                      placeholder={
                        mode === "search"
                          ? "Ask for web-grounded answers, summaries, or research..."
                          : "Chat privately with your local model..."
                      }
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        {mode === "search"
                          ? "Search returns cited answers via Perplexity."
                          : "Local mode stays on your machine via Ollama."}
                      </p>
                      <button className="button button-primary" disabled={!prompt.trim() || isStreaming}>
                        {isStreaming ? "Thinking..." : "Send"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <EmptyState onModeSelect={setMode} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
