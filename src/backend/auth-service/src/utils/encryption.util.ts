/**
 * @fileoverview Implements secure cryptographic utilities for the Egyptian Map of Pi authentication service.
 * Provides enterprise-grade encryption, decryption, and hashing functions with enhanced security features
 * including PBKDF2 key derivation, authentication tag verification, and comprehensive error handling.
 * 
 * @version 1.0.0
 * @requires crypto ^19.0.0 (Node.js native)
 */

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, createHash } from 'crypto';
import { secret as jwtSecret } from '../config/jwt.config';

// Cryptographic constants with strong security parameters
const ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;
const HASH_ALGORITHM = 'sha512' as const;
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 16; // 128 bits for GCM mode
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag
const PBKDF2_ITERATIONS = 100000; // High iteration count for key derivation
const SALT_BOUNDS = { MIN: 16, MAX: 64 }; // Salt length bounds in bytes

/**
 * Custom error class for encryption-related errors with detailed messages
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(`Encryption Error: ${message}`);
    this.name = 'EncryptionError';
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM with PBKDF2 key derivation and authentication tag verification.
 * Implements the encryption strategy specified in Technical Specifications/7.2.2.
 * 
 * @param {string} data - The data to encrypt
 * @returns {string} Encrypted data in format: iv:authTag:encryptedData (base64 encoded)
 * @throws {EncryptionError} If encryption fails or input is invalid
 */
export function encrypt(data: string): string {
  try {
    // Input validation
    if (!data || typeof data !== 'string') {
      throw new EncryptionError('Invalid input data');
    }

    // Generate cryptographically secure random IV
    const iv = randomBytes(IV_LENGTH);

    // Derive encryption key using PBKDF2 with high iteration count
    const key = pbkdf2Sync(
      jwtSecret,
      'egyptian-map-of-pi-salt', // Static salt for key derivation
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      HASH_ALGORITHM
    );

    // Create cipher with derived key and IV
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Encrypt data
    const encryptedData = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    const result = Buffer.concat([iv, authTag, encryptedData])
      .toString('base64');

    // Zero sensitive data from memory
    key.fill(0);
    iv.fill(0);
    
    return result;
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Encryption failed'
    );
  }
}

/**
 * Decrypts data encrypted by the encrypt function with enhanced security validation.
 * Implements the encryption strategy specified in Technical Specifications/7.2.2.
 * 
 * @param {string} encryptedData - The encrypted data to decrypt (format: iv:authTag:encryptedData)
 * @returns {string} Original decrypted data
 * @throws {EncryptionError} If decryption fails, auth tag verification fails, or input is invalid
 */
export function decrypt(encryptedData: string): string {
  try {
    // Input validation
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new EncryptionError('Invalid encrypted data');
    }

    // Decode and split encrypted data
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Validate component lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError('Invalid encrypted data format');
    }

    // Derive decryption key using PBKDF2
    const key = pbkdf2Sync(
      jwtSecret,
      'egyptian-map-of-pi-salt',
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      HASH_ALGORITHM
    );

    // Create decipher
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]).toString('utf8');

    // Zero sensitive data from memory
    key.fill(0);
    iv.fill(0);

    return decrypted;
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Decryption failed'
    );
  }
}

/**
 * Creates a secure hash of data using SHA-512 with enhanced validation.
 * Implements security controls specified in Technical Specifications/7.3.3.
 * 
 * @param {string} data - The data to hash
 * @returns {string} SHA-512 hash of input data
 * @throws {EncryptionError} If hashing fails or input is invalid
 */
export function hash(data: string): string {
  try {
    // Input validation
    if (!data || typeof data !== 'string') {
      throw new EncryptionError('Invalid input data for hashing');
    }

    // Create hash with SHA-512
    const hash = createHash(HASH_ALGORITHM);
    hash.update(data, 'utf8');
    
    return hash.digest('hex');
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Hashing failed'
    );
  }
}

/**
 * Generates a cryptographically secure random salt with enhanced entropy.
 * Implements security controls specified in Technical Specifications/7.3.3.
 * 
 * @param {number} length - Length of salt in bytes (16-64 bytes)
 * @returns {string} Cryptographically secure random salt string (base64 encoded)
 * @throws {EncryptionError} If salt generation fails or length is invalid
 */
export function generateSalt(length: number = 32): string {
  try {
    // Validate length bounds
    if (length < SALT_BOUNDS.MIN || length > SALT_BOUNDS.MAX) {
      throw new EncryptionError(
        `Salt length must be between ${SALT_BOUNDS.MIN} and ${SALT_BOUNDS.MAX} bytes`
      );
    }

    // Generate random bytes with high entropy
    const salt = randomBytes(length);
    
    // Convert to URL-safe base64
    return salt.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    throw new EncryptionError(
      error instanceof Error ? error.message : 'Salt generation failed'
    );
  }
}