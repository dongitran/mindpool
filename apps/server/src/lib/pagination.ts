const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

/**
 * Parse a compound cursor string ("updatedAt_id") into a Mongoose filter.
 * Returns {} if cursor is missing or invalid (graceful degradation → first page).
 */
export function parseCursorFilter(cursor?: string): Record<string, unknown> {
  if (!cursor) return {};
  const sep = cursor.indexOf('_');
  if (sep <= 0) return {};
  const cursorDate = new Date(cursor.slice(0, sep));
  const cursorId = cursor.slice(sep + 1);
  if (isNaN(cursorDate.getTime()) || !OBJECT_ID_RE.test(cursorId)) return {};
  return {
    $or: [
      { updatedAt: { $lt: cursorDate } },
      { updatedAt: cursorDate, _id: { $lt: cursorId } },
    ],
  };
}

/**
 * Build a compound cursor string from a Mongoose document.
 */
export function buildCursor(doc: { get: (key: string) => { toISOString: () => string }; _id: { toString: () => string } }): string {
  return `${doc.get('updatedAt').toISOString()}_${doc._id.toString()}`;
}
