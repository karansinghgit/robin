import OpenAI from "openai";
import { ChatMessage, CloudModelCatalogItem } from "../../shared/contracts";
import { ToolDefinition, ToolCall, ToolRound, StreamReplyResult } from "../tools/types";

function buildResponsesInput(messages: ChatMessage[]): Array<{
  role: "user" | "assistant";
  content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
  >;
}> {
  const input: Array<{
    role: "user" | "assistant";
    content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string }
    >;
  }> = [];

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    const content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string }
    > = [];

    if (message.content.trim().length > 0) {
      content.push({
        type: "input_text",
        text: message.content
      });
    }

    if (message.role === "user" && Array.isArray(message.attachments)) {
      for (const attachment of message.attachments) {
        if (!attachment?.dataUrl) {
          continue;
        }
        content.push({
          type: "input_image",
          image_url: attachment.dataUrl
        });
      }
    }

    if (content.length === 0) {
      continue;
    }

    input.push({
      role: message.role,
      content
    });
  }

  return input;
}

function isLikelyChatModel(id: string): boolean {
  const normalized = id.toLowerCase();

  if (/(embedding|moderation|omni-moderation|whisper|transcribe|tts|image|dall-e|realtime)/.test(normalized)) {
    return false;
  }

  return normalized.startsWith("gpt-") || normalized.startsWith("o1") || normalized.startsWith("o3") || normalized.startsWith("o4");
}

function modesForModel(modelId: string): string[] {
  const normalized = modelId.toLowerCase();
  if (normalized.includes("gpt-5.2-pro")) {
    return ["medium", "high", "xhigh"];
  }
  if (normalized.includes("gpt-5-pro")) {
    return ["high"];
  }
  if (normalized.includes("gpt-5.2-codex")) {
    return ["low", "medium", "high", "xhigh"];
  }
  if (normalized.includes("gpt-5.2")) {
    return ["none", "low", "medium", "high", "xhigh"];
  }
  if (normalized.includes("gpt-5.1")) {
    return ["none", "low", "medium", "high"];
  }
  if (normalized.includes("gpt-5")) {
    return ["minimal", "low", "medium", "high"];
  }
  if (/^o[1-4]/.test(normalized)) {
    return ["low", "medium", "high"];
  }
  return [];
}

function modelPriority(id: string): number {
  const normalized = id.toLowerCase();
  if (normalized.includes("codex")) {
    return 0;
  }
  if (normalized.startsWith("gpt-5")) {
    return 1;
  }
  if (normalized.startsWith("o")) {
    return 2;
  }
  return 3;
}

export class OpenAIProvider {
  async listModels(apiKey: string): Promise<CloudModelCatalogItem[]> {
    const client = new OpenAI({ apiKey });
    const ids: string[] = [];
    for await (const model of client.models.list()) {
      if (!model?.id) {
        continue;
      }
      if (isLikelyChatModel(model.id)) {
        ids.push(model.id);
      }
    }

    const deduped = Array.from(new Set(ids)).sort((left, right) => {
      const leftPriority = modelPriority(left);
      const rightPriority = modelPriority(right);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.localeCompare(right);
    });

    return deduped.map((id) => ({
      id,
      modes: modesForModel(id)
    }));
  }

  async streamReply(input: {
    apiKey: string;
    model: string;
    mode?: string;
    messages: ChatMessage[];
    systemPrompt?: string;
    tools?: ToolDefinition[];
    toolHistory?: ToolRound[];
    onDelta: (delta: string) => void;
  }): Promise<StreamReplyResult> {
    const client = new OpenAI({ apiKey: input.apiKey });
    const responseInput = buildResponsesInput(input.messages);

    for (const round of input.toolHistory ?? []) {
      for (const call of round.calls) {
        responseInput.push({
          type: "function_call",
          call_id: call.id,
          name: call.name,
          arguments: call.arguments
        } as any);
      }
      for (const result of round.results) {
        responseInput.push({
          type: "function_call_output",
          call_id: result.callId,
          output: result.content
        } as any);
      }
    }

    const createParams: Record<string, unknown> = {
      model: input.model,
      input: responseInput,
      stream: true,
      reasoning: input.mode ? { effort: input.mode } : undefined,
      instructions: input.systemPrompt || undefined
    };
    if (input.tools?.length) {
      createParams.tools = input.tools.map((t) => ({
        type: "function",
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }));
    }
    const stream = await (client.responses.create as any)(createParams);

    const pendingToolCalls = new Map<number, { id: string; name: string; arguments: string }>();

    for await (const event of stream) {
      if (event?.type === "response.output_text.delta" && event.delta) {
        input.onDelta(event.delta);
      }
      if (event?.type === "response.output_item.added" && event.item?.type === "function_call") {
        pendingToolCalls.set(event.output_index, {
          id: event.item.call_id || "",
          name: event.item.name || "",
          arguments: ""
        });
      }
      if (event?.type === "response.function_call_arguments.delta") {
        const tc = pendingToolCalls.get(event.output_index);
        if (tc) tc.arguments += event.delta;
      }
    }

    const toolCalls: ToolCall[] = Array.from(pendingToolCalls.values())
      .filter((tc) => tc.name)
      .map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments }));

    return { citations: [], toolCalls };
  }
}
