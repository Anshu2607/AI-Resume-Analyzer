import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import axios from "axios";

import {
  Route,
  Sparkles,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Code2,
  GraduationCap,
  BrainCircuit,
  History,
  Trash2,
  Archive,
  ArchiveRestore,
  RotateCcw,
  Plus,
  X,
  ExternalLink,
  Lightbulb,
  Trophy,
  Database,
  ArrowRight,
  Layers,
  ClipboardCheck,
} from "lucide-react";

import roadmapService from "../services/roadmap.service";

import jobMatchingService from "../services/jobMatching.service";

import type {
  JobMatchSummary,
} from "../types/jobMatching.types";

import type {
  Roadmap,
  RoadmapSummary,
  RoadmapDifficulty,
  RoadmapStatus,
  ActivityType,
} from "../types/roadmap.types";

// =====================================
// CONFIGURATION
// =====================================

const cardClass =
  "rounded-2xl border border-slate-800 bg-[#111827] p-5";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-violet-500 disabled:opacity-50";

const primaryButton =
  "flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50";

const statusConfig: Record<
  RoadmapStatus,
  {
    label: string;
    color: string;
    background: string;
  }
> = {
  not_started: {
    label: "Not Started",
    color: "text-slate-400",
    background: "bg-slate-800",
  },

  in_progress: {
    label: "In Progress",
    color: "text-violet-400",
    background: "bg-violet-500/10",
  },

  completed: {
    label: "Completed",
    color: "text-emerald-400",
    background: "bg-emerald-500/10",
  },

  archived: {
    label: "Archived",
    color: "text-amber-400",
    background: "bg-amber-500/10",
  },
};

const activityConfig = {
  theory: {
    label: "Theory",
    icon: BookOpen,
    color: "text-sky-400",
  },

  practice: {
    label: "Practice",
    icon: Code2,
    color: "text-violet-400",
  },

  project: {
    label: "Project",
    icon: Layers,
    color: "text-emerald-400",
  },

  assessment: {
    label: "Assessment",
    icon: ClipboardCheck,
    color: "text-amber-400",
  },

  revision: {
    label: "Revision",
    icon: RotateCcw,
    color: "text-indigo-400",
  },
} satisfies Record<
  ActivityType,
  {
    label: string;
    icon: typeof BookOpen;
    color: string;
  }
>;

// =====================================
// ERROR HANDLING
// =====================================

const getErrorMessage = (
  error: unknown
): string => {
  if (axios.isAxiosError(error)) {
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
// PROGRESS BAR
// =====================================

function ProgressBar({
  value,
  completed = false,
}: {
  value: number;
  completed?: boolean;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, value)
  );

  return (
    <div
      role="progressbar"
      aria-label="Learning progress"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2.5 overflow-hidden rounded-full bg-slate-800"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          completed
            ? "bg-emerald-500"
            : "bg-violet-500"
        }`}
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

// =====================================
// STATUS BADGE
// =====================================

function StatusBadge({
  status,
}: {
  status: RoadmapStatus;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${config.color} ${config.background}`}
    >
      {config.label}
    </span>
  );
}

// =====================================
// MAIN PAGE
// =====================================

