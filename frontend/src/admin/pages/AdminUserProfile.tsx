import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserRound,
  Mail,
  CalendarDays,
  LogIn,
  Clock3,
  Activity,
  FileText,
  MessagesSquare,
  BrainCircuit,
  ShieldAlert,
  ShieldCheck,
  Gauge,
  History,
} from "lucide-react";

import {
  adminUsersService,
} from "../services/adminUsers.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import UserStatusBadge from "../components/UserStatusBadge";
import AdminStatCard from "../components/AdminStatCard";
import AdminPagination from "../components/AdminPagination";
import UserStatusDialog from "../components/UserStatusDialog";

import type {
  UserProfile,
  UserActivityResponse,
  UserQuota,
  QuotaCounter,
} from "../types/adminUsers.types";

type ProfileTab =
  "overview" | "activities" | "quotas";

const ACTIVITY_TYPES = [
  "USER_REGISTERED",
  "USER_LOGIN",
  "RESUME_UPLOADED",
  "RESUME_DELETED",
  "RESUME_ANALYZED",
  "VECTOR_SEARCH",
  "RAG_CONVERSATION",
  "JOB_MATCHING",
  "SKILL_GAP_ANALYSIS",
  "CAREER_ROADMAP",
  "AGENT_EXECUTION",
  "INTERVIEW_STARTED",
  "INTERVIEW_ANSWER_SUBMITTED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW_REPORT_GENERATED",
  "BACKGROUND_JOB_SUBMITTED",
  "BACKGROUND_JOB_COMPLETED",
  "BACKGROUND_JOB_FAILED",
];

const panelClass =
  "rounded-2xl border border-slate-800 bg-[#111522] p-5";

const inputClass =
  "rounded-xl border border-slate-700 bg-slate-900 " +
  "px-4 py-2.5 text-sm text-slate-300 outline-none " +
  "focus:border-violet-500";

