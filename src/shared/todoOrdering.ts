import { TodoItem } from "./contracts";

export function sortTodosForDisplay(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((left, right) => {
    if (left.completed !== right.completed) {
      return Number(left.completed) - Number(right.completed);
    }
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function reorderTodoForCompletion(
  todos: TodoItem[],
  id: string,
  completed: boolean
): TodoItem[] {
  const sorted = sortTodosForDisplay(todos);
  const target = sorted.find((todo) => todo.id === id);
  if (!target) {
    return sorted;
  }

  const updatedTarget: TodoItem = { ...target, completed };
  const remaining = sorted.filter((todo) => todo.id !== id);
  const pending = remaining.filter((todo) => !todo.completed);
  const done = remaining.filter((todo) => todo.completed);

  return [...pending, updatedTarget, ...done].map((todo, index) => ({
    ...todo,
    order: index
  }));
}

export function reorderTodoInGroup(
  todos: TodoItem[],
  draggedId: string,
  targetId: string
): TodoItem[] {
  const sorted = sortTodosForDisplay(todos);
  const fromIndex = sorted.findIndex((todo) => todo.id === draggedId);
  const toIndex = sorted.findIndex((todo) => todo.id === targetId);

  if (fromIndex === -1 || toIndex === -1) {
    return sorted;
  }

  if (sorted[fromIndex].completed !== sorted[toIndex].completed) {
    return sorted;
  }

  const reordered = [...sorted];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  return reordered.map((todo, index) => ({
    ...todo,
    order: index
  }));
}
