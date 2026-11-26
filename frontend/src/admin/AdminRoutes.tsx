import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  AdminAuthProvider,
} from "./context/AdminAuthContext";

import AdminProtectedRoute from "./components/AdminProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminUserProfile from "./pages/AdminUserProfile";
import AdminAIUsage from "./pages/AdminAIUsage";
import AdminQuotas from "./pages/AdminQuotas";
import AdminSystemHealth from "./pages/AdminSystemHealth";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminPrivacy from "./pages/AdminPrivacy";
import AdminSettings from "./pages/AdminSettings";

export default function AdminRoutes() {

  return (

    <AdminAuthProvider>

      <Routes>

        {/* PUBLIC ADMINISTRATOR LOGIN */}

        <Route
          path="login"
          element={<AdminLogin />}
        />

        {/* PROTECTED ADMINISTRATOR ROUTES */}

        <Route element={<AdminProtectedRoute />}>

          <Route element={<AdminLayout />}>

            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />

            <Route
              path="dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="analytics"
              element={<AdminDashboard />}
            />

            <Route
              path="users"
              element={<AdminUsers />}
            />

            <Route
              path="users/:userId"
              element={<AdminUserProfile />}
            />

            <Route
              path="ai-usage"
              element={<AdminAIUsage />}
            />

            <Route
              path="quotas"
              element={<AdminQuotas />}
            />

            <Route
              path="system-health"
              element={<AdminSystemHealth />}
            />

            <Route
              path="audit-logs"
              element={<AdminAuditLogs />}
            />

            <Route
              path="privacy"
              element={<AdminPrivacy />}
            />

            <Route
              path="settings"
              element={<AdminSettings />}
            />

          </Route>

        </Route>

        {/* FALLBACK ROUTE */}

        <Route
          path="*"
          element={
            <Navigate
              to="/admin/dashboard"
              replace
            />
          }
        />

      </Routes>

    </AdminAuthProvider>

  );
}