/**
 * StorageService — IndexedDB-backed persistence layer for ChronoFlow.
 *
 * Why IndexedDB over localStorage?
 *   - localStorage hard-caps at ~5-10 MB (browser-dependent).
 *   - IndexedDB allows 50%+ of available disk (hundreds of MB to GB).
 *   - Structured data means we can store/retrieve individual stores
 *     without serializing the *entire* dataset on every keystroke.
 *
 * Design:
 *   - Single database "chronoflow" with one object store per data domain.
 *   - Each store uses a single "data" key holding the full array/value,
 *     matching the pattern the React contexts already use (swap-in the whole
 *     array on save, read the whole array on load).
 *   - On first open, localStorage data is auto-migrated and then removed.
 *   - A numeric `version` in a meta store enables future schema migrations.
 *
 * All public methods are async. The contexts run a one-time hydration on
 * mount, then write-through after every state change.
 */

const DB_NAME = 'chronoflow';
const DB_VERSION = 1;
const DATA_KEY = 'data'; // Single key inside each object store
const META_STORE = '_meta';

// Every domain the app persists — each becomes an IndexedDB object store.
export const STORE_NAMES = [
  'clients',
  'projects',
  'customTemplates',
  'rocks',
  'tasks',
  'subtasks',
  'plannedActivities',
  'recurringActivities',
  'sessions',
  'activeTimer',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

// ────────────────────── helpers ──────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Create a store for each data domain
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
      // Meta store for schema version & flags
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('[StorageService] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

// ────────────────────── core API ──────────────────────

/** Read a full store value. Returns `undefined` if nothing stored. */
export async function getStore<T = unknown>(name: StoreName): Promise<T | undefined> {
  const db = await openDB();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(name, 'readonly');
    const req = tx.objectStore(name).get(DATA_KEY);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Overwrite a full store value. */
export async function setStore<T = unknown>(name: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    tx.objectStore(name).put(value, DATA_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Remove a store value (e.g. clearing activeTimer). */
export async function removeStore(name: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    tx.objectStore(name).delete(DATA_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Read all stores in a single transaction — used for bulk hydration. */
export async function getAllStores(): Promise<Record<StoreName, unknown>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...STORE_NAMES], 'readonly');
    const result: Record<string, unknown> = {};
    let pending = STORE_NAMES.length;

    for (const name of STORE_NAMES) {
      const req = tx.objectStore(name).get(DATA_KEY);
      req.onsuccess = () => {
        result[name] = req.result;
        pending--;
        if (pending === 0) resolve(result as Record<StoreName, unknown>);
      };
      req.onerror = () => reject(req.error);
    }
  });
}

/** Write multiple stores atomically in one transaction. */
export async function setManyStores(entries: Partial<Record<StoreName, unknown>>): Promise<void> {
  const db = await openDB();
  const storeNames = Object.keys(entries) as StoreName[];
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).put(entries[name], DATA_KEY);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ────────────────────── migration ──────────────────────

const LS_KEYS_TO_STORES: Record<string, StoreName> = {
  clients: 'clients',
  projects: 'projects',
  customTemplates: 'customTemplates',
  rocks: 'rocks',
  tasks: 'tasks',
  subtasks: 'subtasks',
  plannedActivities: 'plannedActivities',
  recurringActivities: 'recurringActivities',
  sessions: 'sessions',
  activeTimer: 'activeTimer',
};

/**
 * One-time migration: copy all existing localStorage data into IndexedDB,
 * then remove the old keys. Called once at app startup.
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  const db = await openDB();

  // Check if migration already done
  const migrated = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get('migrated');
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => reject(req.error);
  });

  if (migrated) return false; // Already migrated

  // Collect everything from localStorage
  const entries: Partial<Record<StoreName, unknown>> = {};
  let foundAny = false;

  for (const [lsKey, storeName] of Object.entries(LS_KEYS_TO_STORES)) {
    const raw = localStorage.getItem(lsKey);
    if (raw !== null) {
      try {
        entries[storeName] = JSON.parse(raw);
        foundAny = true;
      } catch {
        // Malformed — skip
      }
    }
  }

  if (foundAny) {
    const storeNames = Object.keys(entries) as StoreName[];
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).put(entries[name], DATA_KEY);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Mark migration complete
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(true, 'migrated');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Clean up localStorage (keep hasSeenTutorial — it's a UI flag, not data)
  for (const lsKey of Object.keys(LS_KEYS_TO_STORES)) {
    localStorage.removeItem(lsKey);
  }

  console.log('[StorageService] Migration from localStorage → IndexedDB complete.');
  return true;
}

/**
 * Convenience: run migration + return all stores in one call.
 * Use this at app startup to hydrate all contexts.
 */
export async function initStorage(): Promise<Record<StoreName, unknown>> {
  await migrateFromLocalStorage();
  return getAllStores();
}
