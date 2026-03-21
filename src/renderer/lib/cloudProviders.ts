import {
  CLOUD_PROVIDER_IDS,
  CloudProviderId,
  LocalModelCatalogItem,
  ProviderStatus
} from "../../shared/contracts";

export interface CloudProviderMeta {
  id: CloudProviderId;
  label: string;
}

export const CLOUD_PROVIDERS: CloudProviderMeta[] = [
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google" },
  { id: "perplexity", label: "Perplexity" },
  { id: "openrouter", label: "OpenRouter" }
];

export function buildProviderDrafts(): Record<CloudProviderId, string> {
  return CLOUD_PROVIDER_IDS.reduce(
    (result, id) => {
      result[id] = "";
      return result;
    },
    {} as Record<CloudProviderId, string>
  );
}

export function normalizeCloudProviderKeys(
  source?: Partial<Record<CloudProviderId, boolean>>
): Record<CloudProviderId, boolean> {
  return CLOUD_PROVIDER_IDS.reduce(
    (result, id) => {
      result[id] = Boolean(source?.[id]);
      return result;
    },
    {} as Record<CloudProviderId, boolean>
  );
}

export function normalizeProviderKeyDrafts(
  source?: Partial<Record<CloudProviderId, string>>
): Record<CloudProviderId, string> {
  return CLOUD_PROVIDER_IDS.reduce(
    (result, id) => {
      result[id] = typeof source?.[id] === "string" ? (source[id] ?? "") : "";
      return result;
    },
    {} as Record<CloudProviderId, string>
  );
}

export function normalizeSelectedCloudModels(
  source?: Partial<Record<CloudProviderId, string[]>>
): Record<CloudProviderId, string[]> {
  return CLOUD_PROVIDER_IDS.reduce(
    (result, id) => {
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
    },
    {} as Record<CloudProviderId, string[]>
  );
}

export function moveCloudModelToFront(
  models: string[],
  targetModel: string
): string[] {
  const normalizedTarget = targetModel.trim();
  if (!normalizedTarget) {
    return models;
  }

  const next = models.filter((model) => model !== normalizedTarget);
  next.unshift(normalizedTarget);
  return next;
}

export function findAvailableCloudProvider(
  status?: ProviderStatus | null,
  selectedCloudModels?: Record<CloudProviderId, string[]>
): CloudProviderId | "" {
  if (!status?.cloudProviderKeys) {
    return "";
  }

  const activeProvider = status.activeCloudProvider;
  if (
    status.cloudProviderKeys[activeProvider] &&
    (selectedCloudModels?.[activeProvider]?.length ?? 0) > 0
  ) {
    return activeProvider;
  }

  const configuredWithModels = CLOUD_PROVIDER_IDS.find(
    (providerId) =>
      status.cloudProviderKeys[providerId] &&
      (selectedCloudModels?.[providerId]?.length ?? 0) > 0
  );
  if (configuredWithModels) {
    return configuredWithModels;
  }

  return (
    CLOUD_PROVIDER_IDS.find(
      (providerId) => status.cloudProviderKeys[providerId]
    ) ?? ""
  );
}

export function buildCloudProviderStateMap<T>(
  factory: (providerId: CloudProviderId) => T
): Record<CloudProviderId, T> {
  return CLOUD_PROVIDER_IDS.reduce(
    (result, providerId) => {
      result[providerId] = factory(providerId);
      return result;
    },
    {} as Record<CloudProviderId, T>
  );
}

export function formatModelFootprint(sizeMb: number): string {
  if (sizeMb >= 1024) {
    const gb = sizeMb / 1024;
    return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }
  return `${sizeMb} MB`;
}

export function ramFitTier(
  minRamGb: number,
  systemMemoryGb?: number
): { label: string; tone: "good" | "maybe" | "bad" } {
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

export function inferCatalogProviderCategory(
  item: LocalModelCatalogItem
): string {
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
