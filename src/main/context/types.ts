/**
 * Abstraction for a data source that can contribute context to AI requests.
 *
 * Today: getSummary() is always included, getRelevantContent() does keyword matching.
 * Future: getRelevantContent() can be swapped for embedding-based RAG without changing callers.
 */
export interface ContextProvider {
  /** A brief one-liner about what data this source holds. Included unconditionally. */
  getSummary(): Promise<string>;
  /**
   * Returns formatted content relevant to the user's query.
   * Implementations may use keyword matching or (in future) semantic search.
   * Return an empty string if there is nothing relevant to include.
   */
  getRelevantContent(query: string): Promise<string>;
}
