import {
  CLOUD_PROVIDER_IDS,
  CloudModelCatalogItem,
  CloudProviderId
} from "../shared/contracts";

export interface SettingsData {
  onboardingCompleted: boolean;
  preferredMode: "search" | "local";
  shortcut: string;
  providers: {
    cloud: {
      activeProvider: CloudProviderId;
      selectedModels: Partial<Record<CloudProviderId, string[]>>;
      catalogCache: Partial<
        Record<
          CloudProviderId,
          { fetchedAt: string; models: CloudModelCatalogItem[] }
        >
      >;
    };
    perplexity: {
      model: string;
      preset: string;
    };
    ollama: {
      baseUrl: string;
      model: string;
    };
  };
  toolToggles: {
    fetchUrl: boolean;
    webSearch: boolean;
  };
}

type LegacySettingsShape = {
  onboardingCompleted?: boolean;
  preferredMode?: "search" | "local";
  shortcut?: string;
  activeCloudProvider?: CloudProviderId;
  perplexityModel?: string;
  perplexityPreset?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
};

export const DEFAULT_SETTINGS: SettingsData = {
  onboardingCompleted: false,
  preferredMode: "search",
  shortcut: "CommandOrControl+Shift+Space",
  providers: {
    cloud: {
      activeProvider: "openai",
      selectedModels: {},
      catalogCache: {}
    },
    perplexity: {
      model: "openai/gpt-5-mini",
      preset: "pro-search"
    },
    ollama: {
      baseUrl: "http://localhost:11434",
      model: ""
    }
  },
  toolToggles: {
    fetchUrl: true,
    webSearch: true
  }
};

const CLOUD_PROVIDER_ID_SET = new Set<CloudProviderId>(CLOUD_PROVIDER_IDS);

export function normalizeSettings(raw: unknown): SettingsData {
  const source =
    raw && typeof raw === "object"
      ? (raw as Partial<SettingsData> & LegacySettingsShape)
      : {};
  const sourceProviders = (source.providers ?? {}) as Partial<
    SettingsData["providers"]
  >;
  const sourceCloud = (sourceProviders.cloud ?? {}) as Partial<
    SettingsData["providers"]["cloud"]
  >;
  const sourcePerplexity = (sourceProviders.perplexity ?? {}) as Partial<
    SettingsData["providers"]["perplexity"]
  >;
  const sourceOllama = (sourceProviders.ollama ?? {}) as Partial<
    SettingsData["providers"]["ollama"]
  >;

  const preferredMode = source.preferredMode === "local" ? "local" : "search";
  const shortcut =
    typeof source.shortcut === "string" && source.shortcut.trim()
      ? source.shortcut
      : DEFAULT_SETTINGS.shortcut;

  const normalizedSelectedCloudModels = CLOUD_PROVIDER_IDS.reduce(
    (result, providerId) => {
      const rawModels = sourceCloud.selectedModels?.[providerId];
      if (!Array.isArray(rawModels)) {
        return result;
      }

      const normalizedModels = Array.from(
        new Set(
          rawModels
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
        )
      );

      if (normalizedModels.length > 0) {
        result[providerId] = normalizedModels;
      }

      return result;
    },
    {} as Partial<Record<CloudProviderId, string[]>>
  );

  const normalizedCloudCatalogCache = CLOUD_PROVIDER_IDS.reduce(
    (result, providerId) => {
      const rawEntry = sourceCloud.catalogCache?.[providerId];
      if (!rawEntry || typeof rawEntry !== "object") {
        return result;
      }

      const fetchedAt =
        typeof rawEntry.fetchedAt === "string" ? rawEntry.fetchedAt : "";
      const rawModels = Array.isArray(rawEntry.models) ? rawEntry.models : [];
      const normalizedModels: CloudModelCatalogItem[] = rawModels
        .filter((item): item is CloudModelCatalogItem =>
          Boolean(
            item && typeof item === "object" && typeof item.id === "string"
          )
        )
        .map((item) => ({
          id: item.id.trim(),
          modes: Array.isArray(item.modes)
            ? Array.from(
                new Set(
                  item.modes
                    .filter((mode): mode is string => typeof mode === "string")
                    .map((mode) => mode.trim())
                    .filter(Boolean)
                )
              )
            : [],
          capabilities: {
            image: Boolean(item.capabilities?.image),
            tools: Boolean(item.capabilities?.tools),
            search: Boolean(item.capabilities?.search)
          }
        }))
        .filter((item) => item.id.length > 0);

      if (!fetchedAt || normalizedModels.length === 0) {
        return result;
      }

      result[providerId] = {
        fetchedAt,
        models: normalizedModels
      };
      return result;
    },
    {} as Partial<
      Record<
        CloudProviderId,
        { fetchedAt: string; models: CloudModelCatalogItem[] }
      >
    >
  );

  return {
    onboardingCompleted: Boolean(source.onboardingCompleted),
    preferredMode,
    shortcut,
    providers: {
      cloud: {
        activeProvider:
          typeof sourceCloud.activeProvider === "string" &&
          CLOUD_PROVIDER_ID_SET.has(
            sourceCloud.activeProvider as CloudProviderId
          )
            ? (sourceCloud.activeProvider as CloudProviderId)
            : typeof source.activeCloudProvider === "string" &&
                CLOUD_PROVIDER_ID_SET.has(
                  source.activeCloudProvider as CloudProviderId
                )
              ? (source.activeCloudProvider as CloudProviderId)
              : DEFAULT_SETTINGS.providers.cloud.activeProvider,
        selectedModels: normalizedSelectedCloudModels,
        catalogCache: normalizedCloudCatalogCache
      },
      perplexity: {
        model:
          typeof sourcePerplexity.model === "string" &&
          sourcePerplexity.model.trim()
            ? sourcePerplexity.model
            : typeof source.perplexityModel === "string" &&
                source.perplexityModel.trim()
              ? source.perplexityModel
              : DEFAULT_SETTINGS.providers.perplexity.model,
        preset:
          typeof sourcePerplexity.preset === "string" &&
          sourcePerplexity.preset.trim()
            ? sourcePerplexity.preset
            : typeof source.perplexityPreset === "string" &&
                source.perplexityPreset.trim()
              ? source.perplexityPreset
              : DEFAULT_SETTINGS.providers.perplexity.preset
      },
      ollama: {
        baseUrl:
          typeof sourceOllama.baseUrl === "string" &&
          sourceOllama.baseUrl.trim()
            ? sourceOllama.baseUrl
            : typeof source.ollamaBaseUrl === "string" &&
                source.ollamaBaseUrl.trim()
              ? source.ollamaBaseUrl
              : DEFAULT_SETTINGS.providers.ollama.baseUrl,
        model:
          typeof sourceOllama.model === "string"
            ? sourceOllama.model
            : typeof source.ollamaModel === "string"
              ? source.ollamaModel
              : DEFAULT_SETTINGS.providers.ollama.model
      }
    },
    toolToggles: {
      fetchUrl:
        (source as Partial<SettingsData>).toolToggles?.fetchUrl !== false,
      webSearch:
        (source as Partial<SettingsData>).toolToggles?.webSearch !== false
    }
  };
}
