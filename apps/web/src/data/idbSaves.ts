/**
 * IndexedDB-backed save-slot CRUD. Used by SettingsModal for the
 * named-slot save grid. Independent of the GameRepository abstraction
 * (which covers server-side saves) — this is the local quicksave
 * cache that always exists in the browser.
 */
import type { AppState } from "@first-perception/types";

const DB_NAME = "the-first-perception";
const DB_VERSION = 1;
const STORE_NAME = "saves";

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function getSaveSlots(): Promise<AppState["saveSlots"]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as AppState["saveSlots"]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function writeSaveSlot(slot: AppState["saveSlots"][number]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(slot);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSaveSlot(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function readSaveSlot(
  id: string,
): Promise<AppState["saveSlots"][number] | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const req = store.get(id);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as AppState["saveSlots"][number] | undefined);
    req.onerror = () => reject(req.error);
  });
}
