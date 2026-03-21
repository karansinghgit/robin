import {
  AssistantMode,
  CLOUD_PROVIDER_IDS,
  CloudProviderId
} from "../../shared/contracts";

export function modelKey(mode: AssistantMode, model: string): string {
  return `${mode}:${model}`;
}

export function cloudComposerValue(
  provider: CloudProviderId,
  model: string
): string {
  return `cloud:${provider}:${encodeURIComponent(model)}`;
}

export function localComposerValue(model: string): string {
  return `local:${model}`;
}

export function parseComposerValue(
  value: string
):
  | { mode: "local"; model: string }
  | { mode: "search"; provider: CloudProviderId; model: string }
  | { mode: "unknown" } {
  if (value.startsWith("local:")) {
    return { mode: "local", model: value.slice(6) };
  }

  if (!value.startsWith("cloud:")) {
    return { mode: "unknown" };
  }

  const segments = value.split(":");
  const providerRaw = segments[1] ?? "";
  const provider = CLOUD_PROVIDER_IDS.find(
    (providerId) => providerId === providerRaw
  );
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

export function parseModelKey(value: string): {
  mode: AssistantMode;
  model: string;
} {
  if (value.startsWith("local:")) {
    return { mode: "local", model: value.slice(6) };
  }
  return { mode: "search", model: value.slice(7) };
}

export function resolveCloudProviderId(
  raw: string,
  fallback: CloudProviderId = "openai"
): CloudProviderId {
  const normalized = raw.trim().toLowerCase();
  const found = CLOUD_PROVIDER_IDS.find(
    (providerId) => providerId === normalized
  );
  return found ?? fallback;
}
