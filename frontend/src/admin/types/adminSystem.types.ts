export type ServiceStatus =
  "healthy" | "unavailable";

export interface ServiceHealth {
  status: ServiceStatus;
  latencyMs: number | null;
}

export interface SystemHealth {
  status: "healthy" | "degraded";

  services: {
    api: ServiceHealth;
    mongodb: ServiceHealth;
    redis: ServiceHealth;

    worker: {
      status: ServiceStatus;
      running: boolean;
    };
  };

  application: {
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
    deploymentMode: string;
    platform: string;
    architecture: string;
  };

  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };

  system: {
    logicalCPUs: number;
    totalMemoryMB: number;
    freeMemoryMB: number;
  };

  configuration: {
    primaryAIProvider: string;
    fallbackAIProvider: string;
    fallbackEnabled: boolean;
    groqConfigured: boolean;
    geminiConfigured: boolean;
    aiUsageTrackingEnabled: boolean;
    quotaEnabled: boolean;
    pricingConfigured: boolean;
  };

  checkedAt: string;
}