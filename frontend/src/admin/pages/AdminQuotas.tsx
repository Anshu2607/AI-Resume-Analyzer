import {
  useEffect,
  useState,
} from "react";

import {
  Gauge,
  Search,
  Users,
  BrainCircuit,
  Activity,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

import { Link } from "react-router-dom";

import AdminStatCard from "../components/AdminStatCard";
import AdminPagination from "../components/AdminPagination";
import UserStatusBadge from "../components/UserStatusBadge";

import {
  adminUsersService,
} from "../services/adminUsers.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import type {
  UserListResponse,
  ManagedUser,
  UserQuota,
  QuotaCounter,
} from "../types/adminUsers.types";

const panelClass =
  "rounded-2xl border border-slate-800 bg-[#111522] p-5";

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

function QuotaBar({
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
          counter.used / counter.limit * 100
        )
      : 0;

  return (

    <div className="space-y-3">

      <div className="flex justify-between gap-3 text-sm">

        <span className="text-slate-300">
          {label}
        </span>

        <span className="tabular-nums text-slate-400">
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
          className={`h-full rounded-full ${
            percentage >= 100
              ? "bg-red-500"
              : percentage >= 80
                ? "bg-amber-500"
                : "bg-violet-500"
          }`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

      <div className="flex justify-between text-xs">

        <span className="text-slate-500">
          {counter.remaining} remaining
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

export default function AdminQuotas() {

  const [search, setSearch] =
    useState("");

  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [users, setUsers] =
    useState<UserListResponse | null>(null);

  const [selectedUser, setSelectedUser] =
    useState<ManagedUser | null>(null);

  const [quota, setQuota] =
    useState<UserQuota | null>(null);

  const [usersLoading, setUsersLoading] =
    useState(true);

  const [quotaLoading, setQuotaLoading] =
    useState(false);

  const [usersError, setUsersError] =
    useState("");

  const [quotaError, setQuotaError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  useEffect(() => {

    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);

  }, [search]);

  useEffect(() => {

    const controller = new AbortController();

    setUsersLoading(true);
    setUsersError("");

    adminUsersService.getUsers(
      {
        page,
        limit: 10,
        search: debouncedSearch,
        status: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setUsers(result);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setUsers(null);
          setUsersError(
            getAdminErrorMessage(err)
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setUsersLoading(false);
        }
      });

    return () => controller.abort();

  }, [page, debouncedSearch, refreshKey]);

  const selectedId = selectedUser?.id;

  useEffect(() => {

    setQuota(null);
    setQuotaError("");

    if (!selectedId) {
      setQuotaLoading(false);
      return;
    }

    const controller = new AbortController();

    setQuotaLoading(true);

    adminUsersService.getQuota(
      selectedId,
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setQuota(result);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
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

  }, [selectedId, refreshKey]);

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* HEADER */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-violet-500/10 p-4">
            <Gauge
              size={27}
              className="text-violet-400"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Usage Quotas
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Inspect daily AI consumption and user limits.
            </p>
          </div>

        </div>

        <button
          type="button"
          disabled={usersLoading || quotaLoading}
          onClick={() =>
            setRefreshKey((value) => value + 1)
          }
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              usersLoading || quotaLoading
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>

      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">

        {/* USER SELECTOR */}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111522]">

          <div className="border-b border-slate-800 p-5">

            <div className="mb-4 flex items-center gap-2">

              <Users
                size={19}
                className="text-violet-400"
              />

              <h2 className="font-semibold text-white">
                Select User
              </h2>

            </div>

            <div className="relative">

              <Search
                size={17}
                className="absolute left-3 top-3.5 text-slate-500"
              />

              <input
                type="search"
                aria-label="Search registered users"
                placeholder="Search name or email..."
                maxLength={100}
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-500"
              />

            </div>

          </div>

          {usersLoading ? (

            <div className="flex h-40 items-center justify-center">

              <Loader2
                size={26}
                className="animate-spin text-violet-400"
              />

            </div>

          ) : usersError ? (

            <p className="p-5 text-sm text-red-400">
              {usersError}
            </p>

          ) : (

            <div className="divide-y divide-slate-800">

              {(users?.users ?? []).map((user) => (

                <button
                  key={user.id}
                  type="button"
                  onClick={() =>
                    setSelectedUser(user)
                  }
                  aria-pressed={selectedId === user.id}
                  className={`flex w-full items-center gap-3 p-4 text-left transition ${
                    selectedId === user.id
                      ? "bg-violet-500/10"
                      : "hover:bg-slate-800/40"
                  }`}
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-bold text-violet-400">

                    {user.name.slice(0, 2).toUpperCase()}

                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-medium text-white">
                      {user.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                    </p>

                  </div>

                </button>

              ))}

              {users?.users.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">
                  No matching users.
                </p>
              )}

            </div>

          )}

          {users && (
            <AdminPagination
              pagination={users.pagination}
              totalItems={users.pagination.totalUsers}
              loading={usersLoading}
              onPageChange={setPage}
            />
          )}

        </section>

        {/* QUOTA DETAILS */}

        <section className="min-w-0 space-y-5">

          {!selectedUser && (

            <div className={`${panelClass} flex min-h-[420px] flex-col items-center justify-center gap-4`}>

              <Gauge
                size={48}
                className="text-violet-400"
              />

              <h2 className="font-semibold text-white">
                Select a registered user
              </h2>

              <p className="text-center text-sm text-slate-500">
                Choose an account to inspect daily AI quotas.
              </p>

            </div>

          )}

          {selectedUser && (

            <>

              <div className={`${panelClass} flex flex-wrap items-center justify-between gap-4`}>

                <div>

                  <div className="flex flex-wrap items-center gap-3">

                    <h2 className="text-lg font-semibold text-white">
                      {selectedUser.name}
                    </h2>

                    <UserStatusBadge
                      status={selectedUser.status}
                    />

                  </div>

                  <p className="mt-2 break-all text-sm text-slate-400">
                    {selectedUser.email}
                  </p>

                </div>

                <Link
                  to={`/admin/users/${selectedUser.id}`}
                  className="flex items-center gap-2 text-sm text-violet-400"
                >
                  View Profile
                  <ArrowUpRight size={16} />
                </Link>

              </div>

              {quotaLoading && (
                <div className="flex h-48 items-center justify-center">
                  <Loader2
                    size={30}
                    className="animate-spin text-violet-400"
                  />
                </div>
              )}

              {quotaError && (
                <div
                  role="alert"
                  className="flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-sm text-red-400"
                >
                  <AlertCircle size={18} />
                  {quotaError}
                </div>
              )}

              {!quotaLoading &&
                quota &&
                quota.userId === selectedId && (

                <>

                  <div className="grid gap-4 sm:grid-cols-3">

                    <AdminStatCard
                      title="Attempts Used"
                      value={quota.total.used}
                      icon={BrainCircuit}
                      color="violet"
                    />

                    <AdminStatCard
                      title="Daily Limit"
                      value={quota.total.limit}
                      icon={Gauge}
                      color="blue"
                    />

                    <AdminStatCard
                      title="Remaining"
                      value={quota.total.remaining}
                      icon={Activity}
                      color="emerald"
                    />

                  </div>

                  <div className={panelClass}>

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <h2 className="font-semibold text-white">
                        Daily Consumption
                      </h2>

                      <span className={`text-xs ${
                        quota.enabled
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}>

                        {quota.enabled
                          ? "Enforcement enabled"
                          : "Enforcement disabled"}

                      </span>

                    </div>

                    <div className="mt-6">

                      <QuotaBar
                        label="Total Provider Attempts"
                        counter={quota.total}
                      />

                    </div>

                    <p className="mt-5 text-xs text-slate-500">

                      Resets: {
                        new Date(quota.resetAt).toLocaleString()
                      }

                      {" · "}UTC-based quota window

                    </p>

                  </div>

                  <div className={panelClass}>

                    <h2 className="font-semibold text-white">
                      Feature-specific Quotas
                    </h2>

                    <div className="mt-6 grid gap-x-8 gap-y-7 md:grid-cols-2">

                      {quota.features.map((item) => (

                        <QuotaBar
                          key={item.feature}
                          label={formatLabel(item.feature)}
                          counter={item}
                        />

                      ))}

                    </div>

                  </div>

                  <p className="text-xs leading-relaxed text-slate-500">
                    Quotas count reserved LLM provider attempts.
                    Retries and fallback consume quota. This
                    interface is read-only; limits are controlled
                    by the backend configuration.
                  </p>

                </>

              )}

            </>

          )}

        </section>

      </div>

    </div>
  );
}