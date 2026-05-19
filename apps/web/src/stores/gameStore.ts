import type { AppState } from "../game";

export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T>): void;
  subscribe(callback: (state: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = { ...initial };
  const listeners = new Set<(state: T) => void>();

  return {
    getState: () => state,
    setState: (partial: Partial<T>) => {
      state = { ...state, ...partial };
      listeners.forEach((cb) => cb(state));
    },
    subscribe: (callback: (state: T) => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}

export type GameStore = Store<AppState>;
