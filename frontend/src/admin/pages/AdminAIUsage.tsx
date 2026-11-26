import {
  useEffect,
  useState,
} from "react";

import {
  BrainCircuit,
  Coins,
  Layers3,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Timer,
  Repeat2,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import adminApi, {
  getAdminErrorMessage,
} from "../services/adminApi";

import AdminStatCard from "../components/AdminStatCard";

import type {
  AdminAPIResponse,
} from "../types/admin.types";

import type {
  AnalyticsDays,
  AIUsageAnalytics,
} from "../types/adminAnalytics.types";

const panelClass =
  "min-w-0 rounded-2xl border border-slate-800 bg-[#111522] p-5";

const inputClass =
  "rounded-xl border border-slate-700 bg-[#111522] " +
  "px-4 py-2.5 text-sm text-slate-300 outline-none";

const tooltipStyle = {
  backgroundColor: "#151a29",
  border: "1px solid #334155",
  borderRadius: "10px",
  color: "#e2e8f0",
};

const formatNumber = (
  value: number | null | undefined
): string =>
  value == null
    ? "N/A"
    : value.toLocaleString("en-US");

const formatPercent = (
  value: number | null
): string =>
  value == null
    ? "N/A"
    : `${value.toFixed(1)}%`;

const formatCost = (
  value: number | null
): string =>
  value == null
    ? "N/A"
    : `$${value.toFixed(6)}`;

const formatLabel = (value: string): string =>
  value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");

export default function AdminAIUsage() {

  const [days, setDays] =
    useState<AnalyticsDays>(30);

  const [provider, setProvider] =
    useState<"all" | "groq" | "gemini">("all");

  const [data, setData] =
    useState<AIUsageAnalytics | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  useEffect(() => {

    const controller = new AbortController();

    setLoading(true);
    setError("");
    setData(null);

    adminApi.get<AdminAPIResponse<AIUsageAnalytics>>(
      "/ai-usage",
      {
        params: {
          days,
          ...(provider !== "all"
            ? { provider }
            : {}),
        },

        signal: controller.signal,
      }
    )
      .then((response) => {
        if (!controller.signal.aborted) {
          setData(response.data.data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(getAdminErrorMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();

  }, [days, provider, refreshKey]);

  const summary = data?.summary;

  const trend = (data?.trend ?? []).map(
    (item) => ({
      date: new Date(item.date).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }
      ),

      tokens: item.totalTokens,
      attempts: item.totalAttempts,
      successful: item.successfulAttempts,
      failed: item.failedAttempts,
    })
  );

  const featureChart = [
    ...(data?.features ?? []),
  ]
    .sort(
      (a, b) =>
        b.totalAttempts - a.totalAttempts
    )
    .map((item) => ({
      name: formatLabel(item.feature),
      successful: item.successfulAttempts,
      failed: item.failedAttempts,
    }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* PAGE HEADER */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-violet-500/10 p-4">
            <BrainCircuit
              size={27}
              className="text-violet-400"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              AI Usage & Costs
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Monitor AI consumption, providers and generation costs.
            </p>
          </div>

        </div>

        <div className="flex flex-wrap gap-3">

          <select
            aria-label="Date range"
            value={days}
            onChange={(e) =>
              setDays(
                Number(e.target.value) as AnalyticsDays
              )
            }
            className={inputClass}
          >
            {[7, 14, 30, 60, 90].map((day) => (
              <option key={day} value={day}>
                Last {day} days
              </option>
            ))}
          </select>

          <select
            aria-label="AI provider"
            value={provider}
            onChange={(e) =>
              setProvider(
                e.target.value as
                  "all" | "groq" | "gemini"
              )
            }
            className={inputClass}
          >
            <option value="all">All Providers</option>
            <option value="groq">Groq</option>
            <option value="gemini">Gemini</option>
          </select>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            className={`${inputClass} flex items-center gap-2 disabled:opacity-50`}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

        </div>

      </section>

      {loading && (
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2
            size={36}
            className="animate-spin text-violet-400"
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300"
        >
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {!loading && data && summary && (
        <>

          {/* USAGE STATISTICS */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <AdminStatCard
              title="Provider Attempts"
              value={formatNumber(summary.totalAttempts)}
              description="Includes retries and fallback"
              icon={BrainCircuit}
              color="violet"
            />

            <AdminStatCard
              title="Measured Tokens"
              value={formatNumber(summary.totalTokens)}
              description={`Coverage: ${formatPercent(
                summary.tokenMeasurementCoverage
              )}`}
              icon={Layers3}
              color="cyan"
            />

            <AdminStatCard
              title="Estimated Cost"
              value={formatCost(summary.estimatedCostUsd)}
              description={`USD · Pricing coverage: ${formatPercent(
                summary.pricingCoverage
              )}`}
              icon={Coins}
              color="amber"
            />

            <AdminStatCard
              title="Success Rate"
              value={formatPercent(summary.successRate)}
              icon={CheckCircle2}
              color="emerald"
            />

            <AdminStatCard
              title="Successful Attempts"
              value={formatNumber(summary.successfulAttempts)}
              icon={CheckCircle2}
              color="emerald"
            />

            <AdminStatCard
              title="Failed Attempts"
              value={formatNumber(summary.failedAttempts)}
              icon={XCircle}
              color="red"
            />

            <AdminStatCard
              title="Fallback Attempts"
              value={formatNumber(summary.fallbackAttempts)}
              icon={Repeat2}
              color="blue"
            />

            <AdminStatCard
              title="Average AI Latency"
              value={
                summary.averageDurationMs == null
                  ? "N/A"
                  : `${summary.averageDurationMs} ms`
              }
              icon={Timer}
              color="violet"
            />

          </section>

          {/* PRICING NOTICE */}

          {summary.unpricedAttempts > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">

              <AlertCircle
                size={19}
                className="shrink-0"
              />

              <p>
                {formatNumber(summary.unpricedAttempts)}
                {" "}attempts do not have calculated pricing.
                Reported costs cover priced attempts only
                and do not represent the actual provider bill.
              </p>

            </div>
          )}

          {/* TOKEN CONSUMPTION CHART */}

          <section className={panelClass}>

            <h2 className="font-semibold text-white">
              AI Token Consumption
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Daily measured tokens, UTC
            </p>

            <div className="mt-6">

              {trend.length === 0 ? (
                <p className="py-20 text-center text-sm text-slate-500">
                  No recorded AI usage.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>

                  <AreaChart data={trend}>

                    <defs>
                      <linearGradient
                        id="aiTokenGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.4}
                        />

                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#263044"
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                    />

                    <Tooltip contentStyle={tooltipStyle} />

                    <Area
                      type="monotone"
                      dataKey="tokens"
                      name="Measured Tokens"
                      stroke="#a78bfa"
                      strokeWidth={2.5}
                      fill="url(#aiTokenGradient)"
                      connectNulls={false}
                    />

                  </AreaChart>

                </ResponsiveContainer>
              )}

            </div>

          </section>

          {/* PROVIDER CARDS */}

          <section>

            <h2 className="mb-4 font-semibold text-white">
              Provider Performance
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">

              {data.providers.map((item) => (

                <div
                  key={item.provider}
                  className={panelClass}
                >

                  <div className="flex items-center gap-3">

                    <div className="rounded-xl bg-violet-500/10 p-3">
                      <BrainCircuit
                        size={23}
                        className="text-violet-400"
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold capitalize text-white">
                        {item.provider}
                      </h3>

                      <p className="text-xs text-slate-500">
                        AI generation provider
                      </p>
                    </div>

                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">

                    {[
                      {
                        label: "Attempts",
                        value: formatNumber(item.totalAttempts),
                      },
                      {
                        label: "Measured Tokens",
                        value: formatNumber(item.totalTokens),
                      },
                      {
                        label: "Success Rate",
                        value: formatPercent(item.successRate),
                      },
                      {
                        label: "Estimated Cost",
                        value: formatCost(item.estimatedCostUsd),
                      },
                    ].map((metric) => (

                      <div
                        key={metric.label}
                        className="rounded-xl bg-slate-900/60 p-4"
                      >
                        <p className="text-xs text-slate-500">
                          {metric.label}
                        </p>

                        <p className="mt-2 text-lg font-semibold text-white">
                          {metric.value}
                        </p>
                      </div>

                    ))}

                  </div>

                </div>

              ))}

              {data.providers.length === 0 && (
                <p className="text-sm text-slate-500">
                  No provider usage recorded.
                </p>
              )}

            </div>

          </section>

          {/* FEATURE USAGE */}

          <section className={panelClass}>

            <h2 className="font-semibold text-white">
              AI Usage by Feature
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Successful and failed generation attempts
            </p>

            <div className="mt-6">

              {featureChart.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-500">
                  No feature usage recorded.
                </p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(
                    280,
                    featureChart.length * 45
                  )}
                >

                  <BarChart
                    data={featureChart}
                    layout="vertical"
                    margin={{ right: 20 }}
                  >

                    <CartesianGrid
                      stroke="#263044"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                      stroke="#64748b"
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{
                        fontSize: 11,
                        fill: "#94a3b8",
                      }}
                    />

                    <Tooltip contentStyle={tooltipStyle} />

                    <Bar
                      dataKey="successful"
                      name="Successful"
                      stackId="usage"
                      fill="#8b5cf6"
                    />

                    <Bar
                      dataKey="failed"
                      name="Failed"
                      stackId="usage"
                      fill="#f43f5e"
                    />

                  </BarChart>

                </ResponsiveContainer>
              )}

            </div>

          </section>

          {/* MODEL USAGE TABLE */}

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111522]">

            <div className="border-b border-slate-800 p-5">
              <h2 className="font-semibold text-white">
                AI Model Consumption
              </h2>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full whitespace-nowrap text-left text-sm">

                <thead className="bg-slate-900/60 text-xs text-slate-400">
                  <tr>
                    {[
                      "Provider",
                      "Model",
                      "Attempts",
                      "Input Tokens",
                      "Output Tokens",
                      "Total Tokens",
                      "Estimated Cost",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">

                  {data.models.map((item) => (

                    <tr
                      key={`${item.provider}:${item.model}`}
                      className="text-slate-300 hover:bg-slate-800/30"
                    >

                      <td className="px-5 py-4 capitalize">
                        {item.provider}
                      </td>

                      <td className="px-5 py-4 font-medium text-white">
                        {item.model}
                      </td>

                      <td className="px-5 py-4">
                        {formatNumber(item.totalAttempts)}
                      </td>

                      <td className="px-5 py-4">
                        {item.measuredAttempts === 0
                          ? "N/A"
                          : formatNumber(item.inputTokens)}
                      </td>

                      <td className="px-5 py-4">
                        {item.measuredAttempts === 0
                          ? "N/A"
                          : formatNumber(item.outputTokens)}
                      </td>

                      <td className="px-5 py-4">
                        {formatNumber(item.totalTokens)}
                      </td>

                      <td className="px-5 py-4 text-amber-400">
                        {formatCost(item.estimatedCostUsd)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            {data.models.length === 0 && (
              <p className="p-10 text-center text-sm text-slate-500">
                No model usage records.
              </p>
            )}

          </section>

          {/* COVERAGE DETAILS */}

          <section className={panelClass}>

            <div className="flex items-center gap-3">
              <Activity
                size={20}
                className="text-violet-400"
              />

              <h2 className="font-semibold text-white">
                Measurement Coverage
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {[
                ["Measured Attempts", summary.measuredAttempts],
                ["Unmeasured Attempts", summary.unmeasuredAttempts],
                ["Priced Attempts", summary.pricedAttempts],
                ["Unpriced Attempts", summary.unpricedAttempts],
              ].map(([label, value]) => (

                <div
                  key={label}
                  className="rounded-xl bg-slate-900/60 p-4"
                >
                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-xl font-semibold text-white">
                    {value}
                  </p>
                </div>

              ))}

            </div>

          </section>

          <p className="text-right text-xs text-slate-500">
            Records retained for {data.retentionDays} days
            {" · "}Updated: {
              new Date(data.generatedAt).toLocaleString()
            }
          </p>

        </>
      )}

    </div>
  );
}