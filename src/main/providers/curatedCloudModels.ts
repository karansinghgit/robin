import { CloudModelCatalogItem, CloudProviderId } from "../../shared/contracts";

export const CURATED_CLOUD_MODELS: Record<CloudProviderId, CloudModelCatalogItem[]> = {
  openai: [
    { id: "gpt-5.2-codex", modes: ["low", "medium", "high", "xhigh"] },
    { id: "gpt-5.2", modes: ["none", "low", "medium", "high", "xhigh"] },
    { id: "gpt-5.2-mini", modes: ["none", "low", "medium", "high", "xhigh"] },
    { id: "gpt-5.2-nano", modes: ["none", "low", "medium", "high", "xhigh"] },
    { id: "gpt-5.1", modes: ["none", "low", "medium", "high"] },
    { id: "gpt-5.1-mini", modes: ["none", "low", "medium", "high"] },
    { id: "gpt-5.1-nano", modes: ["none", "low", "medium", "high"] },
    { id: "gpt-5-pro", modes: ["high"] },
    { id: "o4-mini", modes: ["low", "medium", "high"] },
    { id: "o3", modes: ["low", "medium", "high"] }
  ],
  anthropic: [
    { id: "claude-opus-4-1", modes: [] },
    { id: "claude-sonnet-4-5", modes: [] },
    { id: "claude-haiku-4-5", modes: [] }
  ],
  google: [
    { id: "gemini-2.5-pro", modes: [] },
    { id: "gemini-2.5-flash", modes: [] },
    { id: "gemini-2.5-flash-lite", modes: [] }
  ],
  perplexity: [
    { id: "sonar-pro", modes: [] },
    { id: "sonar", modes: [] }
  ],
  openrouter: []
};
