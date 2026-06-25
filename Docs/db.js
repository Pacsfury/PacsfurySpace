const DB_NAME    = "pacsfuy-docs";
const DB_VERSION = 1;
const STORE      = "documents";

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = ({ target }) => {
            target.result.createObjectStore(STORE, { keyPath: "id" });
        };
        req.onsuccess = ({ target }) => resolve(target.result);
        req.onerror   = ({ target }) => reject(target.error);
    });
}

function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
}

export async function getAllDocs() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, "readonly").getAll();
        req.onsuccess = ({ target }) => resolve(target.result);
        req.onerror   = ({ target }) => reject(target.error);
    });
}

export async function getDoc(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, "readonly").get(id);
        req.onsuccess = ({ target }) => resolve(target.result ?? null);
        req.onerror   = ({ target }) => reject(target.error);
    });
}

export async function saveDoc(doc) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, "readwrite").put(doc);
        req.onsuccess = () => resolve();
        req.onerror   = ({ target }) => reject(target.error);
    });
}

export async function deleteDoc(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, "readwrite").delete(id);
        req.onsuccess = () => resolve();
        req.onerror   = ({ target }) => reject(target.error);
    });
}

export function newDocId() {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}