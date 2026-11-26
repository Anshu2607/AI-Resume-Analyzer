import {
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Activity,
  BrainCircuit,
  Coins,
  Timer,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  MessagesSquare,
  Layers3,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

import {
  adminAnalyticsService,
} from "../services/adminAnalytics.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import AdminStatCard from "../components/AdminStatCard";

import type {
  AnalyticsDays,
  AdminDashboardData,
} from "../types/adminAnalytics.types";

const CHART_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#f43f5e",
  "#6366f1",
  "#ec4899",
];

const numberFormat =
  new Intl.NumberFormat("en-US");

const formatNumber = (
  value: number | null | undefined
): string => {

  if (value == null) {
    return "N/A";
  }

  return numberFormat.format(value);
};

const formatPercent = (
  value: number | null | undefined
): string => {

  return value == null
    ? "N/A"
    : `${value.toFixed(1)}%`;
};

const formatCost = (
  value: number | null | undefined
): string => {

  return value == null
    ? "N/A"
    : `$${value.toFixed(6)}`;
};

const formatDate = (
  value: string
): string => {

  return new Date(value).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  );
};

const tooltipStyle = {
  backgroundColor: "#151a29",
  border: "1px solid #334155",
  borderRadius: "10px",
  color: "#e2e8f0",
};

// =====================================
// REUSABLE CHART PANEL
// =====================================

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {

  return (

    <section className="min-w-0 rounded-2xl border border-slate-800 bg-[#111522] p-5">

      <h2 className="font-semibold text-white">

        {title}

      </h2>

      {description && (

        <p className="mt-1 text-xs text-slate-500">

          {description}

        </p>

      )}

      <div className="mt-6">

        {children}

      </div>

    </section>
  );
}

function EmptyChart() {

  return (

    <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-slate-500">

      <Activity size={28} />

      <p className="text-sm">

        No recorded activity for this period.

      </p>

    </div>
  );
}

// =====================================
// MAIN DASHBOARD
// =====================================

