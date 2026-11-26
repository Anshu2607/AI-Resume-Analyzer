import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import axios from "axios";

import {
  Target,
  BriefcaseBusiness,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Layers,
  Filter,
  Sparkles,
  ArrowRight,
  Lightbulb,
  X,
  BarChart3,
  Clock,
  Info,
} from "lucide-react";

import jobMatchingService from "../services/jobMatching.service";

import roadmapService from "../services/roadmap.service";

import type {
  JobMatchSummary,
} from "../types/jobMatching.types";

import type {
  SkillGapReport,
  SkillGapPriority,
} from "../types/roadmap.types";

// =====================================
// CONFIGURATION
// =====================================

type PriorityFilter =
  | "all"
  | SkillGapPriority;

type ImportanceFilter =
  | "all"
  | "required"
  | "preferred";

const cardClass =
  "rounded-2xl border border-slate-800 bg-[#111827] p-5";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-violet-500 disabled:opacity-50";

const priorityConfig: Record<
  SkillGapPriority,
  {
    label: string;
    color: string;
    background: string;
    border: string;
  }
> = {

  critical: {
    label: "Critical",
    color: "#f87171",
    background: "bg-red-500/10",
    border: "border-red-500/20",
  },

  high: {
    label: "High",
    color: "#fb923c",
    background: "bg-orange-500/10",
    border: "border-orange-500/20",
  },

  medium: {
    label: "Medium",
    color: "#fbbf24",
    background: "bg-amber-500/10",
    border: "border-amber-500/20",
  },

  low: {
    label: "Low",
    color: "#38bdf8",
    background: "bg-sky-500/10",
    border: "border-sky-500/20",
  },

};

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
// COVERAGE VISUALIZATION
// =====================================

