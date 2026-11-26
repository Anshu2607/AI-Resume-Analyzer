import { useState } from "react";
import type { FormEvent } from "react";

import {
  X,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

import type {
  ManagedUser,
} from "../types/adminUsers.types";

interface UserStatusDialogProps {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function UserStatusDialog({
  user,
  onClose,
  onConfirm,
}: UserStatusDialogProps) {

  const suspending = user.status === "active";

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    if (loading) return;

    if (
      reason.trim().length < 5 ||
      reason.trim().length > 500
    ) {
      setError(
        "Reason must contain between 5 and 500 characters."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {

      await onConfirm(reason.trim());

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update account status."
      );

    } finally {

      setLoading(false);
    }
  };

  const Icon = suspending
    ? ShieldAlert
    : ShieldCheck;

  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-dialog-title"
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#111522] p-6 shadow-2xl"
      >

        <div className="flex items-start justify-between">

          <div
            className={`rounded-xl p-3 ${
              suspending
                ? "bg-red-500/10 text-red-400"
                : "bg-emerald-500/10 text-emerald-400"
            }`}
          >

            <Icon size={28} />

          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white"
          >

            <X size={22} />

          </button>

        </div>

        <h2
          id="status-dialog-title"
          className="mt-5 text-xl font-bold text-white"
        >

          {suspending
            ? "Suspend User Account"
            : "Reactivate User Account"}

        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">

          {suspending
            ? "This user will lose access to protected platform features until the account is reactivated."
            : "This user will regain access to the platform and its available features."}

        </p>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4">

          <p className="font-medium text-white">
            {user.name}
          </p>

          <p className="mt-1 break-all text-xs text-slate-400">
            {user.email}
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-5"
        >

          <div>

            <label
              htmlFor="status-reason"
              className="mb-2 block text-sm font-medium text-slate-300"
            >

              Reason for this action

            </label>

            <textarea
              id="status-reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              minLength={5}
              maxLength={500}
              rows={4}
              required
              autoFocus
              disabled={loading}
              placeholder="Enter a clear reason..."
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-violet-500"
            />

            <div className="mt-2 flex justify-between text-xs text-slate-500">

              <span>Recorded in administrator audit logs.</span>

              <span>{reason.length}/500</span>

            </div>

          </div>

          {error && (

            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400"
            >

              <AlertCircle size={17} />

              {error}

            </div>

          )}

          <div className="flex justify-end gap-3">

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
            >

              Cancel

            </button>

            <button
              type="submit"
              disabled={
                loading ||
                reason.trim().length < 5
              }
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                suspending
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >

              {loading && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Processing..."
                : suspending
                  ? "Suspend Account"
                  : "Reactivate Account"}

            </button>

          </div>

        </form>

      </section>

    </div>
  );
}