import type {
  RequestHandler,
} from "express";

// =====================================
// INPUT SECURITY LIMITS
// =====================================

const INPUT_SECURITY_CONFIG = {
  maxDepth: 15,

  maxObjectKeys: 100,

  maxArrayLength: 1000,

  maxTotalNodes: 10000,
} as const;

// =====================================
// UNSAFE PROPERTY NAMES
// =====================================

const UNSAFE_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

// =====================================
// INPUT SECURITY ERROR
// =====================================

class InputSecurityError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "InputSecurityError";
  }
}

// =====================================
// VALIDATE INPUT STRUCTURE
// =====================================

const validateInputStructure = (
  input: unknown
): void => {

  let totalNodes = 0;

  const inspect = (
    value: unknown,
    depth: number
  ): void => {

    totalNodes++;

    if (
      totalNodes >
      INPUT_SECURITY_CONFIG.maxTotalNodes
    ) {
      throw new InputSecurityError(
        "Request contains too many values"
      );
    }

    if (
      depth >
      INPUT_SECURITY_CONFIG.maxDepth
    ) {
      throw new InputSecurityError(
        "Request structure is too deeply nested"
      );
    }

    if (
      value === null ||
      typeof value !== "object"
    ) {
      return;
    }

    // Validate array size.

    if (Array.isArray(value)) {

      if (
        value.length >
        INPUT_SECURITY_CONFIG.maxArrayLength
      ) {
        throw new InputSecurityError(
          "Request contains an oversized array"
        );
      }

      for (const item of value) {
        inspect(item, depth + 1);
      }

      return;
    }

    // Validate object properties.

    const entries = Object.entries(value);

    if (
      entries.length >
      INPUT_SECURITY_CONFIG.maxObjectKeys
    ) {
      throw new InputSecurityError(
        "Request contains too many object properties"
      );
    }

    for (const [key, item] of entries) {

      // Prevent prototype pollution.

      if (UNSAFE_KEYS.has(key)) {
        throw new InputSecurityError(
          "Request contains an unsafe property"
        );
      }

      // Prevent MongoDB operator injection.

      if (
        key.startsWith("$") ||
        key.includes(".")
      ) {
        throw new InputSecurityError(
          "Request contains a prohibited property"
        );
      }

      inspect(item, depth + 1);
    }

  };

  inspect(input, 0);
};

// =====================================
// INPUT SECURITY MIDDLEWARE
// =====================================

export const inputSecurity:
  RequestHandler = (req, res, next) => {

    try {

      validateInputStructure(req.body);

      validateInputStructure(req.query);

      validateInputStructure(req.params);

      next();

    } catch (error) {

      if (error instanceof InputSecurityError) {

        res.status(400).json({
          success: false,

          message: error.message,
        });

        return;
      }

      next(error);
    }

  };