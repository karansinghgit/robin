import { AppStorage } from "../storage";
import { ContextProvider } from "./types";

const MAX_NOTE_CHARS = 1500;
const MAX_NOTES_IN_CONTEXT = 4;

function excerpt(content: string): string {
  return content.length > MAX_NOTE_CHARS
    ? content.slice(0, MAX_NOTE_CHARS) + "…"
    : content;
}

export class NotesContextProvider implements ContextProvider {
  constructor(private readonly storage: AppStorage) {}

  async getSummary(): Promise<string> {
    const notes = await this.storage.listNotes();
    if (notes.length === 0) return "";
    return `Notes: ${notes.length} note${notes.length === 1 ? "" : "s"}.`;
  }

  async getRelevantContent(query: string): Promise<string> {
    const notes = await this.storage.listNotes();
    if (notes.length === 0) return "";

    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Score each note by keyword hits in title + content
    const scored = notes.map((note) => {
      const haystack = `${note.title} ${note.content}`.toLowerCase();
      const score = keywords.filter((kw) => haystack.includes(kw)).length;
      return { note, score };
    });

    const relevant = keywords.length > 0
      ? scored.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score)
      : scored;

    const toDisplay = relevant.slice(0, MAX_NOTES_IN_CONTEXT).map((entry) => entry.note);
    if (toDisplay.length === 0) return "";

    const sections = toDisplay.map((note) => {
      const body = excerpt(note.content.trim());
      return body ? `### ${note.title}\n${body}` : `### ${note.title}\n(empty)`;
    });

    return `## Your Notes\n${sections.join("\n\n")}`;
  }
}