export default function AdminDashboard() {

  const { user } = useAdminAuth();

  const [days, setDays] =
    useState<AnalyticsDays>(30);

  const [data, setData] =
    useState<AdminDashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // ===================================
  // FETCH DASHBOARD DATA
  // ===================================

  useEffect(() => {

    const controller =
      new AbortController();

    setLoading(true);

    setError("");

    adminAnalyticsService
      .getDashboard(
        days,
        controller.signal
      )
      .then((result) => {

        if (!controller.signal.aborted) {
          setData(result);
        }

      })
      .catch((err) => {

        if (!controller.signal.aborted) {

          setError(
            getAdminErrorMessage(err)
          );

        }

      })
      .finally(() => {

        if (!controller.signal.aborted) {
          setLoading(false);
        }

      });

    return () => {
      controller.abort();
    };

  }, [days, refreshKey]);

  // ===================================
  // LOADING AND ERROR STATES
  // ===================================

  if (loading && !data) {

    return (

      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4">

        <Loader2
          size={36}
          className="animate-spin text-violet-400"
        />

        <p className="text-sm text-slate-400">

          Loading platform analytics...

        </p>

      </div>

    );
  }

  if (!data) {

    return (

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">

        <AlertCircle
          size={30}
          className="mx-auto mb-4 text-red-400"
        />

        <p className="text-sm text-red-300">

          {error || "Unable to load dashboard."}

        </p>

        <button
          type="button"
          onClick={() =>
            setRefreshKey((value) => value + 1)
          }
          className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm text-white"
        >

          Try Again

        </button>

      </div>
    );
  }

  const {
    overview,
    registrations,
    engagement,
    features,
    aiUsage,
  } = data;

  const registrationChart =
    registrations.trend.map((item) => ({
      date: formatDate(item.date),
      registrations: item.count,
    }));

  const engagementChart =
    engagement.trend.map((item) => ({
      date: formatDate(item.date),
      activeUsers: item.count,
    }));

  const featureChart =
    [...features.features]
      .filter((item) => item.totalRequests > 0)
      .sort(
        (a, b) =>
          b.totalRequests - a.totalRequests
      )
      .slice(0, 8)
      .map((item) => ({
        name: item.label,
        successful: item.successfulRequests,
        failed: item.failedRequests,
      }));

  const providerChart =
    aiUsage.providers
      .filter((item) => item.totalAttempts > 0)
      .map((item) => ({
        name: item.provider.toUpperCase(),
        value: item.totalAttempts,
      }));

  const accountChart = [
    {
      name: "Active accounts",
      value: overview.users.accounts.enabledAccounts,
      color: "#10b981",
    },
    {
      name: "Suspended accounts",
      value: overview.users.accounts.suspendedAccounts,
      color: "#f43f5e",
    },
  ].filter((item) => item.value > 0);

  const displayedDays =
    overview.dateRange.days;

  // ===================================
  // DASHBOARD INTERFACE
  // ===================================

  return (

    <div className="mx-auto max-w-[1600px] space-y-7">

      {/* WELCOME AND CONTROLS */}

      <section className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-400">

            <ShieldCheck size={15} />

            ADMINISTRATION OVERVIEW

          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">

            Welcome back, {user?.name?.split(" ")[0] || "Admin"}

          </h1>

          <p className="mt-2 text-sm text-slate-400">

            Monitor CareerLens AI performance and user activity.

          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <select
            value={days}
            onChange={(event) =>
              setDays(
                Number(event.target.value) as AnalyticsDays
              )
            }
            className="rounded-xl border border-slate-700 bg-[#111522] px-4 py-2.5 text-sm text-slate-300 outline-none"
          >

            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>

          </select>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111522] px-4 py-2.5 text-sm text-slate-300 hover:border-violet-500/40 disabled:opacity-50"
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

        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">

          <AlertCircle size={18} />

          {error}. Showing previously loaded data.

        </div>

      )}

      {/* USER STATISTICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <AdminStatCard
          title="Total Registered Users"
          value={formatNumber(
            overview.users.accounts.totalUsers
          )}
          description="All existing regular user accounts"
          icon={Users}
          color="violet"
        />

        <AdminStatCard
          title="Daily Active Users"
          value={formatNumber(
            overview.users.engagement.dailyActiveUsers
          )}
          description="Active today, UTC"
          icon={UserCheck}
          color="emerald"
        />

        <AdminStatCard
          title="New Registrations"
          value={formatNumber(
            overview.users.registrations.selectedPeriod
          )}
          description={`During the last ${displayedDays} days`}
          icon={UserPlus}
          color="blue"
        />

        <AdminStatCard
          title="Suspended Accounts"
          value={formatNumber(
            overview.users.accounts.suspendedAccounts
          )}
          description="Currently restricted accounts"
          icon={UserX}
          color="red"
        />

      </section>

      {/* PLATFORM AND AI STATISTICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <AdminStatCard
          title="AI Provider Attempts"
          value={formatNumber(
            aiUsage.summary.totalAttempts
          )}
          description="Includes retries and fallback attempts"
          icon={BrainCircuit}
          color="violet"
        />

        <AdminStatCard
          title="Measured AI Tokens"
          value={formatNumber(
            aiUsage.summary.totalTokens
          )}
          description={`Measurement coverage: ${
            formatPercent(
              aiUsage.summary.tokenMeasurementCoverage
            )
          }`}
          icon={Layers3}
          color="cyan"
        />

        <AdminStatCard
          title="Estimated AI Cost"
          value={formatCost(
            aiUsage.summary.estimatedCostUsd
          )}
          description={`USD · Pricing coverage: ${
            formatPercent(
              aiUsage.summary.pricingCoverage
            )
          }`}
          icon={Coins}
          color="amber"
        />

        <AdminStatCard
          title="Average Response Time"
          value={
            overview.performance.averageDurationMs == null
              ? "N/A"
              : `${Math.round(
                  overview.performance.averageDurationMs
                )} ms`
          }
          description="Tracked platform API requests"
          icon={Timer}
          color="emerald"
        />

      </section>

      {/* REGISTRATION AND ENGAGEMENT */}

      <section className="grid gap-5 xl:grid-cols-2">

        <ChartPanel
          title="User Growth"
          description="Daily new account registrations"
        >

          <ResponsiveContainer
            width="100%"
            height={280}
          >

            <AreaChart data={registrationChart}>

              <defs>

                <linearGradient
                  id="registrationGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="#8b5cf6"
                    stopOpacity={0.35}
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
                tickLine={false}
                minTickGap={25}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={tooltipStyle}
              />

              <Area
                type="monotone"
                dataKey="registrations"
                stroke="#a78bfa"
                strokeWidth={2.5}
                fill="url(#registrationGradient)"
                name="Registrations"
              />

            </AreaChart>

          </ResponsiveContainer>

        </ChartPanel>

        <ChartPanel
          title="User Engagement"
          description="Unique users with successful tracked activity"
        >

          <ResponsiveContainer
            width="100%"
            height={280}
          >

            <AreaChart data={engagementChart}>

              <defs>

                <linearGradient
                  id="engagementGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >

                  <stop
                    offset="0%"
                    stopColor="#10b981"
                    stopOpacity={0.3}
                  />

                  <stop
                    offset="100%"
                    stopColor="#10b981"
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
                tickLine={false}
                minTickGap={25}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip
                contentStyle={tooltipStyle}
              />

              <Area
                type="monotone"
                dataKey="activeUsers"
                name="Active Users"
                stroke="#34d399"
                strokeWidth={2.5}
                fill="url(#engagementGradient)"
              />

            </AreaChart>

          </ResponsiveContainer>

        </ChartPanel>

      </section>

      {/* FEATURE USAGE */}

      <ChartPanel
        title="Platform Feature Usage"
        description="Top eight features by recorded requests"
      >

        {featureChart.length === 0 ? (

          <EmptyChart />

        ) : (

          <ResponsiveContainer
            width="100%"
            height={360}
          >

            <BarChart
              data={featureChart}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >

              <CartesianGrid
                stroke="#263044"
                strokeDasharray="3 3"
                horizontal={false}
              />

              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#ffffff05" }}
              />

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

        <div className="flex justify-center gap-6 text-xs text-slate-400">

          <span className="flex items-center gap-2">

            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />

            Successful

          </span>

          <span className="flex items-center gap-2">

            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />

            Failed

          </span>

        </div>

      </ChartPanel>

      {/* ACCOUNT AND PROVIDER DISTRIBUTION */}

      <section className="grid gap-5 xl:grid-cols-2">

        <ChartPanel
          title="Account Distribution"
          description="Current registered account status"
        >

          {accountChart.length === 0 ? (

            <EmptyChart />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={250}
            >

              <PieChart>

                <Pie
                  data={accountChart}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="none"
                >

                  {accountChart.map((item) => (

                    <Cell
                      key={item.name}
                      fill={item.color}
                    />

                  ))}

                </Pie>

                <Tooltip
                  contentStyle={tooltipStyle}
                />

              </PieChart>

            </ResponsiveContainer>

          )}

          <div className="space-y-3">

            {accountChart.map((item) => (

              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-3 text-sm"
              >

                <span className="flex items-center gap-2 text-slate-400">

                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />

                  {item.name}

                </span>

                <span className="font-semibold text-white">

                  {formatNumber(item.value)}

                </span>

              </div>

            ))}

          </div>

        </ChartPanel>

        <ChartPanel
          title="AI Provider Distribution"
          description="Share of recorded generation attempts"
        >

          {providerChart.length === 0 ? (

            <EmptyChart />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={250}
            >

              <PieChart>

                <Pie
                  data={providerChart}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="none"
                >

                  {providerChart.map((item, index) => (

                    <Cell
                      key={item.name}
                      fill={
                        CHART_COLORS[
                          index % CHART_COLORS.length
                        ]
                      }
                    />

                  ))}

                </Pie>

                <Tooltip
                  contentStyle={tooltipStyle}
                />

              </PieChart>

            </ResponsiveContainer>

          )}

          <div className="space-y-3">

            {providerChart.map((item, index) => (

              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-3 text-sm"
              >

                <span className="flex items-center gap-2 text-slate-400">

                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[
                          index % CHART_COLORS.length
                        ],
                    }}
                  />

                  {item.name}

                </span>

                <span className="font-semibold text-white">

                  {formatNumber(item.value)}

                </span>

              </div>

            ))}

          </div>

        </ChartPanel>

      </section>

      {/* INTERVIEW AND PERFORMANCE METRICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <AdminStatCard
          title="API Success Rate"
          value={formatPercent(
            overview.performance.successRate
          )}
          description="Tracked platform API requests"
          icon={CheckCircle2}
          color="emerald"
        />

        <AdminStatCard
          title="AI Success Rate"
          value={formatPercent(
            aiUsage.summary.successRate
          )}
          description="Successful generation attempts"
          icon={Activity}
          color="blue"
        />

        <AdminStatCard
          title="AI Interviews"
          value={formatNumber(
            overview.interviews.totalInterviews
          )}
          description={`${
            overview.interviews.completedInterviews
          } completed interviews`}
          icon={MessagesSquare}
          color="violet"
        />

        <AdminStatCard
          title="Background Jobs Completed"
          value={formatNumber(
            overview.backgroundJobs.completedJobs
          )}
          description={`${
            overview.backgroundJobs.failedJobs
          } recorded failures`}
          icon={Layers3}
          color="cyan"
        />

      </section>

      {/* QUICK LINKS */}

      <section className="grid gap-4 sm:grid-cols-3">

        {[
          {
            title: "Manage Users",
            path: "/admin/users",
            icon: Users,
          },
          {
            title: "Detailed AI Usage",
            path: "/admin/ai-usage",
            icon: BrainCircuit,
          },
          {
            title: "System Monitoring",
            path: "/admin/system-health",
            icon: Activity,
          },
        ].map((item) => (

          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#111522] p-5 text-sm text-slate-300 transition hover:border-violet-500/40"
          >

            <item.icon
              size={20}
              className="text-violet-400"
            />

            <span className="flex-1 font-medium">

              {item.title}

            </span>

            <ArrowUpRight
              size={16}
              className="text-slate-500"
            />

          </Link>

        ))}

      </section>

      {/* DATA TIMESTAMP */}

      <p className="text-right text-xs text-slate-600">

        Analytics generated: {
          new Date(
            overview.generatedAt
          ).toLocaleString()
        }

      </p>

    </div>
  );
}