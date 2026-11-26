import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";

import {
  MessagesSquare,
  BrainCircuit,
  Sparkles,
  Code2,
  Users,
  FileText,
  BriefcaseBusiness,
  Layers,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  History,
  Trash2,
  RefreshCw,
  ArrowRight,
  Plus,
  Trophy,
  Lightbulb,
  TrendingUp,
  Clock,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

import interviewService from "../services/interview.service";
import jobMatchingService from "../services/jobMatching.service";
import useBackgroundJob from "../hooks/useBackgroundJob";
import BackgroundJobProgress from "../components/BackgroundJobProgress";

import type {
  InterviewType,
  InterviewDifficulty,
  InterviewSession,
  InterviewSessionSummary,
  InterviewEvaluation,
  InterviewReport,
  InterviewStatus,
  AdaptiveDecision,
  CreateInterviewRequest,
} from "../types/interview.types";

import type {
  JobMatchSummary,
} from "../types/jobMatching.types";

// =====================================
// UI CONFIGURATION
// =====================================

const cardClass =
  "rounded-2xl border border-slate-800 bg-[#111827] p-5";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-violet-500 disabled:opacity-50";

const primaryButton =
  "flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50";

// =====================================
// INTERVIEW TYPES
// =====================================

const interviewOptions = [
  {
    value: "technical",
    title: "Technical",
    description: "Concepts, coding and practical scenarios",
    icon: Code2,
  },
  {
    value: "hr",
    title: "HR Interview",
    description: "Motivation and professional communication",
    icon: Users,
  },
  {
    value: "behavioral",
    title: "Behavioral",
    description: "Teamwork, leadership and decision-making",
    icon: MessagesSquare,
  },
  {
    value: "resume_based",
    title: "Resume Based",
    description: "Projects, experience and technical skills",
    icon: FileText,
  },
  {
    value: "job_specific",
    title: "Job Specific",
    description: "Questions aligned with job requirements",
    icon: BriefcaseBusiness,
  },
  {
    value: "mixed",
    title: "Mixed Interview",
    description: "Technical, HR and scenario-based questions",
    icon: Layers,
  },
] as const;

// =====================================
// HELPER FUNCTIONS
// =====================================

const formatLabel = (value: string): string =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatScore = (score: number | null): string =>
  score === null
    ? "Not assessed"
    : `${score.toFixed(1)}/100`;

const getScoreColor = (score: number | null): string => {
  if (score === null) return "text-slate-400";
  if (score >= 75) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      return "The request timed out. Refresh the session or history before retrying.";
    }

    const message = error.response?.data?.message;

    return typeof message === "string"
      ? message
      : error.message;
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
};

// =====================================
// STATUS BADGE
// =====================================

