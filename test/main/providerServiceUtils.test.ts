import assert from "node:assert/strict";
import test from "node:test";
import { ChatMessage } from "../../src/shared/contracts";
import {
  extractUrls,
  isWeatherQuery,
  parseActions,
  prepareMessagesForAPI,
  requiresLiveWebSearch,
  truncateContext
} from "../../src/main/providerServiceUtils";

function message(
  id: string,
  role: ChatMessage["role"],
  content: string,
  attachments = false
): ChatMessage {
  return {
    id,
    role,
    content,
    createdAt: new Date(0).toISOString(),
    attachments: attachments
      ? [
          {
            id: `${id}-attachment`,
            name: "image.png",
            mimeType: "image/png",
            dataUrl: "data:image/png;base64,abc"
          }
        ]
      : undefined
  };
}

test("prepareMessagesForAPI strips attachments from older user messages only", () => {
  const prepared = prepareMessagesForAPI([
    message("1", "user", "first", true),
    message("2", "assistant", "reply"),
    message("3", "user", "latest", true)
  ]);

  assert.equal(prepared[0].attachments, undefined);
  assert.equal(prepared[2].attachments?.length, 1);
});

test("parseActions extracts valid todo actions and removes action blocks from content", () => {
  const parsed = parseActions(
    [
      "Visible response",
      '<action>{"type":"create_todo","title":"Ship linting"}</action>',
      '<action>{"type":"complete_todo","id":"todo-1"}</action>',
      '<action>{"type":"unknown"}</action>',
      "<action>not json</action>"
    ].join("\n")
  );

  assert.equal(parsed.cleanContent, "Visible response");
  assert.deepEqual(parsed.actions, [
    { type: "create_todo", title: "Ship linting" },
    { type: "complete_todo", id: "todo-1" }
  ]);
});

test("truncateContext drops oldest messages but preserves at least four", () => {
  const messages = [
    message("1", "user", "aaaa"),
    message("2", "assistant", "bbbb"),
    message("3", "user", "cccc"),
    message("4", "assistant", "dddd"),
    message("5", "user", "eeee"),
    message("6", "assistant", "ffff")
  ];

  const truncated = truncateContext(messages, 12);

  assert.deepEqual(
    truncated.map((entry) => entry.id),
    ["3", "4", "5", "6"]
  );
});

test("extractUrls returns unique cleaned urls", () => {
  assert.deepEqual(
    extractUrls(
      "Read https://example.com/foo, then compare with https://example.com/foo."
    ),
    ["https://example.com/foo"]
  );
});

test("requiresLiveWebSearch detects live/current-info prompts", () => {
  assert.equal(
    requiresLiveWebSearch("What is the weather in Calcutta right now?"),
    true
  );
  assert.equal(requiresLiveWebSearch("Give me the latest Apple news"), true);
  assert.equal(requiresLiveWebSearch("Rewrite this paragraph"), false);
});

test("isWeatherQuery detects weather prompts only", () => {
  assert.equal(isWeatherQuery("What is the temperature in Delhi?"), true);
  assert.equal(isWeatherQuery("Summarize my meeting notes"), false);
});
