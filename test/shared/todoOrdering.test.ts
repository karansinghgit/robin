import assert from "node:assert/strict";
import test from "node:test";
import { TodoItem } from "../../src/shared/contracts";
import {
  reorderTodoForCompletion,
  reorderTodoInGroup,
  sortTodosForDisplay
} from "../../src/shared/todoOrdering";

function todo(
  id: string,
  title: string,
  order: number,
  completed = false
): TodoItem {
  return {
    id,
    title,
    completed,
    order,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  };
}

test("sortTodosForDisplay keeps pending todos before completed todos", () => {
  const sorted = sortTodosForDisplay([
    todo("done-1", "done", 0, true),
    todo("todo-1", "todo", 1, false)
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["todo-1", "done-1"]
  );
});

test("reorderTodoForCompletion moves a newly completed todo to the top of the done pile", () => {
  const reordered = reorderTodoForCompletion(
    [
      todo("todo-1", "first", 0, false),
      todo("todo-2", "second", 1, false),
      todo("done-1", "done", 2, true)
    ],
    "todo-1",
    true
  );

  assert.deepEqual(
    reordered.map((item) => item.id),
    ["todo-2", "todo-1", "done-1"]
  );
});

test("reorderTodoInGroup reorders items within the same completion section", () => {
  const reordered = reorderTodoInGroup(
    [
      todo("todo-1", "first", 0, false),
      todo("todo-2", "second", 1, false),
      todo("done-1", "done", 2, true)
    ],
    "todo-2",
    "todo-1"
  );

  assert.deepEqual(
    reordered.map((item) => item.id),
    ["todo-2", "todo-1", "done-1"]
  );
});

test("reorderTodoInGroup ignores drops across pending and completed sections", () => {
  const reordered = reorderTodoInGroup(
    [todo("todo-1", "first", 0, false), todo("done-1", "done", 1, true)],
    "todo-1",
    "done-1"
  );

  assert.deepEqual(
    reordered.map((item) => item.id),
    ["todo-1", "done-1"]
  );
});
