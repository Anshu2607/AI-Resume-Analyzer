import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import LoadingScreen from "../components/LoadingScreen";

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;