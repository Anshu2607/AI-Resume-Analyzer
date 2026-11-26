import { useState } from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  FileText,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  Map,
  MessagesSquare,
  History,
  Settings,
  BrainCircuit,
  Bot,
  Sparkles,
  LogOut,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

// =====================================
// DASHBOARD NAVIGATION
// =====================================

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Resume Analysis",
    path: "/resume-analysis",
    icon: FileText,
  },
  {
    name: "AI Career Assistant",
    path: "/ai-assistant",
    icon: BrainCircuit,
  },
  {
    name: "Job Matching",
    path: "/job-matching",
    icon: BriefcaseBusiness,
  },
  {
    name: "Skill Gap Analysis",
    path: "/skill-gaps",
    icon: ChartNoAxesColumn,
  },
  {
    name: "Career Roadmap",
    path: "/career-roadmap",
    icon: Map,
  },
  {
    name: "Career AI Agent",
    path: "/ai-agent",
    icon: Bot,
  },
  {
    name: "AI Interview",
    path: "/ai-interview",
    icon: MessagesSquare,
  },
  {
    name: "History",
    path: "/history",
    icon: History,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

// =====================================
// DASHBOARD LAYOUT
// =====================================

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const currentPage =
    navigation.find(
      (item) => item.path === location.pathname
    )?.name || "Dashboard";

  // Generate user initials

  const userInitials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  // Logout

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100">

      {/* Mobile Sidebar Overlay */}

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close mobile navigation"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Dashboard Sidebar */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-slate-800
          bg-[#101827]
          transition-all duration-300

          ${
            sidebarCollapsed
              ? "lg:w-20"
              : "lg:w-64"
          }

          ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }

          w-64
          lg:translate-x-0
        `}
      >

        {/* Brand Section */}

        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-4">

          <NavLink
            to="/dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/20">

              <BrainCircuit
                size={25}
                className="text-white"
              />

            </div>

            <div
              className={`min-w-0 ${
                sidebarCollapsed ? "lg:hidden" : ""
              }`}
            >

              <h1 className="truncate text-base font-bold tracking-tight text-white">
                CareerLens AI
              </h1>

              <p className="truncate text-[10px] text-slate-400">
                Career Intelligence Platform
              </p>

            </div>

          </NavLink>

          {/* Mobile Close Button */}

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>

        </div>

        {/* Navigation Section */}

        <nav className="flex-1 overflow-y-auto px-3 py-6">

          <p
            className={`mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${
              sidebarCollapsed ? "lg:hidden" : ""
            }`}
          >
            Workspace
          </p>

          <div className="space-y-1.5">

            {navigation.map((item) => {

              const Icon = item.icon;

              const isAIFeature =
                item.path === "/ai-assistant" ||
                item.path === "/ai-agent";

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `
                      group relative
                      flex items-center gap-3
                      rounded-xl px-3 py-3
                      text-sm font-medium
                      transition-all duration-200

                      ${
                        sidebarCollapsed
                          ? "lg:justify-center"
                          : ""
                      }

                      ${
                        isActive
                          ? "bg-violet-500/15 text-violet-300"
                          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                      }
                    `
                  }
                >

                  {({ isActive }) => (
                    <>

                      <Icon
                        size={20}
                        className={`shrink-0 ${
                          isActive
                            ? "text-violet-400"
                            : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      />

                      <span
                        className={`min-w-0 flex-1 truncate ${
                          sidebarCollapsed
                            ? "lg:hidden"
                            : ""
                        }`}
                      >
                        {item.name}
                      </span>

                      {isAIFeature && !isActive && (
                        <Sparkles
                          size={13}
                          className={`shrink-0 text-violet-400 ${
                            sidebarCollapsed
                              ? "lg:hidden"
                              : ""
                          }`}
                        />
                      )}

                      {isActive && (
                        <span className="absolute inset-y-3 right-0 w-[3px] rounded-full bg-violet-400" />
                      )}

                    </>
                  )}

                </NavLink>
              );
            })}

          </div>

        </nav>

        {/* AI Information Card */}

        <div
          className={`shrink-0 px-4 pb-4 ${
            sidebarCollapsed ? "lg:hidden" : ""
          }`}
        >

          <div className="rounded-xl border border-violet-500/15 bg-linear-to-br from-violet-500/10 to-indigo-500/5 p-4">

            <div className="flex items-center gap-2">

              <Sparkles
                size={17}
                className="text-violet-400"
              />

              <span className="text-xs font-semibold text-violet-300">
                AI-Powered Workspace
              </span>

            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Intelligent insights to help you
              understand and accelerate your career.
            </p>

          </div>

        </div>

        {/* User Account Section */}

        <div className="shrink-0 border-t border-slate-800 p-3">

          <div
            className={`flex items-center gap-3 rounded-xl p-2 ${
              sidebarCollapsed
                ? "lg:justify-center"
                : ""
            }`}
          >

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-700 text-sm font-semibold text-white">
              {userInitials}
            </div>

            <div
              className={`min-w-0 flex-1 ${
                sidebarCollapsed ? "lg:hidden" : ""
              }`}
            >

              <p className="truncate text-sm font-medium text-slate-100">
                {user?.name || "CareerLens User"}
              </p>

              <p className="truncate text-[11px] text-slate-500">
                {user?.email || "My Account"}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Logout"
            className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 ${
              sidebarCollapsed
                ? "lg:justify-center"
                : ""
            }`}
          >

            <LogOut
              size={19}
              className="shrink-0"
            />

            <span
              className={
                sidebarCollapsed ? "lg:hidden" : ""
              }
            >
              Logout
            </span>

          </button>

        </div>

      </aside>

      {/* Main Dashboard Area */}

      <div
        className={`flex min-h-screen min-w-0 flex-col transition-all duration-300 ${
          sidebarCollapsed
            ? "lg:ml-20"
            : "lg:ml-64"
        }`}
      >

        {/* Dashboard Header */}

        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0b1120]/95 px-4 backdrop-blur-md sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            {/* Mobile Menu Toggle */}

            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <Menu size={22} />
            </button>

            {/* Desktop Sidebar Toggle */}

            <button
              type="button"
              aria-label={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              onClick={() =>
                setSidebarCollapsed(
                  (previous) => !previous
                )
              }
              className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:block"
            >

              {sidebarCollapsed ? (
                <PanelLeftOpen size={21} />
              ) : (
                <PanelLeftClose size={21} />
              )}

            </button>

            {/* Breadcrumb */}

            <div className="flex min-w-0 items-center gap-2">

              <span className="hidden text-xs text-slate-500 sm:inline">
                Workspace
              </span>

              <ChevronRight
                size={14}
                className="hidden shrink-0 text-slate-600 sm:block"
              />

              <h2 className="truncate text-sm font-semibold text-slate-100">
                {currentPage}
              </h2>

            </div>

          </div>

          {/* Header Right Section */}

          <div className="flex shrink-0 items-center gap-3">

            <div className="hidden items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 sm:flex">

              <Sparkles
                size={14}
                className="text-violet-400"
              />

              <span className="text-[11px] font-medium text-violet-300">
                AI Workspace
              </span>

            </div>

            <div className="hidden h-7 w-px bg-slate-800 sm:block" />

            <NavLink
              to="/settings"
              title="Account settings"
              aria-label="Account settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-violet-500/40 hover:text-violet-300"
            >
              <UserCircle size={20} />
            </NavLink>

          </div>

        </header>

        {/* Render Current Page */}

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
}