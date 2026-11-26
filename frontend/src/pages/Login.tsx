import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || "Unable to log in"
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">

      {/* Branding Section */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">

        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-3">
            <BrainCircuit size={26} />
          </div>

          <span className="text-2xl font-bold">
            CareerLens AI
          </span>
        </div>

        <div className="relative max-w-lg">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
            <Sparkles size={16} />
            AI-Powered Career Intelligence
          </div>

          <h1 className="text-5xl font-bold leading-tight">
            Your career.
            <br />
            <span className="text-indigo-400">
              A smarter direction.
            </span>
          </h1>

          <p className="mt-6 leading-relaxed text-slate-400">
            Understand your strengths, discover skill gaps,
            and build a personalized path towards your dream career.
          </p>

          <div className="mt-10 space-y-5">

            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-400">
                <BrainCircuit size={22} />
              </div>
              <span>Intelligent resume analysis</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-400">
                <Target size={22} />
              </div>
              <span>Semantic job matching</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-400">
                <TrendingUp size={22} />
              </div>
              <span>Personalized career roadmaps</span>
            </div>

          </div>
        </div>

        <p className="relative text-sm text-slate-500">
          © {new Date().getFullYear()} CareerLens AI
        </p>

      </div>

      {/* Login Form */}
      <div className="flex items-center justify-center px-6 py-12">

        <div className="w-full max-w-md">

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrainCircuit className="text-indigo-600" size={30} />
            <span className="text-xl font-bold">CareerLens AI</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-slate-500">
            Sign in to continue your career journey.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-3.5 text-slate-400" size={18} />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-12 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
              Create account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;