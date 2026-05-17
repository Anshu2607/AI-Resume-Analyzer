import Navbar from "../components/Navbar";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { loginUser } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (
      !identifier.trim() ||
      !password.trim()
    ) {
      setError(
        "Username/Email and password are required."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await loginUser({
        identifier: identifier.trim(),
        password,
      });

      localStorage.setItem(
        "isLoggedIn",
        "true"
      );
      localStorage.setItem(
        "userEmail",
        data.email || ""
      );
      localStorage.setItem(
        "username",
        data.username || ""
      );
      localStorage.setItem(
        "userName",
        data.name || ""
      );

      navigate("/dashboard");
    } catch (err) {
      console.error("Login Error:", err);

      setError(
        err.response?.data?.message ||
          "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">
          {/* Left Panel */}
          <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-blue-600 to-purple-600 text-white p-12">
            <h1 className="text-4xl font-bold mb-6">
              Welcome Back
            </h1>
            <p className="text-blue-100 leading-relaxed">
              Sign in to continue analyzing
              resumes and preparing for
              interviews.
            </p>
          </div>

          {/* Right Panel */}
          <div className="p-10">
            <h2 className="text-4xl font-bold text-center mb-2 dark:text-white">
              Login
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
              Sign in using username or email
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              {/* Username or Email */}
              <div className="relative">
                <User
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Username or Email"
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(
                      e.target.value
                    )
                  }
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-3.5 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading
                  ? "Logging in..."
                  : "Login"}
              </button>
            </form>

            <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-600 font-medium"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}