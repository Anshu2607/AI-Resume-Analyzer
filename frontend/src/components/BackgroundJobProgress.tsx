import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  PauseCircle,
  Activity,
  XCircle,
  Layers,
} from "lucide-react";

import type {
  BackgroundJob,
  BackgroundJobStatus,
} from "../types/backgroundJob.types";

// =====================================
// COMPONENT PROPS
// =====================================

interface BackgroundJobProgressProps {
  job: BackgroundJob | null;

  isSubmitting: boolean;

  isPolling: boolean;

  isRetrying: boolean;

  error: string | null;

  onRetry: () => void;

  onResumeTracking: () => void;

  onStopTracking: () => void;

  onDismiss?: () => void;
}

// =====================================
// STATUS CONFIGURATION
// =====================================

const STATUS_CONFIG = {
  queued: {
    label: "Queued",

    description:
      "Waiting for an available background worker.",

    color: "text-slate-400",

    background: "bg-slate-500/10",

    icon: Clock,
  },

  processing: {
    label: "Processing",

    description:
      "AI is processing your request in the background.",

    color: "text-violet-400",

    background: "bg-violet-500/10",

    icon: Loader2,
  },

  completed: {
    label: "Completed",

    description:
      "Background processing completed successfully.",

    color: "text-emerald-400",

    background: "bg-emerald-500/10",

    icon: CheckCircle2,
  },

  failed: {
    label: "Failed",

    description:
      "The background job could not be completed.",

    color: "text-red-400",

    background: "bg-red-500/10",

    icon: AlertCircle,
  },

  retrying: {
    label: "Retrying",

    description:
      "A temporary failure occurred. The job is scheduled to retry.",

    color: "text-amber-400",

    background: "bg-amber-500/10",

    icon: RefreshCw,
  },

  paused: {
    label: "Paused",

    description:
      "The background job is currently paused.",

    color: "text-amber-400",

    background: "bg-amber-500/10",

    icon: PauseCircle,
  },

  unknown: {
    label: "Unknown",

    description:
      "The current job status could not be determined.",

    color: "text-slate-400",

    background: "bg-slate-500/10",

    icon: AlertCircle,
  },
} satisfies Record<
  BackgroundJobStatus,
  {
    label: string;

    description: string;

    color: string;

    background: string;

    icon: typeof Clock;
  }
>;

// =====================================
// FORMAT JOB TYPE
// =====================================

