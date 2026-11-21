import type { LoadedWorkspace } from './supabase';
import { requestDeviceKey } from './deviceUnlock';
import type { WorkspaceData } from '../types';

export type OfflineDocument = {
  base: LoadedWorkspace;
  local: WorkspaceData;
  lastSyncedAt?: number;
};

type OfflineRecord = {
  scope: string;
  ownerId: string;
  generation: number;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  credentialId?: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
};

export type OfflineVault = {
  record: OfflineRecord;
  key: CryptoKey;
  document: OfflineDocument;
};

export class OfflineCopyChanged extends Error {}

const table = 'workspace';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('catlx-private-offline', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(table, { keyPath: 'scope' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readOfflineCopy(scope: string): Promise<OfflineRecord | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const read = db.transaction(table, 'readonly').objectStore(table).get(scope);
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
  } finally {
    db.close();
  }
}

async function changeRecord(scope: string, expected: OfflineRecord | undefined, replacement?: OfflineRecord) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(table, 'readwrite');
      const store = transaction.objectStore(table);
      let changed = false;
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(changed ? new OfflineCopyChanged() : transaction.error);
      const read = store.get(scope);
      read.onsuccess = () => {
        const current: OfflineRecord | undefined = read.result;
        if (current?.generation !== expected?.generation || current?.ownerId !== expected?.ownerId ||
            current?.salt.toString() !== expected?.salt.toString()) {
          changed = true;
          transaction.abort();
          return;
        }
        if (replacement) store.put(replacement);
        else store.delete(scope);
      };
    });
  } finally {
    db.close();
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(phrase: string, salt: Uint8Array<ArrayBuffer>) {
  const source = await crypto.subtle.importKey('raw', encoder.encode(phrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
    source, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function parameters(record: Omit<OfflineRecord, 'ciphertext'>): AesGcmParams {
  return {
    name: 'AES-GCM',
    iv: record.iv,
    additionalData: encoder.encode(JSON.stringify(record.credentialId
      ? [record.scope, record.ownerId, record.generation, [...record.credentialId]]
      : [record.scope, record.ownerId, record.generation])),
  };
}

async function persist(
  identity: Pick<OfflineRecord, 'scope' | 'ownerId' | 'salt' | 'credentialId'>,
  key: CryptoKey,
  document: OfflineDocument,
  previous?: OfflineRecord,
): Promise<OfflineVault> {
  const metadata = {
    ...identity,
    generation: (previous?.generation ?? 0) + 1,
    iv: crypto.getRandomValues(new Uint8Array(12)),
  };
  const ciphertext = await crypto.subtle.encrypt(parameters(metadata), key, encoder.encode(JSON.stringify(document)));
  const record = { ...metadata, ciphertext };
  await changeRecord(record.scope, previous, record);
  return { record, key, document };
}

type DeviceSetup = { credentialId: Uint8Array<ArrayBuffer>; salt: Uint8Array<ArrayBuffer>; key: CryptoKey };

export function createOfflineCopy(scope: string, ownerId: string, device: DeviceSetup, base: LoadedWorkspace) {
  const { credentialId, salt, key } = device;
  return persist({ scope, ownerId, salt, credentialId }, key, { base, local: base.payload, lastSyncedAt: Date.now() });
}

async function decryptCopy(record: OfflineRecord, key: CryptoKey): Promise<OfflineVault> {
  const plaintext = await crypto.subtle.decrypt(parameters(record), key, record.ciphertext);
  return { record, key, document: JSON.parse(decoder.decode(plaintext)) };
}

export async function unlockLegacyCopy(record: OfflineRecord, phrase: string): Promise<OfflineVault> {
  if (record.credentialId) throw new OfflineCopyChanged();
  return decryptCopy(record, await deriveKey(phrase, record.salt));
}

export async function unlockWithDevice(record: OfflineRecord): Promise<OfflineVault> {
  if (!record.credentialId) throw new OfflineCopyChanged();
  const key = await requestDeviceKey({ id: record.credentialId, salt: record.salt });
  const latest = await readOfflineCopy(record.scope);
  if (!latest || latest.ownerId !== record.ownerId) throw new OfflineCopyChanged();
  return decryptCopy(latest, key);
}

export function convertOfflineCopy(vault: OfflineVault, device: DeviceSetup) {
  const { scope, ownerId } = vault.record;
  const { credentialId, salt, key } = device;
  return persist({ scope, ownerId, salt, credentialId }, key, vault.document, vault.record);
}

export function updateOfflineCopy(vault: OfflineVault, document: OfflineDocument) {
  const { scope, ownerId, salt, credentialId } = vault.record;
  return persist({ scope, ownerId, salt, credentialId }, vault.key, document, vault.record);
}

export function forgetOfflineCopy(record: OfflineRecord) {
  return changeRecord(record.scope, record);
}
