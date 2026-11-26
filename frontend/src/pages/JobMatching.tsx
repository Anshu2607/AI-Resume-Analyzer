import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import axios from "axios";

import {
  BriefcaseBusiness,
  Sparkles,
  FileText,
  Building2,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  History,
  Trash2,
  ChevronRight,
  ShieldCheck,
  BrainCircuit,
  Lightbulb,
  Database,
  X,
  Clock,
  Plus,
  GraduationCap,
  Code2,
  Layers,
} from "lucide-react";

import jobMatchingService from "../services/jobMatching.service";

import {
  resumeService,
} from "../services/resume.service";

import type {
  Resume,
} from "../types/resume.types";

import type {
  JobMatch,
  JobMatchSummary,
  CompatibilityLevel,
  CompatibilityScores,
} from "../types/jobMatching.types";

// =====================================
// CONFIGURATION
// =====================================

const scoreCategories = [
  {
    key: "semanticSimilarity",
    label: "Semantic Similarity",
    icon: BrainCircuit,
  },
  {
    key: "technicalSkills",
    label: "Technical Skills",
    icon: Code2,
  },
  {
    key: "experience",
    label: "Experience",
    icon: BriefcaseBusiness,
  },
  {
    key: "education",
    label: "Education",
    icon: GraduationCap,
  },
  {
    key: "projectRelevance",
    label: "Project Relevance",
    icon: Layers,
  },
] as const;

const compatibilityConfig: Record<
  CompatibilityLevel,
  {
    label: string;
    color: string;
    background: string;
    description: string;
  }
