import { Citation } from "../../shared/contracts";

/** JSON Schema describing a tool's parameters. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** A tool invocation request from the model. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

/** The result of executing a tool call, sent back to the model. */
export interface ToolResult {
  callId: string;
  name: string;
  content: string;
  isError?: boolean;
}

/** One round of tool calling (model requested → we executed). */
export interface ToolRound {
  calls: ToolCall[];
  results: ToolResult[];
}

/** Uniform return type for all providers' streamReply. */
export interface StreamReplyResult {
  citations: Citation[];
  toolCalls: ToolCall[];
}

/** A tool that can be registered in the tool registry. */
export interface ToolExecutor {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
}
