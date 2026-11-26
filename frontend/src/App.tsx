import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import DashboardLayout from "./layouts/DashboardLayout";

// =====================================
// ADMINISTRATOR PORTAL
// =====================================

import AdminRoutes from "./admin/AdminRoutes";

// =====================================
// PUBLIC PAGES
// =====================================

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

// =====================================
// DASHBOARD PAGES
// =====================================

import Dashboard from "./pages/Dashboard";
import ResumeAnalysis from "./pages/ResumeAnalysis";
import AICareerAssistant from "./pages/AICareerAssistant";
import JobMatching from "./pages/JobMatching";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import CareerRoadmap from "./pages/CareerRoadmap";
import AICareerAgent from "./pages/AICareerAgent";
import AIInterview from "./pages/AIInterview";

// =====================================
// UPCOMING MODULES
// =====================================

import ModulePlaceholder from "./pages/ModulePlaceholder";

// =====================================
// APPLICATION ROUTES
// =====================================

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Administrator Portal */}

          <Route
            path="/admin/*"
            element={<AdminRoutes />}
          />

          {/* Landing Page */}

          <Route
            path="/"
            element={<Landing />}
          />

          {/* Public Routes */}

          <Route element={<PublicRoute />}>

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

          </Route>

          {/* Protected User Routes */}

          <Route element={<ProtectedRoute />}>

            <Route element={<DashboardLayout />}>

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/resume-analysis"
                element={<ResumeAnalysis />}
              />

              <Route
                path="/ai-assistant"
                element={<AICareerAssistant />}
              />

              <Route
                path="/job-matching"
                element={<JobMatching />}
              />

              <Route
                path="/skill-gaps"
                element={<SkillGapAnalysis />}
              />

              <Route
                path="/career-roadmap"
                element={<CareerRoadmap />}
              />

              {/* Agentic AI */}

              <Route
                path="/ai-agent"
                element={<AICareerAgent />}
              />

              {/* AI Interview Preparation */}

              <Route
                path="/ai-interview"
                element={<AIInterview />}
              />

              {/* History */}

              <Route
                path="/history"
                element={
                  <ModulePlaceholder
                    title="History"
                    description="Access your previous analyses and career activities."
                  />
                }
              />

              {/* Settings */}

              <Route
                path="/settings"
                element={
                  <ModulePlaceholder
                    title="Settings"
                    description="Manage your profile, preferences and account settings."
                  />
                }
              />

            </Route>

          </Route>

          {/* Fallback Route */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;