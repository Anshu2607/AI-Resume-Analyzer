import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requirements = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      valid: /[a-z]/.test(password),
    },
    {
      label: "One number",
      valid: /[0-9]/.test(password),
    },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!requirements.every((item) => item.valid)) {
      setError("Please meet all password requirements.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must not exceed 72 bytes.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name, email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || "Registration failed"
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">

      {/* Branding Section */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">

        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-3">
            <BrainCircuit size={26} />
          </div>
          <span className="text-2xl font-bold">CareerLens AI</span>
        </div>

        <div className="relative max-w-lg">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
            <Sparkles size={16} />
            Build your future with AI
          </div>

          <h1 className="text-5xl font-bold leading-tight">
            Unlock your
            <br />
            <span className="text-indigo-400">
              career potential.
            </span>
          </h1>

          <p className="mt-6 leading-relaxed text-slate-400">
            Discover where you stand today and what you need
            to achieve your professional goals tomorrow.
          </p>

          <div className="mt-10 space-y-5">
            {[
              "AI-powered resume intelligence",
              "Explainable job compatibility scores",
              "Personalized skill-gap analysis",
              "Intelligent interview preparation",
              "Customized career development plans",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 size={21} className="text-indigo-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

        </div>

        <p className="relative text-sm text-slate-500">
          © {new Date().getFullYear()} CareerLens AI
        </p>

      </div>

      {/* Registration Form */}
      <div className="flex items-center justify-center px-6 py-10">

        <div className="w-full max-w-md">

          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrainCircuit className="text-indigo-600" size={30} />
            <span className="text-xl font-bold">CareerLens AI</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Create your account
          </h2>

          <p className="mt-2 text-slate-500">
            Start building your smarter career journey.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">

            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                Full name
              </label>

              <div className="relative">
                <UserRound size={18} className="absolute left-4 top-3.5 text-slate-400" />

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  minLength={2}
                  maxLength={100}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>

              <div className="relative">
                <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative">
                <LockKeyhole size={18} className="absolute left-4 top-3.5 text-slate-400" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className={`${inputClass} pr-12`}
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

              <div className="mt-3 grid grid-cols-2 gap-2">
                {requirements.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      item.valid ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    {item.label}
                  </div>
                ))}
              </div>

            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                Confirm password
              </label>

              <div className="relative">
                <LockKeyhole size={18} className="absolute left-4 top-3.5 text-slate-400" />

                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Register;