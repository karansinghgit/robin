import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ChatMessage,
  ConversationThread,
  NoteItem,
  ThreadSummary,
  TodoItem
} from "../shared/contracts";
import { reorderTodoForCompletion } from "../shared/todoOrdering";
import { DEFAULT_SETTINGS, normalizeSettings, SettingsData } from "./settings";

interface ThreadsFile {
  threads: ConversationThread[];
}

interface TodosFile {
  todos: TodoItem[];
}

interface NotesFile {
  notes: NoteItem[];
}

export class AppStorage {
  private readonly rootDir = path.join(app.getPath("userData"), "data");
  private readonly settingsPath = path.join(this.rootDir, "settings.json");
  private readonly threadsPath = path.join(this.rootDir, "threads.json");
  private readonly todosPath = path.join(this.rootDir, "todos.json");
  private readonly notesPath = path.join(this.rootDir, "notes.json");

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await this.ensureFile(this.settingsPath, DEFAULT_SETTINGS);
    await this.ensureFile<ThreadsFile>(this.threadsPath, { threads: [] });
    await this.ensureFile<TodosFile>(this.todosPath, { todos: [] });
    await this.ensureFile<NotesFile>(this.notesPath, { notes: [] });
  }

  async getSettings(): Promise<SettingsData> {
    const raw = await this.readJson<unknown>(
      this.settingsPath,
      DEFAULT_SETTINGS
    );
    return normalizeSettings(raw);
  }

  async saveSettings(
    updater: (current: SettingsData) => SettingsData
  ): Promise<SettingsData> {
    const current = await this.getSettings();
    const next = normalizeSettings(updater(current));
    await this.writeJson(this.settingsPath, next);
    return next;
  }

  async listThreads(): Promise<ThreadSummary[]> {
    const threads = await this.getThreads();
    return threads
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((thread) => ({
        id: thread.id,
        title: thread.title,
        mode: thread.mode,
        updatedAt: thread.updatedAt,
        preview: (() => {
          const last = thread.messages.at(-1);
          const text = last?.content ?? "";
          if (text.trim().length > 0) {
            return text;
          }
          if ((last?.attachments?.length ?? 0) > 0) {
            return "Image";
          }
          return "";
        })()
      }));
  }

  async loadThread(id: string): Promise<ConversationThread | null> {
    const threads = await this.getThreads();
    return threads.find((thread) => thread.id === id) ?? null;
  }

  async upsertThread(thread: ConversationThread): Promise<void> {
    const threads = await this.getThreads();
    const index = threads.findIndex((item) => item.id === thread.id);
    if (index === -1) {
      threads.push(thread);
    } else {
      threads[index] = thread;
    }
    await this.writeJson(this.threadsPath, { threads });
  }

  async deleteThread(id: string): Promise<boolean> {
    const threads = await this.getThreads();
    const nextThreads = threads.filter((thread) => thread.id !== id);
    if (nextThreads.length === threads.length) {
      return false;
    }
    await this.writeJson(this.threadsPath, { threads: nextThreads });
    return true;
  }

  async finalizeStreamingMessages(threadId?: string): Promise<void> {
    const threads = await this.getThreads();
    let changed = false;
    const now = new Date().toISOString();

    const nextThreads = threads.map((thread) => {
      if (threadId && thread.id !== threadId) {
        return thread;
      }

      let threadChanged = false;
      const nextMessages: ChatMessage[] = [];

      for (const message of thread.messages) {
        if (message.status !== "streaming") {
          nextMessages.push(message);
          continue;
        }

        threadChanged = true;
        changed = true;
        const emptyAssistant =
          message.role === "assistant" &&
          message.content.trim().length === 0 &&
          (message.attachments?.length ?? 0) === 0;

        if (emptyAssistant) {
          continue;
        }

        nextMessages.push({
          ...message,
          status: "complete"
        });
      }

      if (!threadChanged) {
        return thread;
      }

      return {
        ...thread,
        updatedAt: now,
        messages: nextMessages
      };
    });

    if (!changed) {
      return;
    }

    await this.writeJson(this.threadsPath, { threads: nextThreads });
  }

  async listTodos(): Promise<TodoItem[]> {
    const file = await this.readJson<TodosFile>(this.todosPath, { todos: [] });
    return file.todos.slice().sort((a, b) => a.order - b.order);
  }

  async createTodo(title: string): Promise<TodoItem> {
    const file = await this.readJson<TodosFile>(this.todosPath, { todos: [] });
    const maxOrder = file.todos.reduce((max, t) => Math.max(max, t.order), -1);
    const now = new Date().toISOString();
    const todo: TodoItem = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };
    file.todos.push(todo);
    await this.writeJson(this.todosPath, file);
    return todo;
  }

  async updateTodo(
    id: string,
    changes: Partial<Pick<TodoItem, "title" | "completed" | "order">>
  ): Promise<TodoItem | null> {
    const file = await this.readJson<TodosFile>(this.todosPath, { todos: [] });
    const todo = file.todos.find((t) => t.id === id);
    if (!todo) return null;
    const now = new Date().toISOString();
    if (changes.title !== undefined) todo.title = changes.title;
    if (changes.order !== undefined) todo.order = changes.order;
    todo.updatedAt = now;

    if (
      changes.completed !== undefined &&
      changes.completed !== todo.completed
    ) {
      const nextCompleted = changes.completed;
      const nextTodos = reorderTodoForCompletion(
        file.todos.map((entry) =>
          entry.id === id
            ? { ...entry, completed: nextCompleted, updatedAt: now }
            : entry
        ),
        id,
        nextCompleted
      );
      file.todos = nextTodos;
    } else if (changes.completed !== undefined) {
      todo.completed = changes.completed;
    }

    await this.writeJson(this.todosPath, file);
    return file.todos.find((entry) => entry.id === id) ?? null;
  }

  async reorderTodos(orderedIds: string[]): Promise<TodoItem[]> {
    const file = await this.readJson<TodosFile>(this.todosPath, { todos: [] });
    const idToTodo = new Map(file.todos.map((t) => [t.id, t]));
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) {
      const todo = idToTodo.get(orderedIds[i]);
      if (todo) {
        todo.order = i;
        todo.updatedAt = now;
      }
    }
    await this.writeJson(this.todosPath, file);
    return file.todos.slice().sort((a, b) => a.order - b.order);
  }

  async deleteTodo(id: string): Promise<boolean> {
    const file = await this.readJson<TodosFile>(this.todosPath, { todos: [] });
    const nextTodos = file.todos.filter((t) => t.id !== id);
    if (nextTodos.length === file.todos.length) return false;
    await this.writeJson(this.todosPath, { todos: nextTodos });
    return true;
  }

  async listNotes(): Promise<NoteItem[]> {
    const file = await this.readJson<NotesFile>(this.notesPath, { notes: [] });
    return file.notes
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createNote(title: string): Promise<NoteItem> {
    const file = await this.readJson<NotesFile>(this.notesPath, { notes: [] });
    const now = new Date().toISOString();
    const note: NoteItem = {
      id: crypto.randomUUID(),
      title: title || "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now
    };
    file.notes.push(note);
    await this.writeJson(this.notesPath, file);
    return note;
  }

  async updateNote(
    id: string,
    changes: Partial<Pick<NoteItem, "title" | "content">>
  ): Promise<NoteItem | null> {
    const file = await this.readJson<NotesFile>(this.notesPath, { notes: [] });
    const note = file.notes.find((n) => n.id === id);
    if (!note) return null;
    if (changes.title !== undefined) note.title = changes.title;
    if (changes.content !== undefined) note.content = changes.content;
    note.updatedAt = new Date().toISOString();
    await this.writeJson(this.notesPath, file);
    return note;
  }

  async deleteNote(id: string): Promise<boolean> {
    const file = await this.readJson<NotesFile>(this.notesPath, { notes: [] });
    const nextNotes = file.notes.filter((n) => n.id !== id);
    if (nextNotes.length === file.notes.length) return false;
    await this.writeJson(this.notesPath, { notes: nextNotes });
    return true;
  }

  private async getThreads(): Promise<ConversationThread[]> {
    const file = await this.readJson<ThreadsFile>(this.threadsPath, {
      threads: []
    });
    return file.threads;
  }

  private async ensureFile<T>(filePath: string, initial: T): Promise<void> {
    try {
      await readFile(filePath, "utf8");
    } catch {
      await this.writeJson(filePath, initial);
    }
  }

  private async readJson<T>(filePath: string, fallback: T): Promise<T> {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export function buildThreadTitle(prompt: string): string {
  const compact = prompt.trim().replace(/\s+/g, " ");
  return compact.length <= 48 ? compact : `${compact.slice(0, 45)}...`;
}
