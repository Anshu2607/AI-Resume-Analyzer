import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import axios from "axios";

import backgroundJobService, {
  generateIdempotencyKey,
} from "../services/backgroundJob.service";

import type {
  BackgroundJob,
  BackgroundJobState,
  BackgroundJobPollingOptions,
} from "../types/backgroundJob.types";

// =====================================
// DEFAULT POLLING CONFIGURATION
// =====================================

const DEFAULT_POLLING_INTERVAL = 2000;

const DEFAULT_MAX_POLLING_DURATION =
  10 * 60 * 1000;

const MAX_CONSECUTIVE_POLLING_ERRORS = 3;

// =====================================
// INITIAL STATE
// =====================================

const INITIAL_STATE: BackgroundJobState = {
  job: null,

  isSubmitting: false,

  isPolling: false,

  isRetrying: false,

  error: null,
};

// =====================================
// CHECK TERMINAL JOB STATUS
// =====================================

const isTerminalStatus = (
  job: BackgroundJob
): boolean => {
  return (
    job.status === "completed" ||
    job.status === "failed"
  );
};

// =====================================
// ERROR MESSAGE HELPER
// =====================================

const getErrorMessage = (
  error: unknown
): string => {
  if (axios.isAxiosError(error)) {
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      return (
        "The request timed out. " +
        "Your background job may still be running."
      );
    }

    const message =
      error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "An unexpected background job error occurred.";
};

// =====================================
// CHECK RETRYABLE POLLING ERROR
// =====================================

const isRetryablePollingError = (
  error: unknown
): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status =
    error.response?.status;

  return (
    status === undefined ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
};

// =====================================
// BACKGROUND JOB HOOK
// =====================================

