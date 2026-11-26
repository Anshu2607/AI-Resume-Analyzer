import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  Menu,
  ShieldCheck,
  Clock3,
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

const PAGE_TITLES: Record<string, string> = {

  "/admin/dashboard": "Dashboard Overview",

  "/admin/users": "User Management",

  "/admin/analytics": "Platform Analytics",

  "/admin/ai-usage": "AI Usage & Costs",

  "/admin/quotas": "Usage Quotas",

  "/admin/system-health": "System Health",

  "/admin/audit-logs": "Administrator Audit Logs",

  "/admin/privacy": "Privacy & Data Management",

  "/admin/settings": "Administrator Settings",
};

export default function AdminLayout() {

  const location = useLocation();

  const {
    user,
    expiresAt,
  } = useAdminAuth();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const pageTitle =

    PAGE_TITLES[location.pathname] ??

    (
      location.pathname.startsWith("/admin/users/")

        ? "User Profile"

        : "Administration Portal"
    );

  useEffect(() => {

    if (!expiresAt) {
      return;
    }

    const updateTimer = () => {

      setRemainingSeconds(

        Math.max(

          0,

          Math.ceil(
            (expiresAt - Date.now()) / 1000
          )

        )
      );
    };

    updateTimer();

    const timer =
      window.setInterval(updateTimer, 1000);

    return () => {

      window.clearInterval(timer);

    };

  }, [expiresAt]);

  const minutes =
    Math.floor(remainingSeconds / 60);

  const seconds =
    String(remainingSeconds % 60)
      .padStart(2, "0");

  return (

    <div className="flex min-h-screen bg-[#080b14] text-slate-200">

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">

        {/* TOP NAVIGATION */}

        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-slate-800 bg-[#0c101b]/95 px-4 backdrop-blur-xl sm:px-7">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg border border-slate-700 p-2 text-slate-300 lg:hidden"
            >

              <Menu size={21} />

            </button>

            <div className="min-w-0">

              <p className="text-xs text-slate-500">

                Administration / Workspace

              </p>

              <h2 className="mt-1 truncate text-base font-semibold text-white sm:text-xl">

                {pageTitle}

              </h2>

            </div>

          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">

            {/* SECURE SESSION */}

            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-medium text-emerald-400 md:flex">

              <ShieldCheck size={15} />

              MFA Verified

            </div>

            {/* SESSION TIMER */}

            <div
              title="Remaining administrator session time"
              className={`
                flex items-center gap-2
                rounded-lg border px-3 py-2
                text-xs font-medium tabular-nums
                ${
                  remainingSeconds <= 300

                    ? "border-red-500/20 bg-red-500/10 text-red-400"

                    : "border-slate-800 bg-slate-900 text-slate-400"
                }
              `}
            >

              <Clock3 size={15} />

              {minutes}:{seconds}

            </div>

            <div className="hidden h-8 w-px bg-slate-800 sm:block" />

            <div className="hidden text-right sm:block">

              <p className="text-sm font-medium text-white">

                {user?.name || "Administrator"}

              </p>

              <p className="mt-1 text-xs text-slate-500">

                Administrator

              </p>

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}

        <main className="min-h-[calc(100vh-144px)] p-4 sm:p-7">

          <Outlet />

        </main>

        {/* FOOTER */}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-7 py-5 text-xs text-slate-600">

          <span>

            © {new Date().getFullYear()} CareerLens AI

          </span>

          <span className="flex items-center gap-2">

            <ShieldCheck size={14} />

            Restricted Administration Workspace

          </span>

        </footer>

      </div>

    </div>

  );
}