> = {
  excellent: {
    label: "Excellent Alignment",
    color: "#34d399",
    background: "bg-emerald-500/10",
    description:
      "Your resume demonstrates strong documented alignment with this role.",
  },

  good: {
    label: "Good Alignment",
    color: "#4ade80",
    background: "bg-green-500/10",
    description:
      "Your resume matches several important job requirements.",
  },

  moderate: {
    label: "Moderate Alignment",
    color: "#fbbf24",
    background: "bg-amber-500/10",
    description:
      "Your resume shows partial alignment, with opportunities for improvement.",
  },

  limited: {
    label: "Limited Alignment",
    color: "#fb923c",
    background: "bg-orange-500/10",
    description:
      "Several important job requirements are not evidenced in your resume.",
  },

  low: {
    label: "Low Alignment",
    color: "#f87171",
    background: "bg-red-500/10",
    description:
      "Your resume currently demonstrates limited alignment with this role.",
  },
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-500 disabled:opacity-50";

const cardClass =
  "rounded-2xl border border-slate-800 bg-[#111827] p-5";

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
// SCORE CIRCLE COMPONENT
// =====================================

function ScoreCircle({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  const radius = 75;

  const circumference =
    2 * Math.PI * radius;

  const safeScore = Math.max(
    0,
    Math.min(100, score)
  );

  const offset =
    circumference -
    (safeScore / 100) * circumference;

  return (
    <div
      className="relative mx-auto h-48 w-48"
      role="img"
      aria-label={`Compatibility score ${safeScore} out of 100`}
    >
      <svg
        viewBox="0 0 180 180"
        className="h-full w-full -rotate-90"
      >
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#263244"
          strokeWidth="12"
        />

        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-bold tracking-tight"
          style={{ color }}
        >
          {safeScore}
        </span>

        <span className="mt-1 text-sm text-slate-400">
          out of 100
        </span>
      </div>
    </div>
  );
}

// =====================================
// SCORE BAR COMPONENT
// =====================================

function ScoreBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: number;
}) {
  const safeScore = Math.max(
    0,
    Math.min(100, score)
  );

  const color =
    safeScore >= 75
      ? "#34d399"
      : safeScore >= 50
      ? "#a78bfa"
      : "#fbbf24";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">

        <div>
          <p className="text-sm font-medium text-slate-200">
            {label}
          </p>

          <p className="text-[11px] text-slate-500">
            {Math.round(weight * 100)}% weight
          </p>
        </div>

        <span
          className="text-sm font-semibold"
          style={{ color }}
        >
          {safeScore}/100
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">

        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${safeScore}%`,
            backgroundColor: color,
          }}
        />

      </div>
    </div>
  );
}

// =====================================
// MAIN PAGE
// =====================================

export default function JobMatching() {

  // Form state

  const [resumes, setResumes] =
    useState<Resume[]>([]);

  const [selectedResume, setSelectedResume] =
    useState("");

  const [jobTitle, setJobTitle] =
    useState("");

  const [companyName, setCompanyName] =
    useState("");

  const [jobDescription, setJobDescription] =
    useState("");

  const [consent, setConsent] =
    useState(false);

  // Report state

  const [report, setReport] =
    useState<JobMatch | null>(null);

  const [history, setHistory] =
    useState<JobMatchSummary[]>([]);

  // Loading states

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  // Pagination

  const [historyPage, setHistoryPage] =
    useState(1);

  const [hasMoreHistory, setHasMoreHistory] =
    useState(false);

  // UI states

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(true);

  const [expandedEvidence, setExpandedEvidence] =
    useState<Record<number, boolean>>({});

  const operationLock = useRef(false);

  const reportRef =
    useRef<HTMLDivElement | null>(null);

  const formRef =
    useRef<HTMLDivElement | null>(null);

  const busy =
    loading || generating || historyLoading;

  // =====================================
  // INITIAL DATA LOADING
  // =====================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {

        setLoading(true);

        const [resumeData, historyData] =
          await Promise.all([
            resumeService.getAll(),

            jobMatchingService.getAll(1, 20),
          ]);

        if (cancelled) return;

        const processedResumes =
          resumeData.data.filter(
            (resume: Resume) =>
              resume.status === "processed"
          );

        setResumes(processedResumes);

        setHistory(historyData.jobMatches);

        setHasMoreHistory(
          historyData.pagination.totalPages > 1
        );

        if (processedResumes.length > 0) {
          setSelectedResume(
            processedResumes[0]._id
          );
        }

      } catch (error) {

        if (!cancelled) {
          setError(getErrorMessage(error));
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

  // Scroll to newly selected report

  useEffect(() => {
    if (report) {
      reportRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [report]);

  // =====================================
  // GENERATE REPORT
  // =====================================

  const handleGenerate = async (
    event: FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    if (operationLock.current || busy) {
      return;
    }

    if (!selectedResume) {
      setError("Please select a resume.");
      return;
    }

    if (jobTitle.trim().length < 2) {
      setError("Please enter a valid job title.");
      return;
    }

    if (
      jobDescription.trim().length < 50
    ) {
      setError(
        "Job description must contain at least 50 characters."
      );
      return;
    }

    if (
      jobDescription.trim().length > 20000
    ) {
      setError(
        "Job description must not exceed 20000 characters."
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

      const result =
        await jobMatchingService.generateReport({
          resumeId: selectedResume,

          jobTitle: jobTitle.trim(),

          companyName:
            companyName.trim() || undefined,

          jobDescription:
            jobDescription.trim(),

          consent: true,
        });

      setReport(result);

      setExpandedEvidence({});

      setShowForm(false);

      // Refresh history after report generation

      try {

        const refreshed =
          await jobMatchingService.getAll(
            1,
            20
          );

        setHistory(refreshed.jobMatches);

        setHistoryPage(1);

        setHasMoreHistory(
          refreshed.pagination.totalPages > 1
        );

      } catch {

        // Preserve the generated report even
        // if refreshing history fails.

        setHistory((previous) => [
          result,

          ...previous.filter(
            (item) =>
              item._id !== result._id
          ),
        ].slice(0, 20));

      }

    } catch (error) {

      setError(getErrorMessage(error));

    } finally {

      setGenerating(false);

      operationLock.current = false;

    }
  };

  // =====================================
  // OPEN SAVED REPORT
  // =====================================

  const handleViewReport = async (
    jobMatchId: string
  ) => {

    if (operationLock.current) return;

    operationLock.current = true;

    try {

      setHistoryLoading(true);

      setError("");

      const result =
        await jobMatchingService.getById(
          jobMatchId
        );

      setReport(result);

      setExpandedEvidence({});

      setShowForm(false);

    } catch (error) {

      setError(getErrorMessage(error));

    } finally {

      setHistoryLoading(false);

      operationLock.current = false;

    }
  };

  // =====================================
  // DELETE SAVED REPORT
  // =====================================

  const handleDelete = async (
    jobMatchId: string
  ) => {

    if (operationLock.current) return;

    const confirmed = window.confirm(
      "Permanently delete this job matching report?"
    );

    if (!confirmed) return;

    operationLock.current = true;

    try {

      setHistoryLoading(true);

      setError("");

      await jobMatchingService.delete(
        jobMatchId
      );

      setHistory((previous) =>
        previous.filter(
          (item) =>
            item._id !== jobMatchId
        )
      );

      if (report?._id === jobMatchId) {

        setReport(null);

        setShowForm(true);

      }

      try {

        const refreshed =
          await jobMatchingService.getAll(
            1,
            20
          );

        setHistory(refreshed.jobMatches);

        setHistoryPage(1);

        setHasMoreHistory(
          refreshed.pagination.totalPages > 1
        );

      } catch {

        setError(
          "Report deleted, but history could not be refreshed."
        );

      }

    } catch (error) {

      setError(getErrorMessage(error));

    } finally {

      setHistoryLoading(false);

      operationLock.current = false;

    }
  };

  // =====================================
  // LOAD MORE SAVED REPORTS
  // =====================================

  const loadMoreHistory = async () => {

    if (operationLock.current) return;

    operationLock.current = true;

    try {

      setHistoryLoading(true);

      setError("");

      const nextPage = historyPage + 1;

      const result =
        await jobMatchingService.getAll(
          nextPage,
          20
        );

      setHistory((previous) => {

        const existingIds = new Set(
          previous.map((item) => item._id)
        );

        return [
          ...previous,

          ...result.jobMatches.filter(
            (item) =>
              !existingIds.has(item._id)
          ),
        ];
      });

      setHistoryPage(nextPage);

      setHasMoreHistory(
        nextPage <
          result.pagination.totalPages
      );

    } catch (error) {

      setError(getErrorMessage(error));

    } finally {

      setHistoryLoading(false);

      operationLock.current = false;

    }
  };

  // =====================================
  // START NEW ANALYSIS
  // =====================================

  const startNewAnalysis = () => {

    if (busy) return;

    setJobTitle("");

    setCompanyName("");

    setJobDescription("");

    setConsent(false);

    setReport(null);

    setError("");

    setShowForm(true);

    setExpandedEvidence({});

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });
  };

  const toggleEvidence = (
    index: number
  ) => {

    setExpandedEvidence((previous) => ({
      ...previous,

      [index]: !previous[index],
    }));

  };

  const currentResume =
    resumes.find(
      (resume) =>
        resume._id === selectedResume
    );

  const currentCompatibility =
    report
      ? compatibilityConfig[
          report.compatibilityLevel
        ]
      : null;

  // =====================================
  // INITIAL LOADING SCREEN
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
            Loading your job matching workspace...
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

            <BriefcaseBusiness
              size={28}
              className="text-violet-400"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Semantic Job Matching
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Compare your resume with real job requirements.
            </p>

          </div>

        </div>

        <button
          type="button"
          disabled={busy}
          onClick={startNewAnalysis}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          <Plus size={17} />

          New Analysis
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

          <span className="flex-1">
            {error}
          </span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* ANALYSIS FORM */}

      {showForm && (
        <div
          ref={formRef}
          className={cardClass}
        >

          <div className="mb-6 flex items-center gap-3">

            <Target
              size={23}
              className="text-violet-400"
            />

            <div>

              <h2 className="text-lg font-semibold">
                New Compatibility Analysis
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select your resume and enter the target job details.
              </p>

            </div>

          </div>

          <form
            onSubmit={handleGenerate}
            className="space-y-5"
          >

            {/* Resume Selection */}

            <div>

              <label
                htmlFor="resume"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
              >

                <FileText size={16} />

                Select Resume

              </label>

              <select
                id="resume"
                required
                value={selectedResume}
                disabled={busy}
                onChange={(event) =>
                  setSelectedResume(
                    event.target.value
                  )
                }
                className={inputClass}
              >

                <option value="">
                  Select a processed resume
                </option>

                {resumes.map((resume) => (
                  <option
                    key={resume._id}
                    value={resume._id}
                  >
                    {resume.originalName}
                  </option>
                ))}

              </select>

              {currentResume && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">

                  <CheckCircle2 size={14} />

                  Resume ready for analysis

                </p>
              )}

              {resumes.length === 0 && (
                <p className="mt-2 text-xs text-amber-400">
                  Upload a PDF resume from Resume Analysis first.
                </p>
              )}

            </div>

            {/* Job Information */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label
                  htmlFor="jobTitle"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                >

                  <BriefcaseBusiness size={16} />

                  Job Title

                </label>

                <input
                  id="jobTitle"
                  required
                  maxLength={150}
                  value={jobTitle}
                  disabled={busy}
                  onChange={(event) =>
                    setJobTitle(event.target.value)
                  }
                  placeholder="e.g. Full Stack Developer"
                  className={inputClass}
                />

              </div>

              <div>

                <label
                  htmlFor="companyName"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                >

                  <Building2 size={16} />

                  Company Name

                  <span className="text-xs text-slate-500">
                    (Optional)
                  </span>

                </label>

                <input
                  id="companyName"
                  maxLength={150}
                  value={companyName}
                  disabled={busy}
                  onChange={(event) =>
                    setCompanyName(event.target.value)
                  }
                  placeholder="e.g. Sample Technologies"
                  className={inputClass}
                />

              </div>

            </div>

            {/* Job Description */}

            <div>

              <label
                htmlFor="jobDescription"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Job Description
              </label>

              <textarea
                id="jobDescription"
                required
                rows={8}
                minLength={50}
                maxLength={20000}
                value={jobDescription}
                disabled={busy}
                onChange={(event) =>
                  setJobDescription(
                    event.target.value
                  )
                }
                placeholder="Paste the complete job description, including required skills, preferred qualifications, responsibilities and experience requirements..."
                className={`${inputClass} resize-y leading-relaxed`}
              />

              <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500">

                <span>
                  Minimum 50 characters
                </span>

                <span>
                  {jobDescription.length}/20000
                </span>

              </div>

            </div>

            {/* AI PROCESSING CONSENT */}

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

                I agree that my redacted resume text and job
                details may be processed by Groq or Google
                Gemini to generate compatibility insights.
                Use synthetic resumes during development.

              </span>

            </label>

            {/* SUBMIT BUTTON */}

            <button
              type="submit"
              disabled={
                busy ||
                !selectedResume ||
                !consent ||
                jobTitle.trim().length < 2 ||
                jobDescription.trim().length < 50
              }
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
                ? "Analyzing Job Compatibility..."
                : "Analyze Job Compatibility"}

            </button>

          </form>

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
            Generating your compatibility report
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">

            CareerLens AI is comparing document embeddings,
            evaluating job requirements and verifying
            supporting resume evidence.

          </p>

          <div className="mx-auto mt-5 h-2 max-w-xs overflow-hidden rounded-full bg-slate-800">

            <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />

          </div>

        </div>
      )}

      {/* COMPATIBILITY REPORT */}

      {report && currentCompatibility && !generating && (
        <div
          ref={reportRef}
          className="scroll-mt-24 space-y-6"
        >

          {/* Report Header */}

          <div className={cardClass}>

            <div className="flex flex-wrap items-start justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-violet-500/10 p-3">

                  <BriefcaseBusiness
                    size={24}
                    className="text-violet-400"
                  />

                </div>

                <div>

                  <h2 className="text-xl font-semibold">

                    {report.jobTitle}

                  </h2>

                  <p className="mt-1 text-sm text-slate-400">

                    {report.companyName}

                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">

                <Clock size={15} />

                {new Date(
                  report.createdAt
                ).toLocaleDateString()}

              </div>

            </div>

            <div className="mt-6 grid items-center gap-6 md:grid-cols-[220px_1fr]">

              <ScoreCircle
                score={report.overallScore}
                color={currentCompatibility.color}
              />

              <div>

                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${currentCompatibility.background}`}
                  style={{
                    color: currentCompatibility.color,
                  }}
                >
                  {currentCompatibility.label}
                </span>

                <h3 className="mt-4 text-xl font-semibold">
                  Compatibility Overview
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {currentCompatibility.description}
                </p>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {report.result.summary}
                </p>

              </div>

            </div>

          </div>

          {/* Summary Statistics */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {[
              {
                label: "Semantic Score",
                value: `${report.semanticScore}/100`,
                icon: BrainCircuit,
                color: "text-violet-400",
              },
              {
                label: "Matched Skills",
                value:
                  report.result.matchedSkills.length,
                icon: CheckCircle2,
                color: "text-emerald-400",
              },
              {
                label: "Skills Not Evidenced",
                value:
                  report.result.missingSkills.length,
                icon: AlertCircle,
                color: "text-amber-400",
              },
              {
                label: "Recommendations",
                value:
                  report.result.recommendations.length,
                icon: Lightbulb,
                color: "text-sky-400",
              },
            ].map((item) => {

              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={cardClass}
                >

                  <div className="flex items-center justify-between gap-2">

                    <p className="text-xs text-slate-400">
                      {item.label}
                    </p>

                    <Icon
                      size={19}
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

          {/* Score Breakdown */}

          <div className={cardClass}>

            <div className="mb-6 flex items-center gap-3">

              <TrendingUp
                size={21}
                className="text-violet-400"
              />

              <h3 className="text-lg font-semibold">
                Compatibility Breakdown
              </h3>

            </div>

            <div className="grid gap-6 md:grid-cols-2">

              {scoreCategories.map((category) => (

                <ScoreBar
                  key={category.key}
                  label={category.label}
                  score={
                    report.scores[
                      category.key as keyof CompatibilityScores
                    ]
                  }
                  weight={
                    report.weights[category.key]
                  }
                />

              ))}

            </div>

            <p className="mt-6 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">

              This is a weighted, heuristic estimate of
              resume-to-job compatibility. It is not an
              official ATS score or probability of selection.

            </p>

          </div>

          {/* Skills Analysis */}

          <div className="grid items-start gap-6 xl:grid-cols-2">

            {/* Matched Skills */}

            <section className={cardClass}>

              <div className="mb-5 flex items-center gap-3">

                <ShieldCheck
                  size={22}
                  className="text-emerald-400"
                />

                <div>

                  <h3 className="font-semibold">
                    Matched Skills
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Skills supported by resume excerpts
                  </p>

                </div>

              </div>

              {report.result.matchedSkills.length === 0 && (
                <p className="text-sm text-slate-500">
                  No supported skill matches were identified.
                </p>
              )}

              <div className="space-y-3">

                {report.result.matchedSkills.map(
                  (skill, index) => (

                    <div
                      key={`${skill.skill}-${index}`}
                      className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4"
                    >

                      <div className="flex flex-wrap items-center justify-between gap-2">

                        <div className="flex items-center gap-2">

                          <CheckCircle2
                            size={16}
                            className="text-emerald-400"
                          />

                          <span className="text-sm font-medium text-slate-200">
                            {skill.skill}
                          </span>

                        </div>

                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] capitalize text-slate-300">

                          {skill.matchType} match

                        </span>

                      </div>

                      <button
                        type="button"
                        aria-expanded={
                          !!expandedEvidence[index]
                        }
                        onClick={() =>
                          toggleEvidence(index)
                        }
                        className="mt-3 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >

                        {expandedEvidence[index]
                          ? "Hide evidence"
                          : "View verified excerpt"}

                        <ChevronRight
                          size={14}
                          className={`transition ${
                            expandedEvidence[index]
                              ? "rotate-90"
                              : ""
                          }`}
                        />

                      </button>

                      {expandedEvidence[index] && (

                        <p className="mt-3 whitespace-pre-wrap wrap-break-word rounded-lg bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-300">

                          {skill.evidence}

                        </p>

                      )}

                    </div>

                  )
                )}

              </div>

            </section>

            {/* Missing Skills */}

            <section className={cardClass}>

              <div className="mb-5 flex items-center gap-3">

                <AlertCircle
                  size={22}
                  className="text-amber-400"
                />

                <div>

                  <h3 className="font-semibold">
                    Skills Not Evidenced
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Requirements not supported by the resume
                  </p>

                </div>

              </div>

              {report.result.missingSkills.length === 0 && (
                <p className="text-sm text-slate-500">
                  No missing skill evidence was identified.
                </p>
              )}

              <div className="space-y-3">

                {report.result.missingSkills.map(
                  (skill, index) => (

                    <div
                      key={`${skill.skill}-${index}`}
                      className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4"
                    >

                      <div className="flex flex-wrap items-center justify-between gap-2">

                        <span className="text-sm font-medium text-slate-200">

                          {skill.skill}

                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] capitalize ${
                            skill.importance === "required"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >

                          {skill.importance}

                        </span>

                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-slate-400">

                        {skill.recommendation}

                      </p>

                    </div>

                  )
                )}

              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">

                Missing evidence does not necessarily mean
                you do not possess the skill.

              </p>

            </section>

          </div>

          {/* Required and Preferred Skills */}

          <div className="grid gap-6 md:grid-cols-2">

            {[
              {
                label: "Required Skills",
                skills: report.result.requiredSkills,
                color: "text-violet-300",
              },
              {
                label: "Preferred Skills",
                skills: report.result.preferredSkills,
                color: "text-sky-300",
              },
            ].map((section) => (

              <div
                key={section.label}
                className={cardClass}
              >

                <h3 className="mb-4 font-semibold">
                  {section.label}
                </h3>

                <div className="flex flex-wrap gap-2">

                  {section.skills.length === 0 && (
                    <p className="text-xs text-slate-500">
                      No skills identified in this category.
                    </p>
                  )}

                  {section.skills.map(
                    (skill, index) => (

                      <span
                        key={`${skill}-${index}`}
                        className={`rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs ${section.color}`}
                      >

                        {skill}

                      </span>

                    )
                  )}

                </div>

              </div>

            ))}

          </div>

          {/* Detailed Assessment */}

          <section className={cardClass}>

            <h3 className="mb-5 text-lg font-semibold">
              Detailed Assessment
            </h3>

            <div className="grid gap-4 md:grid-cols-2">

              {scoreCategories
                .filter(
                  (category) =>
                    category.key !== "semanticSimilarity"
                )
                .map((category) => {

                  const key =
                    category.key as keyof JobMatch["result"]["assessment"];

                  const assessment =
                    report.result.assessment[key];

                  const Icon = category.icon;

                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-2">

                          <Icon
                            size={18}
                            className="text-violet-400"
                          />

                          <h4 className="text-sm font-medium">

                            {category.label}

                          </h4>

                        </div>

                        <span className="text-sm font-semibold text-violet-300">

                          {assessment.score}/100

                        </span>

                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-slate-400">

                        {assessment.explanation}

                      </p>

                    </div>
                  );
                })}

            </div>

          </section>

          {/* Strengths and Gaps */}

          <div className="grid gap-6 md:grid-cols-2">

            <section className={cardClass}>

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-emerald-400">

                <TrendingUp size={20} />

                Profile Strengths

              </h3>

              <div className="space-y-3">

                {report.result.strengths.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No strengths identified.
                  </p>
                )}

                {report.result.strengths.map(
                  (strength, index) => (

                    <div
                      key={index}
                      className="flex items-start gap-3"
                    >

                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-emerald-400"
                      />

                      <p className="text-sm leading-relaxed text-slate-300">

                        {strength}

                      </p>

                    </div>

                  )
                )}

              </div>

            </section>

            <section className={cardClass}>

              <h3 className="mb-4 flex items-center gap-2 font-semibold text-amber-400">

                <Target size={20} />

                Improvement Areas

              </h3>

              <div className="space-y-3">

                {report.result.gaps.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No improvement areas identified.
                  </p>
                )}

                {report.result.gaps.map(
                  (gap, index) => (

                    <div
                      key={index}
                      className="flex items-start gap-3"
                    >

                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0 text-amber-400"
                      />

                      <p className="text-sm leading-relaxed text-slate-300">

                        {gap}

                      </p>

                    </div>

                  )
                )}

              </div>

            </section>

          </div>

          {/* Recommendations */}

          <section className={cardClass}>

            <div className="mb-5 flex items-center gap-3">

              <Lightbulb
                size={23}
                className="text-violet-400"
              />

              <div>

                <h3 className="text-lg font-semibold">
                  Personalized Recommendations
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Actionable steps to improve alignment with this role
                </p>

              </div>

            </div>

            <div className="space-y-4">

              {report.result.recommendations.length === 0 && (
                <p className="text-sm text-slate-500">
                  No recommendations were generated.
                </p>
              )}

              {[...report.result.recommendations]
                .sort((a, b) => {

                  const priorityOrder = {
                    high: 0,
                    medium: 1,
                    low: 2,
                  };

                  return (
                    priorityOrder[a.priority] -
                    priorityOrder[b.priority]
                  );
                })
                .map((recommendation, index) => (

                  <div
                    key={index}
                    className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm font-semibold text-violet-400">

                      {index + 1}

                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="text-sm font-semibold">

                          {recommendation.title}

                        </h4>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] capitalize ${
                            recommendation.priority === "high"
                              ? "bg-red-500/10 text-red-400"
                              : recommendation.priority === "medium"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >

                          {recommendation.priority} priority

                        </span>

                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-slate-400">

                        {recommendation.description}

                      </p>

                    </div>

                  </div>

                ))}

            </div>

          </section>

          {/* Original Job Description */}

          <details className={cardClass}>

            <summary className="cursor-pointer text-sm font-semibold text-slate-300">
              View Saved Job Description
            </summary>

            <p className="mt-4 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-400">

              {report.jobDescription}

            </p>

          </details>

          {/* AI Metadata */}

          <section className={cardClass}>

            <div className="mb-4 flex items-center gap-2">

              <Database
                size={19}
                className="text-violet-400"
              />

              <h3 className="font-semibold">
                Analysis Metadata
              </h3>

            </div>

            <div className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">

              {[
                {
                  label: "AI Provider",
                  value: report.provider,
                },
                {
                  label: "Generation Model",
                  value: report.modelUsed,
                },
                {
                  label: "Embedding Model",
                  value: report.embeddingModel,
                },
                {
                  label: "Resume Chunks",
                  value: report.resumeChunkCount,
                },
                {
                  label: "Job Description Chunks",
                  value: report.jobChunkCount,
                },
                {
                  label: "Processing Time",
                  value: `${(
                    report.processingTime / 1000
                  ).toFixed(2)} seconds`,
                },
                {
                  label: "Scoring Version",
                  value: report.scoringVersion,
                },
                {
                  label: "Similarity Version",
                  value: report.similarityVersion,
                },
                {
                  label: "Prompt Version",
                  value: report.promptVersion,
                },
              ].map((item) => (

                <div
                  key={item.label}
                  className="min-w-0 rounded-xl bg-slate-950/40 p-3"
                >

                  <p className="text-slate-500">

                    {item.label}

                  </p>

                  <p className="mt-2 wrap-break-word font-medium text-slate-300">

                    {item.value}

                  </p>

                </div>

              ))}

            </div>

          </section>

        </div>
      )}

      {/* SAVED REPORT HISTORY */}

      <section className={cardClass}>

        <div className="mb-5 flex items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <History
              size={23}
              className="text-violet-400"
            />

            <div>

              <h2 className="text-lg font-semibold">
                Job Matching History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                View your previously generated compatibility reports
              </p>

            </div>

          </div>

          {historyLoading && (
            <Loader2
              size={20}
              className="animate-spin text-violet-400"
            />
          )}

        </div>

        {history.length === 0 && (

          <div className="py-12 text-center">

            <BriefcaseBusiness
              size={35}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="text-sm text-slate-400">
              No job matching reports yet.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Generate your first compatibility analysis above.
            </p>

          </div>

        )}

        <div className="space-y-3">

          {history.map((item) => {

            const config =
              compatibilityConfig[
                item.compatibilityLevel
              ];

            return (
              <div
                key={item._id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition ${
                  report?._id === item._id
                    ? "border-violet-500/30 bg-violet-500/5"
                    : "border-slate-800 bg-slate-950/30"
                }`}
              >

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void handleViewReport(
                      item._id
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                >

                  <div className="rounded-xl bg-violet-500/10 p-3">

                    <BriefcaseBusiness
                      size={20}
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

                    <p className="mt-1 text-[11px] text-slate-500">

                      {new Date(
                        item.createdAt
                      ).toLocaleDateString()}

                    </p>

                  </div>

                </button>

                <div className="flex items-center gap-4">

                  <div className="text-right">

                    <p
                      className="text-xl font-bold"
                      style={{
                        color: config.color,
                      }}
                    >

                      {item.overallScore}/100

                    </p>

                    <p className="text-[10px] text-slate-500">

                      {config.label}

                    </p>

                  </div>

                  <button
                    type="button"
                    title="View report"
                    aria-label="View report"
                    disabled={busy}
                    onClick={() =>
                      void handleViewReport(
                        item._id
                      )
                    }
                    className="rounded-lg border border-slate-700 p-2.5 text-slate-400 hover:border-violet-500/40 hover:text-violet-400 disabled:opacity-40"
                  >

                    <ChevronRight size={17} />

                  </button>

                  <button
                    type="button"
                    title="Delete report"
                    aria-label="Delete report"
                    disabled={busy}
                    onClick={() =>
                      void handleDelete(item._id)
                    }
                    className="rounded-lg border border-slate-700 p-2.5 text-slate-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  >

                    <Trash2 size={17} />

                  </button>

                </div>

              </div>
            );
          })}

        </div>

        {hasMoreHistory && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void loadMoreHistory()
            }
            className="mt-4 w-full rounded-xl border border-slate-700 py-3 text-sm text-violet-400 hover:bg-slate-800 disabled:opacity-40"
          >
            Load More Reports
          </button>
        )}

      </section>

      {/* Footer Disclaimer */}

      <p className="pb-4 text-center text-xs leading-relaxed text-slate-500">

        CareerLens AI provides informational career guidance.
        Compatibility scores are estimates and do not represent
        hiring decisions or guaranteed employment outcomes.

      </p>

    </div>
  );
}