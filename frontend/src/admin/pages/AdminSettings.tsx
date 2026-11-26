import {
  useEffect,
  useState,
} from "react";

import {
  Settings,
  ShieldCheck,
  UserRound,
  Mail,
  Clock3,
  Server,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCw,
  LockKeyhole,
  Database,
} from "lucide-react";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

import {
  adminAuthService,
} from "../services/adminAuth.service";

import {
  adminSystemService,
} from "../services/adminSystem.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

import type {
  AdminUser,
  AdminAccessVerification,
} from "../types/admin.types";

import type {
  SystemHealth,
} from "../types/adminSystem.types";

// =====================================
// SHARED STYLES
// =====================================

const panelClass =
  "rounded-2xl border border-slate-800 bg-[#111522] p-5";

// =====================================
// DATE FORMATTER
// =====================================

const formatDate = (
  value: string | null | undefined
): string => {

  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

// =====================================
// REUSABLE SETTINGS ROW
// =====================================

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {

  return (

    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 py-4 last:border-b-0">

      <span className="text-sm text-slate-400">

        {label}

      </span>

      <span className="wrap-break-word text-right text-sm font-medium text-slate-200">

        {value}

      </span>

    </div>

  );
}

// =====================================
// ADMINISTRATOR SETTINGS PAGE
// =====================================

export default function AdminSettings() {

  const {
    user,
    expiresAt,
    logout,
  } = useAdminAuth();

  const [profile, setProfile] =
    useState<AdminUser | null>(null);

  const [verification, setVerification] =
    useState<AdminAccessVerification | null>(null);

  const [health, setHealth] =
    useState<SystemHealth | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [showLogoutDialog, setShowLogoutDialog] =
    useState(false);

  // ===================================
  // FETCH ADMINISTRATOR CONFIGURATION
  // ===================================

  useEffect(() => {

    let cancelled = false;

    const controller = new AbortController();

    setLoading(true);

    setError("");

    Promise.all([

      adminAuthService.getProfile(),

      adminAuthService.verifyAccess(),

      adminSystemService.getHealth(
        controller.signal
      ),

    ])
      .then(([
        profileData,
        accessData,
        healthData,
      ]) => {

        if (!cancelled) {

          setProfile(profileData);

          setVerification(accessData);

          setHealth(healthData);

        }

      })
      .catch((err) => {

        if (!cancelled) {

          setError(
            getAdminErrorMessage(err)
          );

        }

      })
      .finally(() => {

        if (!cancelled) {

          setLoading(false);

        }

      });

    return () => {

      cancelled = true;

      controller.abort();

    };

  }, [refreshKey]);

  const account = profile ?? user;

  // ===================================
  // SETTINGS INTERFACE
  // ===================================

  return (

    <div className="mx-auto max-w-[1600px] space-y-6">

      {/* ===============================
          PAGE HEADER
          =============================== */}

      <section className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-violet-500/10 p-4">

            <Settings
              size={27}
              className="text-violet-400"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white">

              Administrator Settings

            </h1>

            <p className="mt-1 text-sm text-slate-400">

              Manage your session and review platform configuration.

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
            className={
              loading ? "animate-spin" : ""
            }
          />

          Refresh

        </button>

      </section>

      {/* ===============================
          LOADING STATE
          =============================== */}

      {loading && (

        <div className="flex items-center gap-3 text-sm text-slate-400">

          <Loader2
            size={18}
            className="animate-spin text-violet-400"
          />

          Retrieving administrator configuration...

        </div>

      )}

      {/* ===============================
          ERROR STATE
          =============================== */}

      {error && (

        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400"
        >

          <AlertCircle size={18} />

          {error}

          {profile && " — Showing previously loaded information."}

        </div>

      )}

      {/* ===============================
          ADMINISTRATOR PROFILE
          =============================== */}

      <section className={panelClass}>

        <div className="flex flex-wrap items-center gap-5">

          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/10">

            <UserRound
              size={36}
              className="text-violet-400"
            />

          </div>

          <div className="min-w-0 flex-1">

            <h2 className="text-xl font-semibold text-white">

              {account?.name ?? "Administrator"}

            </h2>

            <p className="mt-2 flex items-center gap-2 wrap-break-word text-sm text-slate-400">

              <Mail
                size={16}
                className="shrink-0"
              />

              {account?.email ?? "Not available"}

            </p>

            <p className="mt-2 text-xs capitalize text-violet-400">

              {account?.role ?? "admin"}

            </p>

          </div>

        </div>

        <div className="mt-6 border-t border-slate-800">

          <SettingRow
            label="Administrator ID"
            value={account?.id ?? "N/A"}
          />

          <SettingRow
            label="Account Status"
            value={account?.status ?? "Unknown"}
          />

          <SettingRow
            label="Account Created"
            value={formatDate(
              account?.createdAt
            )}
          />

          <SettingRow
            label="Last Login"
            value={formatDate(
              account?.lastLoginAt
            )}
          />

          <SettingRow
            label="Last Recorded Activity"
            value={formatDate(
              account?.lastActiveAt
            )}
          />

          <SettingRow
            label="Total Logins"
            value={account?.loginCount ?? "N/A"}
          />

        </div>

      </section>

      <div className="grid gap-5 xl:grid-cols-2">

        {/* =============================
            AUTHENTICATION & SECURITY
            ============================= */}

        <section className={panelClass}>

          <div className="flex items-center gap-3">

            <ShieldCheck
              size={23}
              className="text-violet-400"
            />

            <h2 className="font-semibold text-white">

              Authentication & Security

            </h2>

          </div>

          <div className="mt-4">

            <SettingRow
              label="Session Type"
              value={
                verification?.sessionType ??
                "Not verified"
              }
            />

            <SettingRow
              label="MFA Verification"
              value={
                verification?.mfaVerified
                  ? "Verified"
                  : "Not confirmed"
              }
            />

            <SettingRow
              label="Administrator Role"
              value={
                verification?.role ??
                "Not confirmed"
              }
            />

            <SettingRow
              label="Maximum Session Duration"
              value="30 minutes"
            />

            <SettingRow
              label="Session Storage"
              value="In-memory"
            />

            <SettingRow
              label="Session Expiration"
              value={
                expiresAt

                  ? new Date(
                      expiresAt
                    ).toLocaleString("en-IN")

                  : "Not available"
              }
            />

          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-900/60 p-4">

            <LockKeyhole
              size={18}
              className="shrink-0 text-violet-400"
            />

            <p className="text-xs leading-relaxed text-slate-400">

              Administrator sessions are not persisted
              in browser localStorage. Reloading the
              portal requires authentication again.

            </p>

          </div>

        </section>

        {/* =============================
            PLATFORM CONFIGURATION
            ============================= */}

        <section className={panelClass}>

          <div className="flex items-center gap-3">

            <Server
              size={23}
              className="text-violet-400"
            />

            <h2 className="font-semibold text-white">

              Platform Configuration

            </h2>

          </div>

          <div className="mt-4">

            <SettingRow
              label="Environment"
              value={
                health?.application.environment ??
                "N/A"
              }
            />

            <SettingRow
              label="Deployment Mode"
              value={
                health?.application.deploymentMode ??
                "N/A"
              }
            />

            <SettingRow
              label="Node.js Version"
              value={
                health?.application.nodeVersion ??
                "N/A"
              }
            />

            <SettingRow
              label="Primary AI Provider"
              value={
                health?.configuration.primaryAIProvider ??
                "N/A"
              }
            />

            <SettingRow
              label="Fallback AI Provider"
              value={
                health?.configuration.fallbackAIProvider ??
                "N/A"
              }
            />

            <SettingRow
              label="Automatic AI Fallback"
              value={
                !health

                  ? "N/A"

                  : health.configuration.fallbackEnabled

                    ? "Enabled"

                    : "Disabled"
              }
            />

            <SettingRow
              label="Daily AI Quotas"
              value={
                !health

                  ? "N/A"

                  : health.configuration.quotaEnabled

                    ? "Enabled"

                    : "Disabled"
              }
            />

            <SettingRow
              label="AI Usage Tracking"
              value={
                !health

                  ? "N/A"

                  : health.configuration.aiUsageTrackingEnabled

                    ? "Enabled"

                    : "Disabled"
              }
            />

          </div>

        </section>

      </div>

      {/* ===============================
          DATA RETENTION CONFIGURATION
          =============================== */}

      <section className={panelClass}>

        <div className="flex items-center gap-3">

          <Database
            size={22}
            className="text-violet-400"
          />

          <h2 className="font-semibold text-white">

            Data Retention Configuration

          </h2>

        </div>

        <div className="mt-4">

          <SettingRow
            label="User Activity Retention"
            value="90 days (configured default)"
          />

          <SettingRow
            label="AI Usage Retention"
            value="90 days (configured default)"
          />

          <SettingRow
            label="Administrator Audit Retention"
            value="No automatic expiration configured"
          />

          <SettingRow
            label="Daily Quota Timezone"
            value="UTC"
          />

        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">

          Configuration is read-only in the administrator
          portal. Backend configuration changes require
          controlled server updates.

        </p>

      </section>

      {/* ===============================
          SESSION MANAGEMENT
          =============================== */}

      <section className="rounded-2xl border border-red-500/20 bg-[#111522] p-5">

        <div className="flex flex-wrap items-center justify-between gap-5">

          <div className="flex items-center gap-4">

            <div className="rounded-xl bg-red-500/10 p-3">

              <LogOut
                size={24}
                className="text-red-400"
              />

            </div>

            <div>

              <h2 className="font-semibold text-white">

                Administrator Session

              </h2>

              <p className="mt-1 text-sm text-slate-400">

                Sign out of your current administrator session.

              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              setShowLogoutDialog(true)
            }
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400 hover:bg-red-500/20"
          >

            Sign Out

          </button>

        </div>

      </section>

      {/* ===============================
          LAST SYSTEM UPDATE
          =============================== */}

      <p className="flex items-center justify-end gap-2 text-xs text-slate-500">

        <Clock3 size={14} />

        Last system check: {
          formatDate(health?.checkedAt)
        }

      </p>

      {/* ===============================
          LOGOUT CONFIRMATION DIALOG
          =============================== */}

      {showLogoutDialog && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#111522] p-6"
          >

            <LogOut
              size={30}
              className="text-red-400"
            />

            <h2
              id="logout-title"
              className="mt-4 text-lg font-semibold text-white"
            >

              Sign out of administrator portal?

            </h2>

            <p className="mt-3 text-sm text-slate-400">

              You will need to enter your administrator
              credentials and authenticator code again.

            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  setShowLogoutDialog(false)
                }
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >

                Cancel

              </button>

              <button
                type="button"
                onClick={logout}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
              >

                Sign Out

              </button>

            </div>

          </section>

        </div>

      )}

    </div>

  );
}