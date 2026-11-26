import dotenv from "dotenv";

dotenv.config();

// =====================================
// DEPLOYMENT ENVIRONMENT
// =====================================

const isProduction =
  process.env.NODE_ENV === "production";

const deploymentMode =
  process.env.DEPLOYMENT_MODE || "standard";

if (
  !["standard", "local-docker", "cloud"]
    .includes(deploymentMode)
) {
  throw new Error("Invalid deployment mode");
}

// =====================================
// LOCAL DOCKER CONFIGURATION
// =====================================

const isLocalDocker =
  deploymentMode === "local-docker";

const isCloud =
  deploymentMode === "cloud";

const requiresHTTPS =
  isProduction && !isLocalDocker;

// =====================================
// ALLOWED LOCAL DOCKER ORIGINS
// =====================================

const localDockerOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// =====================================
// PROXY CONFIGURATION
// =====================================

const trustedProxy =
  process.env.TRUSTED_PROXY?.trim();

// =====================================
// DEPLOYMENT CONFIGURATION
// =====================================

export const DEPLOYMENT_CONFIG = {
  isProduction,

  deploymentMode,

  isLocalDocker,

  isCloud,

  requiresHTTPS,

  localDockerOrigins,

  trustedProxy: trustedProxy || false,
} as const;

// =====================================
// VALIDATE DEPLOYMENT ORIGIN
// =====================================

export const isAllowedDeploymentOrigin = (
  origin: string
): boolean => {

  try {

    const parsed = new URL(origin);

    if (
      parsed.origin !== origin ||
      !["http:", "https:"]
        .includes(parsed.protocol)
    ) {
      return false;
    }

    if (isLocalDocker) {

      return localDockerOrigins.includes(
        origin
      );

    }

    if (requiresHTTPS) {

      return (
        parsed.protocol === "https:" &&
        ![
          "localhost",
          "127.0.0.1",
          "[::1]",
        ].includes(parsed.hostname)
      );

    }

    return true;

  } catch {

    return false;

  }
};