export const useBackgroundJob = (
  options: BackgroundJobPollingOptions = {}
) => {

  // ===================================
  // POLLING CONFIGURATION
  // ===================================

  const intervalMs = Math.max(
    1000,

    options.intervalMs ??
      DEFAULT_POLLING_INTERVAL
  );

  const maxPollingDurationMs = Math.max(
    intervalMs,

    options.maxPollingDurationMs ??
      DEFAULT_MAX_POLLING_DURATION
  );

  // ===================================
  // STATE
  // ===================================

  const [state, setState] =
    useState<BackgroundJobState>(
      INITIAL_STATE
    );

  // ===================================
  // REFERENCES
  // ===================================

  const mountedRef =
    useRef(false);

  const operationRef =
    useRef(0);

  const busyRef =
    useRef(false);

  const timerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const abortControllerRef =
    useRef<AbortController | null>(
      null
    );

  const jobRef =
    useRef<BackgroundJob | null>(
      null
    );

  const idempotencyKeysRef =
    useRef<Map<string, string>>(
      new Map()
    );

  // ===================================
  // CHECK ACTIVE OPERATION
  // ===================================

  const isActiveOperation =
    useCallback(
      (operationId: number): boolean => {
        return (
          mountedRef.current &&
          operationRef.current ===
            operationId
        );
      },
      []
    );

  // ===================================
  // CLEAR TIMER AND CANCEL REQUEST
  // ===================================

  const clearPendingOperations =
    useCallback(() => {

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);

        timerRef.current = null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();

        abortControllerRef.current = null;
      }

    }, []);

  // ===================================
  // COMPONENT LIFECYCLE
  // ===================================

  useEffect(() => {

    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      operationRef.current++;

      busyRef.current = false;

      clearPendingOperations();
    };

  }, [clearPendingOperations]);

  // ===================================
  // UPDATE CURRENT JOB
  // ===================================

  const updateJob = useCallback(
    (job: BackgroundJob) => {

      jobRef.current = job;

      setState((previous) => ({
        ...previous,

        job,

        error:
          job.status === "failed"
            ? job.error ||
              "Background processing failed."
            : null,
      }));

    },
    []
  );

  // ===================================
  // START AUTOMATIC POLLING
  // ===================================

  const startPolling = useCallback(
    (
      jobId: string,

      operationId: number
    ): void => {

      if (
        !isActiveOperation(
          operationId
        )
      ) {
        return;
      }

      const startedAt = Date.now();

      let consecutiveErrors = 0;

      setState((previous) => ({
        ...previous,

        isSubmitting: false,

        isRetrying: false,

        isPolling: true,

        error: null,
      }));

      // ===============================
      // STOP POLLING
      // ===============================

      const finishPolling = (
        error: string | null = null
      ) => {

        if (
          !isActiveOperation(
            operationId
          )
        ) {
          return;
        }

        busyRef.current = false;

        timerRef.current = null;

        abortControllerRef.current =
          null;

        setState((previous) => ({
          ...previous,

          isPolling: false,

          error,
        }));

      };

      // ===============================
      // POLL JOB STATUS
      // ===============================

      const poll = async (): Promise<void> => {

        timerRef.current = null;

        if (
          !isActiveOperation(
            operationId
          )
        ) {
          return;
        }

        // Enforce maximum polling duration.

        if (
          Date.now() - startedAt >=
          maxPollingDurationMs
        ) {
          finishPolling(
            "Status tracking timed out. " +
            "The background job may still be running. " +
            "Resume tracking to check its latest status."
          );

          return;
        }

        const controller =
          new AbortController();

        abortControllerRef.current =
          controller;

        let nextDelay = intervalMs;

        try {

          const job =
            await backgroundJobService.getStatus(
              jobId,

              controller.signal
            );

          if (
            !isActiveOperation(
              operationId
            )
          ) {
            return;
          }

          consecutiveErrors = 0;

          updateJob(job);

          // Stop after success or failure.

          if (
            isTerminalStatus(job)
          ) {
            finishPolling(
              job.status === "failed"
                ? job.error ||
                  "Background processing failed."
                : null
            );

            return;
          }

        } catch (error) {

          if (
            axios.isCancel(error) ||
            !isActiveOperation(
              operationId
            )
          ) {
            return;
          }

          consecutiveErrors++;

          // Stop for permanent errors.

          if (
            !isRetryablePollingError(
              error
            )
          ) {
            finishPolling(
              getErrorMessage(error)
            );

            return;
          }

          // Stop after repeated failures.

          if (
            consecutiveErrors >=
            MAX_CONSECUTIVE_POLLING_ERRORS
          ) {
            finishPolling(
              "Unable to retrieve job status. " +
              "Resume tracking to try again."
            );

            return;
          }

          // Back off when polling fails.

          nextDelay = Math.min(
            intervalMs *
              Math.pow(
                2,
                consecutiveErrors
              ),

            30000
          );

        } finally {

          if (
            abortControllerRef.current ===
            controller
          ) {
            abortControllerRef.current =
              null;
          }

        }

        // Schedule the next request only
        // after the previous request finishes.

        if (
          isActiveOperation(
            operationId
          )
        ) {
          timerRef.current =
            setTimeout(() => {
              void poll();
            }, nextDelay);
        }

      };

      void poll();

    },
    [
      intervalMs,
      maxPollingDurationMs,
      isActiveOperation,
      updateJob,
    ]
  );

  // ===================================
  // SUBMIT INTERVIEW REPORT JOB
  // ===================================

  const submitInterviewReport =
    useCallback(
      async (
        sessionId: string
      ): Promise<BackgroundJob | null> => {

        if (
          !mountedRef.current ||
          busyRef.current
        ) {
          return null;
        }

        if (
          !/^[a-fA-F0-9]{24}$/.test(
            sessionId
          )
        ) {
          setState((previous) => ({
            ...previous,

            error:
              "Invalid interview session ID",
          }));

          return null;
        }

        clearPendingOperations();

        busyRef.current = true;

        const operationId =
          ++operationRef.current;

        jobRef.current = null;

        setState({
          ...INITIAL_STATE,

          isSubmitting: true,
        });

        const controller =
          new AbortController();

        abortControllerRef.current =
          controller;

        try {

          // Reuse the same idempotency key
          // for uncertain submission attempts.

          let idempotencyKey =
            idempotencyKeysRef.current.get(
              sessionId
            );

          if (!idempotencyKey) {

            idempotencyKey =
              generateIdempotencyKey();

            idempotencyKeysRef.current.set(
              sessionId,
              idempotencyKey
            );
          }

          const job =
            await backgroundJobService.queueInterviewReport(
              sessionId,

              idempotencyKey,

              controller.signal
            );

          if (
            !isActiveOperation(
              operationId
            )
          ) {
            return null;
          }

          // Submission is now confirmed.

          idempotencyKeysRef.current.delete(
            sessionId
          );

          updateJob(job);

          // Release the submission controller
          // before starting polling.

          if (
            abortControllerRef.current ===
            controller
          ) {
            abortControllerRef.current =
              null;
          }

          // A job may complete before the
          // frontend receives its response.

          if (
            isTerminalStatus(job)
          ) {

            busyRef.current = false;

            setState((previous) => ({
              ...previous,

              isSubmitting: false,
            }));

          } else {

            startPolling(
              job.jobId,
              operationId
            );

          }

          return job;

        } catch (error) {

          if (
            axios.isCancel(error) ||
            !isActiveOperation(
              operationId
            )
          ) {
            return null;
          }

          // Keep the idempotency key when
          // submission success is uncertain.

          const status =
            axios.isAxiosError(error)
              ? error.response?.status
              : undefined;

          if (
            status !== undefined &&
            status >= 400 &&
            status < 500 &&
            ![408, 409, 429].includes(
              status
            )
          ) {
            idempotencyKeysRef.current.delete(
              sessionId
            );
          }

          busyRef.current = false;

          setState((previous) => ({
            ...previous,

            isSubmitting: false,

            error:
              getErrorMessage(error),
          }));

          return null;

        } finally {

          if (
            abortControllerRef.current ===
            controller
          ) {
            abortControllerRef.current =
              null;
          }

        }

      },
      [
        clearPendingOperations,
        isActiveOperation,
        startPolling,
        updateJob,
      ]
    );

  // ===================================
  // RETRY FAILED BACKGROUND JOB
  // ===================================

  const retryJob = useCallback(
    async (): Promise<BackgroundJob | null> => {

      const currentJob =
        jobRef.current;

      if (
        !mountedRef.current ||
        busyRef.current ||
        !currentJob ||
        currentJob.status !== "failed"
      ) {
        return null;
      }

      clearPendingOperations();

      busyRef.current = true;

      const operationId =
        ++operationRef.current;

      setState((previous) => ({
        ...previous,

        isRetrying: true,

        error: null,
      }));

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {

        const job =
          await backgroundJobService.retry(
            currentJob.jobId,

            controller.signal
          );

        if (
          !isActiveOperation(
            operationId
          )
        ) {
          return null;
        }

        updateJob(job);

        if (
          abortControllerRef.current ===
          controller
        ) {
          abortControllerRef.current =
            null;
        }

        if (
          isTerminalStatus(job)
        ) {

          busyRef.current = false;

          setState((previous) => ({
            ...previous,

            isRetrying: false,
          }));

        } else {

          startPolling(
            job.jobId,
            operationId
          );

        }

        return job;

      } catch (error) {

        if (
          axios.isCancel(error) ||
          !isActiveOperation(
            operationId
          )
        ) {
          return null;
        }

        busyRef.current = false;

        setState((previous) => ({
          ...previous,

          isRetrying: false,

          error:
            getErrorMessage(error),
        }));

        return null;

      } finally {

        if (
          abortControllerRef.current ===
          controller
        ) {
          abortControllerRef.current =
            null;
        }

      }

    },
    [
      clearPendingOperations,
      isActiveOperation,
      startPolling,
      updateJob,
    ]
  );

  // ===================================
  // RESUME TRACKING EXISTING JOB
  // ===================================

  const resumeTracking = useCallback(
    (jobId?: string): void => {

      if (
        !mountedRef.current ||
        busyRef.current
      ) {
        return;
      }

      const targetJobId =
        jobId ??
        jobRef.current?.jobId;

      if (!targetJobId) {

        setState((previous) => ({
          ...previous,

          error:
            "No background job is available to track.",
        }));

        return;
      }

      if (
        !/^ai-[a-f0-9]{64}$/.test(
          targetJobId
        )
      ) {

        setState((previous) => ({
          ...previous,

          error:
            "Invalid background job ID",
        }));

        return;
      }

      clearPendingOperations();

      busyRef.current = true;

      const operationId =
        ++operationRef.current;

      // Avoid displaying an unrelated job.

      if (
        jobRef.current?.jobId !==
        targetJobId
      ) {

        jobRef.current = null;

        setState(INITIAL_STATE);

      }

      startPolling(
        targetJobId,
        operationId
      );

    },
    [
      clearPendingOperations,
      startPolling,
    ]
  );

  // ===================================
  // STOP LOCAL STATUS TRACKING
  // ===================================

  const stopTracking = useCallback(
    (): void => {

      operationRef.current++;

      clearPendingOperations();

      busyRef.current = false;

      if (mountedRef.current) {

        setState((previous) => ({
          ...previous,

          isSubmitting: false,

          isPolling: false,

          isRetrying: false,
        }));

      }

    },
    [clearPendingOperations]
  );

  // ===================================
  // RESET BACKGROUND JOB STATE
  // ===================================

  const reset = useCallback(
    (): void => {

      stopTracking();

      jobRef.current = null;

      if (mountedRef.current) {
        setState(INITIAL_STATE);
      }

      // Preserve unresolved submission keys
      // to protect subsequent retry attempts.

    },
    [stopTracking]
  );

  // ===================================
  // DERIVED STATE
  // ===================================

  const isBusy =
    state.isSubmitting ||
    state.isPolling ||
    state.isRetrying;

  const isCompleted =
    state.job?.status === "completed";

  const isFailed =
    state.job?.status === "failed";

  // ===================================
  // PUBLIC HOOK INTERFACE
  // ===================================

  return {
    ...state,

    isBusy,

    isCompleted,

    isFailed,

    submitInterviewReport,

    retryJob,

    resumeTracking,

    stopTracking,

    reset,
  };
};

export default useBackgroundJob;