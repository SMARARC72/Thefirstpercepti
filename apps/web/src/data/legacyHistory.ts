/**
 * Browser-local legacy ledger. Each death writes here so the next run's
 * death screen can show "previous lives" and the legacy screen can list
 * them. Capped at 20 entries — older runs silently rotate out.
 *
 * When `repo` (HttpRepository / LocalStorageRepository) is configured,
 * legacies also persist there; this localStorage layer remains as a
 * zero-latency local mirror so the death screen renders instantly even
 * if the server is slow.
 */
import type { Legacy } from "@first-perception/types";

const LEGACY_HISTORY_KEY = "the-first-perception.legacy-history";
const MAX_LEGACIES = 20;

export function loadLegacyHistory(): Legacy[] {
  try {
    const raw = localStorage.getItem(LEGACY_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Legacy[]) : [];
  } catch {
    return [];
  }
}

export function saveLegacyHistory(history: Legacy[]): void {
  try {
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_LEGACIES)));
  } catch {
    // Quota exceeded or storage disabled. Acceptable: the next death
    // will try again.
  }
}
