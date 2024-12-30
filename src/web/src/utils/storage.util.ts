/**
 * @fileoverview Core utility functions for managing client-side storage operations
 * with encryption support in the Egyptian Map of Pi web application.
 * @version 1.0.0
 * @license MIT
 */

import CryptoJS from 'crypto-js'; // v4.1.1

// Global constants
const STORAGE_PREFIX = 'egyptian_map_pi_';
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

// Storage type enum
export enum StorageType {
  LOCAL = 'local',
  SESSION = 'session'
}

// Error types
class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Validates storage availability and encryption key if needed
 * @param storageType - Type of storage to validate
 * @param requiresEncryption - Whether encryption key is required
 * @throws {StorageError} If storage is unavailable or encryption key is missing
 */
const validateStorage = (storageType: StorageType, requiresEncryption: boolean = false): void => {
  try {
    const storage = storageType === StorageType.LOCAL ? localStorage : sessionStorage;
    const testKey = `${STORAGE_PREFIX}test`;
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
  } catch (error) {
    throw new StorageError(`${storageType} storage is not available`);
  }

  if (requiresEncryption && !ENCRYPTION_KEY) {
    throw new StorageError('Encryption key is not configured');
  }
};

/**
 * Validates storage size against maximum limit
 * @param value - Data to be stored
 * @throws {StorageError} If data size exceeds limit
 */
const validateSize = (value: string): void => {
  const size = new Blob([value]).size;
  if (size > MAX_STORAGE_SIZE) {
    throw new StorageError(`Data size (${size} bytes) exceeds maximum limit (${MAX_STORAGE_SIZE} bytes)`);
  }
};

/**
 * Encrypts data using AES-256
 * @param value - Data to encrypt
 * @returns Encrypted string
 */
const encrypt = (value: string): string => {
  if (!ENCRYPTION_KEY) throw new StorageError('Encryption key is not configured');
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
};

/**
 * Decrypts AES-256 encrypted data
 * @param value - Encrypted data
 * @returns Decrypted string
 */
const decrypt = (value: string): string => {
  if (!ENCRYPTION_KEY) throw new StorageError('Encryption key is not configured');
  const bytes = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Stores data in localStorage with optional encryption
 * @param key - Storage key
 * @param value - Data to store
 * @param encrypt - Whether to encrypt the data
 * @throws {StorageError} If storage operation fails
 */
export const setLocalStorage = (key: string, value: any, encrypt: boolean = false): void => {
  try {
    validateStorage(StorageType.LOCAL, encrypt);
    
    const jsonValue = JSON.stringify(value);
    validateSize(jsonValue);
    
    const storageValue = encrypt ? encrypt(jsonValue) : jsonValue;
    const storageKey = `${STORAGE_PREFIX}${key}`;
    
    localStorage.setItem(storageKey, storageValue);
  } catch (error) {
    throw new StorageError(`Failed to set localStorage: ${error.message}`);
  }
};

/**
 * Retrieves data from localStorage with optional decryption
 * @param key - Storage key
 * @param encrypted - Whether the data is encrypted
 * @returns Retrieved value or null if not found
 */
export const getLocalStorage = (key: string, encrypted: boolean = false): any | null => {
  try {
    validateStorage(StorageType.LOCAL, encrypted);
    
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const value = localStorage.getItem(storageKey);
    
    if (!value) return null;
    
    const jsonValue = encrypted ? decrypt(value) : value;
    return JSON.parse(jsonValue);
  } catch (error) {
    throw new StorageError(`Failed to get localStorage: ${error.message}`);
  }
};

/**
 * Stores data in sessionStorage with optional encryption
 * @param key - Storage key
 * @param value - Data to store
 * @param encrypt - Whether to encrypt the data
 * @throws {StorageError} If storage operation fails
 */
export const setSessionStorage = (key: string, value: any, encrypt: boolean = false): void => {
  try {
    validateStorage(StorageType.SESSION, encrypt);
    
    const jsonValue = JSON.stringify(value);
    validateSize(jsonValue);
    
    const storageValue = encrypt ? encrypt(jsonValue) : jsonValue;
    const storageKey = `${STORAGE_PREFIX}${key}`;
    
    sessionStorage.setItem(storageKey, storageValue);
  } catch (error) {
    throw new StorageError(`Failed to set sessionStorage: ${error.message}`);
  }
};

/**
 * Retrieves data from sessionStorage with optional decryption
 * @param key - Storage key
 * @param encrypted - Whether the data is encrypted
 * @returns Retrieved value or null if not found
 */
export const getSessionStorage = (key: string, encrypted: boolean = false): any | null => {
  try {
    validateStorage(StorageType.SESSION, encrypted);
    
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const value = sessionStorage.getItem(storageKey);
    
    if (!value) return null;
    
    const jsonValue = encrypted ? decrypt(value) : value;
    return JSON.parse(jsonValue);
  } catch (error) {
    throw new StorageError(`Failed to get sessionStorage: ${error.message}`);
  }
};

/**
 * Removes data from specified storage type
 * @param key - Storage key
 * @param storageType - Type of storage to remove from
 * @throws {StorageError} If removal operation fails
 */
export const removeFromStorage = (key: string, storageType: StorageType): void => {
  try {
    validateStorage(storageType);
    
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const storage = storageType === StorageType.LOCAL ? localStorage : sessionStorage;
    
    storage.removeItem(storageKey);
  } catch (error) {
    throw new StorageError(`Failed to remove from storage: ${error.message}`);
  }
};

/**
 * Clears all application data from specified storage type
 * @param storageType - Type of storage to clear
 * @throws {StorageError} If clearing operation fails
 */
export const clearStorage = (storageType: StorageType): void => {
  try {
    validateStorage(storageType);
    
    const storage = storageType === StorageType.LOCAL ? localStorage : sessionStorage;
    
    // Only clear items with application prefix
    Object.keys(storage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        storage.removeItem(key);
      }
    });
  } catch (error) {
    throw new StorageError(`Failed to clear storage: ${error.message}`);
  }
};