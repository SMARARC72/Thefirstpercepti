/**
 * Server-only persistence entry point. Import from
 * "@first-perception/persistence/server" — never from browser code.
 *
 * Pulls in `pg`, which has Node-only deps (net, tls, pg-native bindings).
 */
export { PostgresRepository } from "./PostgresRepository.js";
export type { PostgresRepositoryOptions } from "./PostgresRepository.js";
export type { GameRepository } from "./repository.js";
export type {
  AgentLogEntry,
  LegacyRecord,
  NPCMemory,
  Rumor,
  SaveSlot,
  WorldEvent,
} from "./types.js";
