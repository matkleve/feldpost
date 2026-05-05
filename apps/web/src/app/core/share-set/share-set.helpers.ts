const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses comma- or whitespace-separated UUIDs for named share recipients.
 * Returns deduplicated lowercased ids when all tokens are valid UUIDs.
 */
export function parseRecipientUserIdsFromCommaSeparatedInput(raw: string):
  | { ok: true; ids: string[] }
  | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'empty' };
  }

  const parts = trimmed
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { ok: false, message: 'empty' };
  }

  const ids: string[] = [];
  for (const p of parts) {
    if (!UUID_RE.test(p)) {
      return { ok: false, message: 'invalid_uuid' };
    }
    const id = p.toLowerCase();
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }

  return { ok: true, ids };
}
