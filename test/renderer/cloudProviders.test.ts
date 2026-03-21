import assert from "node:assert/strict";
import test from "node:test";
import {
  findAvailableCloudProvider,
  moveCloudModelToFront,
  normalizeSelectedCloudModels
} from "../../src/renderer/lib/cloudProviders";

test("normalizeSelectedCloudModels trims and deduplicates model ids", () => {
  const normalized = normalizeSelectedCloudModels({
    openai: [" gpt-5.2 ", "gpt-5.2", "", "gpt-5.2-mini"]
  });

  assert.deepEqual(normalized.openai, ["gpt-5.2", "gpt-5.2-mini"]);
});

test("moveCloudModelToFront promotes the active model without duplicating it", () => {
  assert.deepEqual(
    moveCloudModelToFront(["gpt-5.2", "gpt-5.2-mini"], "gpt-5.2-mini"),
    ["gpt-5.2-mini", "gpt-5.2"]
  );
});

test("findAvailableCloudProvider prefers the active provider when it has models", () => {
  const provider = findAvailableCloudProvider(
    {
      onboardingCompleted: true,
      preferredMode: "search",
      shortcut: "CommandOrControl+Shift+Space",
      systemMemoryGb: 16,
      activeCloudProvider: "google",
      cloudProviderKeys: {
        openai: true,
        google: true,
        perplexity: false,
        openrouter: false
      },
      providerApiKeys: {
        openai: "",
        google: "",
        perplexity: "",
        openrouter: ""
      },
      selectedCloudModels: {
        openai: ["gpt-5.2"],
        google: ["gemini-2.5-pro"],
        perplexity: [],
        openrouter: []
      },
      perplexity: {
        configured: false,
        model: "sonar",
        preset: "pro-search"
      },
      ollama: {
        state: "ready",
        baseUrl: "http://localhost:11434",
        models: ["qwen2.5"],
        selectedModel: "qwen2.5",
        downloadUrl: "https://ollama.com/download/"
      },
      braveSearchKeyConfigured: false,
      toolToggles: { fetchUrl: true, webSearch: true }
    },
    {
      openai: ["gpt-5.2"],
      google: ["gemini-2.5-pro"],
      perplexity: [],
      openrouter: []
    }
  );

  assert.equal(provider, "google");
});
