/* Offline book storage · downloaded PDFs live in IndexedDB so the reader
   can open them with no connection. One record per book:
   { id, title, blob, saved_at }. All helpers fail soft (resolve null/false)
   so a broken IndexedDB never breaks the reader. */

const DB_NAME = "ft-offline-books";
const STORE = "books";

function openDb() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = () => {
        try {
          if (!rq.result.objectStoreNames.contains(STORE)) {
            rq.result.createObjectStore(STORE, { keyPath: "id" });
          }
        } catch {}
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function runTx(mode, fn) {
  return (async () => {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        let out = null;
        if (req) {
          req.onsuccess = () => { out = req.result; };
          req.onerror = () => { out = null; };
        }
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => resolve(out);
        tx.onabort = () => resolve(out);
      } catch {
        resolve(null);
      }
    });
  })();
}

/** Save a downloaded book PDF (Blob) for offline reading. */
export async function saveOfflineBook(id, blob, title) {
  if (!id || !blob) return false;
  const rec = { id: String(id), title: title || "", blob, saved_at: new Date().toISOString() };
  await runTx("readwrite", (store) => store.put(rec));
  return hasOfflineBook(id);
}

/** The stored record ({id, title, blob, saved_at}) or null. */
export async function getOfflineBook(id) {
  if (!id) return null;
  const rec = await runTx("readonly", (store) => store.get(String(id)));
  return rec || null;
}

/** True when a local copy of this book exists. */
export async function hasOfflineBook(id) {
  const rec = await getOfflineBook(id);
  return !!rec?.blob;
}

/** Remove the local copy of a book. */
export async function deleteOfflineBook(id) {
  if (!id) return;
  await runTx("readwrite", (store) => store.delete(String(id)));
}
