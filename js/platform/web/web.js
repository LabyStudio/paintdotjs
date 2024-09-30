let indexedDBInstance = null;

const indexedDBName = 'paint.js';
const indexedDBStoreName = 'fileSystem';

const createIndexedDBInstance = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(indexedDBName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(indexedDBStoreName)) {
                db.createObjectStore(indexedDBStoreName, {keyPath: 'fileName'});
            }
        };

        request.onblocked = (event) => {
            reject(new Error('IndexedDB blocked'));
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

const getObjectStore = async (mode) => {
    let instance = indexedDBInstance;
    if (instance === null || instance.closed) {
        instance = indexedDBInstance = await createIndexedDBInstance();
    }
    const transaction = instance.transaction([indexedDBStoreName], mode);
    return transaction.objectStore(indexedDBStoreName);
}