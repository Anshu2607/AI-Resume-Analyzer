import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  BrainCircuit,
  Sparkles,
  Target,
  BriefcaseBusiness,
  Route,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  History,
  Trash2,
  ArrowRight,
  Plus,
  RefreshCw,
  Wrench,
  Lightbulb,
  FileText,
  ChevronDown,
  Database,
  X,
} from "lucide-react";

import agentService from "../services/agent.service";
import jobMatchingService from "../services/jobMatching.service";
import roadmapService from "../services/roadmap.service";

import type {
  AgentRequest,
  AgentSessionDetails,
  AgentSessionSummary,
  AgentStatus,
  AgentToolName,
  AgentDifficulty,
  AgentArtifact,
} from "../types/agent.types";

import type {
  JobMatchSummary,
} from "../types/jobMatching.types";

import type {
  RoadmapSummary,
} from "../types/roadmap.types";

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

const toolLabels: Record<AgentToolName, string> = {
  get_resume_analysis: "Retrieve Resume Analysis",
  search_resume: "Search Resume Evidence",
  get_job_match: "Retrieve Job Matching Report",
  generate_job_match: "Generate Job Matching Report",
  get_skill_gaps: "Analyze Skill Gaps",
  generate_roadmap: "Generate Career Roadmap",
  get_roadmap_progress: "Retrieve Learning Progress",
};

const statusConfig: Record<
  AgentStatus,
  { label: string; style: string }
> = {
  pending: {
    label: "Pending",
    style: "bg-slate-800 text-slate-400",
  },
  planning: {
    label: "Planning",
    style: "bg-violet-500/10 text-violet-400",
  },
  executing: {
    label: "Executing",
    style: "bg-sky-500/10 text-sky-400",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    style: "bg-amber-500/10 text-amber-400",
  },
  completed: {
    label: "Completed",
    style: "bg-emerald-500/10 text-emerald-400",
  },
  failed: {
    label: "Failed",
    style: "bg-red-500/10 text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    style: "bg-slate-800 text-slate-400",
  },
};

const suggestedGoals = [
  {
    title: "Improve Job Compatibility",
    description: "Analyze job fit and prioritize missing skills.",
    goal: "Retrieve my existing job matching report, analyze my skill gaps and recommend which skills I should prioritize.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Build a Career Roadmap",
    description: "Generate a personalized learning plan.",
    goal: "Analyze my existing job matching report, identify skill gaps and generate a personalized career roadmap using my selected learning preferences.",
    icon: Route,
  },
  {
    title: "Review Learning Progress",
    description: "Find remaining activities and next steps.",
    goal: "Review my existing career roadmap progress and recommend which remaining learning activities I should complete next.",
    icon: Target,
  },
  {
    title: "Analyze Resume Evidence",
    description: "Identify strengths and supporting evidence.",
    goal: "Review my resume analysis and relevant resume evidence to identify strengths, weaknesses and career improvement opportunities.",
    icon: FileText,
  },
];

// =====================================
// ERROR HANDLING
// =====================================

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The request timed out. Check session history before starting another execution.";
    }

    return (
      error.response?.data?.message ||
      error.message ||
      "Unable to complete the request."
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
};

// =====================================
// STATUS BADGE
// =====================================

