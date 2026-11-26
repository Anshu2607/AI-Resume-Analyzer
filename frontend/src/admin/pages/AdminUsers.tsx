import {
  useEffect,
  useState,
} from "react";

import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  UserRound,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
  adminUsersService,
} from "../services/adminUsers.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import UserStatusBadge from "../components/UserStatusBadge";

import AdminPagination from "../components/AdminPagination";

import type {
  UserListQuery,
  UserListResponse,
} from "../types/adminUsers.types";

const inputClass =
  "rounded-xl border border-slate-700 " +
  "bg-[#111522] px-4 py-3 text-sm " +
  "text-slate-300 outline-none " +
  "focus:border-violet-500";

const formatDate = (
  value: string | null
): string => {

  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

export default function AdminUsers() {

  const [search, setSearch] =
    useState("");

  const [query, setQuery] =
    useState<UserListQuery>({
      page: 1,
      limit: 20,
      search: "",
      status: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

  const [data, setData] =
    useState<UserListResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // Debounce search.

  useEffect(() => {

    const timer = window.setTimeout(() => {

      setQuery((previous) => ({

        ...previous,

        search: search.trim(),

        page: 1,

      }));

    }, 400);

    return () => window.clearTimeout(timer);

  }, [search]);

  // Retrieve user directory.

  useEffect(() => {

    const controller =
      new AbortController();

    setLoading(true);
    setError("");

    adminUsersService
      .getUsers(
        query,
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

  }, [query, refreshKey]);

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* HEADER */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-violet-500/10 p-4">

            <Users
              size={26}
              className="text-violet-400"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white">

              User Management

            </h1>

            <p className="mt-1 text-sm text-slate-400">

              Search, monitor and manage registered accounts.

            </p>

          </div>

        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            setRefreshKey((value) => value + 1)
          }
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#111522] px-4 py-3 text-sm text-slate-300 disabled:opacity-50"
        >

          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Refresh

        </button>

      </section>

      {/* FILTERS */}

      <section className="rounded-2xl border border-slate-800 bg-[#111522] p-5">

        <div className="flex flex-wrap gap-3">

          <div className="relative min-w-[220px] flex-1">

            <Search
              size={18}
              className="absolute left-4 top-3.5 text-slate-500"
            />

            <input
              type="search"
              aria-label="Search users"
              placeholder="Search by name or email..."
              value={search}
              maxLength={100}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className={`${inputClass} w-full pl-11`}
            />

          </div>

          <select
            aria-label="Account status"
            value={query.status}
            onChange={(event) => {

              const status =
                event.target.value as UserListQuery["status"];

              setQuery((previous) => ({
                ...previous,
                status,
                page: 1,
              }));
            }}
            className={inputClass}
          >

            <option value="all">All statuses</option>

            <option value="active">Active</option>

            <option value="suspended">Suspended</option>

          </select>

          <select
            aria-label="Sort users"
            value={query.sortBy}
            onChange={(event) => {

              const sortBy =
                event.target.value as UserListQuery["sortBy"];

              setQuery((previous) => ({
                ...previous,
                sortBy,
                page: 1,
              }));
            }}
            className={inputClass}
          >

            <option value="createdAt">Registration date</option>

            <option value="name">Name</option>

            <option value="email">Email</option>

            <option value="lastLoginAt">Last login</option>

            <option value="lastActiveAt">Last active</option>

            <option value="loginCount">Login count</option>

          </select>

          <select
            aria-label="Sort order"
            value={query.sortOrder}
            onChange={(event) => {

              const sortOrder =
                event.target.value as "asc" | "desc";

              setQuery((previous) => ({
                ...previous,
                sortOrder,
                page: 1,
              }));
            }}
            className={inputClass}
          >

            <option value="desc">Descending</option>

            <option value="asc">Ascending</option>

          </select>

          <select
            aria-label="Users per page"
            value={query.limit}
            onChange={(event) => {

              setQuery((previous) => ({
                ...previous,
                limit: Number(event.target.value),
                page: 1,
              }));
            }}
            className={inputClass}
          >

            <option value={10}>10 per page</option>

            <option value={20}>20 per page</option>

            <option value={50}>50 per page</option>

            <option value={100}>100 per page</option>

          </select>

        </div>

      </section>

      {/* ERROR */}

      {error && (

        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >

          <AlertCircle size={18} />

          {error}

        </div>

      )}

      {/* USER TABLE */}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111522]">

        <div className="flex items-center justify-between border-b border-slate-800 p-5">

          <h2 className="font-semibold text-white">

            Registered Users

          </h2>

          <span className="text-sm text-slate-400">

            {data?.pagination.totalUsers ?? 0} accounts

          </span>

        </div>

        {loading ? (

          <div className="flex h-64 flex-col items-center justify-center gap-3">

            <Loader2
              size={30}
              className="animate-spin text-violet-400"
            />

            <p className="text-sm text-slate-400">

              Loading users...

            </p>

          </div>

        ) : !data || data.users.length === 0 ? (

          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">

            <UserRound size={36} />

            <p className="text-sm">

              {error ? "Unable to retrieve users." : "No matching users found."}

            </p>

          </div>

        ) : (

          <>

            <div className="overflow-x-auto">

              <table className="w-full whitespace-nowrap text-left text-sm">

                <thead className="bg-slate-900/70 text-xs text-slate-400">

                  <tr>

                    {[
                      "User",
                      "Status",
                      "Registered",
                      "Last Login",
                      "Last Active",
                      "Logins",
                      "Action",
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

                  {data.users.map((user) => (

                    <tr
                      key={user.id}
                      className="transition hover:bg-slate-800/30"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 font-semibold text-violet-400">

                            {user.name
                              .slice(0, 2)
                              .toUpperCase()}

                          </div>

                          <div>

                            <p className="font-medium text-white">

                              {user.name}

                            </p>

                            <p className="mt-1 text-xs text-slate-500">

                              {user.email}

                            </p>

                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4">

                        <UserStatusBadge
                          status={user.status}
                        />

                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">

                        {formatDate(user.createdAt)}

                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">

                        {formatDate(user.lastLoginAt)}

                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">

                        {formatDate(user.lastActiveAt)}

                      </td>

                      <td className="px-5 py-4 text-slate-300">

                        {user.loginCount}

                      </td>

                      <td className="px-5 py-4">

                        <Link
                          to={`/admin/users/${user.id}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/20"
                        >

                          View Profile

                          <ArrowUpRight size={14} />

                        </Link>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            <AdminPagination
              pagination={data.pagination}
              totalItems={data.pagination.totalUsers}
              loading={loading}
              onPageChange={(page) => {

                setQuery((previous) => ({
                  ...previous,
                  page,
                }));
              }}
            />

          </>

        )}

      </section>

    </div>
  );
}