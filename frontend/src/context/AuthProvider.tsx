import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AuthContext } from "./AuthContext";
import { authService } from "../services/auth.service";

import type {
  User,
  LoginInput,
  RegisterInput,
} from "../types/auth.types";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({
  children,
}: AuthProviderProps) => {

  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Restore authentication on page refresh
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      const token = localStorage.getItem("careerlens_token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authService.getProfile();

        if (active) {
          setUser(response.data);
        }
      } catch {
        if (active) {
          localStorage.removeItem("careerlens_token");
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  // Login
  const login = async (data: LoginInput): Promise<void> => {
    const response = await authService.login(data);

    localStorage.setItem(
      "careerlens_token",
      response.data.token
    );

    setUser(response.data.user);
  };

  // Registration
  const register = async (
    data: RegisterInput
  ): Promise<void> => {
    const response = await authService.register(data);

    localStorage.setItem(
      "careerlens_token",
      response.data.token
    );

    setUser(response.data.user);
  };

  // Logout
  const logout = (): void => {
    localStorage.removeItem("careerlens_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};