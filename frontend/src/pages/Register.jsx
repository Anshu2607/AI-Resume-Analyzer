import Navbar from "../components/Navbar";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { registerUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] =
    useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const validateEmail = (value) => {
    const regex =
      /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return regex.test(value);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setError("All fields are required.");
      return;
    }

    if (!validateEmail(email)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await registerUser({
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccess(
        response.message ||
          "Registration successful!"
      );

      // Clear form
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");

      // Redirect to login
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Registration Error:", err);

      setError(
        err.response?.data?.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">
          {/* Left Panel */}
          <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white p-12">
            <h1 className="text-4xl font-bold mb-6">
              Start Your Career Journey
            </h1>
            <p className="text-purple-100 leading-relaxed">
              Create your account to analyze
              resumes, match job descriptions,
              and prepare for interviews.
            </p>
          </div>

          {/* Right Panel */}
          <div className="p-10">
            <h2 className="text-4xl font-bold text-center mb-2 dark:text-white">
              Register
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
              Create your account
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">
                {success}
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >
              {/* Name */}
              <div className="relative">
                <User
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Username */}
              <div className="relative">
                <AtSign
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    setPassword(e.target.value)
                  }
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading
                  ? "Creating Account..."
                  : "Register"}
              </button>
            </form>

            <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-purple-600 font-medium"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}