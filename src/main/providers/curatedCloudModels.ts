import { CloudModelCatalogItem, CloudProviderId } from "../../shared/contracts";

export const CURATED_CLOUD_MODELS: Record<
  CloudProviderId,
  CloudModelCatalogItem[]
> = {
  openai: [
    {
      id: "gpt-5.2-codex",
      modes: ["low", "medium", "high", "xhigh"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5.2",
      modes: ["none", "low", "medium", "high", "xhigh"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5.2-mini",
      modes: ["none", "low", "medium", "high", "xhigh"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5.2-nano",
      modes: ["none", "low", "medium", "high", "xhigh"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5.1",
      modes: ["none", "low", "medium", "high"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5.1-mini",
      modes: ["none", "low", "medium", "high"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5.1-nano",
      modes: ["none", "low", "medium", "high"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gpt-5-pro",
      modes: ["high"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "o4-mini",
      modes: ["low", "medium", "high"],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "o3",
      modes: ["low", "medium", "high"],
      capabilities: { image: true, tools: true, search: false }
    }
  ],
  google: [
    {
      id: "gemini-2.5-pro",
      modes: [],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gemini-2.5-flash",
      modes: [],
      capabilities: { image: true, tools: true, search: false }
    },
    {
      id: "gemini-2.5-flash-lite",
      modes: [],
      capabilities: { image: true, tools: true, search: false }
    }
  ],
  perplexity: [
    {
      id: "sonar-pro",
      modes: [],
      capabilities: { image: false, tools: false, search: true }
    },
    {
      id: "sonar",
      modes: [],
      capabilities: { image: false, tools: false, search: true }
    }
  ],
  openrouter: []
};
