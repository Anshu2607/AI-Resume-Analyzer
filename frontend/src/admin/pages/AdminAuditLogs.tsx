import {
  useEffect,
  useState,
} from "react";

import {
  ScrollText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  Search,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
  adminAuditService,
} from "../services/adminAudit.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import AdminPagination from "../components/AdminPagination";

import UserStatusBadge from "../components/UserStatusBadge";

import type {
  AuditAction,
  AuditResponse,
} from "../types/adminAudit.types";

const inputClass =
  "rounded-xl border border-slate-700 " +
  "bg-[#111522] px-4 py-3 text-sm " +
  "text-slate-300 outline-none " +
  "focus:border-violet-500";

export default function AdminAuditLogs() {

  const [page, setPage] = useState(1);

  const [action, setAction] =
    useState<"all" | AuditAction>("all");

  const [userIdInput, setUserIdInput] =
    useState("");

  const [targetUserId, setTargetUserId] =
    useState("");

  const [data, setData] =
    useState<AuditResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchError, setSearchError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  useEffect(() => {

    const controller =
      new AbortController();

    setLoading(true);
    setError("");
    setData(null);

    adminAuditService.getAuditLogs(

      {
        page,

        limit: 20,

        ...(action !== "all"
          ? { action }
          : {}),

        ...(targetUserId
          ? { targetUserId }
          : {}),
      },

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

    return () => controller.abort();

  }, [
    page,
    action,
    targetUserId,
    refreshKey,
  ]);

  const applyUserFilter = () => {

    const value = userIdInput.trim();

    if (
      value &&
      !/^[a-fA-F0-9]{24}$/.test(value)
    ) {

      setSearchError("Enter a valid user ID.");

      return;
    }

    setSearchError("");
    setTargetUserId(value);
    setPage(1);
  };

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* HEADER */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-violet-500/10 p-4">

            <ScrollText
              size={27}
              className="text-violet-400"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white">

              Administrator Audit Logs

            </h1>

            <p className="mt-1 text-sm text-slate-400">

              Review recorded administrator account actions.

            </p>

          </div>

        </div>

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

      </section>

      {/* INFORMATION */}

      <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-slate-400">

        <ShieldCheck
          size={21}
          className="shrink-0 text-violet-400"
        />

        <p>

          Account suspensions and reactivations
          are recorded with the administrator ID,
          affected user, reason and timestamp.
          Audit records are read-only in this portal.

        </p>

      </div>

      {/* FILTERS */}

      <section className="rounded-2xl border border-slate-800 bg-[#111522] p-5">

        <div className="flex flex-wrap gap-3">

          <select
            aria-label="Audit action"
            value={action}
            onChange={(event) => {

              setAction(
                event.target.value as
                  "all" | AuditAction
              );

              setPage(1);

            }}
            className={inputClass}
          >

            <option value="all">
              All Actions
            </option>

            <option value="USER_SUSPENDED">
              User Suspended
            </option>

            <option value="USER_REACTIVATED">
              User Reactivated
            </option>

          </select>

          <form
            onSubmit={(event) => {

              event.preventDefault();

              applyUserFilter();

            }}
            className="flex min-w-0 flex-1 flex-wrap gap-3"
          >

            <input
              type="text"
              aria-label="Target user ID"
              value={userIdInput}
              maxLength={24}
              placeholder="Filter by user ID..."
              onChange={(event) =>
                setUserIdInput(event.target.value)
              }
              className={`${inputClass} min-w-0 flex-1`}
            />

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500"
            >

              <Search size={16} />

              Search

            </button>

            <button
              type="button"
              onClick={() => {

                setUserIdInput("");
                setTargetUserId("");
                setSearchError("");
                setPage(1);

              }}
              className={inputClass}
            >

              Clear

            </button>

          </form>

        </div>

        {searchError && (

          <p
            role="alert"
            className="mt-3 text-xs text-red-400"
          >

            {searchError}

          </p>

        )}

      </section>

      {/* ERROR */}

      {error && (

        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400"
        >

          <AlertCircle size={18} />

          {error}

        </div>

      )}

      {/* AUDIT RECORDS */}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111522]">

        <div className="flex items-center justify-between border-b border-slate-800 p-5">

          <h2 className="font-semibold text-white">

            Recorded Administrator Actions

          </h2>

          <span className="text-xs text-slate-400">

            {data?.pagination.totalRecords ?? "—"} records

          </span>

        </div>

        {loading ? (

          <div className="flex h-64 items-center justify-center">

            <Loader2
              size={32}
              className="animate-spin text-violet-400"
            />

          </div>

        ) : !data || data.records.length === 0 ? (

          <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-500">

            <ScrollText size={35} />

            <p className="text-sm">

              {error
                ? "Unable to retrieve audit logs."
                : "No matching audit records found."}

            </p>

          </div>

        ) : (

          <>

            <div className="divide-y divide-slate-800">

              {data.records.map((record) => {

                const suspended =
                  record.action === "USER_SUSPENDED";

                const Icon = suspended
                  ? ShieldAlert
                  : ShieldCheck;

                return (

                  <article
                    key={record.id}
                    className="p-5 transition hover:bg-slate-800/20"
                  >

                    <div className="flex flex-wrap items-start gap-4">

                      <div className={`rounded-xl p-3 ${
                        suspended
                          ? "bg-red-500/10 text-red-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>

                        <Icon size={24} />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <h3 className="font-semibold text-white">

                            {suspended
                              ? "User Account Suspended"
                              : "User Account Reactivated"}

                          </h3>

                          <span className="text-xs text-slate-500">

                            {new Date(
                              record.createdAt
                            ).toLocaleString("en-IN")}

                          </span>

                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">

                          <UserStatusBadge
                            status={record.previousStatus}
                          />

                          <span className="text-slate-500">
                            →
                          </span>

                          <UserStatusBadge
                            status={record.newStatus}
                          />

                        </div>

                        <div className="mt-4 rounded-xl bg-slate-900/60 p-4">

                          <p className="text-xs text-slate-500">

                            Recorded Reason

                          </p>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">

                            {record.reason}

                          </p>

                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">

                          <div>

                            <p className="text-xs text-slate-500">

                              Administrator ID

                            </p>

                            <p className="mt-1 break-all font-mono text-xs text-slate-300">

                              {record.adminId}

                            </p>

                          </div>

                          <div>

                            <p className="text-xs text-slate-500">

                              Target User ID

                            </p>

                            <Link
                              to={`/admin/users/${record.targetUserId}`}
                              className="mt-1 inline-flex items-center gap-2 break-all font-mono text-xs text-violet-400 hover:text-violet-300"
                            >

                              {record.targetUserId}

                              <ArrowUpRight size={13} />

                            </Link>

                          </div>

                        </div>

                        {record.requestId && (

                          <p className="mt-4 break-all text-xs text-slate-600">

                            Request ID: {record.requestId}

                          </p>

                        )}

                      </div>

                    </div>

                  </article>

                );

              })}

            </div>

            <AdminPagination
              pagination={data.pagination}
              totalItems={data.pagination.totalRecords}
              onPageChange={setPage}
              loading={loading}
            />

          </>

        )}

      </section>

    </div>
  );
}