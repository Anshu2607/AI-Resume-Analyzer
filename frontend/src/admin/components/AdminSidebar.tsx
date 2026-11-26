import {
  NavLink,
} from "react-router-dom";

import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  ChartNoAxesCombined,
  BrainCircuit,
  Gauge,
  Activity,
  ScrollText,
  Shield,
  Settings,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationGroups = [

  {
    title: "WORKSPACE",

    items: [

      {
        label: "Overview",
        path: "/admin/dashboard",
        icon: LayoutDashboard,
      },

      {
        label: "User Management",
        path: "/admin/users",
        icon: Users,
      },

      {
        label: "Platform Analytics",
        path: "/admin/analytics",
        icon: ChartNoAxesCombined,
      },
    ],
  },

  {
    title: "AI MANAGEMENT",

    items: [

      {
        label: "AI Usage & Costs",
        path: "/admin/ai-usage",
        icon: BrainCircuit,
      },

      {
        label: "Usage Quotas",
        path: "/admin/quotas",
        icon: Gauge,
      },
    ],
  },

  {
    title: "SYSTEM & SECURITY",

    items: [

      {
        label: "System Health",
        path: "/admin/system-health",
        icon: Activity,
      },

      {
        label: "Audit Logs",
        path: "/admin/audit-logs",
        icon: ScrollText,
      },

      {
        label: "Privacy & Data",
        path: "/admin/privacy",
        icon: Shield,
      },

      {
        label: "Settings",
        path: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export default function AdminSidebar({
  isOpen,
  onClose,
}: AdminSidebarProps) {

  const {
    user,
    logout,
  } = useAdminAuth();

  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join("")
      .toUpperCase() || "AD";

  return (

    <>

      {/* MOBILE OVERLAY */}

      {isOpen && (

        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />

      )}

      {/* SIDEBAR */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-800
          bg-[#0c101b]
          transition-transform duration-300
          lg:sticky lg:top-0 lg:h-screen
          lg:shrink-0 lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >

        {/* BRAND */}

        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-800 px-5">

          <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-2.5">

            <ShieldCheck
              size={25}
              className="text-violet-400"
            />

          </div>

          <div className="min-w-0 flex-1">

            <h1 className="text-sm font-bold text-white">
              CareerLens AI
            </h1>

            <p className="mt-1 text-[10px] tracking-widest text-slate-500">
              ADMIN PORTAL
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="text-slate-400 lg:hidden"
          >
            <X size={20} />
          </button>

        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">

          {navigationGroups.map((group) => (

            <section key={group.title}>

              <p className="mb-3 px-3 text-[10px] font-semibold tracking-widest text-slate-500">

                {group.title}

              </p>

              <div className="space-y-1">

                {group.items.map((item) => (

                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `
                      group flex items-center gap-3
                      rounded-lg px-3 py-3
                      text-sm font-medium transition
                      ${
                        isActive

                          ? "bg-violet-500/15 text-violet-300"

                          : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                      }
                    `}
                  >

                    {({ isActive }) => (

                      <>

                        <item.icon
                          size={19}
                          className={
                            isActive
                              ? "text-violet-400"
                              : "text-slate-500 group-hover:text-slate-300"
                          }
                        />

                        <span className="flex-1">
                          {item.label}
                        </span>

                        {isActive && (
                          <ChevronRight size={14} />
                        )}

                      </>

                    )}

                  </NavLink>

                ))}

              </div>

            </section>

          ))}

        </nav>

        {/* ADMIN ACCOUNT */}

        <div className="shrink-0 border-t border-slate-800 p-4">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-300">

              {initials}

            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-semibold text-white">

                {user?.name || "Administrator"}

              </p>

              <p className="mt-1 truncate text-xs text-slate-500">

                {user?.email}

              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/15 bg-red-500/5 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/15"
          >

            <LogOut size={17} />

            Sign Out

          </button>

        </div>

      </aside>

    </>
  );
}