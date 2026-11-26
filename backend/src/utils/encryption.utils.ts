import {

  randomBytes,

  createCipheriv,

  createDecipheriv,

} from "node:crypto";

// =====================================
// ENCRYPTION CONFIGURATION
// =====================================

const ALGORITHM = "aes-256-gcm";

const IV_LENGTH = 12;

const AUTH_TAG_LENGTH = 16;

const KEY_LENGTH = 32;

const VERSION = "v1";

// =====================================
// RETRIEVE ENCRYPTION KEY
// =====================================

const getEncryptionKey = (): Buffer => {

  const configuredKey =
    process.env.ADMIN_MFA_ENCRYPTION_KEY?.trim();

  if (
    !configuredKey ||
    !/^[a-fA-F0-9]{64}$/.test(configuredKey)
  ) {

    throw new Error(
      "Invalid administrator MFA encryption configuration"
    );

  }

  const key = Buffer.from(
    configuredKey,
    "hex"
  );

  if (key.length !== KEY_LENGTH) {

    throw new Error(
      "Invalid administrator MFA encryption key length"
    );

  }

  return key;

};

// =====================================
// ENCRYPT SENSITIVE VALUE
// =====================================

export const encryptSecret = (

  plaintext: string,

  context: string

): string => {

  if (!plaintext || !context) {

    throw new Error(
      "Encryption value and context are required"
    );

  }

  const key = getEncryptionKey();

  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(

    ALGORITHM,

    key,

    iv,

    {
      authTagLength: AUTH_TAG_LENGTH,
    }

  );

  // Bind encrypted data to its context.

  cipher.setAAD(
    Buffer.from(`${VERSION}:${context}`, "utf8")
  );

  const encrypted = Buffer.concat([

    cipher.update(plaintext, "utf8"),

    cipher.final(),

  ]);

  const authTag = cipher.getAuthTag();

  return [

    VERSION,

    iv.toString("hex"),

    authTag.toString("hex"),

    encrypted.toString("hex"),

  ].join(":");

};

// =====================================
// DECRYPT SENSITIVE VALUE
// =====================================

export const decryptSecret = (

  encryptedValue: string,

  context: string

): string => {

  if (!context) {

    throw new Error(
      "Decryption context is required"
    );

  }

  const parts = encryptedValue.split(":");

  if (parts.length !== 4) {

    throw new Error(
      "Invalid encrypted secret format"
    );

  }

  const [

    version,

    ivHex,

    authTagHex,

    ciphertextHex,

  ] = parts;

  if (version !== VERSION) {

    throw new Error(
      "Unsupported encryption version"
    );

  }

  if (

    !/^[a-f0-9]{24}$/i.test(ivHex) ||

    !/^[a-f0-9]{32}$/i.test(authTagHex) ||

    !/^(?:[a-f0-9]{2})+$/i.test(ciphertextHex)

  ) {

    throw new Error(
      "Invalid encrypted secret encoding"
    );

  }

  const key = getEncryptionKey();

  const iv = Buffer.from(ivHex, "hex");

  const authTag = Buffer.from(authTagHex, "hex");

  const ciphertext = Buffer.from(
    ciphertextHex,
    "hex"
  );

  try {

    const decipher = createDecipheriv(

      ALGORITHM,

      key,

      iv,

      {
        authTagLength: AUTH_TAG_LENGTH,
      }

    );

    decipher.setAAD(
      Buffer.from(`${VERSION}:${context}`, "utf8")
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([

      decipher.update(ciphertext),

      decipher.final(),

    ]);

    return decrypted.toString("utf8");

  } catch {

    throw new Error(
      "Unable to decrypt administrator MFA secret"
    );

  }

};