function StatusBadge({ status }: { status: AgentStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${config.style}`}
    >
      {config.label}
    </span>
  );
}

// =====================================
// MAIN COMPONENT
// =====================================

export default function AICareerAgent() {
  const navigate = useNavigate();

  // ===================================
  // FORM STATE
  // ===================================

  const [goal, setGoal] = useState("");
  const [jobMatchId, setJobMatchId] = useState("");
  const [roadmapId, setRoadmapId] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [analysisId, setAnalysisId] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [durationWeeks, setDurationWeeks] = useState(4);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);

  const [difficulty, setDifficulty] =
    useState<AgentDifficulty>("intermediate");

  const [consent, setConsent] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ===================================
  // RESOURCE STATE
  // ===================================

  const [jobMatches, setJobMatches] =
    useState<JobMatchSummary[]>([]);

  const [roadmaps, setRoadmaps] =
    useState<RoadmapSummary[]>([]);

  // ===================================
  // SESSION STATE
  // ===================================

  const [session, setSession] =
    useState<AgentSessionDetails | null>(null);

  const [history, setHistory] =
    useState<AgentSessionSummary[]>([]);

  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // ===================================
  // LOADING STATE
  // ===================================

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const operationLock = useRef(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const busy = loading || running || updating;

  // ===================================
  // INITIAL DATA
  // ===================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setLoading(true);

        const [matches, savedRoadmaps, sessions] =
          await Promise.allSettled([
            jobMatchingService.getAll(1, 50),
            roadmapService.getAll(1, 50),
            agentService.getAll(1, 20),
          ]);

        if (cancelled) return;

        if (matches.status === "fulfilled") {
          setJobMatches(matches.value.jobMatches);
        }

        if (savedRoadmaps.status === "fulfilled") {
          setRoadmaps(savedRoadmaps.value.roadmaps);
        }

        if (sessions.status === "fulfilled") {
          setHistory(sessions.value.sessions);

          setHasMoreHistory(
            sessions.value.pagination.totalPages > 1
          );
        }

        if (
          matches.status === "rejected" ||
          savedRoadmaps.status === "rejected" ||
          sessions.status === "rejected"
        ) {
          setError(
            "Some resources could not be loaded. Refresh the page to try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================
  // REFRESH SESSION HISTORY
  // ===================================

  const refreshHistory = async () => {
    const response = await agentService.getAll(1, 20);

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
        "The operation completed, but session history could not be refreshed."
      );
    }
  };

  // ===================================
  // DISPLAY SESSION
  // ===================================

  const displaySession = (
    selectedSession: AgentSessionDetails
  ) => {
    setSession(selectedSession);

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // ===================================
  // START AGENT EXECUTION
  // ===================================

  const handleLaunchAgent = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (busy || operationLock.current) return;

    if (goal.trim().length < 5 || goal.length > 2000) {
      setError(
        "Enter a career goal between 5 and 2000 characters."
      );
      return;
    }

    if (!consent) {
      setError("External AI processing consent is required.");
      return;
    }

    if (
      !Number.isInteger(durationWeeks) ||
      durationWeeks < 1 ||
      durationWeeks > 8 ||
      !Number.isInteger(hoursPerWeek) ||
      hoursPerWeek < 2 ||
      hoursPerWeek > 40
    ) {
      setError("Invalid learning preferences.");
      return;
    }

    const idPattern = /^[a-fA-F0-9]{24}$/;

    if (
      [resumeId, analysisId, jobMatchId, roadmapId].some(
        (id) => id.trim() && !idPattern.test(id.trim())
      )
    ) {
      setError("One or more resource IDs are invalid.");
      return;
    }

    if (
      jobDescription.trim() &&
      jobDescription.trim().length < 50
    ) {
      setError(
        "Job description must contain at least 50 characters."
      );
      return;
    }

    const request: AgentRequest = {
      goal: goal.trim(),

      resumeId: resumeId.trim() || undefined,

      analysisId: analysisId.trim() || undefined,

      jobMatchId: jobMatchId || undefined,

      roadmapId: roadmapId || undefined,

      jobTitle: jobTitle.trim() || undefined,

      companyName: companyName.trim() || undefined,

      jobDescription: jobDescription.trim() || undefined,

      learningPreferences: {
        durationWeeks,
        hoursPerWeek,
        difficulty,
      },

      consent: true,
    };

    operationLock.current = true;

    try {
      setRunning(true);
      setError("");
      setSession(null);

      const response =
        await agentService.createSession(request);

      displaySession(response);

      await refreshHistorySafely();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setRunning(false);
      operationLock.current = false;
    }
  };

  // ===================================
  // APPROVE OR DECLINE TOOL
  // ===================================

  const handleApproval = async (approved: boolean) => {
    if (
      !session ||
      session.isLocked ||
      !session.pendingApproval ||
      busy ||
      operationLock.current
    ) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);
      setError("");

      const response = await agentService.approve(
        session._id,
        {
          stepNumber: session.pendingApproval.stepNumber,
          approved,
        }
      );

      displaySession(response);

      await refreshHistorySafely();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUpdating(false);
      operationLock.current = false;
    }
  };

  // ===================================
  // OPEN SAVED SESSION
  // ===================================

  const handleOpenSession = async (sessionId: string) => {
    if (busy || operationLock.current) return;

    operationLock.current = true;

    try {
      setUpdating(true);
      setError("");

      const response =
        await agentService.getById(sessionId);

      displaySession(response);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUpdating(false);
      operationLock.current = false;
    }
  };

  // ===================================
  // REFRESH SESSION
  // ===================================

  const handleRefreshSession = async () => {
    if (!session) return;

    await handleOpenSession(session._id);
  };

  // ===================================
  // CANCEL SESSION
  // ===================================

  const handleCancelSession = async () => {
    if (
      !session ||
      session.isLocked ||
      busy ||
      operationLock.current
    ) {
      return;
    }

    if (
      !window.confirm(
        "Cancel this session? Previously generated reports will remain saved."
      )
    ) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);
      setError("");

      const response =
        await agentService.cancel(session._id);

      displaySession(response);

      await refreshHistorySafely();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUpdating(false);
      operationLock.current = false;
    }
  };

  // ===================================
  // DELETE SESSION
  // ===================================

  const handleDeleteSession = async (
    sessionId: string
  ) => {
    if (busy || operationLock.current) return;

    if (
      !window.confirm(
        "Delete this agent session? Generated reports will not be deleted."
      )
    ) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);
      setError("");

      await agentService.delete(sessionId);

      setHistory((previous) =>
        previous.filter(
          (item) => item._id !== sessionId
        )
      );

      if (session?._id === sessionId) {
        setSession(null);
      }

      await refreshHistorySafely();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUpdating(false);
      operationLock.current = false;
    }
  };

  // ===================================
  // LOAD MORE HISTORY
  // ===================================

  const loadMoreHistory = async () => {
    if (busy || operationLock.current) return;

    operationLock.current = true;

    try {
      setUpdating(true);
      setError("");

      const nextPage = historyPage + 1;

      const response =
        await agentService.getAll(nextPage, 20);

      setHistory((previous) => {
        const ids = new Set(
          previous.map((item) => item._id)
        );

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
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setUpdating(false);
      operationLock.current = false;
    }
  };

  // ===================================
  // OPEN GENERATED ARTIFACT
  // ===================================

  const openArtifact = (artifact: AgentArtifact) => {
    switch (artifact.type) {
      case "resume_analysis":
        navigate("/resume-analysis");
        break;

      case "job_match":
        navigate("/job-matching");
        break;

      case "skill_gap_report":
        navigate("/skill-gaps");
        break;

      case "roadmap":
        navigate("/career-roadmap");
        break;
    }
  };

  // ===================================
  // RESET FORM
  // ===================================

  const startNewSession = () => {
    if (busy) return;

    setSession(null);
    setGoal("");
    setJobMatchId("");
    setRoadmapId("");
    setResumeId("");
    setAnalysisId("");
    setJobTitle("");
    setCompanyName("");
    setJobDescription("");
    setDurationWeeks(4);
    setHoursPerWeek(10);
    setDifficulty("intermediate");
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
            Loading Career AI Agent...
          </p>
        </div>
      </div>
    );
  }

  // ===================================
  // MAIN INTERFACE
  // ===================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-100">

      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
            <BrainCircuit
              size={30}
              className="text-violet-400"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Career AI Agent
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Your intelligent, goal-driven career assistant.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={startNewSession}
          className={primaryButton}
        >
          <Plus size={18} />
          New Session
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
            <X size={18} />
          </button>
        </div>
      )}

      {/* AGENT OVERVIEW */}

      <section className="rounded-2xl border border-violet-500/20 bg-linear-to-r from-violet-500/10 to-indigo-500/5 p-6">
        <div className="flex items-start gap-4">
          <Sparkles
            size={28}
            className="shrink-0 text-violet-400"
          />

          <div>
            <h2 className="text-lg font-semibold">
              One Goal. Multiple Intelligent Actions.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              Describe your career objective. The agent can
              retrieve relevant reports, analyze skill gaps,
              generate learning plans and recommend next steps.
              Creation operations require your explicit approval.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Available Tools",
              value: "7",
              icon: Wrench,
            },
            {
              label: "Planning Limit",
              value: "8 Iterations",
              icon: BrainCircuit,
            },
            {
              label: "Tool Call Limit",
              value: "6 Calls",
              icon: Target,
            },
            {
              label: "Human Approval",
              value: "Enabled",
              icon: ShieldCheck,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <Icon
                  size={20}
                  className="text-violet-400"
                />

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

      {/* AGENT REQUEST FORM */}

      <section className={cardClass}>
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <Target size={22} className="text-violet-400" />
          What would you like to accomplish?
        </h2>

        {/* SUGGESTED GOALS */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {suggestedGoals.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                type="button"
                disabled={busy}
                onClick={() => {
                  setGoal(item.goal);

                  if (
                    item.title === "Analyze Resume Evidence"
                  ) {
                    setShowAdvanced(true);
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-left transition hover:border-violet-500/40 hover:bg-violet-500/5 disabled:opacity-50"
              >
                <Icon
                  size={22}
                  className="mb-3 text-violet-400"
                />

                <p className="text-sm font-medium">
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
          onSubmit={handleLaunchAgent}
          className="mt-6 space-y-5"
        >
          {/* USER GOAL */}

          <div>
            <label
              htmlFor="agentGoal"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Career Goal
            </label>

            <textarea
              id="agentGoal"
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              disabled={busy}
              value={goal}
              onChange={(event) =>
                setGoal(event.target.value)
              }
              placeholder="Describe your career goal..."
              className={`${inputClass} resize-y`}
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {goal.length}/2000
            </p>
          </div>

          {/* RESOURCE SELECTION */}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="agentJobMatch"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Job Matching Report
              </label>

              <select
                id="agentJobMatch"
                value={jobMatchId}
                disabled={busy}
                onChange={(event) =>
                  setJobMatchId(event.target.value)
                }
                className={inputClass}
              >
                <option value="">
                  No report selected
                </option>

                {jobMatches.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.jobTitle} — {item.companyName}
                    {" | "}
                    {item.overallScore}/100
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="agentRoadmap"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Existing Career Roadmap
              </label>

              <select
                id="agentRoadmap"
                value={roadmapId}
                disabled={busy}
                onChange={(event) =>
                  setRoadmapId(event.target.value)
                }
                className={inputClass}
              >
                <option value="">
                  No roadmap selected
                </option>

                {roadmaps.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.jobTitle} — {item.durationWeeks} weeks
                    {" | "}
                    {item.progressPercentage}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LEARNING PREFERENCES */}

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium">
              <Clock size={17} className="text-violet-400" />
              Learning Preferences
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="agentDuration"
                  className="mb-2 block text-xs text-slate-400"
                >
                  Duration
                </label>

                <select
                  id="agentDuration"
                  value={durationWeeks}
                  disabled={busy}
                  onChange={(event) =>
                    setDurationWeeks(
                      Number(event.target.value)
                    )
                  }
                  className={inputClass}
                >
                  {Array.from(
                    { length: 8 },
                    (_, index) => index + 1
                  ).map((week) => (
                    <option key={week} value={week}>
                      {week} {week === 1 ? "week" : "weeks"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="agentHours"
                  className="mb-2 block text-xs text-slate-400"
                >
                  Hours Per Week
                </label>

                <input
                  id="agentHours"
                  type="number"
                  min={2}
                  max={40}
                  step={1}
                  required
                  value={hoursPerWeek}
                  disabled={busy}
                  onChange={(event) =>
                    setHoursPerWeek(
                      Number(event.target.value)
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="agentDifficulty"
                  className="mb-2 block text-xs text-slate-400"
                >
                  Difficulty
                </label>

                <select
                  id="agentDifficulty"
                  value={difficulty}
                  disabled={busy}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value as AgentDifficulty
                    )
                  }
                  className={inputClass}
                >
                  <option value="beginner">
                    Beginner
                  </option>

                  <option value="intermediate">
                    Intermediate
                  </option>

                  <option value="advanced">
                    Advanced
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* ADVANCED CONFIGURATION */}

          <div className="rounded-xl border border-slate-800 bg-slate-950/40">
            <button
              type="button"
              aria-expanded={showAdvanced}
              onClick={() =>
                setShowAdvanced((previous) => !previous)
              }
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-sm font-medium">
                  Advanced Resource Configuration
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Resume IDs, analysis IDs and new job details.
                </p>
              </div>

              <ChevronDown
                size={18}
                className={`text-slate-400 transition ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t border-slate-800 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="agentResumeId"
                      className="mb-2 block text-xs text-slate-400"
                    >
                      Resume ID
                    </label>

                    <input
                      id="agentResumeId"
                      value={resumeId}
                      disabled={busy}
                      onChange={(event) =>
                        setResumeId(event.target.value)
                      }
                      placeholder="24-character MongoDB ID"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="agentAnalysisId"
                      className="mb-2 block text-xs text-slate-400"
                    >
                      Resume Analysis ID
                    </label>

                    <input
                      id="agentAnalysisId"
                      value={analysisId}
                      disabled={busy}
                      onChange={(event) =>
                        setAnalysisId(event.target.value)
                      }
                      placeholder="24-character MongoDB ID"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="agentJobTitle"
                      className="mb-2 block text-xs text-slate-400"
                    >
                      New Job Title
                    </label>

                    <input
                      id="agentJobTitle"
                      value={jobTitle}
                      disabled={busy}
                      maxLength={150}
                      onChange={(event) =>
                        setJobTitle(event.target.value)
                      }
                      placeholder="Software Developer"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="agentCompany"
                      className="mb-2 block text-xs text-slate-400"
                    >
                      Company Name
                    </label>

                    <input
                      id="agentCompany"
                      value={companyName}
                      disabled={busy}
                      maxLength={150}
                      onChange={(event) =>
                        setCompanyName(event.target.value)
                      }
                      placeholder="Company name"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="agentJobDescription"
                    className="mb-2 block text-xs text-slate-400"
                  >
                    New Job Description
                  </label>

                  <textarea
                    id="agentJobDescription"
                    rows={5}
                    maxLength={20000}
                    disabled={busy}
                    value={jobDescription}
                    onChange={(event) =>
                      setJobDescription(event.target.value)
                    }
                    placeholder="Paste the actual job description when requesting a new job matching report."
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI CONSENT */}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(event) =>
                setConsent(event.target.checked)
              }
              className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
            />

            <span className="text-xs leading-relaxed text-slate-400">
              I consent to external AI processing through Groq
              or Google Gemini. My career goal, selected resource
              references and relevant report or resume excerpts
              may be processed to accomplish my request.
              New report creation requires separate approval.
              Automated redaction may not remove all personal
              information.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy || !consent || goal.trim().length < 5}
            className={`${primaryButton} w-full py-4`}
          >
            {running ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <BrainCircuit size={20} />
            )}

            {running
              ? "Agent is Working..."
              : "Launch Career AI Agent"}
          </button>
        </form>
      </section>

      {/* RUNNING STATE */}

      {running && (
        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-10 text-center">
          <BrainCircuit
            size={48}
            className="mx-auto mb-4 animate-pulse text-violet-400"
          />

          <h3 className="text-lg font-semibold">
            Agent Execution in Progress
          </h3>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            The backend is evaluating your goal and selecting
            authorized tools. Results will appear when the
            request returns.
          </p>

          <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
          </div>
        </section>
      )}

      {/* SESSION DETAILS */}

      {session && (
        <div
          ref={resultRef}
          className="scroll-mt-24 space-y-6"
        >
          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-violet-400">
                  Agent Execution
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {session.title}
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {session.goal}
                </p>
              </div>

              <StatusBadge status={session.status} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRefreshSession()}
                className={secondaryButton}
              >
                <RefreshCw
                  size={16}
                  className={updating ? "animate-spin" : ""}
                />
                Refresh Session
              </button>

              {!session.isLocked &&
                (
                  session.status === "pending" ||
                  session.status === "awaiting_approval"
                ) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCancelSession()}
                    className={secondaryButton}
                  >
                    <XCircle size={16} />
                    Cancel Session
                  </button>
                )}
            </div>
          </section>

          {/* LOCKED SESSION */}

          {session.isLocked ? (
            <section className={cardClass}>
              <div className="flex items-center gap-4">
                <Loader2
                  size={28}
                  className="animate-spin text-violet-400"
                />

                <div>
                  <h3 className="font-semibold">
                    Session is Executing
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    {session.message} Use Refresh Session
                    to retrieve the latest saved state.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* EXECUTION METRICS */}

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                  {
                    label: "Planning Iterations",
                    value: session.iteration,
                    icon: BrainCircuit,
                  },
                  {
                    label: "Tool Calls",
                    value: session.totalToolCalls,
                    icon: Wrench,
                  },
                  {
                    label: "AI Creation Calls",
                    value: session.generativeToolCalls,
                    icon: Sparkles,
                  },
                  {
                    label: "Execution Time",
                    value: `${(
                      session.activeExecutionTimeMs / 1000
                    ).toFixed(1)}s`,
                    icon: Clock,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className={cardClass}
                    >
                      <Icon
                        size={21}
                        className="text-violet-400"
                      />

                      <p className="mt-4 text-2xl font-bold">
                        {item.value}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* EXECUTION TIMELINE */}

              <section className={cardClass}>
                <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
                  <Wrench
                    size={21}
                    className="text-violet-400"
                  />

                  Agent Execution Timeline
                </h3>

                {session.executionSteps.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No tools have been executed in this session.
                  </p>
                )}

                <div className="space-y-4">
                  {session.executionSteps.map((step) => {
                    const StepIcon =
                      step.status === "completed"
                        ? CheckCircle2
                        : step.status === "failed"
                          ? XCircle
                          : step.status === "running"
                            ? Loader2
                            : Clock;

                    const stepColor =
                      step.status === "completed"
                        ? "text-emerald-400"
                        : step.status === "failed"
                          ? "text-red-400"
                          : step.status === "pending"
                            ? "text-amber-400"
                            : "text-slate-400";

                    return (
                      <article
                        key={step.stepNumber}
                        className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <StepIcon
                          size={23}
                          className={`mt-1 shrink-0 ${stepColor} ${
                            step.status === "running"
                              ? "animate-spin"
                              : ""
                          }`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold">
                              Step {step.stepNumber}:{" "}
                              {toolLabels[step.toolName]}
                            </h4>

                            <span
                              className={`text-xs capitalize ${stepColor}`}
                            >
                              {step.status}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {step.toolName}
                          </p>

                          <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {step.purpose}
                          </p>

                          {step.resultSummary && (
                            <p className="mt-3 rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-300">
                              {step.resultSummary}
                            </p>
                          )}

                          {step.errorMessage && (
                            <p className="mt-3 text-xs leading-relaxed text-red-400">
                              {step.errorMessage}
                            </p>
                          )}

                          {step.durationMs > 0 && (
                            <p className="mt-3 text-xs text-slate-600">
                              {(step.durationMs / 1000).toFixed(2)} seconds
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* PENDING APPROVAL */}

              {session.status === "awaiting_approval" &&
                session.pendingApproval && (
                  <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                    <div className="flex items-start gap-4">
                      <ShieldCheck
                        size={30}
                        className="shrink-0 text-amber-400"
                      />

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-amber-300">
                          User Approval Required
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                          The agent has paused before creating
                          a new report using external AI.
                        </p>

                        <h4 className="mt-5 font-semibold">
                          {
                            toolLabels[
                              session.pendingApproval.toolName
                            ]
                          }
                        </h4>

                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                          {session.pendingApproval.purpose}
                        </p>

                        <div className="mt-4 space-y-2 rounded-xl bg-slate-950/50 p-4 text-xs text-slate-300">
                          {Object.entries(
                            session.pendingApproval.arguments
                          ).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex flex-wrap justify-between gap-2"
                            >
                              <span className="text-slate-500">
                                {key}
                              </span>

                              <span className="break-all">
                                {String(value)}
                              </span>
                            </div>
                          ))}

                          {session.pendingApproval.toolName ===
                            "generate_roadmap" && (
                            <>
                              <p>
                                Duration:{" "}
                                {session.learningPreferences.durationWeeks} weeks
                              </p>

                              <p>
                                Weekly hours:{" "}
                                {session.learningPreferences.hoursPerWeek}
                              </p>

                              <p className="capitalize">
                                Difficulty:{" "}
                                {session.learningPreferences.difficulty}
                              </p>
                            </>
                          )}

                          {session.pendingApproval.toolName ===
                            "generate_job_match" && (
                            <>
                              <p>
                                Job:{" "}
                                {session.resourceReferences.jobTitle}
                              </p>

                              <p>
                                Company:{" "}
                                {session.resourceReferences.companyName ||
                                  "Not specified"}
                              </p>
                            </>
                          )}
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleApproval(true)
                            }
                            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {updating ? (
                              <Loader2
                                size={18}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle2 size={18} />
                            )}

                            Approve Execution
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleApproval(false)
                            }
                            className={secondaryButton}
                          >
                            <XCircle size={18} />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

              {/* CLARIFICATION REQUEST */}

              {session.clarification && (
                <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-sky-300">
                    <AlertCircle size={20} />
                    Additional Information Required
                  </h3>

                  <p className="mt-3 text-sm text-slate-300">
                    {session.clarification.question}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Missing information:{" "}
                    {session.clarification.missingFields.join(", ")}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Update the request form and launch a new
                    agent session with the required information.
                  </p>
                </section>
              )}

              {/* FINAL RESPONSE */}

              {session.finalResponse && (
                <section className={cardClass}>
                  <h3 className="flex items-center gap-3 text-lg font-semibold">
                    <BrainCircuit
                      size={24}
                      className="text-violet-400"
                    />

                    Agent Response
                  </h3>

                  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {session.finalResponse.summary}
                  </p>

                  {session.finalResponse.recommendations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="mb-4 flex items-center gap-2 font-semibold">
                        <Lightbulb
                          size={19}
                          className="text-violet-400"
                        />

                        Recommended Next Steps
                      </h4>

                      <div className="space-y-3">
                        {session.finalResponse.recommendations.map(
                          (item, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 rounded-xl bg-slate-950/40 p-4"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-400">
                                {index + 1}
                              </span>

                              <p className="text-sm leading-relaxed text-slate-300">
                                {item}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {session.finalResponse.limitations.length > 0 && (
                    <div className="mt-6 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-400">
                        <AlertCircle size={17} />
                        Limitations
                      </h4>

                      <div className="space-y-2">
                        {session.finalResponse.limitations.map(
                          (item, index) => (
                            <p
                              key={index}
                              className="text-xs leading-relaxed text-slate-400"
                            >
                              • {item}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* EXECUTION ERROR */}

              {session.errorMessage && (
                <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-red-400">
                    <XCircle size={20} />
                    Execution Error
                  </h3>

                  <p className="mt-3 text-sm text-slate-400">
                    {session.errorMessage}
                  </p>
                </section>
              )}

              {/* REPORT REFERENCES */}

              {session.artifacts.length > 0 && (
                <section className={cardClass}>
                  <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
                    <Database
                      size={22}
                      className="text-violet-400"
                    />

                    Available Reports
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    {session.artifacts.map((artifact) => (
                      <article
                        key={`${artifact.type}-${artifact.referenceId}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <FileText
                          size={23}
                          className="text-violet-400"
                        />

                        <p className="mt-3 text-sm font-semibold">
                          {artifact.title}
                        </p>

                        <p className="mt-2 text-xs capitalize text-slate-500">
                          {artifact.type.replace(/_/g, " ")}
                        </p>

                        <p className="mt-2 break-all text-[11px] text-slate-600">
                          ID: {artifact.referenceId}
                        </p>

                        <button
                          type="button"
                          onClick={() => openArtifact(artifact)}
                          className="mt-4 flex items-center gap-2 text-xs font-medium text-violet-400 hover:text-violet-300"
                        >
                          Open Related Module
                          <ArrowRight size={14} />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* AGENT METADATA */}

              <section className={cardClass}>
                <h3 className="mb-4 font-semibold">
                  Agent Metadata
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Provider",
                      value: session.provider || "Unavailable",
                    },
                    {
                      label: "Model",
                      value: session.modelUsed || "Unavailable",
                    },
                    {
                      label: "Agent Version",
                      value: session.agentVersion,
                    },
                    {
                      label: "Prompt Version",
                      value: session.promptVersion || "Unavailable",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-slate-950/40 p-3"
                    >
                      <p className="text-xs text-slate-500">
                        {item.label}
                      </p>

                      <p className="mt-2 break-all text-xs font-medium text-slate-300">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* SESSION HISTORY */}

      <section className={cardClass}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-3 text-lg font-semibold">
              <History
                size={22}
                className="text-violet-400"
              />

              Agent Session History
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              Reopen previous executions and pending approvals.
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            aria-label="Refresh history"
            onClick={async () => {
              if (operationLock.current) return;

              operationLock.current = true;

              try {
                setUpdating(true);
                setError("");

                await refreshHistory();
              } catch (error) {
                setError(getErrorMessage(error));
              } finally {
                setUpdating(false);
                operationLock.current = false;
              }
            }}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={updating ? "animate-spin" : ""}
            />
          </button>
        </div>

        {history.length === 0 && (
          <div className="py-10 text-center">
            <BrainCircuit
              size={38}
              className="mx-auto mb-4 text-slate-600"
            />

            <p className="text-sm text-slate-400">
              No agent sessions yet.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {history.map((item) => (
            <article
              key={item._id}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void handleOpenSession(item._id)
                  }
                  className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:opacity-50"
                >
                  <div className="rounded-xl bg-violet-500/10 p-3">
                    <BrainCircuit
                      size={22}
                      className="text-violet-400"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {item.title}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {item.totalToolCalls} tools
                      {" · "}
                      {item.artifactCount} reports
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={item.status} />

                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Open session"
                    onClick={() =>
                      void handleOpenSession(item._id)
                    }
                    className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-violet-400 disabled:opacity-50"
                  >
                    <ArrowRight size={17} />
                  </button>

                  <button
                    type="button"
                    disabled={busy || item.isLocked}
                    aria-label="Delete session"
                    onClick={() =>
                      void handleDeleteSession(item._id)
                    }
                    className="rounded-lg border border-slate-700 p-2 text-slate-500 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {hasMoreHistory && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadMoreHistory()}
            className={`${secondaryButton} mt-4 w-full`}
          >
            Load More Sessions
          </button>
        )}
      </section>

      {/* DISCLAIMER */}

      <p className="pb-4 text-center text-xs leading-relaxed text-slate-500">
        CareerLens AI provides AI-generated career guidance.
        Compatibility estimates and learning recommendations
        do not guarantee employment or verified professional
        proficiency.
      </p>
    </div>
  );
}