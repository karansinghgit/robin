import assert from "node:assert/strict";
import test from "node:test";
import {
  cloudComposerValue,
  modelKey,
  parseComposerValue,
  parseModelKey,
  resolveCloudProviderId
} from "../../src/renderer/lib/modelSelection";

test("cloudComposerValue round-trips through parseComposerValue", () => {
  const value = cloudComposerValue("openrouter", "meta-llama/llama-4");

  assert.deepEqual(parseComposerValue(value), {
    mode: "search",
    provider: "openrouter",
    model: "meta-llama/llama-4"
  });
});

test("modelKey round-trips through parseModelKey", () => {
  const value = modelKey("local", "qwen2.5:7b");

  assert.deepEqual(parseModelKey(value), {
    mode: "local",
    model: "qwen2.5:7b"
  });
});

test("resolveCloudProviderId falls back when the provider is unknown", () => {
  assert.equal(
    resolveCloudProviderId("unknown-provider", "perplexity"),
    "perplexity"
  );
});
