import {
  useEffect,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  ShieldCheck,
  Shield,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  KeyRound,
  Activity,
  Users,
  BarChart3,
} from "lucide-react";

import {
  useAdminAuth,
} from "../context/AdminAuthContext";

import {
  adminAuthService,
} from "../services/adminAuth.service";

import {
  getAdminErrorMessage,
} from "../services/adminApi";

type LoginStage =
  "credentials" | "verification";

const inputClass =
  "w-full rounded-xl border border-slate-700 " +
  "bg-slate-900/80 px-4 py-3.5 text-sm " +
  "text-white placeholder:text-slate-500 " +
  "outline-none transition focus:border-violet-500 " +
  "focus:ring-2 focus:ring-violet-500/20";

export default function AdminLogin() {

  const navigate = useNavigate();

  const {
    isAuthenticated,
    establishSession,
  } = useAdminAuth();

  const [stage, setStage] =
    useState<LoginStage>("credentials");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [otp, setOtp] =
    useState("");

  const [challengeToken, setChallengeToken] =
    useState("");

  const [challengeExpiresAt, setChallengeExpiresAt] =
    useState<number | null>(null);

  const [secondsRemaining, setSecondsRemaining] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===================================
  // CHALLENGE EXPIRATION TIMER
  // ===================================

  useEffect(() => {

    if (
      stage !== "verification" ||
      !challengeExpiresAt
    ) {
      return;
    }

    const updateCountdown = () => {

      const remaining =
        Math.max(
          0,
          Math.ceil(
            (challengeExpiresAt - Date.now()) /
            1000
          )
        );

      setSecondsRemaining(remaining);
    };

    updateCountdown();

    const interval =
      window.setInterval(
        updateCountdown,
        1000
      );

    return () => {
      window.clearInterval(interval);
    };

  }, [stage, challengeExpiresAt]);

  // ===================================
  // RESET LOGIN FLOW
  // ===================================

  const resetLogin = () => {

    setStage("credentials");

    setChallengeToken("");

    setChallengeExpiresAt(null);

    setPassword("");

    setOtp("");

    setError("");

    setSecondsRemaining(0);
  };

  // ===================================
  // ADMIN CREDENTIAL VERIFICATION
  // ===================================

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    setLoading(true);

    try {

      const challenge =
        await adminAuthService.login({

          email: email.trim(),

          password,
        });

      setPassword("");

      if (challenge.setupRequired) {

        setError(
          "Administrator MFA enrollment is required. " +
          "Complete secure enrollment before logging in."
        );

        return;
      }

      if (
        !challenge.mfaRequired ||
        !challenge.challengeToken ||
        !Number.isFinite(challenge.expiresIn) ||
        challenge.expiresIn <= 0
      ) {

        throw new Error(
          "Invalid authentication challenge"
        );
      }

      setChallengeToken(
        challenge.challengeToken
      );

      setChallengeExpiresAt(

        Date.now() +
        challenge.expiresIn * 1000

      );

      setSecondsRemaining(
        challenge.expiresIn
      );

      setStage("verification");

    } catch (err) {

      setError(
        getAdminErrorMessage(err)
      );

    } finally {

      setLoading(false);

    }
  };

  // ===================================
  // MFA VERIFICATION
  // ===================================

  const handleVerification = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (!/^[0-9]{6}$/.test(otp)) {

      setError(
        "Enter a valid six-digit authenticator code."
      );

      return;
    }

    if (
      !challengeToken ||
      !challengeExpiresAt ||
      Date.now() >= challengeExpiresAt
    ) {

      setError(
        "Verification expired. Please sign in again."
      );

      return;
    }

    setLoading(true);

    try {

      const session =
        await adminAuthService.verifyMFA({

          challengeToken,

          otp,
        });

      establishSession(session);

      setOtp("");

      setChallengeToken("");

      navigate(
        "/admin/dashboard",
        { replace: true }
      );

    } catch (err) {

      setError(
        getAdminErrorMessage(err)
      );

      setOtp("");

    } finally {

      setLoading(false);

    }
  };

  if (isAuthenticated) {

    return (
      <Navigate
        to="/admin/dashboard"
        replace
      />
    );
  }

  const minutes =
    Math.floor(secondsRemaining / 60);

  const seconds =
    String(
      secondsRemaining % 60
    ).padStart(2, "0");

  // ===================================
  // LOGIN INTERFACE
  // ===================================

  return (

    <div className="relative min-h-screen overflow-hidden bg-[#080b14] text-white">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[130px]" />

      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:px-16">

        {/* LEFT INFORMATION PANEL */}

        <section className="hidden lg:block">

          <div className="mb-12 flex items-center gap-3">

            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">

              <ShieldCheck
                size={30}
                className="text-violet-400"
              />

            </div>

            <div>

              <h1 className="text-xl font-bold">

                CareerLens AI

              </h1>

              <p className="text-xs tracking-widest text-slate-400">

                ADMINISTRATION PORTAL

              </p>

            </div>

          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-300">

            <Shield size={14} />

            Restricted administrator access

          </div>

          <h2 className="max-w-xl text-5xl font-bold leading-tight tracking-tight">

            Manage your platform.

            <span className="mt-2 block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">

              Stay in control.

            </span>

          </h2>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">

            Monitor platform performance, manage user
            accounts, track AI consumption and maintain
            platform security from one central workspace.

          </p>

          <div className="mt-10 space-y-4">

            {[
              {
                icon: Users,
                title: "User Management",
                description:
                  "Manage accounts and monitor engagement.",
              },
              {
                icon: BarChart3,
                title: "Intelligent Analytics",
                description:
                  "Understand platform usage and AI consumption.",
              },
              {
                icon: Activity,
                title: "System Monitoring",
                description:
                  "Monitor application health and performance.",
              },
              {
                icon: LockKeyhole,
                title: "Secure Authentication",
                description:
                  "Protected with multi-factor authentication.",
              },
            ].map((item) => (

              <div
                key={item.title}
                className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4"
              >

                <div className="rounded-lg bg-violet-500/10 p-3">

                  <item.icon
                    size={21}
                    className="text-violet-400"
                  />

                </div>

                <div>

                  <h3 className="text-sm font-semibold">

                    {item.title}

                  </h3>

                  <p className="mt-1 text-xs text-slate-400">

                    {item.description}

                  </p>

                </div>

              </div>

            ))}

          </div>

        </section>

        {/* AUTHENTICATION CARD */}

        <section className="mx-auto w-full max-w-md">

          <div className="rounded-3xl border border-slate-800 bg-[#111522]/95 p-7 shadow-2xl sm:p-10">

            <div className="mb-7 flex justify-center">

              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4">

                {stage === "credentials" ? (

                  <ShieldCheck
                    size={36}
                    className="text-violet-400"
                  />

                ) : (

                  <KeyRound
                    size={36}
                    className="text-violet-400"
                  />

                )}

              </div>

            </div>

            <div className="mb-8 text-center">

              <h2 className="text-2xl font-bold tracking-tight">

                {stage === "credentials"
                  ? "Administrator Sign In"
                  : "Verify Your Identity"}

              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-400">

                {stage === "credentials"
                  ? "Enter your administrator credentials to continue."
                  : "Enter the six-digit code from your authenticator application."}

              </p>

            </div>

            {/* ERROR MESSAGE */}

            {error && (

              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
              >

                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{error}</span>

              </div>

            )}

            {/* CREDENTIAL FORM */}

            {stage === "credentials" ? (

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                <div>

                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >

                    Administrator Email

                  </label>

                  <div className="relative">

                    <Mail
                      size={18}
                      className="absolute left-4 top-4 text-slate-500"
                    />

                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="admin@example.com"
                      autoComplete="username"
                      required
                      disabled={loading}
                      className={`${inputClass} pl-12`}
                    />

                  </div>

                </div>

                <div>

                  <label
                    htmlFor="admin-password"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >

                    Password

                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-4 text-slate-500"
                    />

                    <input
                      id="admin-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className={`${inputClass} pl-12 pr-12`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-4 top-4 text-slate-400 hover:text-white"
                    >

                      {showPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />}

                    </button>

                  </div>

                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loading ? (

                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Authenticating...
                    </>

                  ) : (

                    <>
                      Continue

                      <ArrowRight size={18} />
                    </>

                  )}

                </button>

              </form>

            ) : (

              /* MFA VERIFICATION FORM */

              <form
                onSubmit={handleVerification}
                className="space-y-6"
              >

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">

                  <p className="text-xs text-slate-400">

                    Signing in as

                  </p>

                  <p className="mt-1 break-all text-sm font-medium text-slate-200">

                    {email}

                  </p>

                </div>

                <div>

                  <label
                    htmlFor="admin-otp"
                    className="mb-3 block text-center text-sm font-medium text-slate-300"
                  >

                    Authentication Code

                  </label>

                  <input
                    id="admin-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    disabled={loading}
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-4 text-center text-3xl font-semibold tracking-[0.45em] text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  <p
                    className={`mt-3 text-center text-xs ${
                      secondsRemaining > 0
                        ? "text-slate-400"
                        : "text-red-400"
                    }`}
                  >

                    {secondsRemaining > 0
                      ? `Verification expires in ${minutes}:${seconds}`
                      : "Verification expired. Sign in again."}

                  </p>

                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    otp.length !== 6 ||
                    secondsRemaining <= 0
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loading ? (

                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Verifying...
                    </>

                  ) : (

                    <>
                      <ShieldCheck size={18} />

                      Verify and Sign In
                    </>

                  )}

                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={resetLogin}
                  className="flex w-full items-center justify-center gap-2 text-sm text-slate-400 hover:text-white"
                >

                  <ArrowLeft size={16} />

                  Back to Sign In

                </button>

              </form>

            )}

            {/* SECURITY FOOTER */}

            <div className="mt-8 border-t border-slate-800 pt-6">

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">

                <LockKeyhole size={13} />

                Multi-factor authentication protected

              </div>

              <p className="mt-3 text-center text-xs text-slate-600">

                Authorized personnel only.

              </p>

            </div>

          </div>

          <p className="mt-6 text-center text-xs text-slate-600">

            © {new Date().getFullYear()} CareerLens AI.
            Administration Portal.

          </p>

        </section>

      </div>

    </div>
  );
}