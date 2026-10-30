/** Audios subidos por el usuario, guardados en IndexedDB del propio móvil. */

export interface StoredAudio {
  id: string;
  name: string;
  blob: Blob;
  addedAt: number;
}

const DB_NAME = "remoteTerrify";
const STORE = "audios";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function listAudios(): Promise<StoredAudio[]> {
  const all = await tx<StoredAudio[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => a.addedAt - b.addedAt);
}

export function getAudio(id: string): Promise<StoredAudio | undefined> {
  return tx<StoredAudio | undefined>("readonly", (s) => s.get(id));
}

export async function addAudio(file: File): Promise<StoredAudio> {
  const audio: StoredAudio = {
    id: crypto.randomUUID(),
    name: file.name,
    blob: file,
    addedAt: Date.now(),
  };
  await tx("readwrite", (s) => s.put(audio));
  return audio;
}

export async function deleteAudio(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}
