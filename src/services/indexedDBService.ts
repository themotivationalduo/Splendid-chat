import { Message, Chat, UserStatus } from '../types';

const DB_NAME = 'SplendidLocalChatDB';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Messages Store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('chatId', 'chatId', { unique: false });
        msgStore.createIndex('createdAt', 'createdAt', { unique: false });
        msgStore.createIndex('senderId', 'senderId', { unique: false });
      }

      // Chats Store
      if (!db.objectStoreNames.contains('chats')) {
        const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Media Blobs Store (for PeerJS media or local file caching - ZERO Firebase storage)
      if (!db.objectStoreNames.contains('mediaBlobs')) {
        db.createObjectStore('mediaBlobs', { keyPath: 'id' });
      }

      // Statuses Store (for local device status persistence)
      if (!db.objectStoreNames.contains('statuses')) {
        const statusStore = db.createObjectStore('statuses', { keyPath: 'id' });
        statusStore.createIndex('userId', 'userId', { unique: false });
        statusStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

// ----------------- MESSAGES IN INDEXEDDB ----------------- //

export async function saveMessageToIndexedDB(msg: Message): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    store.put(msg);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save message to IndexedDB:', err);
  }
}

export async function saveMessagesBulkToIndexedDB(msgs: Message[]): Promise<void> {
  if (!msgs.length) return;
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    for (const msg of msgs) {
      store.put(msg);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save messages bulk to IndexedDB:', err);
  }
}

export async function getMessagesFromIndexedDB(chatId: string): Promise<Message[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('chatId');
    const request = index.getAll(chatId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const msgs: Message[] = request.result || [];
        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        resolve(msgs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get messages from IndexedDB:', err);
    return [];
  }
}

export async function updateMessageInIndexedDB(msgId: string, updates: Partial<Message>): Promise<Message | null> {
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const getReq = store.get(msgId);
    
    return new Promise((resolve, reject) => {
      getReq.onsuccess = () => {
        const existing = getReq.result as Message | undefined;
        if (!existing) {
          resolve(null);
          return;
        }
        const updated: Message = {
          ...existing,
          ...updates
        };
        store.put(updated);
        tx.oncomplete = () => resolve(updated);
        tx.onerror = () => reject(tx.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('Failed to update message in IndexedDB:', err);
    return null;
  }
}

export async function deleteMessageFromIndexedDB(msgId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    store.delete(msgId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete message from IndexedDB:', err);
  }
}

export async function clearChatMessagesFromIndexedDB(chatId: string): Promise<void> {
  try {
    const msgs = await getMessagesFromIndexedDB(chatId);
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    for (const msg of msgs) {
      store.delete(msg.id);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to clear chat messages from IndexedDB:', err);
  }
}

// ----------------- CHATS IN INDEXEDDB ----------------- //

export async function saveChatToIndexedDB(chat: Chat): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    store.put(chat);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save chat to IndexedDB:', err);
  }
}

export async function getChatsFromIndexedDB(): Promise<Chat[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('chats', 'readonly');
    const store = tx.objectStore('chats');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const chats: Chat[] = request.result || [];
        chats.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(chats);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get chats from IndexedDB:', err);
    return [];
  }
}

export async function deleteChatFromIndexedDB(chatId: string): Promise<void> {
  try {
    await clearChatMessagesFromIndexedDB(chatId);
    const db = await getDB();
    const tx = db.transaction('chats', 'readwrite');
    const store = tx.objectStore('chats');
    store.delete(chatId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete chat from IndexedDB:', err);
  }
}

// ----------------- MEDIA BLOBS IN INDEXEDDB ----------------- //

export async function saveMediaBlobToIndexedDB(id: string, data: Blob | string, mimeType?: string): Promise<string> {
  try {
    const db = await getDB();
    const tx = db.transaction('mediaBlobs', 'readwrite');
    const store = tx.objectStore('mediaBlobs');
    
    store.put({ id, data, mimeType, timestamp: Date.now() });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (data instanceof Blob) {
      return URL.createObjectURL(data);
    }
    return data;
  } catch (err) {
    console.error('Failed to save media blob to IndexedDB:', err);
    if (data instanceof Blob) {
      return URL.createObjectURL(data);
    }
    return data;
  }
}

export async function getMediaBlobFromIndexedDB(id: string): Promise<string | null> {
  try {
    const db = await getDB();
    const tx = db.transaction('mediaBlobs', 'readonly');
    const store = tx.objectStore('mediaBlobs');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        if (result.data instanceof Blob) {
          resolve(URL.createObjectURL(result.data));
        } else {
          resolve(result.data);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get media blob from IndexedDB:', err);
    return null;
  }
}

// ----------------- STATUSES IN INDEXEDDB ----------------- //

export async function saveStatusToIndexedDB(status: UserStatus): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('statuses', 'readwrite');
    const store = tx.objectStore('statuses');
    store.put(status);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save status to IndexedDB:', err);
  }
}

export async function getStatusesFromIndexedDB(): Promise<UserStatus[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('statuses', 'readonly');
    const store = tx.objectStore('statuses');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const statuses: UserStatus[] = request.result || [];
        statuses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(statuses);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get statuses from IndexedDB:', err);
    return [];
  }
}

export async function deleteStatusFromIndexedDB(statusId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('statuses', 'readwrite');
    const store = tx.objectStore('statuses');
    store.delete(statusId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete status from IndexedDB:', err);
  }
}
