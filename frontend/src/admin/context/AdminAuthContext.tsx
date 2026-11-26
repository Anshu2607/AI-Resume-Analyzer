import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  setAdminAccessToken,
  ADMIN_SESSION_EXPIRED_EVENT,
} from "../services/adminApi";

import {
  adminAuthService,
} from "../services/adminAuth.service";

import type {
  AdminUser,
  AdminSession,
} from "../types/admin.types";

// =====================================
// CONTEXT TYPES
// =====================================

interface AdminAuthContextType {

  user: AdminUser | null;

  token: string | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  expiresAt: number | null;

  establishSession: (
    session: AdminSession
  ) => void;

  logout: () => void;

}

const AdminAuthContext =
  createContext<
    AdminAuthContextType | undefined
  >(undefined);

// =====================================
// AUTHENTICATION PROVIDER
// =====================================

export const AdminAuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {

  const [user, setUser] =
    useState<AdminUser | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [expiresAt, setExpiresAt] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const tokenRef =
    useRef<string | null>(null);

  const logoutInProgress =
    useRef(false);

  const sessionGeneration =
    useRef(0);

  // ===================================
  // CLEAR LOCAL ADMINISTRATOR SESSION
  // ===================================

  const clearSession = useCallback(() => {

    sessionGeneration.current += 1;

    tokenRef.current = null;

    logoutInProgress.current = false;

    setAdminAccessToken(null);

    setToken(null);

    setUser(null);

    setExpiresAt(null);

    setIsLoading(false);

  }, []);

  // ===================================
  // SERVER-SIDE LOGOUT
  // ===================================

  const logout = useCallback(() => {

    if (logoutInProgress.current) {
      return;
    }

    if (!tokenRef.current) {

      clearSession();

      return;
    }

    logoutInProgress.current = true;

    setIsLoading(true);

    const generation =
      sessionGeneration.current;

    void adminAuthService.logout()

      .catch(() => {

        // Always clear local authentication,
        // even if the backend is unreachable.

        if (
          generation === sessionGeneration.current
        ) {

          window.alert(

            "You will be signed out locally, but server-side " +
            "session revocation could not be confirmed. " +
            "The previous token may remain valid until expiration."

          );

        }

      })

      .finally(() => {

        // Prevent an older asynchronous request
        // from clearing a newer login session.

        if (
          generation === sessionGeneration.current
        ) {

          clearSession();

        }

      });

  }, [clearSession]);

  // ===================================
  // ESTABLISH ADMIN SESSION
  // ===================================

  const establishSession = useCallback(
    (session: AdminSession) => {

      if (

        !session.token ||

        session.user?.role !== "admin" ||

        session.user?.status !== "active" ||

        session.mfaVerified !== true ||

        !Number.isFinite(session.expiresIn) ||

        session.expiresIn <= 0 ||

        session.expiresIn > 1800

      ) {

        clearSession();

        throw new Error(
          "Invalid administrator session"
        );

      }

      sessionGeneration.current += 1;

      logoutInProgress.current = false;

      tokenRef.current = session.token;

      setAdminAccessToken(
        session.token
      );

      setToken(session.token);

      setUser(session.user);

      setExpiresAt(

        Date.now() +
        session.expiresIn * 1000

      );

      setIsLoading(false);

    },
    [clearSession]
  );

  // ===================================
  // HANDLE INVALID OR REVOKED JWT
  // ===================================

  useEffect(() => {

    // A rejected JWT must be cleared directly.
    // Do not attempt another logout API request.

    window.addEventListener(

      ADMIN_SESSION_EXPIRED_EVENT,

      clearSession

    );

    return () => {

      window.removeEventListener(

        ADMIN_SESSION_EXPIRED_EVENT,

        clearSession

      );

    };

  }, [clearSession]);

  // ===================================
  // AUTOMATIC SESSION EXPIRATION
  // ===================================

  useEffect(() => {

    if (!expiresAt) {
      return;
    }

    const remaining =
      expiresAt - Date.now();

    if (remaining <= 0) {

      clearSession();

      return;
    }

    const timer =
      window.setTimeout(

        clearSession,

        remaining

      );

    const verifyExpiration = () => {

      if (Date.now() >= expiresAt) {

        clearSession();

      }

    };

    window.addEventListener(

      "focus",

      verifyExpiration

    );

    document.addEventListener(

      "visibilitychange",

      verifyExpiration

    );

    return () => {

      window.clearTimeout(timer);

      window.removeEventListener(

        "focus",

        verifyExpiration

      );

      document.removeEventListener(

        "visibilitychange",

        verifyExpiration

      );

    };

  }, [expiresAt, clearSession]);

  // ===================================
  // AUTHENTICATION STATE
  // ===================================

  const isAuthenticated = Boolean(

    token &&

    user?.role === "admin" &&

    expiresAt &&

    expiresAt > Date.now()

  );

  return (

    <AdminAuthContext.Provider
      value={{

        user,

        token,

        expiresAt,

        isAuthenticated,

        isLoading,

        establishSession,

        logout,

      }}
    >

      {children}

    </AdminAuthContext.Provider>

  );
};

// =====================================
// ADMINISTRATOR AUTHENTICATION HOOK
// =====================================

export const useAdminAuth = () => {

  const context =
    useContext(AdminAuthContext);

  if (!context) {

    throw new Error(

      "useAdminAuth must be used within AdminAuthProvider"

    );

  }

  return context;
};