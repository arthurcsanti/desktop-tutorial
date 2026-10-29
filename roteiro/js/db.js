// Armazenamento local (IndexedDB). Tudo funciona offline; a nuvem é opcional.

const DB_NAME = 'maquina-de-roteiro';
const DB_VERSION = 2;
let dbPromise;

function open() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('scripts')) db.createObjectStore('scripts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      // imagens: { path: 'anexos/abc.jpg', blob, type, createdAt, synced }
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'path' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const allScripts = () => run('scripts', 'readonly', (s) => s.getAll());
export const putScript = (script) => run('scripts', 'readwrite', (s) => s.put(script));
export const getMeta = (key) => run('meta', 'readonly', (s) => s.get(key));
export const setMeta = (key, value) => run('meta', 'readwrite', (s) => s.put(value, key));
export const deleteScript = (id) => run('scripts', 'readwrite', (s) => s.delete(id));
export const getFile = (path) => run('files', 'readonly', (s) => s.get(path));
export const putFile = (file) => run('files', 'readwrite', (s) => s.put(file));
export const allFiles = () => run('files', 'readonly', (s) => s.getAll());
