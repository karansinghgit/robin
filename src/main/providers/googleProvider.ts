import { ChatAttachment, ChatMessage } from "../../shared/contracts";

type GeminiRole = "user" | "model";

interface GeminiContent {
  role: GeminiRole;
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  >;
}

function imagePartFromAttachment(attachment: ChatAttachment): { inlineData: { mimeType: string; data: string } } | null {
  if (!attachment?.dataUrl || !attachment?.mimeType) {
    return null;
  }

  const commaIndex = attachment.dataUrl.indexOf(",");
  if (commaIndex === -1) {
    return null;
  }
  const encoded = attachment.dataUrl.slice(commaIndex + 1).trim();
  if (!encoded) {
    return null;
  }

  return {
    inlineData: {
      mimeType: attachment.mimeType,
      data: encoded
    }
  };
}

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    const parts: GeminiContent["parts"] = [];
    if (message.content.trim().length > 0) {
      parts.push({ text: message.content });
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

    const role: GeminiRole = message.role === "assistant" ? "model" : "user";
    contents.push({ role, parts });
  }

  return contents;
}

function extractText(payload: unknown): string {
  const candidates = Array.isArray((payload as { candidates?: unknown[] })?.candidates)
    ? (payload as { candidates: unknown[] }).candidates
    : [];
  const first = candidates[0] as { content?: { parts?: Array<{ text?: string }> } } | undefined;
  const parts = Array.isArray(first?.content?.parts) ? first.content.parts : [];
  return parts
    .map((part) => typeof part?.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("");
}

function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const chunks = trimmed.match(/.{1,180}(\s|$)/g);
  if (!chunks || chunks.length === 0) {
    return [trimmed];
  }

  return chunks.map((chunk) => chunk);
}

function parseGoogleError(rawBody: string): string | null {
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

export class GoogleProvider {
  async streamReply(input: {
    apiKey: string;
    model: string;
    messages: ChatMessage[];
    systemPrompt?: string;
    onDelta: (delta: string) => void;
  }): Promise<void> {
    const rawModelId = input.model.startsWith("models/") ? input.model.slice("models/".length) : input.model;
    const modelId = rawModelId.trim();
    if (!modelId) {
      throw new Error("Pick a Google model first.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
    const contents = toGeminiContents(input.messages);
    if (contents.length === 0) {
      throw new Error("Add a message or image first.");
    }
    const body: Record<string, unknown> = { contents };
    if (input.systemPrompt) {
      body.systemInstruction = { parts: [{ text: input.systemPrompt }] };
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const body = await response.text();
      const parsedError = parseGoogleError(body);
      if (response.status === 401 || response.status === 403) {
        throw new Error(parsedError || "Google API key is invalid or does not have Gemini API access.");
      }
      throw new Error(parsedError || "Google model request failed.");
    }

    const payload = await response.json();
    const output = extractText(payload);
    if (!output) {
      throw new Error("Google returned an empty response.");
    }

    for (const delta of chunkText(output)) {
      input.onDelta(delta);
    }
  }
}
