import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  Server,
  Database,
  Layers3,
  Cpu,
  MemoryStick,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  adminSystemService,
} from "../services/adminSystem.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import AdminStatCard from "../components/AdminStatCard";

import type {
  SystemHealth,
  ServiceStatus,
} from "../types/adminSystem.types";

const panelClass =
  "rounded-2xl border border-slate-800 bg-[#111522] p-5";

const formatUptime = (
  seconds: number
): string => {

  const days = Math.floor(seconds / 86400);

  const hours = Math.floor(
    (seconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  return `${days}d ${hours}h ${minutes}m`;
};

function HealthCard({
  title,
  status,
  icon: Icon,
  latency,
  description,
}: {
  title: string;
  status: ServiceStatus;
  icon: LucideIcon;
  latency?: number | null;
  description: string;
}) {

  const healthy = status === "healthy";

  return (

    <div className={panelClass}>

      <div className="flex items-center justify-between gap-3">

        <div className={`rounded-xl p-3 ${
          healthy
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        }`}>

          <Icon size={25} />

        </div>

        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
          healthy
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        }`}>

          {healthy
            ? <CheckCircle2 size={14} />
            : <XCircle size={14} />}

          {healthy
            ? "Operational"
            : "Unavailable"}

        </span>

      </div>

      <h3 className="mt-5 font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

      {latency != null && (

        <p className="mt-4 text-sm font-medium text-slate-300">
          Ping latency: {latency} ms
        </p>

      )}

    </div>
  );
}

function ConfigurationRow({
  label,
  enabled,
  trueLabel = "Enabled",
  falseLabel = "Disabled",
}: {
  label: string;
  enabled: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {

  return (

    <div className="flex items-center justify-between gap-4 border-b border-slate-800 py-4 last:border-b-0">

      <span className="text-sm text-slate-300">
        {label}
      </span>

      <span className={`flex items-center gap-2 text-xs ${
        enabled
          ? "text-emerald-400"
          : "text-amber-400"
      }`}>

        {enabled
          ? <CheckCircle2 size={15} />
          : <AlertTriangle size={15} />}

        {enabled ? trueLabel : falseLabel}

      </span>

    </div>
  );
}

export default function AdminSystemHealth() {

  const [data, setData] =
    useState<SystemHealth | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [autoRefresh, setAutoRefresh] =
    useState(true);

  const [refreshKey, setRefreshKey] =
    useState(0);

  useEffect(() => {

    const controller = new AbortController();

    let running = false;

    const loadHealth = async () => {

      if (
        running ||
        controller.signal.aborted
      ) return;

      running = true;

      setLoading(true);
      setError("");

      try {

        const result =
          await adminSystemService.getHealth(
            controller.signal
          );

        if (!controller.signal.aborted) {
          setData(result);
        }

      } catch (err) {

        if (!controller.signal.aborted) {

          setError(
            getAdminErrorMessage(err)
          );

        }

      } finally {

        running = false;

        if (!controller.signal.aborted) {
          setLoading(false);
        }

      }
    };

    void loadHealth();

    const timer = autoRefresh

      ? window.setInterval(() => {
          if (!document.hidden) {
            void loadHealth();
          }
        }, 30000)

      : undefined;

    return () => {
      controller.abort();

      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };

  }, [autoRefresh, refreshKey]);

  const heapPercentage =
    data && data.memory.heapTotalMB > 0

      ? Math.min(
          100,
          data.memory.heapUsedMB /
          data.memory.heapTotalMB * 100
        )

      : 0;

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* HEADER */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-emerald-500/10 p-4">
            <Activity
              size={27}
              className="text-emerald-400"
            />
          </div>

          <div>

            <h1 className="text-2xl font-bold text-white">
              System Health
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Monitor platform infrastructure and service availability.
            </p>

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-xs text-slate-300">

            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) =>
                setAutoRefresh(e.target.checked)
              }
              className="accent-violet-500"
            />

            Auto-refresh (30s)

          </label>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-50"
          >

            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            Refresh

          </button>

        </div>

      </section>

      {error && (

        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400"
        >

          <AlertTriangle size={19} />

          {error}

          {data && " — Showing the last successful snapshot."}

        </div>

      )}

      {loading && !data && (

        <div className="flex min-h-[55vh] items-center justify-center">

          <Loader2
            size={36}
            className="animate-spin text-violet-400"
          />

        </div>

      )}

      {data && (

        <>

          {/* OVERALL STATUS */}

          <section className={`rounded-2xl border p-6 ${
            error
              ? "border-amber-500/20 bg-amber-500/5"
              : data.status === "healthy"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-amber-500/20 bg-amber-500/5"
          }`}>

            <div className="flex items-center gap-4">

              {!error && data.status === "healthy" ? (

                <CheckCircle2
                  size={36}
                  className="text-emerald-400"
                />

              ) : (

                <AlertTriangle
                  size={36}
                  className="text-amber-400"
                />

              )}

              <div>

                <h2 className="text-lg font-semibold text-white">

                  {error
                    ? "Current Health Unknown"
                    : data.status === "healthy"
                      ? "Core Services Operational"
                      : "System Degraded"}

                </h2>

                <p className="mt-1 text-sm text-slate-400">

                  Last checked: {
                    new Date(data.checkedAt).toLocaleString()
                  }

                </p>

              </div>

            </div>

          </section>

          {/* SERVICE HEALTH */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <HealthCard
              title="Backend API"
              icon={Server}
              status={data.services.api.status}
              description="Express application responding"
            />

            <HealthCard
              title="MongoDB"
              icon={Database}
              status={data.services.mongodb.status}
              latency={data.services.mongodb.latencyMs}
              description="Database connectivity"
            />

            <HealthCard
              title="Redis"
              icon={Layers3}
              status={data.services.redis.status}
              latency={data.services.redis.latencyMs}
              description="Cache and quota infrastructure"
            />

            <HealthCard
              title="Background Worker"
              icon={Activity}
              status={data.services.worker.status}
              description="BullMQ local worker running state"
            />

          </section>

          {/* RESOURCE USAGE */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <AdminStatCard
              title="Server Uptime"
              value={formatUptime(
                data.application.uptimeSeconds
              )}
              icon={Clock3}
              color="emerald"
            />

            <AdminStatCard
              title="Process Memory"
              value={`${data.memory.rssMB} MB`}
              description="Resident set size"
              icon={MemoryStick}
              color="violet"
            />

            <AdminStatCard
              title="JavaScript Heap"
              value={`${data.memory.heapUsedMB} MB`}
              description="Currently used heap"
              icon={Layers3}
              color="blue"
            />

            <AdminStatCard
              title="Logical CPUs"
              value={data.system.logicalCPUs}
              description="Available parallelism"
              icon={Cpu}
              color="cyan"
            />

          </section>

          <div className="grid gap-5 xl:grid-cols-2">

            {/* APPLICATION INFORMATION */}

            <section className={panelClass}>

              <div className="flex items-center gap-3">

                <Server
                  size={21}
                  className="text-violet-400"
                />

                <h2 className="font-semibold text-white">
                  Application Information
                </h2>

              </div>

              <div className="mt-4">

                {[
                  ["Node.js Version", data.application.nodeVersion],
                  ["Environment", data.application.environment],
                  ["Deployment Mode", data.application.deploymentMode],
                  ["Platform", data.application.platform],
                  ["Architecture", data.application.architecture],
                  ["External Memory", `${data.memory.externalMB} MB`],
                ].map(([label, value]) => (

                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-slate-800 py-4 text-sm last:border-b-0"
                  >

                    <span className="text-slate-500">
                      {label}
                    </span>

                    <span className="font-medium text-slate-200">
                      {value}
                    </span>

                  </div>

                ))}

              </div>

            </section>

            {/* MEMORY INFORMATION */}

            <section className={panelClass}>

              <div className="flex items-center gap-3">

                <MemoryStick
                  size={21}
                  className="text-violet-400"
                />

                <h2 className="font-semibold text-white">
                  Memory Information
                </h2>

              </div>

              <div className="mt-6 space-y-3">

                <div className="flex justify-between text-sm">

                  <span className="text-slate-400">
                    JavaScript Heap Utilization
                  </span>

                  <span className="text-slate-200">
                    {heapPercentage.toFixed(1)}%
                  </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: `${heapPercentage}%`,
                    }}
                  />

                </div>

                <p className="text-xs text-slate-500">

                  {data.memory.heapUsedMB} MB used
                  {" / "}
                  {data.memory.heapTotalMB} MB allocated

                </p>

              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-slate-900/60 p-4">

                  <p className="text-xs text-slate-500">
                    OS Total Memory
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {data.system.totalMemoryMB} MB
                  </p>

                </div>

                <div className="rounded-xl bg-slate-900/60 p-4">

                  <p className="text-xs text-slate-500">
                    OS Free Memory
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {data.system.freeMemoryMB} MB
                  </p>

                </div>

              </div>

              <p className="mt-5 text-xs leading-relaxed text-slate-500">
                OS memory figures may represent host memory rather
                than Docker container limits. Heap utilization is
                not total server memory utilization.
              </p>

            </section>

          </div>

          {/* AI CONFIGURATION */}

          <section className={panelClass}>

            <div className="flex items-center gap-3">

              <BrainCircuit
                size={22}
                className="text-violet-400"
              />

              <h2 className="font-semibold text-white">
                AI Provider Configuration
              </h2>

            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-900/60 p-4">

                <p className="text-xs text-slate-500">
                  Primary Provider
                </p>

                <p className="mt-2 font-semibold capitalize text-white">
                  {data.configuration.primaryAIProvider}
                </p>

              </div>

              <div className="rounded-xl bg-slate-900/60 p-4">

                <p className="text-xs text-slate-500">
                  Fallback Provider
                </p>

                <p className="mt-2 font-semibold capitalize text-white">
                  {data.configuration.fallbackAIProvider}
                </p>

              </div>

            </div>

            <div className="mt-4">

              <ConfigurationRow
                label="Groq API Key"
                enabled={data.configuration.groqConfigured}
                trueLabel="Configured"
                falseLabel="Not configured"
              />

              <ConfigurationRow
                label="Gemini API Key"
                enabled={data.configuration.geminiConfigured}
                trueLabel="Configured"
                falseLabel="Not configured"
              />

              <ConfigurationRow
                label="Automatic Provider Fallback"
                enabled={data.configuration.fallbackEnabled}
              />

              <ConfigurationRow
                label="AI Usage Tracking"
                enabled={data.configuration.aiUsageTrackingEnabled}
              />

              <ConfigurationRow
                label="Daily AI Quota Enforcement"
                enabled={data.configuration.quotaEnabled}
              />

              <ConfigurationRow
                label="Model Pricing Configuration"
                enabled={data.configuration.pricingConfigured}
                trueLabel="Present"
                falseLabel="Not configured"
              />

            </div>

          </section>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#111522] p-4 text-xs leading-relaxed text-slate-500">

            <ShieldCheck
              size={19}
              className="shrink-0 text-emerald-400"
            />

            Monitoring is restricted to MFA-authenticated
            administrators. API keys and connection credentials
            are never included in health responses. Provider
            configuration does not guarantee provider availability.

          </div>

        </>

      )}

    </div>
  );
}