function StatusBadge({
  status,
}: {
  status: InterviewStatus;
}) {
  const styles: Record<InterviewStatus, string> = {
    not_started: "bg-slate-800 text-slate-400",
    in_progress: "bg-violet-500/10 text-violet-400",
    completed: "bg-emerald-500/10 text-emerald-400",
    cancelled: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${styles[status]}`}
    >
      {formatLabel(status)}
    </span>
  );
}

// =====================================
// SCORE BAR
// =====================================

function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">
          {label}
        </span>

        <span className={`text-sm font-medium ${getScoreColor(score)}`}>
          {formatScore(score)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{
            width: `${Math.min(100, Math.max(0, score ?? 0))}%`,
          }}
        />
      </div>
    </div>
  );
}

// =====================================
// FEEDBACK LIST
// =====================================

function FeedbackList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "success" | "warning" | "neutral";
}) {
  if (items.length === 0) return null;

  const color =
    variant === "success"
      ? "text-emerald-400"
      : variant === "warning"
        ? "text-amber-400"
        : "text-violet-400";

  const Icon =
    variant === "success"
      ? CheckCircle2
      : variant === "warning"
        ? AlertCircle
        : Lightbulb;

  return (
    <div>
      <h4 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${color}`}>
        <Icon size={18} />
        {title}
      </h4>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg bg-slate-950/40 p-3"
          >
            <span className="text-slate-500">•</span>

            <p className="text-sm leading-relaxed text-slate-300">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================
// ANSWER EVALUATION
// =====================================

function EvaluationPanel({
  evaluation,
}: {
  evaluation: InterviewEvaluation;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            Answer Evaluation
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            AI-assisted assessment
          </p>
        </div>

        <div className={`text-3xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
          {evaluation.overallScore.toFixed(1)}
          <span className="text-sm text-slate-500">/100</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ScoreBar label="Accuracy" score={evaluation.scores.accuracy} />
        <ScoreBar label="Relevance" score={evaluation.scores.relevance} />
        <ScoreBar label="Completeness" score={evaluation.scores.completeness} />
        <ScoreBar label="Clarity" score={evaluation.scores.clarity} />
      </div>

      <p className="rounded-xl bg-slate-950/40 p-4 text-sm leading-relaxed text-slate-300">
        {evaluation.feedback}
      </p>

      <FeedbackList
        title="Strengths"
        items={evaluation.strengths}
        variant="success"
      />

      <FeedbackList
        title="Areas for Improvement"
        items={evaluation.weaknesses}
        variant="warning"
      />

      <FeedbackList
        title="Missing Key Points"
        items={evaluation.missingKeyPoints}
        variant="warning"
      />

      <FeedbackList
        title="Improvement Suggestions"
        items={evaluation.improvementSuggestions}
        variant="neutral"
      />

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-300">
          <Lightbulb size={18} />
          Suggested Model Answer
        </h4>

        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {evaluation.modelAnswer}
        </p>
      </div>

      <p className="text-xs text-slate-600">
        Evaluated by {evaluation.provider}
        {" · "}
        {evaluation.modelUsed}
        {" · "}
        {(evaluation.processingTime / 1000).toFixed(1)} seconds
      </p>
    </div>
  );
}

// =====================================
// PERFORMANCE REPORT
// =====================================

function PerformanceReportPanel({
  report,
}: {
  report: InterviewReport;
}) {
  return (
    <section className={cardClass}>
      <h2 className="flex items-center gap-3 text-xl font-semibold">
        <Trophy size={25} className="text-violet-400" />
        Interview Performance Report
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Overall Score",
            value: formatScore(report.overallScore),
          },
          {
            label: "Questions Answered",
            value: `${report.answeredQuestions}/${report.totalQuestions}`,
          },
          {
            label: "Questions Skipped",
            value: String(report.skippedQuestions),
          },
          {
            label: "Performance Level",
            value: formatLabel(report.performanceLevel),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-3 text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <h3 className="mb-3 font-semibold">Performance Summary</h3>

        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {report.summary}
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="space-y-5 rounded-xl border border-slate-800 p-5">
          <h3 className="font-semibold">Evaluation Breakdown</h3>

          <ScoreBar label="Accuracy" score={report.averageAccuracy} />
          <ScoreBar label="Relevance" score={report.averageRelevance} />
          <ScoreBar label="Completeness" score={report.averageCompleteness} />
          <ScoreBar label="Clarity" score={report.averageClarity} />
        </div>

        <div className="space-y-5 rounded-xl border border-slate-800 p-5">
          <h3 className="font-semibold">Topic-wise Performance</h3>

          {report.topicPerformance.map((item) => (
            <div key={item.topic}>
              <ScoreBar label={item.topic} score={item.averageScore} />

              <p className="mt-1 text-xs text-slate-500">
                {item.answeredQuestions} of {item.totalQuestions} answered
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <FeedbackList
          title="Key Strengths"
          items={report.strengths}
          variant="success"
        />

        <FeedbackList
          title="Areas for Improvement"
          items={report.weaknesses}
          variant="warning"
        />

        <FeedbackList
          title="Priority Topics"
          items={report.priorityTopics}
          variant="neutral"
        />

        <FeedbackList
          title="Preparation Recommendations"
          items={report.recommendations}
          variant="neutral"
        />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Scores represent evaluated answers only. Skipped questions are
        tracked separately. This report is intended for interview
        practice and does not predict hiring outcomes.
      </p>
    </section>
  );
}

// =====================================
// MAIN INTERVIEW PAGE
// =====================================

export default function AIInterview() {
  // Configuration state

  const [interviewType, setInterviewType] =
    useState<InterviewType>("technical");

  const [targetRole, setTargetRole] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [difficulty, setDifficulty] =
    useState<InterviewDifficulty>("intermediate");

  const [questionCount, setQuestionCount] = useState(5);
  const [topics, setTopics] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [jobMatchId, setJobMatchId] = useState("");

  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [enableFollowUps, setEnableFollowUps] = useState(true);
  const [consent, setConsent] = useState(false);

  // Session state

  const [session, setSession] =
    useState<InterviewSession | null>(null);

  const [answer, setAnswer] = useState("");

  const [adaptiveDecision, setAdaptiveDecision] =
    useState<AdaptiveDecision | null>(null);

  const [reviewingQuestionId, setReviewingQuestionId] =
    useState<string | null>(null);

  // Resources and history

  const [jobMatches, setJobMatches] =
    useState<JobMatchSummary[]>([]);

  const [history, setHistory] =
    useState<InterviewSessionSummary[]>([]);

  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // Application state

  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [requiresRefresh, setRequiresRefresh] = useState(false);

  const operationLock = useRef(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Background job state

  const backgroundJob = useBackgroundJob({
    intervalMs: 2000,
    maxPollingDurationMs: 10 * 60 * 1000,
  });

  const [reportLoading, setReportLoading] = useState(false);
  const [reportLoadError, setReportLoadError] = useState("");
  const [reportLoadAttempt, setReportLoadAttempt] = useState(0);

  const activeSessionId = session?._id;
  const hasReport = Boolean(session?.report);

  const completedJobId =
    backgroundJob.job?.status === "completed" &&
    backgroundJob.job.resourceId === activeSessionId
      ? backgroundJob.job.jobId
      : undefined;

  const busy =
    loading ||
    operation !== null ||
    backgroundJob.isBusy ||
    reportLoading;

  const currentQuestion = session?.currentQuestion ?? null;

  const reviewedQuestion = session?.questions.find(
    (question) => question.questionId === reviewingQuestionId
  );

  // ===================================
  // INITIAL DATA LOADING
  // ===================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const [matches, sessions] = await Promise.allSettled([
          jobMatchingService.getAll(1, 50),
          interviewService.getAll(1, 20),
        ]);

        if (cancelled) return;

        if (matches.status === "fulfilled") {
          setJobMatches(matches.value.jobMatches);
        }

        if (sessions.status === "fulfilled") {
          setHistory(sessions.value.sessions);

          setHasMoreHistory(
            sessions.value.pagination.totalPages > 1
          );
        }

        if (
          matches.status === "rejected" ||
          sessions.status === "rejected"
        ) {
          setError("Some interview resources could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================
  // FETCH COMPLETED BACKGROUND REPORT
  // ===================================

  useEffect(() => {
    if (!completedJobId || !activeSessionId || hasReport) {
      return;
    }

    let cancelled = false;

    const sessionId = activeSessionId;

    const retrieveReport = async () => {
      setReportLoading(true);
      setReportLoadError("");

      try {
        const report = await interviewService.getReport(sessionId);

        if (cancelled) return;

        setSession((previous) =>
          previous?._id === sessionId
            ? {
                ...previous,
                report,
                averageScore: report.overallScore,
                isLocked: false,
              }
            : previous
        );

        setRequiresRefresh(false);

        setHistory((previous) =>
          previous.map((item) =>
            item._id === sessionId
              ? {
                  ...item,
                  averageScore: report.overallScore,
                  isLocked: false,
                }
              : item
          )
        );
      } catch (error) {
        if (!cancelled) {
          setReportLoadError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setReportLoading(false);
        }
      }
    };

    void retrieveReport();

    return () => {
      cancelled = true;
    };
  }, [
    completedJobId,
    activeSessionId,
    hasReport,
    reportLoadAttempt,
  ]);

  // ===================================
  // RESET BACKGROUND TRACKING
  // ===================================

  const resetBackgroundTracking = () => {
    backgroundJob.reset();
    setReportLoading(false);
    setReportLoadError("");
    setReportLoadAttempt(0);
  };

  // ===================================
  // REFRESH HISTORY
  // ===================================

  const refreshHistory = async () => {
    const response = await interviewService.getAll(1, 20);

    setHistory(response.sessions);
    setHistoryPage(1);

    setHasMoreHistory(
      response.pagination.totalPages > 1
    );
  };

  const refreshHistorySafely = async () => {
    try {
      await refreshHistory();
    } catch {
      setError(
        "Operation completed, but history could not be refreshed."
      );
    }
  };

  // ===================================
  // OPERATION HANDLER
  // ===================================

  const runOperation = async (
    label: string,
    action: () => Promise<void>,
    refreshOnFailure = false
  ) => {
    if (
      operationLock.current ||
      loading ||
      backgroundJob.isBusy ||
      reportLoading
    ) {
      return;
    }

    operationLock.current = true;

    setOperation(label);
    setError("");

    try {
      await action();
    } catch (error) {
      setError(getErrorMessage(error));

      if (refreshOnFailure) {
        setRequiresRefresh(true);
      }
    } finally {
      setOperation(null);
      operationLock.current = false;
    }
  };

  // ===================================
  // DISPLAY SESSION
  // ===================================

  const displaySession = (nextSession: InterviewSession) => {
    if (session?._id !== nextSession._id) {
      resetBackgroundTracking();
    }

    setSession(nextSession);

    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // ===================================
  // START INTERVIEW
  // ===================================

  const handleStartInterview = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (busy || requiresRefresh) return;

    const parsedTopics = Array.from(
      new Set(
        topics
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean)
      )
    );

    if (targetRole.trim().length < 2) {
      setError("Please enter a valid target role.");
      return;
    }

    if (
      parsedTopics.length > 10 ||
      parsedTopics.some((topic) => topic.length > 100)
    ) {
      setError(
        "Enter up to 10 topics, each containing at most 100 characters."
      );

      return;
    }

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 3 ||
      questionCount > 15
    ) {
      setError("Select between 3 and 15 questions.");
      return;
    }

    if (interviewType === "resume_based" && !resumeId.trim()) {
      setError("Resume ID is required.");
      return;
    }

    if (
      resumeId.trim() &&
      !/^[a-fA-F0-9]{24}$/.test(resumeId.trim())
    ) {
      setError("Invalid Resume ID.");
      return;
    }

    if (interviewType === "job_specific" && !jobMatchId) {
      setError("Select an existing job matching report.");
      return;
    }

    if (!consent) {
      setError("External AI processing consent is required.");
      return;
    }

    const request: CreateInterviewRequest = {
      interviewType,
      targetRole: targetRole.trim(),
      companyName: companyName.trim() || undefined,
      difficulty,
      questionCount,
      topics: parsedTopics,
      resumeId: resumeId.trim() || undefined,
      jobMatchId: jobMatchId || undefined,
      adaptiveDifficulty,
      enableFollowUps,
      consent: true,
    };

    void runOperation(
      "Generating your first question...",
      async () => {
        const response = await interviewService.createSession(request);

        setAnswer("");
        setAdaptiveDecision(null);
        setReviewingQuestionId(null);
        setRequiresRefresh(false);

        displaySession(response);

        await refreshHistorySafely();
      },
      true
    );
  };

  // ===================================
  // SUBMIT OR SKIP QUESTION
  // ===================================

  const handleProcessQuestion = (skip: boolean) => {
    if (
      !session ||
      !currentQuestion ||
      session.status !== "in_progress" ||
      session.isLocked ||
      busy ||
      requiresRefresh
    ) {
      return;
    }

    if (!skip && !answer.trim()) {
      setError("Please enter your answer.");
      return;
    }

    if (
      skip &&
      !window.confirm("Skip this question without evaluation?")
    ) {
      return;
    }

    void runOperation(
      skip
        ? "Preparing the next question..."
        : "Evaluating your answer...",
      async () => {
        const response = skip
          ? await interviewService.skipQuestion(session._id, {
              questionId: currentQuestion.questionId,
            })
          : await interviewService.submitAnswer(session._id, {
              questionId: currentQuestion.questionId,
              answer: answer.trim(),
            });

        setAnswer("");

        setAdaptiveDecision(response.adaptiveDecision);

        setReviewingQuestionId(
          response.latestAnswer.questionId
        );

        setRequiresRefresh(false);

        displaySession(response.session);

        await refreshHistorySafely();
      },
      true
    );
  };

  // ===================================
  // OPEN SAVED SESSION
  // ===================================

  const openSession = (sessionId: string) => {
    void runOperation(
      "Loading interview session...",
      async () => {
        const response = await interviewService.getById(sessionId);

        setAnswer("");
        setAdaptiveDecision(null);
        setReviewingQuestionId(null);

        setRequiresRefresh(response.isLocked);

        displaySession(response);
      }
    );
  };

  // ===================================
  // REFRESH ACTIVE SESSION
  // ===================================

  const refreshSession = () => {
    if (!session) return;

    void runOperation(
      "Refreshing interview...",
      async () => {
        const response = await interviewService.getById(session._id);

        if (
          response.currentQuestion?.questionId !==
          session.currentQuestion?.questionId
        ) {
          setAnswer("");
          setReviewingQuestionId(null);
          setAdaptiveDecision(null);
        }

        setRequiresRefresh(response.isLocked);
        setSession(response);

        if (response.report) {
          setReportLoadError("");
        }

        await refreshHistorySafely();
      }
    );
  };

  // ===================================
  // GENERATE REPORT ASYNCHRONOUSLY
  // ===================================

  const handleGenerateReport = () => {
    if (
      !session ||
      session.status !== "completed" ||
      session.report ||
      busy ||
      operationLock.current
    ) {
      return;
    }

    setError("");
    setReportLoadError("");

    const existingJob = backgroundJob.job;

    if (existingJob?.resourceId === session._id) {
      if (existingJob.status === "completed") {
        setReportLoadAttempt((previous) => previous + 1);
        return;
      }

      if (existingJob.status === "failed") {
        void backgroundJob.retryJob();
        return;
      }

      backgroundJob.resumeTracking();
      return;
    }

    // The backend checks whether an existing job
    // can be recovered before creating another.

    void backgroundJob.submitInterviewReport(session._id);
  };

  // ===================================
  // CANCEL INTERVIEW
  // ===================================

  const handleCancel = () => {
    if (
      !session ||
      session.isLocked ||
      requiresRefresh ||
      busy
    ) {
      return;
    }

    if (
      !window.confirm(
        "Cancel this interview? Previous answers will remain saved."
      )
    ) {
      return;
    }

    void runOperation(
      "Cancelling interview...",
      async () => {
        const response = await interviewService.cancel(session._id);

        resetBackgroundTracking();

        setSession(response);
        setAnswer("");
        setAdaptiveDecision(null);

        await refreshHistorySafely();
      },
      true
    );
  };

  // ===================================
  // DELETE INTERVIEW
  // ===================================

  const handleDelete = (sessionId: string) => {
    if (busy) return;

    if (
      !window.confirm(
        "Permanently delete this interview and its saved evaluations?"
      )
    ) {
      return;
    }

    void runOperation(
      "Deleting interview...",
      async () => {
        await interviewService.delete(sessionId);

        if (session?._id === sessionId) {
          resetBackgroundTracking();

          setSession(null);
          setAnswer("");
          setAdaptiveDecision(null);
          setReviewingQuestionId(null);
          setRequiresRefresh(false);
        }

        setHistory((previous) =>
          previous.filter((item) => item._id !== sessionId)
        );

        await refreshHistorySafely();
      }
    );
  };

  // ===================================
  // LOAD MORE HISTORY
  // ===================================

  const loadMoreHistory = () => {
    void runOperation(
      "Loading interview history...",
      async () => {
        const nextPage = historyPage + 1;

        const response = await interviewService.getAll(nextPage, 20);

        setHistory((previous) => {
          const ids = new Set(previous.map((item) => item._id));

          return [
            ...previous,
            ...response.sessions.filter(
              (item) => !ids.has(item._id)
            ),
          ];
        });

        setHistoryPage(nextPage);

        setHasMoreHistory(
          nextPage < response.pagination.totalPages
        );
      }
    );
  };

  // ===================================
  // NEW INTERVIEW
  // ===================================

  const startNewInterview = () => {
    if (busy || requiresRefresh) return;

    resetBackgroundTracking();

    setSession(null);
    setAnswer("");
    setAdaptiveDecision(null);
    setReviewingQuestionId(null);
    setConsent(false);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ===================================
  // LOADING SCREEN
  // ===================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto mb-4 animate-spin text-violet-400"
          />

          <p className="text-sm text-slate-400">
            Loading AI Interview Studio...
          </p>
        </div>
      </div>
    );
  }

  // ===================================
  // MAIN USER INTERFACE
  // ===================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-100">

      {/* HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
            <MessagesSquare size={30} className="text-violet-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              AI Interview Studio
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Practice intelligently. Improve with every answer.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || requiresRefresh}
          onClick={startNewInterview}
          className={primaryButton}
        >
          <Plus size={18} />
          New Interview
        </button>
      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <AlertCircle size={20} className="shrink-0" />

          <p className="flex-1">{error}</p>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* OPERATION INDICATOR */}

      {operation && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-300"
        >
          <Loader2 size={20} className="animate-spin" />
          {operation}
        </div>
      )}

      {/* REFRESH REQUIRED */}

      {requiresRefresh && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-300">
            Refresh saved interview state before retrying an operation.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (session) {
                refreshSession();
              } else {
                void runOperation(
                  "Refreshing history...",
                  async () => {
                    await refreshHistory();
                    setRequiresRefresh(false);
                  }
                );
              }
            }}
            className={`${secondaryButton} mt-3`}
          >
            <RefreshCw size={16} />

            {session ? "Refresh Session" : "Refresh History"}
          </button>

          {!session && (
            <p className="mt-2 text-xs text-slate-400">
              Check history for a newly created interview before
              starting another.
            </p>
          )}
        </div>
      )}

      {/* CONFIGURATION SECTION */}

      {!session && (
        <>
          <section className="rounded-2xl border border-violet-500/20 bg-linear-to-r from-violet-500/10 to-indigo-500/5 p-6">
            <div className="flex items-start gap-4">
              <BrainCircuit
                size={30}
                className="shrink-0 text-violet-400"
              />

              <div>
                <h2 className="text-lg font-semibold">
                  Your Personal AI Interviewer
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Experience personalized interview questions, adaptive
                  difficulty, intelligent follow-ups and structured
                  answer evaluations.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: "Interview Modes",
                  value: "6",
                  icon: Layers,
                },
                {
                  label: "Difficulty Levels",
                  value: "3",
                  icon: TrendingUp,
                },
                {
                  label: "Questions",
                  value: "3–15",
                  icon: MessagesSquare,
                },
                {
                  label: "AI Evaluation",
                  value: "Enabled",
                  icon: BrainCircuit,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <Icon size={20} className="text-violet-400" />

                    <p className="mt-3 text-lg font-semibold">
                      {item.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="flex items-center gap-3 text-lg font-semibold">
              <Target size={23} className="text-violet-400" />
              Configure Your Interview
            </h2>

            {/* INTERVIEW MODES */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {interviewOptions.map((item) => {
                const Icon = item.icon;
                const selected = interviewType === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={busy}
                    aria-pressed={selected}
                    onClick={() => setInterviewType(item.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
                    }`}
                  >
                    <Icon size={24} className="mb-3 text-violet-400" />

                    <p className="text-sm font-semibold">
                      {item.title}
                    </p>

                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleStartInterview}
              className="mt-6 space-y-5"
            >
              <div className="grid gap-5 md:grid-cols-2">

                {/* TARGET ROLE */}

                <div>
                  <label
                    htmlFor="interviewRole"
                    className="mb-2 block text-sm text-slate-300"
                  >
                    Target Role
                  </label>

                  <input
                    id="interviewRole"
                    required
                    minLength={2}
                    maxLength={150}
                    disabled={busy}
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                    placeholder="Software Developer"
                    className={inputClass}
                  />
                </div>

                {/* COMPANY */}

                <div>
                  <label
                    htmlFor="interviewCompany"
                    className="mb-2 block text-sm text-slate-300"
                  >
                    Company Name (Optional)
                  </label>

                  <input
                    id="interviewCompany"
                    maxLength={150}
                    disabled={busy}
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Target company"
                    className={inputClass}
                  />
                </div>

                {/* DIFFICULTY */}

                <div>
                  <label
                    htmlFor="interviewDifficulty"
                    className="mb-2 block text-sm text-slate-300"
                  >
                    Starting Difficulty
                  </label>

                  <select
                    id="interviewDifficulty"
                    value={difficulty}
                    disabled={busy}
                    onChange={(event) =>
                      setDifficulty(event.target.value as InterviewDifficulty)
                    }
                    className={inputClass}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                {/* QUESTION COUNT */}

                <div>
                  <label
                    htmlFor="interviewCount"
                    className="mb-2 block text-sm text-slate-300"
                  >
                    Number of Questions
                  </label>

                  <select
                    id="interviewCount"
                    value={questionCount}
                    disabled={busy}
                    onChange={(event) =>
                      setQuestionCount(Number(event.target.value))
                    }
                    className={inputClass}
                  >
                    {Array.from(
                      { length: 13 },
                      (_, index) => index + 3
                    ).map((count) => (
                      <option key={count} value={count}>
                        {count} Questions
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TOPICS */}

              <div>
                <label
                  htmlFor="interviewTopics"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Preferred Topics
                </label>

                <textarea
                  id="interviewTopics"
                  rows={3}
                  maxLength={1010}
                  disabled={busy}
                  value={topics}
                  onChange={(event) => setTopics(event.target.value)}
                  placeholder="Java, Spring Boot, SQL, Redis, System Design"
                  className={inputClass}
                />

                <p className="mt-1 text-xs text-slate-500">
                  Enter up to 10 comma-separated topics.
                </p>
              </div>

              {/* PERSONALIZATION RESOURCES */}

              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <h3 className="font-medium">
                  Personalization Resources
                </h3>

                <div>
                  <label
                    htmlFor="interviewResume"
                    className="mb-2 block text-xs text-slate-400"
                  >
                    Resume ID
                    {interviewType === "resume_based"
                      ? " (Required)"
                      : " (Optional)"}
                  </label>

                  <input
                    id="interviewResume"
                    disabled={busy}
                    required={interviewType === "resume_based"}
                    value={resumeId}
                    onChange={(event) => setResumeId(event.target.value)}
                    placeholder="24-character MongoDB Resume ID"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="interviewJobMatch"
                    className="mb-2 block text-xs text-slate-400"
                  >
                    Job Matching Report
                    {interviewType === "job_specific"
                      ? " (Required)"
                      : " (Optional)"}
                  </label>

                  <select
                    id="interviewJobMatch"
                    disabled={busy}
                    required={interviewType === "job_specific"}
                    value={jobMatchId}
                    onChange={(event) => setJobMatchId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">No report selected</option>

                    {jobMatches.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.jobTitle} — {item.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ADAPTIVE SETTINGS */}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4">
                  <input
                    type="checkbox"
                    checked={adaptiveDifficulty}
                    disabled={busy}
                    onChange={(event) =>
                      setAdaptiveDifficulty(event.target.checked)
                    }
                    className="mt-1 accent-violet-600"
                  />

                  <div>
                    <p className="text-sm font-medium">
                      Adaptive Difficulty
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Adjust questions based on your performance.
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 p-4">
                  <input
                    type="checkbox"
                    checked={enableFollowUps}
                    disabled={busy}
                    onChange={(event) =>
                      setEnableFollowUps(event.target.checked)
                    }
                    className="mt-1 accent-violet-600"
                  />

                  <div>
                    <p className="text-sm font-medium">
                      Intelligent Follow-ups
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Explore partial answers and knowledge gaps.
                    </p>
                  </div>
                </label>
              </div>

              {/* CONSENT */}

              <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={busy}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 accent-violet-600"
                />

                <span className="text-xs leading-relaxed text-slate-400">
                  I consent to external AI processing through Groq or
                  Google Gemini. My answers and selected career context
                  may be processed to generate questions and feedback.
                  Automated redaction may not remove all personal
                  information.
                </span>
              </label>

              <button
                type="submit"
                disabled={busy || !consent || requiresRefresh}
                className={`${primaryButton} w-full py-4`}
              >
                <Sparkles size={20} />
                Start AI Interview
              </button>
            </form>
          </section>
        </>
      )}

      {/* ACTIVE SESSION */}

      {session && (
        <div ref={workspaceRef} className="scroll-mt-24 space-y-6">

          {/* SESSION OVERVIEW */}

          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {session.targetRole}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {formatLabel(session.interviewType)}

                  {session.companyName && ` · ${session.companyName}`}
                </p>
              </div>

              <StatusBadge status={session.status} />
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Interview Progress
              </span>

              <span className="font-semibold text-violet-400">
                {session.progressPercentage}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{
                  width: `${session.progressPercentage}%`,
                }}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: "Answered",
                  value: `${session.answeredQuestions}/${session.questionCount}`,
                },
                {
                  label: "Skipped",
                  value: String(session.skippedQuestions),
                },
                {
                  label: "Current Difficulty",
                  value: formatLabel(session.currentDifficulty),
                },
                {
                  label: "Average Score",
                  value: formatScore(session.averageScore),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-slate-950/40 p-4"
                >
                  <p className="text-xs text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={refreshSession}
                className={secondaryButton}
              >
                <RefreshCw size={16} />
                Refresh Session
              </button>

              {session.status === "in_progress" && (
                <button
                  type="button"
                  disabled={busy || session.isLocked || requiresRefresh}
                  onClick={handleCancel}
                  className={secondaryButton}
                >
                  <XCircle size={16} />
                  Cancel Interview
                </button>
              )}
            </div>
          </section>

          {/* ADAPTIVE DIFFICULTY */}

          {adaptiveDecision &&
            !adaptiveDecision.shouldCompleteInterview && (
              <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <TrendingUp
                  size={21}
                  className="shrink-0 text-violet-400"
                />

                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Adaptive Interview Update
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {adaptiveDecision.difficultyReason}
                  </p>
                </div>
              </div>
            )}

          {/* LOCKED SESSION */}

          {session.isLocked && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              This interview is currently processing another operation.
              Refresh the session to retrieve its latest saved state.
            </div>
          )}

          {/* CURRENT QUESTION */}

          {session.status === "in_progress" && currentQuestion && (
            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium tracking-wider text-slate-500">
                  QUESTION {currentQuestion.questionNumber} OF{" "}
                  {session.questionCount}
                </span>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-400">
                    {formatLabel(currentQuestion.difficulty)}
                  </span>

                  {currentQuestion.isFollowUp && (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
                      Follow-up
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/10 p-3">
                  <BrainCircuit size={25} className="text-violet-400" />
                </div>

                <div>
                  <h3 className="font-semibold">AI Interviewer</h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {currentQuestion.topic}
                    {" · "}
                    {formatLabel(currentQuestion.category)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-100">
                  {currentQuestion.question}
                </p>
              </div>

              <form
                className="mt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleProcessQuestion(false);
                }}
              >
                <label
                  htmlFor="interviewAnswer"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Your Answer
                </label>

                <textarea
                  id="interviewAnswer"
                  rows={8}
                  maxLength={10000}
                  value={answer}
                  disabled={busy || session.isLocked || requiresRefresh}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Explain your answer clearly and include relevant examples..."
                  className={`${inputClass} resize-y`}
                />

                <p className="mt-1 text-right text-xs text-slate-500">
                  {answer.length}/10000
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={busy || session.isLocked || requiresRefresh}
                    onClick={() => handleProcessQuestion(true)}
                    className={secondaryButton}
                  >
                    Skip Question
                    <ArrowRight size={17} />
                  </button>

                  <button
                    type="submit"
                    disabled={
                      busy ||
                      session.isLocked ||
                      requiresRefresh ||
                      !answer.trim()
                    }
                    className={primaryButton}
                  >
                    <Sparkles size={18} />
                    Submit Answer
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* COMPLETED INTERVIEW */}

          {session.status === "completed" && (
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
              <Trophy size={45} className="mx-auto text-emerald-400" />

              <h2 className="mt-4 text-xl font-semibold">
                Interview Completed!
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                You have processed all {session.questionCount}{" "}
                interview questions.
              </p>

              {!session.report &&
                !backgroundJob.job &&
                !backgroundJob.isBusy && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleGenerateReport}
                    className={`${primaryButton} mx-auto mt-6`}
                  >
                    <Trophy size={18} />

                    {backgroundJob.error
                      ? "Retry Report Submission"
                      : "Generate Performance Report"}
                  </button>
                )}

              {backgroundJob.isBusy && (
                <p className="mt-5 text-sm text-violet-300">
                  Your performance report is being processed
                  asynchronously.
                </p>
              )}
            </section>
          )}

          {/* BACKGROUND JOB PROGRESS */}

          {session.status === "completed" &&
            !session.report &&
            (
              backgroundJob.job ||
              backgroundJob.isBusy ||
              backgroundJob.error
            ) && (
              <BackgroundJobProgress
                job={backgroundJob.job}
                isSubmitting={backgroundJob.isSubmitting}
                isPolling={backgroundJob.isPolling}
                isRetrying={backgroundJob.isRetrying}
                error={backgroundJob.error}
                onRetry={() => {
                  void backgroundJob.retryJob();
                }}
                onResumeTracking={() => {
                  backgroundJob.resumeTracking();
                }}
                onStopTracking={() => {
                  backgroundJob.stopTracking();
                }}
                onDismiss={() => {
                  resetBackgroundTracking();
                }}
              />
            )}

          {/* REPORT RETRIEVAL */}

          {reportLoading && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-300"
            >
              <Loader2 size={20} className="animate-spin" />
              Retrieving your completed performance report...
            </div>
          )}

          {/* REPORT RETRIEVAL ERROR */}

          {reportLoadError && !session.report && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/5 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={21}
                  className="shrink-0 text-red-400"
                />

                <div>
                  <p className="text-sm font-semibold text-red-300">
                    Unable to retrieve the report
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {reportLoadError}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Background processing has completed. You can retry
                    retrieving the report without generating another one.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setReportLoadAttempt((previous) => previous + 1)
                }
                className={`${secondaryButton} mt-4`}
              >
                <RefreshCw size={16} />
                Retrieve Report Again
              </button>
            </div>
          )}

          {/* CANCELLED INTERVIEW */}

          {session.status === "cancelled" && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
              <h3 className="font-semibold">
                Interview Cancelled
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Your previously submitted answers remain available
                for review.
              </p>
            </div>
          )}

          {/* QUESTION HISTORY */}

          <section className={cardClass}>
            <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold">
              <History size={22} className="text-violet-400" />
              Question History
            </h2>

            <div className="space-y-3">
              {session.questions.map((question) => {
                const expanded =
                  reviewingQuestionId === question.questionId;

                const evaluation = question.answer?.evaluation;

                return (
                  <article
                    key={question.questionId}
                    className="rounded-xl border border-slate-800 bg-slate-950/40"
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() =>
                        setReviewingQuestionId(
                          expanded ? null : question.questionId
                        )
                      }
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      {question.answer?.status === "answered" ? (
                        <CheckCircle2
                          size={21}
                          className="shrink-0 text-emerald-400"
                        />
                      ) : question.answer?.status === "skipped" ? (
                        <ArrowRight
                          size={21}
                          className="shrink-0 text-slate-500"
                        />
                      ) : (
                        <Clock
                          size={21}
                          className="shrink-0 text-violet-400"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          Question {question.questionNumber}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {question.topic}
                          {" · "}
                          {question.question}
                        </p>
                      </div>

                      {evaluation && (
                        <span
                          className={`text-sm font-semibold ${getScoreColor(
                            evaluation.overallScore
                          )}`}
                        >
                          {evaluation.overallScore.toFixed(1)}
                        </span>
                      )}

                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-slate-400 transition ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expanded && reviewedQuestion && (
                      <div className="space-y-5 border-t border-slate-800 p-5">
                        <div>
                          <p className="text-xs text-slate-500">
                            Interview Question
                          </p>

                          <p className="mt-2 text-sm leading-relaxed">
                            {question.question}
                          </p>
                        </div>

                        {question.answer?.status === "answered" && (
                          <div>
                            <p className="text-xs text-slate-500">
                              Your Answer
                            </p>

                            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-sm leading-relaxed text-slate-300">
                              {question.answer.answer}
                            </p>
                          </div>
                        )}

                        {evaluation ? (
                          <EvaluationPanel evaluation={evaluation} />
                        ) : (
                          <p className="text-sm text-slate-500">
                            {question.answer?.status === "skipped"
                              ? "This question was skipped."
                              : "This question has not been evaluated."}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* PERFORMANCE REPORT */}

          {session.report && (
            <PerformanceReportPanel report={session.report} />
          )}
        </div>
      )}

      {/* INTERVIEW SESSION HISTORY */}

      <section className={cardClass}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-3 text-lg font-semibold">
              <History size={22} className="text-violet-400" />
              Interview History
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              Resume interviews or review previous performance.
            </p>
          </div>

          <button
            type="button"
            aria-label="Refresh interview history"
            disabled={busy}
            onClick={() =>
              void runOperation(
                "Refreshing interview history...",
                refreshHistory
              )
            }
            className={secondaryButton}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {history.length === 0 && (
          <div className="py-10 text-center">
            <MessagesSquare
              size={40}
              className="mx-auto mb-4 text-slate-600"
            />

            <p className="text-sm text-slate-400">
              No interviews available.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {history.map((item) => (
            <article
              key={item._id}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="rounded-xl bg-violet-500/10 p-3">
                    <MessagesSquare
                      size={22}
                      className="text-violet-400"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {item.targetRole}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {formatLabel(item.interviewType)}
                      {" · "}
                      {item.answeredQuestions}/{item.questionCount} answered
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={item.status} />

                  <span
                    className={`text-sm font-medium ${getScoreColor(item.averageScore)}`}
                  >
                    {formatScore(item.averageScore)}
                  </span>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openSession(item._id)}
                    className={secondaryButton}
                  >
                    {item.status === "in_progress" ? "Resume" : "View"}
                    <ArrowRight size={15} />
                  </button>

                  <button
                    type="button"
                    disabled={busy || item.isLocked}
                    aria-label="Delete interview"
                    onClick={() => handleDelete(item._id)}
                    className="rounded-lg border border-slate-700 p-3 text-slate-500 transition hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{
                    width: `${item.progressPercentage}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>

        {hasMoreHistory && (
          <button
            type="button"
            disabled={busy}
            onClick={loadMoreHistory}
            className={`${secondaryButton} mt-4 w-full`}
          >
            Load More Interviews
          </button>
        )}
      </section>

      {/* DISCLAIMER */}

      <div className="flex items-start justify-center gap-2 pb-4 text-xs leading-relaxed text-slate-500">
        <ShieldCheck size={16} className="shrink-0" />

        <p>
          CareerLens AI provides interview practice and AI-assisted
          feedback. Results are not validated hiring assessments
          or guarantees of employment.
        </p>
      </div>
    </div>
  );
}