const formatJobType = (
  jobType: string
): string => {
  return jobType
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

// =====================================
// BACKGROUND JOB PROGRESS COMPONENT
// =====================================

export default function BackgroundJobProgress({
  job,

  isSubmitting,

  isPolling,

  isRetrying,

  error,

  onRetry,

  onResumeTracking,

  onStopTracking,

  onDismiss,
}: BackgroundJobProgressProps) {

  // ===================================
  // DERIVED STATE
  // ===================================

  const isBusy =
    isSubmitting ||
    isPolling ||
    isRetrying;

  const isCompleted =
    job?.status === "completed";

  const isFailed =
    job?.status === "failed";

  const isTerminal =
    isCompleted || isFailed;

  const progress = isCompleted
    ? 100
    : Math.max(
        0,
        Math.min(
          100,
          job?.progress ?? 0
        )
      );

  const statusConfig = job
    ? STATUS_CONFIG[job.status]
    : STATUS_CONFIG.queued;

  const StatusIcon =
    statusConfig.icon;

  const progressColor =
    isCompleted
      ? "bg-emerald-500"
      : isFailed
        ? "bg-red-500"
        : job?.status === "retrying"
          ? "bg-amber-500"
          : "bg-violet-500";

  // Hide component when no operation
  // or error is available.

  if (
    !job &&
    !isBusy &&
    !error
  ) {
    return null;
  }

  // ===================================
  // MAIN COMPONENT
  // ===================================

  return (
    <section
      className="rounded-2xl border border-slate-800 bg-[#111827] p-5 text-slate-100"
      aria-label="Background job progress"
    >

      {/* HEADER */}

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-violet-500/10 p-3">

            <Layers
              size={24}
              className="text-violet-400"
            />

          </div>

          <div>

            <h3 className="font-semibold">

              {job
                ? formatJobType(job.jobType)
                : "Background Processing"}

            </h3>

            <p className="mt-1 text-xs text-slate-500">

              Powered by Redis and BullMQ

            </p>

          </div>

        </div>

        {onDismiss && !isBusy && (

          <button
            type="button"
            aria-label="Dismiss background job progress"
            onClick={onDismiss}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
          >

            <XCircle size={20} />

          </button>

        )}

      </div>

      {/* SUBMISSION STATE */}

      {isSubmitting && (

        <div
          role="status"
          className="mt-5 flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"
        >

          <Loader2
            size={21}
            className="shrink-0 animate-spin text-violet-400"
          />

          <div>

            <p className="text-sm font-medium text-violet-300">

              Submitting background job...

            </p>

            <p className="mt-1 text-xs text-slate-400">

              Preparing your request for asynchronous processing.

            </p>

          </div>

        </div>

      )}

      {/* JOB STATUS */}

      {job && (

        <div className="mt-5 space-y-5">

          {/* STATUS INDICATOR */}

          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl p-4 ${statusConfig.background}`}
          >

            <StatusIcon
              size={23}
              className={`shrink-0 ${statusConfig.color} ${
                job.status === "processing" ||
                isRetrying
                  ? "animate-spin"
                  : ""
              }`}
            />

            <div className="flex-1">

              <p
                className={`text-sm font-semibold ${statusConfig.color}`}
              >

                {isRetrying
                  ? "Requesting retry..."
                  : statusConfig.label}

              </p>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">

                {statusConfig.description}

              </p>

            </div>

          </div>

          {/* PROGRESS BAR */}

          <div>

            <div className="mb-3 flex items-center justify-between">

              <span className="text-sm text-slate-400">

                Processing Progress

              </span>

              <span className="text-sm font-semibold">

                {progress}%

              </span>

            </div>

            <div
              role="progressbar"
              aria-label="Background processing progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-2.5 overflow-hidden rounded-full bg-slate-800"
            >

              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

            <p className="mt-2 text-xs text-slate-500">

              Progress represents processing stages,
              not remaining time.

            </p>

          </div>

          {/* JOB STATISTICS */}

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">

              <p className="flex items-center gap-2 text-xs text-slate-500">

                <RefreshCw size={14} />

                Attempts Made

              </p>

              <p className="mt-3 text-xl font-semibold">

                {job.attemptsMade}

                <span className="text-sm font-normal text-slate-500">

                  {" / "}
                  {job.maxAttempts}

                </span>

              </p>

            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">

              <p className="flex items-center gap-2 text-xs text-slate-500">

                <Activity size={14} />

                Status Tracking

              </p>

              <p
                className={`mt-3 text-sm font-medium ${
                  isPolling
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >

                {isPolling
                  ? "Active"
                  : isTerminal
                    ? "Finished"
                    : "Inactive"}

              </p>

            </div>

          </div>

          {/* COMPLETION MESSAGE */}

          {isCompleted && (

            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

              <CheckCircle2
                size={21}
                className="shrink-0 text-emerald-400"
              />

              <div>

                <p className="text-sm font-semibold text-emerald-300">

                  Processing completed successfully

                </p>

                <p className="mt-1 text-xs text-slate-400">

                  Your result is ready to retrieve.

                </p>

              </div>

            </div>

          )}

        </div>

      )}

      {/* ERROR MESSAGE */}

      {error && (

        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
        >

          <AlertCircle
            size={20}
            className="shrink-0 text-red-400"
          />

          <div>

            <p className="text-sm font-semibold text-red-300">

              Background Processing Issue

            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">

              {error}

            </p>

          </div>

        </div>

      )}

      {/* ACTION BUTTONS */}

      <div className="mt-5 flex flex-wrap gap-3">

        {/* RETRY FAILED JOB */}

        {isFailed && (

          <button
            type="button"
            disabled={isBusy}
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <RefreshCw
              size={17}
              className={
                isRetrying
                  ? "animate-spin"
                  : ""
              }
            />

            {isRetrying
              ? "Retrying..."
              : "Retry Background Job"}

          </button>

        )}

        {/* RESUME TRACKING */}

        {job &&
          !isTerminal &&
          !isBusy && (

            <button
              type="button"
              onClick={onResumeTracking}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >

              <RefreshCw size={17} />

              Resume Tracking

            </button>

          )}

        {/* STOP TRACKING */}

        {isPolling && (

          <button
            type="button"
            onClick={onStopTracking}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >

            <PauseCircle size={17} />

            Stop Tracking

          </button>

        )}

      </div>

      {/* TRACKING DISCLAIMER */}

      {job && !isTerminal && (

        <p className="mt-4 text-xs leading-relaxed text-slate-500">

          Stopping status tracking does not cancel
          the background job. You can resume tracking
          to retrieve its latest status.

        </p>

      )}

    </section>
  );
}