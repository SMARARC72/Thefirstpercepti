/**
 * Browser-safe persistence entry point. Import from "@first-perception/persistence".
 *
 * The server-side PostgresRepository lives at
 * "@first-perception/persistence/server" — it must NOT be reachable from
 * this file, otherwise it would pull `pg` into the browser bundle.
 */
export type { GameRepository } from "./repository.js";
export { HttpRepository, HttpRepositoryError } from "./HttpRepository.js";
export type { HttpRepositoryOptions } from "./HttpRepository.js";
export { LocalStorageRepository } from "./LocalStorageRepository.js";
export { MemoryRepository } from "./MemoryRepository.js";
export { apiOk, apiError } from "./wire.js";
export type { ApiOk, ApiError, ApiResponse } from "./wire.js";
export { SCHEMA_VERSION, DEFAULT_PG_SCHEMA } from "./schema.js";
export type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";