function CoverageCircle({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {

  const radius = 52;

  const circumference =
    2 * Math.PI * radius;

  const score = Math.max(
    0,
    Math.min(100, value ?? 0)
  );

  const offset =
    circumference -
    (score / 100) * circumference;

  return (

    <div className="flex flex-col items-center">

      <div
        className="relative h-36 w-36"
        role="img"
        aria-label={
          value === null
            ? `${label}: Not applicable`
            : `${label}: ${score}%`
        }
      >

        <svg
          viewBox="0 0 130 130"
          className="h-full w-full -rotate-90"
        >

          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke="#263244"
            strokeWidth="10"
          />

          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />

        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">

          <span
            className="text-3xl font-bold"
            style={{ color }}
          >

            {value === null
              ? "N/A"
              : `${score}%`}

          </span>

        </div>

      </div>

      <p className="mt-2 text-sm font-medium text-slate-300">
        {label}
      </p>

    </div>

  );

}

// =====================================
// MAIN PAGE
// =====================================

export default function SkillGapAnalysis() {

  const navigate = useNavigate();

  // Job matching reports

  const [jobMatches, setJobMatches] =
    useState<JobMatchSummary[]>([]);

  const [selectedJobMatch, setSelectedJobMatch] =
    useState("");

  // Skill gap report

  const [report, setReport] =
    useState<SkillGapReport | null>(null);

  // Loading states

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  // Pagination

  const [page, setPage] =
    useState(1);

  const [hasMore, setHasMore] =
    useState(false);

  // Error state

  const [error, setError] =
    useState("");

  // Filters

  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");

  const [importanceFilter, setImportanceFilter] =
    useState<ImportanceFilter>("all");

  // =====================================
  // LOAD EXISTING JOB MATCHING REPORTS
  // =====================================

  useEffect(() => {

    let cancelled = false;

    const initialize = async () => {

      try {

        setLoading(true);

        setError("");

        const result =
          await jobMatchingService.getAll(
            1,
            20
          );

        if (cancelled) return;

        setJobMatches(
          result.jobMatches
        );

        setHasMore(
          result.pagination.totalPages > 1
        );

        if (result.jobMatches.length > 0) {

          setSelectedJobMatch(
            result.jobMatches[0]._id
          );

        }

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

  }, []);

  // =====================================
  // LOAD ADDITIONAL JOB MATCHING REPORTS
  // =====================================

  const loadMoreReports = async () => {

    if (
      loadingMore ||
      analyzing
    ) {
      return;
    }

    try {

      setLoadingMore(true);

      setError("");

      const nextPage = page + 1;

      const result =
        await jobMatchingService.getAll(
          nextPage,
          20
        );

      setJobMatches((previous) => {

        const existingIds = new Set(
          previous.map(
            (item) => item._id
          )
        );

        return [
          ...previous,

          ...result.jobMatches.filter(
            (item) =>
              !existingIds.has(item._id)
          ),
        ];

      });

      setPage(nextPage);

      setHasMore(
        nextPage <
          result.pagination.totalPages
      );

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      setLoadingMore(false);

    }

  };

  // =====================================
  // GENERATE SKILL GAP ANALYSIS
  // =====================================

  const handleAnalyze = async () => {

    if (
      !selectedJobMatch ||
      analyzing ||
      loadingMore
    ) {
      return;
    }

    try {

      setAnalyzing(true);

      setError("");

      setReport(null);

      setPriorityFilter("all");

      setImportanceFilter("all");

      const result =
        await roadmapService.getSkillGaps(
          selectedJobMatch
        );

      setReport(result);

    } catch (error) {

      setError(
        getErrorMessage(error)
      );

    } finally {

      setAnalyzing(false);

    }

  };

  // =====================================
  // FILTER SKILL GAPS
  // =====================================

  const filteredGaps =
    report?.skillGaps.filter(
      (item) => {

        const matchesPriority =
          priorityFilter === "all" ||
          item.priority === priorityFilter;

        const matchesImportance =
          importanceFilter === "all" ||
          item.importance === importanceFilter;

        return (
          matchesPriority &&
          matchesImportance
        );

      }
    ) ?? [];

  // =====================================
  // NAVIGATE TO CAREER ROADMAP
  // =====================================

  const handleGenerateRoadmap = () => {

    if (
      !report ||
      report.skillGaps.length === 0
    ) {
      return;
    }

    const query = new URLSearchParams({
      jobMatchId: report.jobMatchId,
    });

    navigate(
      `/career-roadmap?${query.toString()}`
    );

  };

  const selectedReport =
    jobMatches.find(
      (item) =>
        item._id === selectedJobMatch
    );

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
            Loading your skill gap workspace...
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

            <Target
              size={28}
              className="text-violet-400"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Skill Gap Analysis
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Identify and prioritize your learning opportunities.
            </p>

          </div>

        </div>

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

      {/* REPORT SELECTION */}

      <section className={cardClass}>

        <div className="mb-5 flex items-center gap-3">

          <BriefcaseBusiness
            size={23}
            className="text-violet-400"
          />

          <div>

            <h2 className="text-lg font-semibold">
              Select Job Matching Report
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Reuse an existing compatibility analysis.
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

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Generate a job compatibility report before analyzing your skill gaps.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/job-matching")
              }
              className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500"
            >

              Open Job Matching

              <ArrowRight size={16} />

            </button>

          </div>

        ) : (

          <div className="space-y-4">

            <label
              htmlFor="jobMatch"
              className="block text-sm font-medium text-slate-300"
            >

              Target Job Report

            </label>

            <select
              id="jobMatch"
              value={selectedJobMatch}
              disabled={
                analyzing || loadingMore
              }
              onChange={(event) => {

                setSelectedJobMatch(
                  event.target.value
                );

                setReport(null);

                setError("");

                setPriorityFilter("all");

                setImportanceFilter("all");

              }}
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

                  {" | "}

                  {new Date(
                    item.createdAt
                  ).toLocaleDateString()}

                </option>

              ))}

            </select>

            {hasMore && (

              <button
                type="button"
                disabled={
                  loadingMore || analyzing
                }
                onClick={() =>
                  void loadMoreReports()
                }
                className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50"
              >

                {loadingMore && (

                  <Loader2
                    size={14}
                    className="animate-spin"
                  />

                )}

                Load older job matching reports

              </button>

            )}

            {selectedReport && (

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">

                <div>

                  <p className="text-sm font-semibold">

                    {selectedReport.jobTitle}

                  </p>

                  <p className="mt-1 text-xs text-slate-400">

                    {selectedReport.companyName}

                  </p>

                </div>

                <div className="text-right">

                  <p className="text-2xl font-bold text-violet-400">

                    {selectedReport.overallScore}/100

                  </p>

                  <p className="text-xs text-slate-500">
                    Existing compatibility score
                  </p>

                </div>

              </div>

            )}

            <button
              type="button"
              disabled={
                !selectedJobMatch ||
                analyzing ||
                loadingMore
              }
              onClick={() =>
                void handleAnalyze()
              }
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {analyzing ? (

                <Loader2
                  size={20}
                  className="animate-spin"
                />

              ) : (

                <BarChart3 size={20} />

              )}

              {analyzing
                ? "Analyzing Skill Gaps..."
                : "Analyze Skill Gaps"}

            </button>

            <p className="flex items-center justify-center gap-2 text-xs text-slate-500">

              <ShieldCheck
                size={14}
                className="text-emerald-400"
              />

              No additional external AI request is required.

            </p>

          </div>

        )}

      </section>

      {/* ANALYSIS RESULTS */}

      {report && (

        <div className="space-y-6">

          {/* REPORT HEADER */}

          <section className={cardClass}>

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
                  Skill Gap Report
                </p>

                <h2 className="mt-2 text-xl font-semibold">

                  {report.jobTitle}

                </h2>

                <p className="mt-1 text-sm text-slate-400">

                  {report.companyName}

                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">

                <Clock size={15} />

                {new Date(
                  report.generatedAt
                ).toLocaleString()}

              </div>

            </div>

          </section>

          {/* SUMMARY STATISTICS */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {[
              {
                label: "Total Skill Gaps",
                value:
                  report.statistics.totalMissingSkills,
                icon: Layers,
                color: "text-violet-400",
              },
              {
                label: "Critical Gaps",
                value:
                  report.statistics.criticalGaps,
                icon: AlertCircle,
                color: "text-red-400",
              },
              {
                label: "Matched Skills",
                value:
                  report.statistics.totalMatchedSkills,
                icon: CheckCircle2,
                color: "text-emerald-400",
              },
              {
                label: "Missing Required Skills",
                value:
                  report.statistics.missingRequiredSkills,
                icon: Target,
                color: "text-amber-400",
              },
            ].map((item) => {

              const Icon = item.icon;

              return (

                <div
                  key={item.label}
                  className={cardClass}
                >

                  <div className="flex items-center justify-between gap-3">

                    <p className="text-xs text-slate-400">

                      {item.label}

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

          {/* SKILL COVERAGE */}

          <div className="grid gap-6 lg:grid-cols-2">

            <section className={cardClass}>

              <div className="mb-6 flex items-center gap-3">

                <TrendingUp
                  size={22}
                  className="text-violet-400"
                />

                <h3 className="text-lg font-semibold">
                  Skill Coverage
                </h3>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <CoverageCircle
                  label="Required Skills"
                  value={
                    report.statistics.requiredSkillCoverage
                  }
                  color="#34d399"
                />

                <CoverageCircle
                  label="Preferred Skills"
                  value={
                    report.statistics.preferredSkillCoverage
                  }
                  color="#a78bfa"
                />

              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">

                <div className="rounded-xl bg-slate-950/40 p-3">

                  <p className="text-xs text-slate-500">
                    Required skills
                  </p>

                  <p className="mt-2 text-xl font-semibold">

                    {report.statistics.totalRequiredSkills}

                  </p>

                </div>

                <div className="rounded-xl bg-slate-950/40 p-3">

                  <p className="text-xs text-slate-500">
                    Preferred skills
                  </p>

                  <p className="mt-2 text-xl font-semibold">

                    {report.statistics.totalPreferredSkills}

                  </p>

                </div>

              </div>

            </section>

            {/* PRIORITY DISTRIBUTION */}

            <section className={cardClass}>

              <div className="mb-6 flex items-center gap-3">

                <BarChart3
                  size={22}
                  className="text-violet-400"
                />

                <h3 className="text-lg font-semibold">
                  Priority Distribution
                </h3>

              </div>

              <div className="space-y-5">

                {[
                  {
                    label: "Critical",
                    count:
                      report.statistics.criticalGaps,
                    color: "#f87171",
                  },
                  {
                    label: "High",
                    count:
                      report.statistics.highPriorityGaps,
                    color: "#fb923c",
                  },
                  {
                    label: "Medium",
                    count:
                      report.statistics.mediumPriorityGaps,
                    color: "#fbbf24",
                  },
                  {
                    label: "Low",
                    count:
                      report.statistics.lowPriorityGaps,
                    color: "#38bdf8",
                  },
                ].map((item) => {

                  const total =
                    report.statistics.totalMissingSkills;

                  const percentage =
                    total > 0
                      ? (item.count / total) * 100
                      : 0;

                  return (

                    <div
                      key={item.label}
                      className="space-y-2"
                    >

                      <div className="flex items-center justify-between text-sm">

                        <span className="text-slate-300">

                          {item.label}

                        </span>

                        <span
                          className="font-semibold"
                          style={{
                            color: item.color,
                          }}
                        >

                          {item.count} skills

                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor:
                              item.color,
                          }}
                        />

                      </div>

                    </div>

                  );

                })}

              </div>

            </section>

          </div>

          {/* PRIORITIZED SKILL GAPS */}

          <section className={cardClass}>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <Target
                  size={23}
                  className="text-violet-400"
                />

                <div>

                  <h3 className="text-lg font-semibold">
                    Prioritized Skill Gaps
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Learning priorities based on job requirements.
                  </p>

                </div>

              </div>

              <span className="text-xs text-slate-400">

                {filteredGaps.length} of{" "}

                {report.skillGaps.length} skills

              </span>

            </div>

            {/* FILTER CONTROLS */}

            <div className="mb-6 grid gap-3 sm:grid-cols-2">

              <div>

                <label
                  htmlFor="priorityFilter"
                  className="mb-2 flex items-center gap-2 text-xs text-slate-400"
                >

                  <Filter size={14} />

                  Filter by priority

                </label>

                <select
                  id="priorityFilter"
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(
                      event.target.value as PriorityFilter
                    )
                  }
                  className={inputClass}
                >

                  <option value="all">
                    All Priorities
                  </option>

                  <option value="critical">
                    Critical
                  </option>

                  <option value="high">
                    High
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="low">
                    Low
                  </option>

                </select>

              </div>

              <div>

                <label
                  htmlFor="importanceFilter"
                  className="mb-2 flex items-center gap-2 text-xs text-slate-400"
                >

                  <Filter size={14} />

                  Filter by importance

                </label>

                <select
                  id="importanceFilter"
                  value={importanceFilter}
                  onChange={(event) =>
                    setImportanceFilter(
                      event.target.value as ImportanceFilter
                    )
                  }
                  className={inputClass}
                >

                  <option value="all">
                    All Skills
                  </option>

                  <option value="required">
                    Required Skills
                  </option>

                  <option value="preferred">
                    Preferred Skills
                  </option>

                </select>

              </div>

            </div>

            {/* EMPTY SKILL GAP STATE */}

            {report.skillGaps.length === 0 && (

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">

                <CheckCircle2
                  size={40}
                  className="mx-auto mb-4 text-emerald-400"
                />

                <h3 className="font-semibold">
                  No Identified Skill Gaps
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  The existing job matching report did not identify additional missing skill evidence.
                </p>

              </div>

            )}

            {report.skillGaps.length > 0 &&
              filteredGaps.length === 0 && (

                <div className="py-8 text-center">

                  <p className="text-sm text-slate-400">
                    No skills match your selected filters.
                  </p>

                  <button
                    type="button"
                    onClick={() => {

                      setPriorityFilter("all");

                      setImportanceFilter("all");

                    }}
                    className="mt-3 text-sm text-violet-400 hover:text-violet-300"
                  >

                    Clear filters

                  </button>

                </div>

              )}

            {/* INDIVIDUAL SKILL CARDS */}

            <div className="grid gap-4 xl:grid-cols-2">

              {filteredGaps.map(
                (item, index) => {

                  const config =
                    priorityConfig[item.priority];

                  return (

                    <article
                      key={`${item.skill}-${index}`}
                      className={`rounded-xl border p-5 ${config.border} bg-slate-950/40`}
                    >

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <h4 className="text-base font-semibold text-slate-100">

                            {item.skill}

                          </h4>

                          <div className="mt-2 flex flex-wrap items-center gap-2">

                            <span className={`rounded-md px-2 py-1 text-[11px] capitalize ${
                              item.importance === "required"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-slate-800 text-slate-400"
                            }`}>

                              {item.importance}

                            </span>

                            <span className="text-[11px] text-slate-500">
                              Not evidenced
                            </span>

                          </div>

                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${config.background}`}
                          style={{
                            color: config.color,
                          }}
                        >

                          {config.label}

                        </span>

                      </div>

                      <div className="mt-5 space-y-2">

                        <div className="flex items-center justify-between text-xs">

                          <span className="text-slate-500">
                            Priority Score
                          </span>

                          <span
                            className="font-semibold"
                            style={{
                              color: config.color,
                            }}
                          >

                            {item.priorityScore}/100

                          </span>

                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.priorityScore}%`,
                              backgroundColor:
                                config.color,
                            }}
                          />

                        </div>

                      </div>

                      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/70 p-3">

                        <div className="mb-2 flex items-center gap-2">

                          <Lightbulb
                            size={15}
                            className="text-violet-400"
                          />

                          <p className="text-xs font-medium text-violet-300">
                            Recommended Action
                          </p>

                        </div>

                        <p className="text-sm leading-relaxed text-slate-400">

                          {item.recommendation}

                        </p>

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          </section>

          {/* ROADMAP GENERATION CTA */}

          {report.skillGaps.length > 0 && (

            <section className="rounded-2xl border border-violet-500/20 bg-linear-to-br from-violet-500/10 to-indigo-500/5 p-6 sm:p-8">

              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">

                <div className="flex items-start gap-4">

                  <div className="rounded-xl bg-violet-500/15 p-3">

                    <Sparkles
                      size={28}
                      className="text-violet-400"
                    />

                  </div>

                  <div>

                    <h3 className="text-xl font-semibold">
                      Turn Skill Gaps into a Learning Plan
                    </h3>

                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">

                      Create a personalized career roadmap with weekly milestones, practical exercises and measurable learning objectives based on your identified skill gaps.

                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={handleGenerateRoadmap}
                  className="flex shrink-0 items-center gap-3 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                >

                  Generate Career Roadmap

                  <ArrowRight size={18} />

                </button>

              </div>

            </section>

          )}

          {/* ANALYSIS INFORMATION */}

          <section className={cardClass}>

            <div className="flex items-start gap-3">

              <Info
                size={20}
                className="mt-0.5 shrink-0 text-violet-400"
              />

              <div>

                <h3 className="text-sm font-semibold">
                  Understanding Your Skill Gap Report
                </h3>

                <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">

                  <p>
                    • A missing skill means that supporting evidence was not identified in your resume. It does not necessarily mean you lack the skill.
                  </p>

                  <p>
                    • Priority scores are calculated using a deterministic heuristic based on skill importance and the existing technical assessment.
                  </p>

                  <p>
                    • Skill coverage measures documented alignment with identified job requirements, not verified professional proficiency.
                  </p>

                  <p>
                    • The analysis reuses your saved job matching report without sending additional resume data to an AI provider.
                  </p>

                </div>

                <p className="mt-4 text-xs text-slate-600">

                  Analysis engine version:{" "}

                  {report.analysisVersion}

                </p>

              </div>

            </div>

          </section>

        </div>

      )}

    </div>

  );

}