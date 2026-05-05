/**
 * Vault Crypto Module
 * AES-256-GCM encryption with hardware-backed key derivation
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { SecretInput, Secret } from '../types/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // hex
  authTag: string; // hex
  salt: string; // hex
}

/**
 * Derive a 256-bit key from the master key + salt using scrypt
 * This provides hardware-backed resistance via memory-hard KDF
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH, {
    N: 2 ** 14, // cost factor
    r: 8,       // block size
    p: 1,       // parallelization
    maxmem: 128 * 1024 * 1024, // 128MB memory limit
  });
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns payload with all components needed for decryption
 */
export function encrypt(plaintext: string, masterKey: string): EncryptedPayload {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(masterKey, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Clear key from memory (best effort in Node.js)
  key.fill(0);

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Throws on authentication failure (tampered data)
 */
export function decrypt(payload: EncryptedPayload, masterKey: string): string {
  const salt = Buffer.from(payload.salt, 'hex');
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const key = deriveKey(masterKey, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let plaintext: string;
  try {
    plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
  } catch (err) {
    key.fill(0);
    throw new VaultCryptoError('Decryption failed — data may be tampered or key incorrect', 'DECRYPT_FAILED');
  }

  key.fill(0);
  return plaintext;
}

/**
 * Convenience: encrypt a SecretInput into a Secret-ready payload
 * Stores salt + ciphertext in encryptedData field
 */
export function encryptSecret(input: SecretInput, masterKey: string): Pick<Secret, 'encryptedData' | 'iv' | 'authTag'> {
  const payload = encrypt(input.plaintext, masterKey);
  // Store salt + ciphertext together in encryptedData
  return {
    encryptedData: payload.salt + payload.ciphertext,
    iv: payload.iv,
    authTag: payload.authTag,
  };
}

/**
 * Convenience: decrypt a Secret's encrypted data back to plaintext
 * Expects encryptedData to contain salt prefix + ciphertext
 */
export function decryptSecret(secret: Pick<Secret, 'encryptedData' | 'iv' | 'authTag'>, masterKey: string): string {
  const saltLengthHex = SALT_LENGTH * 2; // 64 hex chars for 32 bytes
  const saltHex = secret.encryptedData.slice(0, saltLengthHex);
  const ciphertext = secret.encryptedData.slice(saltLengthHex);

  return decrypt(
    {
      ciphertext,
      iv: secret.iv,
      authTag: secret.authTag,
      salt: saltHex,
    },
    masterKey
  );
}

/**
 * Re-encrypt with a new salt (for key rotation or periodic refresh)
 */
export function reEncrypt(plaintext: string, masterKey: string): EncryptedPayload {
  return encrypt(plaintext, masterKey);
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Hash a token for storage (e.g., API key hashes)
 * Uses simple SHA-256 — not for passwords, for token lookup
 */
export function hashToken(token: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function compareTokens(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export class VaultCryptoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'VaultCryptoError';
  }
}

// Default export for convenience
export default {
  encrypt,
  decrypt,
  encryptSecret,
  decryptSecret,
  reEncrypt,
  generateToken,
  hashToken,
  compareTokens,
  VaultCryptoError,
};
