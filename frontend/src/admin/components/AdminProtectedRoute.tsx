import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  Loader2,
} from "lucide-react";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

export default function AdminProtectedRoute() {

  const {
    isAuthenticated,
    isLoading,
    user,
  } = useAdminAuth();

  const location = useLocation();

  if (isLoading) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#080b14]">

        <Loader2
          size={36}
          className="animate-spin text-violet-400"
        />

      </div>
    );
  }

  if (
    !isAuthenticated ||
    user?.role !== "admin" ||
    user?.status !== "active"
  ) {

    return (

      <Navigate
        to="/admin/login"
        state={{ from: location.pathname }}
        replace
      />

    );
  }

  return <Outlet />;
}