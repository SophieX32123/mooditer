const RETENTION_MS = 90 * 86400000;
let connection;
export function openDatabase() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('mooditer', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('samples', { keyPath: 'id', autoIncrement: true });
      store.createIndex('timestamp', 'timestamp');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return connection;
}
async function transact(mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('samples', mode);
    const request = operation(tx.objectStore('samples'));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction cancelled'));
  });
}
export const addSample = sample => transact('readwrite', store => store.add(sample));
export const clearSamples = () => transact('readwrite', store => store.clear());
export const readSamples = (since = Date.now() - RETENTION_MS) => transact('readonly', store => store.index('timestamp').getAll(IDBKeyRange.lowerBound(since)));
export const pruneSamples = () => transact('readwrite', store => {
  const request = store.index('timestamp').openCursor(IDBKeyRange.upperBound(Date.now() - RETENTION_MS, true));
  request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue(); } };
  return request;
});
