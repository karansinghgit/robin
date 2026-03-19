import { ToolDefinition, ToolExecutor, ToolCall, ToolResult } from "./types";
import { fetchUrlTool } from "./fetchUrl";
import { createWebSearchTool } from "./webSearch";

/**
 * Build the list of active tool executors based on available API keys.
 * Tools whose prerequisites are not met are silently excluded.
 */
export function buildToolExecutors(braveApiKey?: string | null): ToolExecutor[] {
  const tools: ToolExecutor[] = [fetchUrlTool];

  if (braveApiKey) {
    tools.push(createWebSearchTool(braveApiKey));
  }

  return tools;
}

export function getToolDefinitions(executors: ToolExecutor[]): ToolDefinition[] {
  return executors.map((t) => t.definition);
}

export async function executeToolCalls(
  executors: ToolExecutor[],
  calls: ToolCall[]
): Promise<ToolResult[]> {
  const executorMap = new Map(executors.map((t) => [t.definition.name, t]));

  return Promise.all(
    calls.map(async (call): Promise<ToolResult> => {
      const executor = executorMap.get(call.name);
      if (!executor) {
        return {
          callId: call.id,
          name: call.name,
          content: `Error: Unknown tool "${call.name}".`,
          isError: true
        };
      }

      try {
        const args = JSON.parse(call.arguments) as Record<string, unknown>;
        const content = await executor.execute(args);
        return { callId: call.id, name: call.name, content };
      } catch (error) {
        return {
          callId: call.id,
          name: call.name,
          content: `Error: ${error instanceof Error ? error.message : "Tool execution failed."}`,
          isError: true
        };
      }
    })
  );
}
