import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, normalizeSettings } from "../../src/main/settings";

test("normalizeSettings falls back to defaults for invalid input", () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
});

test("normalizeSettings trims and deduplicates selected cloud models", () => {
  const normalized = normalizeSettings({
    providers: {
      cloud: {
        selectedModels: {
          openai: [" gpt-5.2 ", "gpt-5.2", "", "gpt-5.2-mini"]
        }
      }
    }
  });

  assert.deepEqual(normalized.providers.cloud.selectedModels.openai, [
    "gpt-5.2",
    "gpt-5.2-mini"
  ]);
});

test("normalizeSettings drops legacy providers that are no longer supported", () => {
  const normalized = normalizeSettings({
    activeCloudProvider: "anthropic",
    providers: {
      cloud: {
        activeProvider: "anthropic",
        selectedModels: {
          anthropic: ["claude-sonnet-4-5"],
          openai: ["gpt-5.2"]
        }
      }
    }
  });

  assert.equal(normalized.providers.cloud.activeProvider, "openai");
  assert.deepEqual(normalized.providers.cloud.selectedModels.openai, [
    "gpt-5.2"
  ]);
  assert.equal("anthropic" in normalized.providers.cloud.selectedModels, false);
});