const formatDate = (
  value: string | null | undefined
): string => {

  if (!value) return "Never";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

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

const formatPercentage = (
  value: number | null
): string =>
  value == null
    ? "N/A"
    : `${value.toFixed(1)}%`;

// =====================================
// QUOTA PROGRESS BAR
// =====================================

function QuotaProgress({
  label,
  counter,
}: {
  label: string;
  counter: QuotaCounter;
}) {

  const percentage =
    counter.limit > 0
      ? Math.min(
          100,
          (counter.used / counter.limit) * 100
        )
      : 0;

  const color =
    percentage >= 100
      ? "bg-red-500"
      : percentage >= 80
        ? "bg-amber-500"
        : "bg-violet-500";

  return (

    <div className="space-y-2">

      <div className="flex flex-wrap items-center justify-between gap-2">

        <span className="text-sm font-medium text-slate-300">

          {label}

        </span>

        <span className="text-xs tabular-nums text-slate-400">

          {counter.used} / {counter.limit}

        </span>

      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">

        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />

      </div>

      <div className="flex justify-between text-xs text-slate-500">

        <span>

          {counter.remaining} attempts remaining

        </span>

        {counter.exhausted && (

          <span className="text-red-400">

            Limit reached

          </span>

        )}

      </div>

    </div>
  );
}

// =====================================
// MAIN USER PROFILE PAGE
// =====================================

export default function AdminUserProfile() {

  const { userId } = useParams<{
    userId: string;
  }>();

  const [tab, setTab] =
    useState<ProfileTab>("overview");

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [activities, setActivities] =
    useState<UserActivityResponse | null>(null);

  const [quota, setQuota] =
    useState<UserQuota | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activityLoading, setActivityLoading] =
    useState(false);

  const [quotaLoading, setQuotaLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activityError, setActivityError] =
    useState("");

  const [quotaError, setQuotaError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [showStatusDialog, setShowStatusDialog] =
    useState(false);

  const [activityPage, setActivityPage] =
    useState(1);

  const [activityType, setActivityType] =
    useState("");

  const [outcome, setOutcome] =
    useState<"all" | "success" | "failure">("all");

  // ===================================
  // RESET WHEN USER CHANGES
  // ===================================

  useEffect(() => {

    setProfile(null);
    setActivities(null);
    setQuota(null);
    setActivityPage(1);
    setActivityType("");
    setOutcome("all");
    setTab("overview");
    setSuccess("");
    setShowStatusDialog(false);

  }, [userId]);

  // ===================================
  // FETCH USER PROFILE
  // ===================================

  useEffect(() => {

    if (!userId) {

      setError("Invalid user identifier.");
      setLoading(false);

      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError("");

    adminUsersService
      .getProfile(userId, controller.signal)
      .then((result) => {

        if (!controller.signal.aborted) {
          setProfile(result);
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

    return () => controller.abort();

  }, [userId, refreshKey]);

  // ===================================
  // FETCH PAGINATED ACTIVITY HISTORY
  // ===================================

  useEffect(() => {

    if (!userId || tab !== "activities") {
      return;
    }

    const controller = new AbortController();

    setActivityLoading(true);
    setActivityError("");

    adminUsersService
      .getActivities(
        userId,
        {
          page: activityPage,
          limit: 20,

          ...(activityType
            ? { activityType }
            : {}),

          ...(outcome !== "all"
            ? { outcome }
            : {}),
        },
        controller.signal
      )
      .then((result) => {

        if (!controller.signal.aborted) {
          setActivities(result);
        }

      })
      .catch((err) => {

        if (!controller.signal.aborted) {

          setActivities(null);

          setActivityError(
            getAdminErrorMessage(err)
          );

        }

      })
      .finally(() => {

        if (!controller.signal.aborted) {
          setActivityLoading(false);
        }

      });

    return () => controller.abort();

  }, [
    userId,
    tab,
    activityPage,
    activityType,
    outcome,
    refreshKey,
  ]);

  // ===================================
  // FETCH DAILY AI QUOTAS
  // ===================================

  useEffect(() => {

    if (!userId || tab !== "quotas") {
      return;
    }

    const controller = new AbortController();

    setQuotaLoading(true);
    setQuotaError("");

    adminUsersService
      .getQuota(userId, controller.signal)
      .then((result) => {

        if (!controller.signal.aborted) {
          setQuota(result);
        }

      })
      .catch((err) => {

        if (!controller.signal.aborted) {

          setQuota(null);

          setQuotaError(
            getAdminErrorMessage(err)
          );

        }

      })
      .finally(() => {

        if (!controller.signal.aborted) {
          setQuotaLoading(false);
        }

      });

    return () => controller.abort();

  }, [userId, tab, refreshKey]);

  // ===================================
  // UPDATE ACCOUNT STATUS
  // ===================================

  const handleStatusChange = async (
    reason: string
  ): Promise<void> => {

    if (
      !userId ||
      !profile ||
      profile.account.id !== userId
    ) {
      throw new Error(
        "User account is unavailable."
      );
    }

    const suspending =
      profile.account.status === "active";

    try {

      const result = suspending

        ? await adminUsersService.suspend(
            userId,
            reason
          )

        : await adminUsersService.reactivate(
            userId,
            reason
          );

      setProfile((previous) => {

        if (!previous) return previous;

        return {

          ...previous,

          account: {
            ...previous.account,
            status: result.user.status,
            suspendedAt: result.user.suspendedAt,
            updatedAt: result.user.updatedAt,
          },
        };

      });

      setShowStatusDialog(false);

      setSuccess(
        suspending
          ? "User account suspended successfully."
          : "User account reactivated successfully."
      );

      setRefreshKey((value) => value + 1);

    } catch (err) {

      throw new Error(
        getAdminErrorMessage(err)
      );

    }
  };

  // ===================================
  // LOADING AND ERROR STATES
  // ===================================

  if (
    loading &&
    (!profile || profile.account.id !== userId)
  ) {

    return (

      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4">

        <Loader2
          size={34}
          className="animate-spin text-violet-400"
        />

        <p className="text-sm text-slate-400">

          Loading user profile...

        </p>

      </div>
    );
  }

  if (
    !profile ||
    profile.account.id !== userId
  ) {

    return (

      <div className={`${panelClass} text-center`}>

        <AlertCircle
          size={32}
          className="mx-auto text-red-400"
        />

        <p className="mt-4 text-sm text-red-300">

          {error || "User account not found."}

        </p>

        <Link
          to="/admin/users"
          className="mt-5 inline-flex items-center gap-2 text-sm text-violet-400"
        >

          <ArrowLeft size={16} />

          Back to Users

        </Link>

      </div>
    );
  }

  const {
    account,
    resources,
    activity,
    interviews,
    featureUsage,
    recentActivities,
  } = profile;

  const tabs = [

    {
      value: "overview" as const,
      label: "Overview",
      icon: UserRound,
    },

    {
      value: "activities" as const,
      label: "Activity History",
      icon: History,
    },

    {
      value: "quotas" as const,
      label: "AI Quotas",
      icon: Gauge,
    },
  ];

  const maxFeatureCount = Math.max(
    1,
    ...featureUsage.map((item) => item.count)
  );

  // ===================================
  // PROFILE INTERFACE
  // ===================================

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* BACK AND REFRESH */}

      <div className="flex items-center justify-between gap-3">

        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >

          <ArrowLeft size={18} />

          Back to Users

        </Link>

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

      {/* NOTIFICATIONS */}

      {success && (

        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400"
        >

          <CheckCircle2 size={18} />

          {success}

        </div>

      )}

      {error && (

        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >

          <AlertCircle size={18} />

          {error}

        </div>

      )}

      {/* USER PROFILE HEADER */}

      <section className={panelClass}>

        <div className="flex flex-wrap items-center justify-between gap-5">

          <div className="flex items-center gap-5">

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-3xl font-bold text-violet-400">

              {account.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}

            </div>

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <h1 className="text-2xl font-bold text-white">

                  {account.name}

                </h1>

                <UserStatusBadge
                  status={account.status}
                />

              </div>

              <p className="mt-2 flex items-center gap-2 break-all text-sm text-slate-400">

                <Mail size={15} />

                {account.email}

              </p>

              <p className="mt-2 break-all text-xs text-slate-500">

                User ID: {account.id}

              </p>

            </div>

          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setShowStatusDialog(true)
            }
            className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium disabled:opacity-50 ${
              account.status === "active"

                ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"

                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >

            {account.status === "active"
              ? <ShieldAlert size={18} />
              : <ShieldCheck size={18} />}

            {account.status === "active"
              ? "Suspend Account"
              : "Reactivate Account"}

          </button>

        </div>

        {/* ACCOUNT INFORMATION */}

        <div className="mt-6 grid gap-4 border-t border-slate-800 pt-6 sm:grid-cols-2 xl:grid-cols-4">

          {[
            {
              label: "Registered",
              value: formatDate(account.createdAt),
              icon: CalendarDays,
            },
            {
              label: "Last Login",
              value: formatDate(account.lastLoginAt),
              icon: LogIn,
            },
            {
              label: "Last Active",
              value: formatDate(account.lastActiveAt),
              icon: Clock3,
            },
            {
              label: "Total Logins",
              value: String(account.loginCount),
              icon: Activity,
            },
          ].map((item) => (

            <div
              key={item.label}
              className="rounded-xl bg-slate-900/60 p-4"
            >

              <div className="flex items-center gap-2 text-xs text-slate-500">

                <item.icon size={15} />

                {item.label}

              </div>

              <p className="mt-3 text-sm font-semibold text-slate-200">

                {item.value}

              </p>

            </div>

          ))}

        </div>

        {account.suspendedAt && (

          <p className="mt-4 text-xs text-red-400">

            Suspended on: {
              formatDate(account.suspendedAt)
            }

          </p>

        )}

      </section>

      {/* TABS */}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-[#111522] p-2">

        {tabs.map((item) => (

          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            aria-pressed={tab === item.value}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition ${
              tab === item.value

                ? "bg-violet-500/15 text-violet-300"

                : "text-slate-400 hover:bg-slate-800"
            }`}
          >

            <item.icon size={17} />

            {item.label}

          </button>

        ))}

      </div>

      {/* =================================
          OVERVIEW TAB
          ================================= */}

      {tab === "overview" && (

        <div className="space-y-6">

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <AdminStatCard
              title="Uploaded Resumes"
              value={resources.totalResumes}
              icon={FileText}
              color="violet"
            />

            <AdminStatCard
              title="Recorded Activities"
              value={activity.totalActivities}
              icon={Activity}
              color="blue"
              description="Retained activity records"
            />

            <AdminStatCard
              title="Activity Success Rate"
              value={formatPercentage(
                activity.successRate
              )}
              icon={CheckCircle2}
              color="emerald"
            />

            <AdminStatCard
              title="Failed Activities"
              value={activity.failedActivities}
              icon={XCircle}
              color="red"
            />

          </section>

          {/* INTERVIEW STATISTICS */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <AdminStatCard
              title="Total Interviews"
              value={interviews.totalInterviews}
              icon={MessagesSquare}
              color="violet"
            />

            <AdminStatCard
              title="Completed Interviews"
              value={interviews.completedInterviews}
              icon={CheckCircle2}
              color="emerald"
            />

            <AdminStatCard
              title="Interview Completion"
              value={formatPercentage(
                interviews.completionRate
              )}
              icon={Gauge}
              color="cyan"
            />

            <AdminStatCard
              title="Average Interview Score"
              value={
                interviews.averageScore == null

                  ? "N/A"

                  : interviews.averageScore.toFixed(1)
              }
              icon={BrainCircuit}
              color="amber"
            />

          </section>

          <div className="grid gap-5 xl:grid-cols-2">

            {/* FEATURE USAGE */}

            <section className={panelClass}>

              <h2 className="font-semibold text-white">

                Most Used Features

              </h2>

              <p className="mt-1 text-xs text-slate-500">

                Based on retained activity history.

              </p>

              <div className="mt-6 space-y-5">

                {featureUsage.length === 0 && (

                  <p className="py-10 text-center text-sm text-slate-500">

                    No recorded feature usage.

                  </p>

                )}

                {featureUsage.map((item) => (

                  <div
                    key={item.activityType}
                    className="space-y-2"
                  >

                    <div className="flex justify-between gap-3 text-sm">

                      <span className="text-slate-400">

                        {formatLabel(item.activityType)}

                      </span>

                      <span className="font-medium text-slate-200">

                        {item.count}

                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{
                          width: `${
                            item.count /
                            maxFeatureCount * 100
                          }%`,
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

            </section>

            {/* RECENT ACTIVITIES */}

            <section className={panelClass}>

              <div className="flex items-center justify-between gap-3">

                <h2 className="font-semibold text-white">

                  Recent Activity

                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setTab("activities")
                  }
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >

                  View All

                </button>

              </div>

              <div className="mt-5 divide-y divide-slate-800">

                {recentActivities.length === 0 && (

                  <p className="py-10 text-center text-sm text-slate-500">

                    No recorded activities.

                  </p>

                )}

                {recentActivities.map((item) => (

                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-4"
                  >

                    {item.outcome === "success" ? (

                      <CheckCircle2
                        size={19}
                        className="shrink-0 text-emerald-400"
                      />

                    ) : (

                      <XCircle
                        size={19}
                        className="shrink-0 text-red-400"
                      />

                    )}

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-medium text-slate-200">

                        {formatLabel(item.activityType)}

                      </p>

                      <p className="mt-1 text-xs text-slate-500">

                        {formatDate(item.createdAt)}

                      </p>

                    </div>

                    <span className="text-xs tabular-nums text-slate-400">

                      {item.durationMs == null
                        ? "—"
                        : `${item.durationMs} ms`}

                    </span>

                  </div>

                ))}

              </div>

            </section>

          </div>

        </div>

      )}

      {/* =================================
          ACTIVITY HISTORY TAB
          ================================= */}

      {tab === "activities" && (

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111522]">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5">

            <div>

              <h2 className="font-semibold text-white">

                Activity History

              </h2>

              <p className="mt-1 text-xs text-slate-500">

                Retention: {
                  activities?.retention.days ?? 90
                } days

              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <select
                aria-label="Activity type"
                value={activityType}
                onChange={(event) => {

                  setActivityType(event.target.value);

                  setActivityPage(1);

                }}
                className={inputClass}
              >

                <option value="">

                  All Activities

                </option>

                {ACTIVITY_TYPES.map((type) => (

                  <option key={type} value={type}>

                    {formatLabel(type)}

                  </option>

                ))}

              </select>

              <select
                aria-label="Activity outcome"
                value={outcome}
                onChange={(event) => {

                  setOutcome(
                    event.target.value as
                      "all" | "success" | "failure"
                  );

                  setActivityPage(1);

                }}
                className={inputClass}
              >

                <option value="all">All Outcomes</option>

                <option value="success">Successful</option>

                <option value="failure">Failed</option>

              </select>

            </div>

          </div>

          {activityLoading ? (

            <div className="flex h-56 items-center justify-center">

              <Loader2
                size={30}
                className="animate-spin text-violet-400"
              />

            </div>

          ) : activityError ? (

            <p className="p-10 text-center text-sm text-red-400">

              {activityError}

            </p>

          ) : !activities ||
              activities.activities.length === 0 ? (

            <p className="p-12 text-center text-sm text-slate-500">

              No matching activities found.

            </p>

          ) : (

            <>

              <div className="overflow-x-auto">

                <table className="w-full whitespace-nowrap text-left text-sm">

                  <thead className="bg-slate-900/60 text-xs text-slate-400">

                    <tr>

                      {[
                        "Activity",
                        "Outcome",
                        "HTTP Status",
                        "Duration",
                        "Date & Time",
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

                    {activities.activities.map((item) => (

                      <tr
                        key={item.id}
                        className="hover:bg-slate-800/30"
                      >

                        <td className="px-5 py-4 font-medium text-slate-200">

                          {formatLabel(item.activityType)}

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-2 text-xs ${
                              item.outcome === "success"

                                ? "text-emerald-400"

                                : "text-red-400"
                            }`}
                          >

                            {item.outcome === "success"
                              ? <CheckCircle2 size={15} />
                              : <XCircle size={15} />}

                            {formatLabel(item.outcome)}

                          </span>

                        </td>

                        <td className="px-5 py-4 text-slate-400">

                          {item.statusCode ?? "—"}

                        </td>

                        <td className="px-5 py-4 text-slate-400">

                          {item.durationMs == null
                            ? "—"
                            : `${item.durationMs} ms`}

                        </td>

                        <td className="px-5 py-4 text-xs text-slate-400">

                          {formatDate(item.createdAt)}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <AdminPagination
                pagination={activities.pagination}
                totalItems={
                  activities.pagination.totalActivities
                }
                onPageChange={setActivityPage}
                loading={activityLoading}
              />

            </>

          )}

        </section>

      )}

      {/* =================================
          AI QUOTAS TAB
          ================================= */}

      {tab === "quotas" && (

        <div className="space-y-5">

          {quotaLoading ? (

            <div className="flex h-56 items-center justify-center">

              <Loader2
                size={30}
                className="animate-spin text-violet-400"
              />

            </div>

          ) : quotaError ? (

            <div className={`${panelClass} text-sm text-red-400`}>

              {quotaError}

            </div>

          ) : quota ? (

            <>

              <section className="grid gap-4 sm:grid-cols-3">

                <AdminStatCard
                  title="Daily Attempts Used"
                  value={quota.total.used}
                  icon={BrainCircuit}
                  color="violet"
                />

                <AdminStatCard
                  title="Daily Attempt Limit"
                  value={quota.total.limit}
                  icon={Gauge}
                  color="blue"
                />

                <AdminStatCard
                  title="Remaining Attempts"
                  value={quota.total.remaining}
                  icon={Activity}
                  color="emerald"
                />

              </section>

              <section className={panelClass}>

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <h2 className="font-semibold text-white">

                    Daily AI Consumption

                  </h2>

                  <span
                    className={`text-xs ${
                      quota.enabled
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >

                    {quota.enabled
                      ? "Quota enforcement enabled"
                      : "Quota enforcement disabled"}

                  </span>

                </div>

                <div className="mt-6">

                  <QuotaProgress
                    label="Total Provider Attempts"
                    counter={quota.total}
                  />

                </div>

                <p className="mt-5 text-xs text-slate-500">

                  Resets at: {formatDate(quota.resetAt)}
                  {" "}· UTC-based daily window

                </p>

              </section>

              <section className={panelClass}>

                <h2 className="font-semibold text-white">

                  Feature-specific Limits

                </h2>

                <div className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2">

                  {quota.features.map((item) => (

                    <QuotaProgress
                      key={item.feature}
                      label={formatLabel(item.feature)}
                      counter={item}
                    />

                  ))}

                </div>

              </section>

              <p className="text-xs leading-relaxed text-slate-500">

                Quotas count actual reserved LLM provider
                attempts, including retries and fallback.
                Cached responses may not consume additional
                quota.

              </p>

            </>

          ) : (

            <p className={`${panelClass} text-sm text-slate-500`}>

              No quota information available.

            </p>

          )}

        </div>

      )}

      {/* ACCOUNT STATUS DIALOG */}

      {showStatusDialog && (

        <UserStatusDialog
          user={account}
          onClose={() =>
            setShowStatusDialog(false)
          }
          onConfirm={handleStatusChange}
        />

      )}

    </div>
  );
}