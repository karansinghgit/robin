import { ChatAttachment, ChatMessage } from "../../shared/contracts";

type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface OpenRouterMessage {
  role: "user" | "assistant";
  content: string | OpenRouterContentPart[];
}

interface OpenRouterModelDataEntry {
  id?: string;
  architecture?: {
    input_modalities?: unknown;
  };
}

function imagePartFromAttachment(attachment: ChatAttachment): OpenRouterContentPart | null {
  if (!attachment?.dataUrl) {
    return null;
  }
  return {
    type: "image_url",
    image_url: {
      url: attachment.dataUrl
    }
  };
}

function toOpenRouterMessages(messages: ChatMessage[]): OpenRouterMessage[] {
  const result: OpenRouterMessage[] = [];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    const text = message.content.trim();
    const parts: OpenRouterContentPart[] = [];
    if (text.length > 0) {
      parts.push({ type: "text", text });
    }

    if (message.role === "user" && Array.isArray(message.attachments)) {
      for (const attachment of message.attachments) {
        const imagePart = imagePartFromAttachment(attachment);
        if (imagePart) {
          parts.push(imagePart);
        }
      }
    }

    if (parts.length === 0) {
      continue;
    }

    result.push({
      role: message.role,
      content: parts.length === 1 && parts[0]?.type === "text" ? parts[0].text : parts
    });
  }

  return result;
}

function parseProviderError(rawBody: string): string | null {
  if (!rawBody) {
    return null;
  }

  try {
    const payload = JSON.parse(rawBody) as { error?: { message?: string } };
    return payload.error?.message?.trim() || null;
  } catch {
    return rawBody.trim() || null;
  }
}

function contentDeltaToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

export class OpenRouterProvider {
  private readonly modelCapabilitiesTtlMs = 24 * 60 * 60 * 1000;
  private modelInputModalitiesCache = new Map<string, Set<string>>();
  private modelCapabilitiesFetchedAt = 0;

  private async fetchModelCapabilitiesIfNeeded(): Promise<void> {
    if ((Date.now() - this.modelCapabilitiesFetchedAt) < this.modelCapabilitiesTtlMs && this.modelInputModalitiesCache.size > 0) {
      return;
    }

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Could not verify OpenRouter model capabilities.");
    }

    const payload = await response.json() as { data?: unknown[] };
    const items = Array.isArray(payload?.data) ? payload.data : [];
    const nextCache = new Map<string, Set<string>>();

    for (const item of items) {
      const model = item as OpenRouterModelDataEntry;
      const id = typeof model.id === "string" ? model.id.trim().toLowerCase() : "";
      if (!id) {
        continue;
      }
      const rawInputModalities = model.architecture?.input_modalities;
      const normalized = Array.isArray(rawInputModalities)
        ? rawInputModalities
            .filter((modality): modality is string => typeof modality === "string")
            .map((modality) => modality.trim().toLowerCase())
            .filter(Boolean)
        : [];
      nextCache.set(id, new Set(normalized));
    }

    this.modelInputModalitiesCache = nextCache;
    this.modelCapabilitiesFetchedAt = Date.now();
  }

  private hasImageAttachments(messages: ChatMessage[]): boolean {
    return messages.some((message) => (
      message.role === "user" && (message.attachments?.length ?? 0) > 0
    ));
  }

  private async modelSupportsImageInput(model: string): Promise<boolean | null> {
    try {
      await this.fetchModelCapabilitiesIfNeeded();
    } catch {
      return null;
    }

    const modalities = this.modelInputModalitiesCache.get(model.trim().toLowerCase());
    if (!modalities) {
      return null;
    }
    return modalities.has("image");
  }

  async streamReply(input: {
    apiKey: string;
    model: string;
    messages: ChatMessage[];
    systemPrompt?: string;
    onDelta: (delta: string) => void;
  }): Promise<void> {
    const model = input.model.trim();
    if (!model) {
      throw new Error("Pick an OpenRouter model first.");
    }

    const supportsImage = this.hasImageAttachments(input.messages)
      ? await this.modelSupportsImageInput(model)
      : null;
    if (supportsImage === false) {
      throw new Error("Selected model does not support image input. Use a model with image input support.");
    }

    const userMessages = toOpenRouterMessages(input.messages);
    if (userMessages.length === 0) {
      throw new Error("Add a message first.");
    }

    const messages: Array<{ role: string; content: string | OpenRouterContentPart[] }> = input.systemPrompt
      ? [{ role: "system", content: input.systemPrompt }, ...userMessages]
      : userMessages;

    const hasImages = userMessages.some((m) =>
      Array.isArray(m.content) && m.content.some((p) => p.type === "image_url")
    );
    const bodyStr = JSON.stringify({ model, messages, stream: true });
    console.log(`[OpenRouter] sending ${bodyStr.length} bytes, hasImages=${hasImages}, msgCount=${messages.length}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json"
      },
      body: bodyStr
    });

    console.log(`[OpenRouter] response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const body = await response.text();
      const parsed = parseProviderError(body);
      if (/no endpoints found that support image input/i.test(parsed || "")) {
        throw new Error("This model does not support image input. Choose a vision-capable model or send text only.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(parsed || "OpenRouter API key is invalid.");
      }
      throw new Error(parsed || "OpenRouter request failed.");
    }

    if (!response.body) {
      throw new Error("OpenRouter returned an empty stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let nextLineIndex = buffer.indexOf("\n");
      while (nextLineIndex !== -1) {
        const line = buffer.slice(0, nextLineIndex).trim();
        buffer = buffer.slice(nextLineIndex + 1);
        nextLineIndex = buffer.indexOf("\n");

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: unknown } }>;
          };
          const delta = contentDeltaToText(parsed.choices?.[0]?.delta?.content);
          if (delta) {
            input.onDelta(delta);
          }
        } catch {
          // Ignore malformed chunks and continue streaming.
        }
      }
    }
  }
}
