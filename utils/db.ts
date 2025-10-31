
export interface Creation {
    id?: number;
    timestamp: number;
    originalImageBase64: string;
    originalImageMimeType: string;
    toonifiedImageBase64: string;
    caption: string;
}

const DB_NAME = 'ToonNationDB';
const DB_VERSION = 1;
const STORE_NAME = 'creations';

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(true);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', request.error);
            reject(false);
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
};

export const addCreation = (creation: Omit<Creation, 'id' | 'timestamp'>): Promise<number> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('DB not initialized');
        }
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const newCreation: Creation = {
            ...creation,
            timestamp: Date.now(),
        }

        const request = store.add(newCreation);

        request.onsuccess = () => {
            resolve(request.result as number);
        };

        request.onerror = () => {
            console.error('Error adding creation:', request.error);
            reject(request.error);
        };
    });
};

export const getCreations = (): Promise<Creation[]> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('DB not initialized');
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by newest first
            resolve(request.result.reverse());
        };

        request.onerror = () => {
            console.error('Error getting creations:', request.error);
            reject(request.error);
        };
    });
};

export const deleteCreation = (id: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('DB not initialized');
        }
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve(true);
        };

        request.onerror = () => {
            console.error('Error deleting creation:', request.error);
            reject(false);
        };
    });
};
