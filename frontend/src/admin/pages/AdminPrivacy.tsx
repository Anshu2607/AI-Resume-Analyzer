import {
  useEffect,
  useState,
} from "react";

import {
  Shield,
  Database,
  LockKeyhole,
  Clock3,
  FileText,
  Users,
  BrainCircuit,
  ScrollText,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { Link } from "react-router-dom";

import {
  adminAnalyticsService,
} from "../services/adminAnalytics.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import AdminStatCard from "../components/AdminStatCard";

import type {
  AdminOverview,
  AIUsageAnalytics,
} from "../types/adminAnalytics.types";

const panelClass =
  "rounded-2xl border border-slate-800 bg-[#111522] p-5";

interface DataCategory {
  title: string;
  description: string;
  retention: string;
  icon: LucideIcon;
}

const dataCategories: DataCategory[] = [
  {
    title: "User Accounts",
    description:
      "Account identity, contact information, account status and login metadata.",
    retention: "No automatic expiration configured",
    icon: Users,
  },
  {
    title: "Resume Documents",
    description:
      "Uploaded resumes and information required for resume analysis.",
    retention: "Managed through application deletion controls",
    icon: FileText,
  },
  {
    title: "AI Usage Metadata",
    description:
      "Provider, model, token consumption, request outcome and duration.",
    retention: "90 days by default",
    icon: BrainCircuit,
  },
  {
    title: "User Activity Records",
    description:
      "Feature activity, request outcomes and performance metadata.",
    retention: "90 days by default",
    icon: Clock3,
  },
  {
    title: "Administrator Audit Logs",
    description:
      "Account suspension and reactivation records with administrator reasons.",
    retention: "No automatic expiration configured",
    icon: ScrollText,
  },
];

export default function AdminPrivacy() {

  const [overview, setOverview] =
    useState<AdminOverview | null>(null);

  const [aiUsage, setAIUsage] =
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

    Promise.all([
      adminAnalyticsService.getOverview(
        90,
        controller.signal
      ),

      adminAnalyticsService.getAIUsage(
        90,
        controller.signal
      ),
    ])
      .then(([overviewData, aiUsageData]) => {

        if (!controller.signal.aborted) {

          setOverview(overviewData);
          setAIUsage(aiUsageData);

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

  }, [refreshKey]);

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* HEADER */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-violet-500/10 p-4">

            <Shield
              size={27}
              className="text-violet-400"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white">

              Privacy & Data Management

            </h1>

            <p className="mt-1 text-sm text-slate-400">

              Review platform data storage and retention policies.

            </p>

          </div>

        </div>

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

      </section>

      {error && (

        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400"
        >

          <AlertCircle size={18} />

          {error}

          {overview && " — Showing previously loaded data."}

        </div>

      )}

      {/* DATA OVERVIEW */}

      {loading && !overview ? (

        <div className="flex h-48 items-center justify-center">

          <Loader2
            size={32}
            className="animate-spin text-violet-400"
          />

        </div>

      ) : (

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <AdminStatCard
            title="Registered Accounts"
            value={
              overview?.users.accounts.totalUsers ?? "N/A"
            }
            icon={Users}
            color="violet"
          />

          <AdminStatCard
            title="Suspended Accounts"
            value={
              overview?.users.accounts.suspendedAccounts ?? "N/A"
            }
            icon={LockKeyhole}
            color="red"
          />

          <AdminStatCard
            title="Recorded Feature Requests"
            value={
              overview?.features.totalRequests ?? "N/A"
            }
            description="Selected 90-day analytics window"
            icon={Database}
            color="blue"
          />

          <AdminStatCard
            title="Recorded AI Attempts"
            value={
              aiUsage?.summary.totalAttempts ?? "N/A"
            }
            description="Selected 90-day analytics window"
            icon={BrainCircuit}
            color="cyan"
          />

        </section>

      )}

      {/* DATA CATEGORIES */}

      <section className={panelClass}>

        <h2 className="text-lg font-semibold text-white">

          Data Categories & Retention

        </h2>

        <p className="mt-2 text-xs text-slate-500">

          Overview of known application data categories.
          This is not an exhaustive storage inventory.

        </p>

        <div className="mt-6 divide-y divide-slate-800">

          {dataCategories.map((category) => (

            <div
              key={category.title}
              className="flex flex-wrap items-start gap-4 py-5"
            >

              <div className="rounded-xl bg-violet-500/10 p-3">

                <category.icon
                  size={23}
                  className="text-violet-400"
                />

              </div>

              <div className="min-w-[180px] flex-1">

                <h3 className="font-medium text-white">

                  {category.title}

                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">

                  {category.description}

                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">

                <p className="text-xs text-slate-500">

                  Retention Policy

                </p>

                <p className="mt-1 text-xs font-medium text-slate-300">

                  {category.retention}

                </p>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* DATA PROTECTION */}

      <section className={panelClass}>

        <div className="flex items-center gap-3">

          <ShieldCheck
            size={23}
            className="text-violet-400"
          />

          <h2 className="font-semibold text-white">

            Data Protection Controls

          </h2>

        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">

          {[
            {
              title: "Administrator Access Control",
              description:
                "Administrator API endpoints require an authorized administrator session.",
            },
            {
              title: "Multi-factor Authentication",
              description:
                "Protected administrator endpoints require MFA-verified authentication.",
            },
            {
              title: "Metadata-based Analytics",
              description:
                "AI usage analytics use recorded consumption and operational metadata.",
            },
            {
              title: "Account Action Auditing",
              description:
                "Suspension and reactivation operations produce administrator audit records.",
            },
            {
              title: "Automatic Metadata Expiration",
              description:
                "Activity and AI usage collections have configured MongoDB TTL retention.",
            },
            {
              title: "Credential Protection",
              description:
                "Administrator monitoring responses do not expose API keys or database credentials.",
            },
          ].map((item) => (

            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
            >

              <h3 className="text-sm font-semibold text-slate-200">

                {item.title}

              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">

                {item.description}

              </p>

            </div>

          ))}

        </div>

      </section>

      {/* MANAGEMENT LINKS */}

      <section className="grid gap-4 md:grid-cols-3">

        {[
          {
            title: "Manage User Accounts",
            description:
              "Inspect, suspend or reactivate registered accounts.",
            path: "/admin/users",
            icon: Users,
          },
          {
            title: "Review Audit Logs",
            description:
              "Inspect recorded administrator actions.",
            path: "/admin/audit-logs",
            icon: ScrollText,
          },
          {
            title: "Inspect AI Metadata",
            description:
              "Review model and provider consumption.",
            path: "/admin/ai-usage",
            icon: BrainCircuit,
          },
        ].map((item) => (

          <Link
            key={item.path}
            to={item.path}
            className="rounded-2xl border border-slate-800 bg-[#111522] p-5 transition hover:border-violet-500/40"
          >

            <div className="flex items-center justify-between">

              <item.icon
                size={24}
                className="text-violet-400"
              />

              <ArrowUpRight
                size={17}
                className="text-slate-500"
              />

            </div>

            <h3 className="mt-4 font-medium text-white">

              {item.title}

            </h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">

              {item.description}

            </p>

          </Link>

        ))}

      </section>

      {/* DELETION NOTICE */}

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">

        <div className="flex items-start gap-3">

          <AlertCircle
            size={22}
            className="shrink-0 text-amber-400"
          />

          <div>

            <h2 className="font-semibold text-amber-300">

              Permanent Data Deletion

            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">

              Permanent account deletion, bulk data purging
              and account data exports are not enabled
              in this administrator portal. These operations
              require verified ownership, dependency checks,
              retention policies and additional safeguards.

              Suspending an account does not delete its data.

            </p>

          </div>

        </div>

      </section>

    </div>

  );
}