export default function CareerRoadmap() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const incomingJobMatchId =
    searchParams.get("jobMatchId") || "";

  // =====================================
  // FORM STATE
  // =====================================

  const [jobMatches, setJobMatches] =
    useState<JobMatchSummary[]>([]);

  const [selectedJobMatch, setSelectedJobMatch] =
    useState(incomingJobMatchId);

  const [durationWeeks, setDurationWeeks] =
    useState(4);

  const [hoursPerWeek, setHoursPerWeek] =
    useState(10);

  const [difficulty, setDifficulty] =
    useState<RoadmapDifficulty>(
      "intermediate"
    );

  const [consent, setConsent] =
    useState(false);

  // =====================================
  // ROADMAP STATE
  // =====================================

  const [roadmap, setRoadmap] =
    useState<Roadmap | null>(null);

  const [history, setHistory] =
    useState<RoadmapSummary[]>([]);

  const [showForm, setShowForm] =
    useState(true);

  const [expandedWeeks, setExpandedWeeks] =
    useState<Record<number, boolean>>({
      1: true,
    });

  const [expandedActivities, setExpandedActivities] =
    useState<Record<string, boolean>>({});

  // =====================================
  // LOADING AND ERROR STATE
  // =====================================

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================
  // PAGINATION
  // =====================================

  const [historyPage, setHistoryPage] =
    useState(1);

  const [hasMoreHistory, setHasMoreHistory] =
    useState(false);

  const [jobMatchPage, setJobMatchPage] =
    useState(1);

  const [hasMoreJobMatches, setHasMoreJobMatches] =
    useState(false);

  // =====================================
  // REFERENCES
  // =====================================

  const operationLock = useRef(false);

  const formRef =
    useRef<HTMLDivElement | null>(null);

  const roadmapRef =
    useRef<HTMLDivElement | null>(null);

  const busy =
    loading || generating || updating;

  // =====================================
  // INITIAL DATA LOADING
  // =====================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setLoading(true);

        setError("");

        setRoadmap(null);

        setShowForm(true);

        setConsent(false);

        const [matches, savedRoadmaps] =
          await Promise.all([
            jobMatchingService.getAll(1, 20),

            roadmapService.getAll(1, 20),
          ]);

        const availableMatches = [
          ...matches.jobMatches,
        ];

        // A report selected from Skill Gap
        // Analysis may not be on the first page.

        if (
          incomingJobMatchId &&
          !availableMatches.some(
            (item) =>
              item._id === incomingJobMatchId
          )
        ) {
          try {
            const incomingReport =
              await jobMatchingService.getById(
                incomingJobMatchId
              );

            availableMatches.unshift(
              incomingReport
            );
          } catch {
            // Fall back to available reports.
          }
        }

        if (cancelled) return;

        setJobMatches(availableMatches);

        setJobMatchPage(1);

        setHasMoreJobMatches(
          matches.pagination.totalPages > 1
        );

        setHistory(
          savedRoadmaps.roadmaps
        );

        setHistoryPage(1);

        setHasMoreHistory(
          savedRoadmaps.pagination.totalPages >
            1
        );

        const selected =
          availableMatches.find(
            (item) =>
              item._id === incomingJobMatchId
          );

        setSelectedJobMatch(
          selected?._id ||
            availableMatches[0]?._id ||
            ""
        );
      } catch (error) {
        if (!cancelled) {
          setError(
            getErrorMessage(error)
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
  }, [incomingJobMatchId]);

  // =====================================
  // REFRESH ROADMAP HISTORY
  // =====================================

  const refreshHistory = async () => {
    const result =
      await roadmapService.getAll(1, 20);

    setHistory(result.roadmaps);

    setHistoryPage(1);

    setHasMoreHistory(
      result.pagination.totalPages > 1
    );
  };

  // Update a history item after progress
  // or status changes without another GET.

  const syncHistoryItem = (
    updatedRoadmap: Roadmap
  ) => {
    setHistory((previous) =>
      previous.map((item) =>
        item._id === updatedRoadmap._id
          ? updatedRoadmap
          : item
      )
    );
  };

  // =====================================
  // DISPLAY ROADMAP
  // =====================================

  const displayRoadmap = (
    selectedRoadmap: Roadmap
  ) => {
    setRoadmap(selectedRoadmap);

    setShowForm(false);

    setExpandedActivities({});

    // Open the first unfinished week.

    const firstIncompleteWeek =
      selectedRoadmap.result.milestones.find(
        (milestone) =>
          milestone.activities.some(
            (_activity, index) =>
              !selectedRoadmap.activityProgress.some(
                (progress) =>
                  progress.week ===
                    milestone.week &&
                  progress.activityIndex ===
                    index &&
                  progress.completed
              )
          )
      );

    setExpandedWeeks({
      [firstIncompleteWeek?.week || 1]:
        true,
    });

    requestAnimationFrame(() => {
      roadmapRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // =====================================
  // GENERATE ROADMAP
  // =====================================

  const handleGenerate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (operationLock.current || busy) {
      return;
    }

    if (!selectedJobMatch) {
      setError(
        "Please select a job matching report."
      );
      return;
    }

    if (
      !Number.isInteger(durationWeeks) ||
      durationWeeks < 1 ||
      durationWeeks > 8
    ) {
      setError(
        "Select a duration between 1 and 8 weeks."
      );
      return;
    }

    if (
      !Number.isInteger(hoursPerWeek) ||
      hoursPerWeek < 2 ||
      hoursPerWeek > 40
    ) {
      setError(
        "Weekly learning hours must be between 2 and 40."
      );
      return;
    }

    if (!consent) {
      setError(
        "Please acknowledge external AI processing."
      );
      return;
    }

    operationLock.current = true;

    try {
      setGenerating(true);

      setError("");

      const generated =
        await roadmapService.generateRoadmap({
          jobMatchId: selectedJobMatch,

          durationWeeks,

          hoursPerWeek,

          difficulty,

          consent: true,
        });

      displayRoadmap(generated);

      try {
        await refreshHistory();
      } catch {
        setHistory((previous) =>
          [
            generated,

            ...previous.filter(
              (item) =>
                item._id !== generated._id
            ),
          ].slice(0, 20)
        );

        setError(
          "Roadmap generated successfully, but history could not be refreshed."
        );
      }
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setGenerating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // OPEN SAVED ROADMAP
  // =====================================

  const handleViewRoadmap = async (
    roadmapId: string
  ) => {
    if (operationLock.current || busy) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);

      setError("");

      const result =
        await roadmapService.getById(
          roadmapId
        );

      displayRoadmap(result);
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setUpdating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // UPDATE ACTIVITY PROGRESS
  // =====================================

  const handleActivityProgress = async (
    week: number,
    activityIndex: number,
    completed: boolean
  ) => {
    if (
      !roadmap ||
      operationLock.current ||
      busy ||
      roadmap.status === "archived"
    ) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);

      setError("");

      const result =
        await roadmapService.updateProgress(
          roadmap._id,
          {
            week,
            activityIndex,
            completed,
          }
        );

      // Trust the backend-calculated progress.

      setRoadmap(result);

      syncHistoryItem(result);
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setUpdating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // RESET, ARCHIVE AND RESTORE
  // =====================================

  const handleStatusAction = async (
    action:
      | "reset"
      | "archive"
      | "restore"
  ) => {
    if (
      !roadmap ||
      operationLock.current ||
      busy
    ) {
      return;
    }

    if (
      action === "reset" &&
      !window.confirm(
        "Reset all completed learning activities?"
      )
    ) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);

      setError("");

      let result: Roadmap;

      if (action === "reset") {
        result =
          await roadmapService.resetProgress(
            roadmap._id
          );
      } else if (action === "archive") {
        result =
          await roadmapService.archive(
            roadmap._id
          );
      } else {
        result =
          await roadmapService.restore(
            roadmap._id
          );
      }

      setRoadmap(result);

      syncHistoryItem(result);
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setUpdating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // DELETE ROADMAP
  // =====================================

  const handleDelete = async (
    roadmapId: string
  ) => {
    if (operationLock.current || busy) {
      return;
    }

    if (
      !window.confirm(
        "Permanently delete this roadmap and its learning progress?"
      )
    ) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);

      setError("");

      await roadmapService.delete(
        roadmapId
      );

      setHistory((previous) =>
        previous.filter(
          (item) =>
            item._id !== roadmapId
        )
      );

      if (
        roadmap?._id === roadmapId
      ) {
        setRoadmap(null);

        setShowForm(true);
      }

      try {
        await refreshHistory();
      } catch {
        setError(
          "Roadmap deleted, but history could not be refreshed."
        );
      }
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setUpdating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // LOAD MORE ROADMAPS
  // =====================================

  const loadMoreHistory = async () => {
    if (operationLock.current || busy) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);

      setError("");

      const nextPage =
        historyPage + 1;

      const result =
        await roadmapService.getAll(
          nextPage,
          20
        );

      setHistory((previous) => {
        const ids = new Set(
          previous.map(
            (item) => item._id
          )
        );

        return [
          ...previous,

          ...result.roadmaps.filter(
            (item) =>
              !ids.has(item._id)
          ),
        ];
      });

      setHistoryPage(nextPage);

      setHasMoreHistory(
        nextPage <
          result.pagination.totalPages
      );
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setUpdating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // LOAD MORE JOB MATCHING REPORTS
  // =====================================

  const loadMoreJobMatches = async () => {
    if (operationLock.current || busy) {
      return;
    }

    operationLock.current = true;

    try {
      setUpdating(true);

      setError("");

      const nextPage =
        jobMatchPage + 1;

      const result =
        await jobMatchingService.getAll(
          nextPage,
          20
        );

      setJobMatches((previous) => {
        const ids = new Set(
          previous.map(
            (item) => item._id
          )
        );

        return [
          ...previous,

          ...result.jobMatches.filter(
            (item) =>
              !ids.has(item._id)
          ),
        ];
      });

      setJobMatchPage(nextPage);

      setHasMoreJobMatches(
        nextPage <
          result.pagination.totalPages
      );
    } catch (error) {
      setError(
        getErrorMessage(error)
      );
    } finally {
      setUpdating(false);

      operationLock.current = false;
    }
  };

  // =====================================
  // START NEW ROADMAP
  // =====================================

  const startNewRoadmap = () => {
    if (busy) return;

    setRoadmap(null);

    setError("");

    setShowForm(true);

    setConsent(false);

    setDurationWeeks(4);

    setHoursPerWeek(10);

    setDifficulty("intermediate");

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });
  };

  // =====================================
  // EXPANSION HELPERS
  // =====================================

  const toggleWeek = (week: number) => {
    setExpandedWeeks((previous) => ({
      ...previous,

      [week]: !previous[week],
    }));
  };

  const toggleActivity = (
    key: string
  ) => {
    setExpandedActivities(
      (previous) => ({
        ...previous,

        [key]: !previous[key],
      })
    );
  };

  const isActivityCompleted = (
    week: number,
    activityIndex: number
  ): boolean => {
    return (
      roadmap?.activityProgress.some(
        (item) =>
          item.week === week &&
          item.activityIndex ===
            activityIndex &&
          item.completed
      ) ?? false
    );
  };

  // =====================================
  // INITIAL LOADING
  // =====================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto mb-4 animate-spin text-violet-400"
          />

          <p className="text-sm text-slate-400">
            Loading your career roadmap workspace...
          </p>
        </div>
      </div>
    );
  }

  // =====================================
  // MAIN INTERFACE
  // =====================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-100">

      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
            <Route
              size={28}
              className="text-violet-400"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Career Roadmap
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Your personalized path toward your career goals.
            </p>
          </div>

        </div>

        <button
          type="button"
          disabled={busy}
          onClick={startNewRoadmap}
          className={primaryButton}
        >
          <Plus size={18} />

          New Roadmap
        </button>

      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />

          <p className="flex-1">
            {error}
          </p>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* GENERATION FORM */}

      {showForm && (
        <div
          ref={formRef}
          className={cardClass}
        >

          <div className="mb-6 flex items-center gap-3">

            <Sparkles
              size={23}
              className="text-violet-400"
            />

            <div>
              <h2 className="text-lg font-semibold">
                Generate Personalized Roadmap
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Customize your learning plan using existing skill gaps.
              </p>
            </div>

          </div>

          {jobMatches.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">

              <BriefcaseBusiness
                size={36}
                className="mx-auto mb-4 text-slate-600"
              />

              <h3 className="font-semibold">
                No Job Matching Reports
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Generate a job compatibility report before creating a career roadmap.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/job-matching")
                }
                className={`${primaryButton} mx-auto mt-5`}
              >
                Open Job Matching

                <ArrowRight size={16} />
              </button>

            </div>
          ) : (

            <form
              onSubmit={handleGenerate}
              className="space-y-5"
            >

              {/* Job report selection */}

              <div>
                <label
                  htmlFor="jobMatch"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                >
                  <BriefcaseBusiness size={16} />

                  Target Job Report
                </label>

                <select
                  id="jobMatch"
                  required
                  value={selectedJobMatch}
                  disabled={busy}
                  onChange={(event) =>
                    setSelectedJobMatch(
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  {jobMatches.map((item) => (
                    <option
                      key={item._id}
                      value={item._id}
                    >
                      {item.jobTitle} — {item.companyName}
                      {" | "}
                      {item.overallScore}/100
                    </option>
                  ))}
                </select>

                {hasMoreJobMatches && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void loadMoreJobMatches()
                    }
                    className="mt-2 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50"
                  >
                    Load older job matching reports
                  </button>
                )}
              </div>

              {/* Learning preferences */}

              <div className="grid gap-5 md:grid-cols-3">

                <div>
                  <label
                    htmlFor="duration"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <CalendarDays size={16} />

                    Duration
                  </label>

                  <select
                    id="duration"
                    value={durationWeeks}
                    disabled={busy}
                    onChange={(event) =>
                      setDurationWeeks(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className={inputClass}
                  >
                    {Array.from(
                      { length: 8 },
                      (_, index) => index + 1
                    ).map((week) => (
                      <option
                        key={week}
                        value={week}
                      >
                        {week} {week === 1 ? "week" : "weeks"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="weeklyHours"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <Clock size={16} />

                    Hours Per Week
                  </label>

                  <input
                    id="weeklyHours"
                    type="number"
                    min={2}
                    max={40}
                    step={1}
                    required
                    value={hoursPerWeek}
                    disabled={busy}
                    onChange={(event) =>
                      setHoursPerWeek(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="difficulty"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                  >
                    <GraduationCap size={16} />

                    Difficulty
                  </label>

                  <select
                    id="difficulty"
                    value={difficulty}
                    disabled={busy}
                    onChange={(event) =>
                      setDifficulty(
                        event.target.value as RoadmapDifficulty
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

              {/* Learning budget */}

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-violet-500/15 bg-violet-500/5 p-4 sm:grid-cols-3">

                <div>
                  <p className="text-xs text-slate-400">
                    Duration
                  </p>

                  <p className="mt-2 text-xl font-bold text-violet-300">
                    {durationWeeks} weeks
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Total Learning Budget
                  </p>

                  <p className="mt-2 text-xl font-bold text-violet-300">
                    {durationWeeks *
                      hoursPerWeek} hrs
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Daily Average
                  </p>

                  <p className="mt-2 text-xl font-bold text-violet-300">
                    {(hoursPerWeek / 7).toFixed(1)} hrs
                  </p>
                </div>

              </div>

              {/* AI consent */}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">

                <input
                  type="checkbox"
                  checked={consent}
                  disabled={busy}
                  onChange={(event) =>
                    setConsent(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                />

                <span className="text-xs leading-relaxed text-slate-400">
                  I agree that my target job details,
                  identified skill gaps and learning
                  preferences may be processed by Groq
                  or Google Gemini to generate a
                  personalized learning plan. The roadmap
                  generator does not send the original
                  resume document.
                </span>

              </label>

              <button
                type="submit"
                disabled={
                  busy ||
                  !consent ||
                  !selectedJobMatch
                }
                className={`${primaryButton} w-full py-4`}
              >
                {generating ? (
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={20} />
                )}

                {generating
                  ? "Generating Your Roadmap..."
                  : "Generate Career Roadmap"}
              </button>

            </form>
          )}

        </div>
      )}

      {/* GENERATION LOADING STATE */}

      {generating && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center">

          <BrainCircuit
            size={45}
            className="mx-auto mb-4 animate-pulse text-violet-400"
          />

          <h3 className="text-lg font-semibold">
            Building Your Personalized Learning Plan
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
            CareerLens AI is evaluating skill priorities,
            preparing learning activities and validating
            your weekly learning budget.
          </p>

          <div className="mx-auto mt-5 h-2 max-w-xs overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
          </div>

        </div>
      )}

      {/* SAVED ROADMAP DISPLAY */}

      {roadmap && !generating && (
        <div
          ref={roadmapRef}
          className="scroll-mt-24 space-y-6"
        >

          {/* ROADMAP OVERVIEW */}

          <section className={cardClass}>

            <div className="flex flex-wrap items-start justify-between gap-4">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
                  Personalized Learning Plan
                </p>

                <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                  {roadmap.result.title}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {roadmap.jobTitle} — {roadmap.companyName}
                </p>
              </div>

              <StatusBadge
                status={roadmap.status}
              />

            </div>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {roadmap.result.summary}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-400">

              <span className="flex items-center gap-2">
                <CalendarDays size={16} />

                {roadmap.durationWeeks} weeks
              </span>

              <span className="flex items-center gap-2">
                <Clock size={16} />

                {roadmap.hoursPerWeek} hrs/week
              </span>

              <span className="flex items-center gap-2 capitalize">
                <GraduationCap size={16} />

                {roadmap.difficulty}
              </span>

            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5">

              <div className="mb-4 flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium">
                    Overall Learning Progress
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {roadmap.completedActivities} of{" "}
                    {roadmap.totalActivities} activities completed
                  </p>
                </div>

                <p className="text-3xl font-bold text-violet-400">
                  {roadmap.progressPercentage}%
                </p>

              </div>

              <ProgressBar
                value={roadmap.progressPercentage}
                completed={
                  roadmap.progressPercentage === 100
                }
              />

            </div>

            {/* ROADMAP ACTIONS */}

            <div className="mt-5 flex flex-wrap gap-3">

              {roadmap.status === "archived" ? (

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void handleStatusAction(
                      "restore"
                    )
                  }
                  className={secondaryButton}
                >
                  <ArchiveRestore size={16} />

                  Restore Roadmap
                </button>

              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void handleStatusAction(
                        "reset"
                      )
                    }
                    className={secondaryButton}
                  >
                    <RotateCcw size={16} />

                    Reset Progress
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void handleStatusAction(
                        "archive"
                      )
                    }
                    className={secondaryButton}
                  >
                    <Archive size={16} />

                    Archive
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void handleDelete(
                    roadmap._id
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 size={16} />

                Delete
              </button>

            </div>

            {roadmap.status === "archived" && (
              <p className="mt-4 text-xs text-amber-400">
                Restore this roadmap before updating learning progress.
              </p>
            )}

          </section>

          {/* SUMMARY STATISTICS */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {[
              {
                title: "Scheduled Hours",

                value:
                  `${roadmap.estimatedLearningHours} hrs`,

                icon: Clock,

                color: "text-violet-400",
              },

              {
                title: "Covered Skills",

                value:
                  roadmap.result.coveredSkills.length,

                icon: Target,

                color: "text-emerald-400",
              },

              {
                title: "Learning Activities",

                value:
                  roadmap.totalActivities,

                icon: BookOpen,

                color: "text-sky-400",
              },

              {
                title: "Practical Projects",

                value:
                  roadmap.result.practicalProjects.length,

                icon: Code2,

                color: "text-amber-400",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className={cardClass}
                >
                  <div className="flex items-center justify-between gap-2">

                    <p className="text-xs text-slate-400">
                      {item.title}
                    </p>

                    <Icon
                      size={20}
                      className={item.color}
                    />

                  </div>

                  <p className={`mt-4 text-3xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              );
            })}

          </div>

          {/* LEARNING OBJECTIVES */}

          <section className={cardClass}>

            <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
              <Target
                size={22}
                className="text-violet-400"
              />

              Learning Objectives
            </h3>

            <div className="space-y-3">

              {roadmap.result.learningObjectives.map(
                (objective, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-violet-400"
                    />

                    <p className="text-sm leading-relaxed text-slate-300">
                      {objective}
                    </p>
                  </div>
                )
              )}

            </div>

          </section>

          {/* COVERED AND DEFERRED SKILLS */}

          <div className="grid items-start gap-6 lg:grid-cols-2">

            <section className={cardClass}>

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 size={20} />

                Scheduled Skills
              </h3>

              <div className="flex flex-wrap gap-2">

                {roadmap.result.coveredSkills.map(
                  (skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300"
                    >
                      {skill}
                    </span>
                  )
                )}

              </div>

              <p className="mt-4 text-xs text-slate-500">
                Scheduled skills are learning targets,
                not verified mastered skills.
              </p>

            </section>

            <section className={cardClass}>

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-amber-400">
                <Clock size={20} />

                Deferred Skills
              </h3>

              {roadmap.result.deferredSkills.length ===
                0 && (
                <p className="text-sm text-slate-400">
                  All identified skill gaps have scheduled learning activities.
                </p>
              )}

              <div className="space-y-3">

                {roadmap.result.deferredSkills.map(
                  (item, index) => (
                    <div
                      key={`${item.skill}-${index}`}
                      className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4"
                    >
                      <p className="text-sm font-medium text-amber-300">
                        {item.skill}
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {item.reason}
                      </p>
                    </div>
                  )
                )}

              </div>

            </section>

          </div>

          {/* WEEKLY MILESTONES */}

          <section className="space-y-4">

            <div className="flex items-center justify-between">

              <h3 className="flex items-center gap-3 text-xl font-semibold">
                <CalendarDays
                  size={23}
                  className="text-violet-400"
                />

                Weekly Learning Milestones
              </h3>

              {updating && (
                <Loader2
                  size={20}
                  className="animate-spin text-violet-400"
                />
              )}

            </div>

            {roadmap.result.milestones.map(
              (milestone) => {

                const totalActivities =
                  milestone.activities.length;

                const completedActivities =
                  milestone.activities.filter(
                    (_activity, index) =>
                      isActivityCompleted(
                        milestone.week,
                        index
                      )
                  ).length;

                const complete =
                  totalActivities > 0 &&
                  completedActivities ===
                    totalActivities;

                const weeklyProgress =
                  totalActivities > 0
                    ? Math.round(
                        completedActivities /
                          totalActivities *
                          100
                      )
                    : 0;

                const weeklyHours =
                  milestone.activities.reduce(
                    (sum, activity) =>
                      sum +
                      activity.estimatedHours,
                    0
                  );

                const expanded =
                  !!expandedWeeks[
                    milestone.week
                  ];

                return (
                  <article
                    key={milestone.week}
                    className={cardClass}
                  >

                    {/* WEEK HEADER */}

                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() =>
                        toggleWeek(
                          milestone.week
                        )
                      }
                      className="flex w-full items-center gap-4 text-left"
                    >

                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold ${
                        complete
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-violet-500/10 text-violet-400"
                      }`}>

                        {complete ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          milestone.week
                        )}

                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-xs text-violet-400">
                          Week {milestone.week}
                        </p>

                        <h4 className="mt-1 font-semibold">
                          {milestone.title}
                        </h4>

                        <p className="mt-2 text-xs text-slate-500">
                          {Number(
                            weeklyHours.toFixed(2)
                          )} hrs
                          {" · "}
                          {completedActivities}/
                          {totalActivities} activities
                        </p>

                      </div>

                      <ChevronDown
                        size={21}
                        className={`shrink-0 text-slate-400 transition ${
                          expanded
                            ? "rotate-180"
                            : ""
                        }`}
                      />

                    </button>

                    <div className="mt-4">
                      <ProgressBar
                        value={weeklyProgress}
                        completed={complete}
                      />
                    </div>

                    {/* EXPANDED WEEK */}

                    {expanded && (
                      <div className="mt-5 space-y-5 border-t border-slate-800 pt-5">

                        <div>
                          <p className="text-xs font-medium text-violet-300">
                            Weekly Objective
                          </p>

                          <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {milestone.objective}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">

                          {milestone.targetSkills.map(
                            (skill, index) => (
                              <span
                                key={`${skill}-${index}`}
                                className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                              >
                                {skill}
                              </span>
                            )
                          )}

                        </div>

                        {/* LEARNING ACTIVITIES */}

                        <div className="space-y-3">

                          {milestone.activities.map(
                            (activity, index) => {

                              const key =
                                `${milestone.week}-${index}`;

                              const checked =
                                isActivityCompleted(
                                  milestone.week,
                                  index
                                );

                              const activityExpanded =
                                !!expandedActivities[
                                  key
                                ];

                              const config =
                                activityConfig[
                                  activity.type
                                ];

                              const Icon =
                                config.icon;

                              return (
                                <div
                                  key={key}
                                  className={`rounded-xl border p-4 ${
                                    checked
                                      ? "border-emerald-500/15 bg-emerald-500/5"
                                      : "border-slate-800 bg-slate-950/40"
                                  }`}
                                >

                                  <div className="flex items-start gap-3">

                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={
                                        busy ||
                                        roadmap.status ===
                                          "archived"
                                      }
                                      aria-label={`Mark ${activity.title} as completed`}
                                      onChange={(event) =>
                                        void handleActivityProgress(
                                          milestone.week,
                                          index,
                                          event.target.checked
                                        )
                                      }
                                      className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    />

                                    <button
                                      type="button"
                                      aria-expanded={
                                        activityExpanded
                                      }
                                      onClick={() =>
                                        toggleActivity(key)
                                      }
                                      className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                                    >

                                      <div>
                                        <p className={`text-sm font-medium ${
                                          checked
                                            ? "text-slate-500 line-through"
                                            : "text-slate-200"
                                        }`}>
                                          {activity.title}
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">

                                          <span className={`flex items-center gap-1.5 ${config.color}`}>
                                            <Icon size={14} />

                                            {config.label}
                                          </span>

                                          <span className="flex items-center gap-1.5 text-slate-500">
                                            <Clock size={14} />

                                            {activity.estimatedHours} hrs
                                          </span>

                                        </div>
                                      </div>

                                      <ChevronRight
                                        size={18}
                                        className={`shrink-0 text-slate-500 transition ${
                                          activityExpanded
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      />

                                    </button>

                                  </div>

                                  {/* ACTIVITY DETAILS */}

                                  {activityExpanded && (
                                    <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">

                                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                                        {activity.description}
                                      </p>

                                      <div className="rounded-lg bg-violet-500/5 p-3">

                                        <p className="text-xs font-medium text-violet-300">
                                          Expected Outcome
                                        </p>

                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                          {activity.expectedOutcome}
                                        </p>

                                      </div>

                                      <div className="flex flex-wrap gap-2">

                                        {activity.targetSkills.map(
                                          (skill, skillIndex) => (
                                            <span
                                              key={`${skill}-${skillIndex}`}
                                              className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
                                            >
                                              {skill}
                                            </span>
                                          )
                                        )}

                                      </div>

                                      {/* LEARNING RESOURCES */}

                                      {activity.resources.length > 0 && (
                                        <div className="space-y-3">

                                          <h5 className="flex items-center gap-2 text-sm font-medium">
                                            <BookOpen
                                              size={16}
                                              className="text-violet-400"
                                            />

                                            Suggested Learning Resources
                                          </h5>

                                          {activity.resources.map(
                                            (resource, resourceIndex) => (
                                              <div
                                                key={resourceIndex}
                                                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                                              >

                                                <div className="flex flex-wrap items-center justify-between gap-2">

                                                  <p className="text-sm font-medium text-slate-300">
                                                    {resource.title}
                                                  </p>

                                                  <span className="text-[11px] capitalize text-slate-500">
                                                    {resource.type}
                                                  </span>

                                                </div>

                                                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                                  {resource.description}
                                                </p>

                                                <a
                                                  href={`https://www.google.com/search?q=${encodeURIComponent(
                                                    resource.searchQuery
                                                  )}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="mt-3 inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300"
                                                >
                                                  Search Resource

                                                  <ExternalLink size={13} />
                                                </a>

                                              </div>
                                            )
                                          )}

                                        </div>
                                      )}

                                    </div>
                                  )}

                                </div>
                              );

                            }
                          )}

                        </div>

                        {/* COMPLETION CRITERIA */}

                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">

                          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                            <ClipboardCheck
                              size={18}
                              className="text-emerald-400"
                            />

                            Completion Criteria
                          </h5>

                          <div className="space-y-2">

                            {milestone.completionCriteria.map(
                              (criterion, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >

                                  <CheckCircle2
                                    size={15}
                                    className="mt-0.5 shrink-0 text-emerald-400"
                                  />

                                  <p className="text-xs leading-relaxed text-slate-400">
                                    {criterion}
                                  </p>

                                </div>
                              )
                            )}

                          </div>

                        </div>

                      </div>
                    )}

                  </article>
                );

              }
            )}

          </section>

          {/* PRACTICAL PROJECTS */}

          <section className={cardClass}>

            <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
              <Code2
                size={22}
                className="text-violet-400"
              />

              Practical Projects
            </h3>

            {roadmap.result.practicalProjects.length ===
              0 && (
              <p className="text-sm text-slate-400">
                No dedicated project activities were scheduled in this roadmap.
              </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2">

              {roadmap.result.practicalProjects.map(
                (project, index) => (
                  <article
                    key={index}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-5"
                  >

                    <h4 className="font-semibold">
                      {project.title}
                    </h4>

                    <div className="mt-2 flex items-center gap-4 text-xs capitalize text-slate-500">

                      <span>
                        {project.difficulty}
                      </span>

                      <span>
                        {project.estimatedHours} hrs
                      </span>

                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-slate-400">
                      {project.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">

                      {project.targetSkills.map(
                        (skill, skillIndex) => (
                          <span
                            key={`${skill}-${skillIndex}`}
                            className="rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-300"
                          >
                            {skill}
                          </span>
                        )
                      )}

                    </div>

                    <h5 className="mt-5 text-xs font-medium text-slate-300">
                      Project Deliverables
                    </h5>

                    <div className="mt-3 space-y-2">

                      {project.deliverables.map(
                        (deliverable, deliverableIndex) => (
                          <div
                            key={deliverableIndex}
                            className="flex items-start gap-2"
                          >
                            <CheckCircle2
                              size={15}
                              className="mt-0.5 shrink-0 text-emerald-400"
                            />

                            <p className="text-xs leading-relaxed text-slate-400">
                              {deliverable}
                            </p>
                          </div>
                        )
                      )}

                    </div>

                  </article>
                )
              )}

            </div>

            <p className="mt-4 text-xs text-slate-500">
              These projects summarize scheduled project
              activities and do not add extra learning hours.
            </p>

          </section>

          {/* FINAL ASSESSMENT */}

          <section className={cardClass}>

            <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
              <Trophy
                size={23}
                className="text-amber-400"
              />

              Final Assessment
            </h3>

            <p className="text-sm leading-relaxed text-slate-400">
              {roadmap.result.finalAssessment.description}
            </p>

            <div className="mt-5 space-y-3">

              {roadmap.result.finalAssessment.successCriteria.map(
                (criterion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                  >
                    <Target
                      size={17}
                      className="mt-0.5 shrink-0 text-violet-400"
                    />

                    <p className="text-sm leading-relaxed text-slate-300">
                      {criterion}
                    </p>
                  </div>
                )
              )}

            </div>

          </section>

          {/* RECOMMENDATIONS */}

          {roadmap.result.recommendations.length > 0 && (
            <section className={cardClass}>

              <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
                <Lightbulb
                  size={22}
                  className="text-violet-400"
                />

                Career Recommendations
              </h3>

              <div className="space-y-3">

                {roadmap.result.recommendations.map(
                  (recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl bg-slate-950/40 p-4"
                    >

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-400">
                        {index + 1}
                      </span>

                      <p className="text-sm leading-relaxed text-slate-400">
                        {recommendation}
                      </p>

                    </div>
                  )
                )}

              </div>

            </section>
          )}

          {/* AI METADATA */}

          <section className={cardClass}>

            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Database
                size={19}
                className="text-violet-400"
              />

              Generation Metadata
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {[
                {
                  label: "AI Provider",
                  value: roadmap.provider,
                },
                {
                  label: "Generation Model",
                  value: roadmap.modelUsed,
                },
                {
                  label: "Prompt Version",
                  value: roadmap.promptVersion,
                },
                {
                  label: "Skill Gap Engine",
                  value:
                    roadmap.skillGapAnalysisVersion,
                },
                {
                  label: "Processing Time",
                  value: `${(
                    roadmap.processingTime /
                    1000
                  ).toFixed(2)} seconds`,
                },
                {
                  label: "Created",
                  value: new Date(
                    roadmap.createdAt
                  ).toLocaleDateString(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 rounded-xl bg-slate-950/40 p-3"
                >

                  <p className="text-xs text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 wrap-break-word text-xs font-medium text-slate-300">
                    {item.value}
                  </p>

                </div>
              ))}

            </div>

          </section>

        </div>
      )}

      {/* SAVED ROADMAP HISTORY */}

      <section className={cardClass}>

        <div className="mb-5 flex items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <History
              size={23}
              className="text-violet-400"
            />

            <div>
              <h2 className="text-lg font-semibold">
                Saved Career Roadmaps
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Continue your existing learning plans.
              </p>
            </div>

          </div>

          {updating && (
            <Loader2
              size={19}
              className="animate-spin text-violet-400"
            />
          )}

        </div>

        {history.length === 0 && (
          <div className="py-10 text-center">

            <Route
              size={36}
              className="mx-auto mb-4 text-slate-600"
            />

            <p className="text-sm text-slate-400">
              No saved roadmaps yet.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Generate your first personalized learning plan.
            </p>

          </div>
        )}

        <div className="space-y-3">

          {history.map((item) => (
            <article
              key={item._id}
              className={`rounded-xl border p-4 ${
                roadmap?._id === item._id
                  ? "border-violet-500/30 bg-violet-500/5"
                  : "border-slate-800 bg-slate-950/40"
              }`}
            >

              <div className="flex flex-wrap items-start justify-between gap-4">

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void handleViewRoadmap(
                      item._id
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                >

                  <div className="rounded-xl bg-violet-500/10 p-3">

                    <Route
                      size={21}
                      className="text-violet-400"
                    />

                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold">
                      {item.jobTitle}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.companyName}
                    </p>

                    <p className="mt-2 text-xs capitalize text-slate-500">
                      {item.durationWeeks} weeks
                      {" · "}
                      {item.difficulty}
                    </p>

                  </div>

                </button>

                <div className="flex items-center gap-3">

                  <StatusBadge
                    status={item.status}
                  />

                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Open roadmap"
                    title="Open roadmap"
                    onClick={() =>
                      void handleViewRoadmap(
                        item._id
                      )
                    }
                    className="rounded-lg border border-slate-700 p-2.5 text-slate-400 hover:text-violet-400 disabled:opacity-50"
                  >
                    <ChevronRight size={17} />
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Delete roadmap"
                    title="Delete roadmap"
                    onClick={() =>
                      void handleDelete(
                        item._id
                      )
                    }
                    className="rounded-lg border border-slate-700 p-2.5 text-slate-500 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={17} />
                  </button>

                </div>

              </div>

              <div className="mt-4">

                <div className="mb-2 flex items-center justify-between text-xs">

                  <span className="text-slate-500">
                    {item.completedActivities}/
                    {item.totalActivities} activities
                  </span>

                  <span className="font-medium text-violet-400">
                    {item.progressPercentage}%
                  </span>

                </div>

                <ProgressBar
                  value={item.progressPercentage}
                  completed={
                    item.progressPercentage === 100
                  }
                />

              </div>

            </article>
          ))}

        </div>

        {hasMoreHistory && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void loadMoreHistory()
            }
            className={`${secondaryButton} mt-4 w-full`}
          >
            Load More Roadmaps
          </button>
        )}

      </section>

      {/* DISCLAIMER */}

      <p className="pb-4 text-center text-xs leading-relaxed text-slate-500">
        Learning activities and resources are AI-generated
        suggestions. Completion percentages represent
        self-reported activity completion, not independently
        verified proficiency or guaranteed employment outcomes.
      </p>

    </div>
  );
}