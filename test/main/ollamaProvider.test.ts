import assert from "node:assert/strict";
import test from "node:test";
import { OllamaProvider } from "../../src/main/providers/ollamaProvider";

const ORIGINAL_FETCH = globalThis.fetch;

function createStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" }
  });
}

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

test("ollama provider accepts buffered JSON chat replies", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: { content: "hello from ollama" },
        done: true
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  const provider = new OllamaProvider();
  const deltas: string[] = [];
  const result = await provider.streamReply({
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
    messages: [{ id: "1", role: "user", content: "hi", createdAt: "now" }],
    onDelta: (delta) => {
      deltas.push(delta);
    }
  });

  assert.deepEqual(deltas, ["hello from ollama"]);
  assert.deepEqual(result.toolCalls, []);
});

test("ollama provider accepts streaming ndjson chat replies", async () => {
  globalThis.fetch = async () =>
    createStreamResponse([
      JSON.stringify({
        message: { content: "hello " },
        done: false
      }) + "\n",
      JSON.stringify({
        message: { content: "world" },
        done: true
      })
    ]);

  const provider = new OllamaProvider();
  const deltas: string[] = [];
  const result = await provider.streamReply({
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
    messages: [{ id: "1", role: "user", content: "hi", createdAt: "now" }],
    onDelta: (delta) => {
      deltas.push(delta);
    }
  });

  assert.deepEqual(deltas, ["hello ", "world"]);
  assert.deepEqual(result.toolCalls, []);
});
