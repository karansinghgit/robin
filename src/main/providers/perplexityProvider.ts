import OpenAI from "openai";
import { ChatMessage, Citation } from "../../shared/contracts";

function buildTranscript(messages: ChatMessage[]): string {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    if (!citation.url || seen.has(citation.url)) {
      return false;
    }
    seen.add(citation.url);
    return true;
  });
}

function extractCitations(response: any): Citation[] {
  const citations: Citation[] = [];
  const output = Array.isArray(response?.output) ? response.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const annotations = Array.isArray(part?.annotations) ? part.annotations : [];
      for (const annotation of annotations) {
        const url = annotation?.url ?? annotation?.source?.url;
        const title = annotation?.title ?? annotation?.source?.title ?? url;
        const snippet = annotation?.snippet ?? annotation?.text;
        if (url) {
          citations.push({ title, url, snippet });
        }
      }
    }
  }

  return dedupeCitations(citations);
}

export class PerplexityProvider {
  async streamReply(input: {
    apiKey: string;
    model: string;
    preset: string;
    messages: ChatMessage[];
    onDelta: (delta: string) => void;
  }): Promise<{ citations: Citation[] }> {
    const client = new OpenAI({
      apiKey: input.apiKey,
      baseURL: "https://api.perplexity.ai/v1"
    });

    const stream = await (client.responses.create as any)({
      model: input.model,
      input: buildTranscript(input.messages),
      stream: true,
      extra_body: {
        preset: input.preset,
        tools: [{ type: "web_search" }]
      }
    });

    let completedResponse: any = null;

    for await (const event of stream) {
      if (event?.type === "response.output_text.delta" && event.delta) {
        input.onDelta(event.delta);
      }
      if (event?.type === "response.completed" && event.response) {
        completedResponse = event.response;
      }
    }

    return {
      citations: extractCitations(completedResponse)
    };
  }
}
