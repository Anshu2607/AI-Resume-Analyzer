import { useEffect, useState } from "react";
import axios from "axios";

import {
  Sparkles,
  LoaderCircle,
  FileText,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  History,
  ArrowLeft,
} from "lucide-react";

import { analysisService } from "../services/analysis.service";
import type { Analysis } from "../types/analysis.types";
import type { Resume } from "../types/resume.types";

import AnalysisReport from "./AnalysisReport";

interface AnalysisWorkspaceProps {
  resumes: Resume[];
}

const AnalysisWorkspace = ({
  resumes,
}: AnalysisWorkspaceProps) => {

  const [selectedResumeId, setSelectedResumeId] =
    useState("");

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [activeAnalysis, setActiveAnalysis] =
    useState<Analysis | null>(null);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [viewingId, setViewingId] =
    useState<string | null>(null);

  const [consent, setConsent] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const processedResumes = resumes.filter(
    (resume) => resume.status === "processed"
  );

  const getErrorMessage = (
    error: unknown,
    fallback: string
  ): string => {
    return axios.isAxiosError(error)
      ? error.response?.data?.message || fallback
      : fallback;
  };

  // Retrieve saved analysis reports
  useEffect(() => {
    let cancelled = false;

    const loadAnalyses = async () => {
      try {
        const response = await analysisService.getAll();

        if (!cancelled) {
          setAnalyses(response.data);
        }

      } catch (error) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              error,
              "Unable to retrieve analysis reports."
            )
          );
        }

      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalyses();

    return () => {
      cancelled = true;
    };
  }, []);

  // Generate a new AI analysis
  const handleGenerate = async () => {
    if (
      !selectedResumeId ||
      !consent ||
      isGenerating
    ) {
      return;
    }

    setIsGenerating(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await analysisService.generate(
          selectedResumeId
        );

      setAnalyses((previous) => [
        response.data,
        ...previous,
      ]);

      setActiveAnalysis(response.data);

      setSuccess(
        "AI analysis completed successfully."
      );

    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to generate AI analysis."
        )
      );

    } finally {
      setIsGenerating(false);
    }
  };

  // View a saved analysis
  const handleView = async (id: string) => {
    setViewingId(id);
    setError("");
    setSuccess("");

    try {
      const response =
        await analysisService.getById(id);

      setActiveAnalysis(response.data);

    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to retrieve analysis report."
        )
      );

    } finally {
      setViewingId(null);
    }
  };

  // Delete a saved analysis
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this analysis?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      await analysisService.delete(id);

      setAnalyses((previous) =>
        previous.filter(
          (analysis) => analysis._id !== id
        )
      );

      if (activeAnalysis?._id === id) {
        setActiveAnalysis(null);
      }

      setSuccess(
        "Analysis deleted successfully."
      );

    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to delete analysis."
        )
      );

    } finally {
      setDeletingId(null);
    }
  };

  const getResumeName = (resumeId: string) => {
    return (
      resumes.find(
        (resume) => resume._id === resumeId
      )?.originalName || "Unavailable resume"
    );
  };

  return (
    <div className="space-y-6">

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {/* AI Analysis Generator */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex items-center gap-4">

          <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
            <Sparkles size={28} />
          </div>

          <div>

            <h2 className="text-xl font-semibold text-slate-900">
              Analyze with AI
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Discover your resume strengths, weaknesses
              and career opportunities.
            </p>

          </div>

        </div>

        <label
          htmlFor="analysis-resume"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Select Resume
        </label>

        <select
          id="analysis-resume"
          value={selectedResumeId}
          disabled={isGenerating}
          onChange={(event) => {
            setSelectedResumeId(event.target.value);
            setConsent(false);
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
        >

          <option value="">
            Choose a processed resume
          </option>

          {processedResumes.map((resume) => (

            <option
              key={resume._id}
              value={resume._id}
            >
              {resume.originalName}
            </option>

          ))}

        </select>

        {processedResumes.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            Upload and process a PDF resume first.
          </p>
        )}

        {/* Data processing notice */}
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

          <input
            type="checkbox"
            checked={consent}
            disabled={isGenerating}
            onChange={(event) =>
              setConsent(event.target.checked)
            }
            className="mt-1 h-4 w-4 accent-indigo-600"
          />

          <span className="text-xs leading-relaxed text-slate-600">
  I understand that my extracted resume content
  may be processed by external AI providers,
  including Groq and Google Gemini, to generate
  personalized career insights. Automatic redaction
  may not remove all personal information.
  I agree to this processing.
</span>

        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            !selectedResumeId ||
            !consent ||
            isGenerating ||
            isLoading ||
            viewingId !== null ||
            deletingId !== null ||
            !processedResumes.some(
              (resume) =>
                resume._id === selectedResumeId
            )
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >

          {isGenerating ? (
            <>
              <LoaderCircle
                size={20}
                className="animate-spin"
              />
              Generating AI Analysis...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Generate AI Analysis
            </>
          )}

        </button>

        {isGenerating && (

          <div
            role="status"
            className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-5"
          >

            <div className="flex items-center gap-3">

              <LoaderCircle
                size={24}
                className="animate-spin text-indigo-600"
              />

              <div>

                <h3 className="text-sm font-semibold text-indigo-800">
                  Analyzing your resume
                </h3>

                <p className="mt-1 text-xs text-indigo-600">
                  Generating assessments, skill insights
                  and personalized recommendations.
                </p>

              </div>

            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-indigo-200">

              <div className="h-full w-full animate-pulse rounded-full bg-indigo-600" />

            </div>

          </div>

        )}

      </section>

      {/* Active AI Report */}
      {activeAnalysis && (

        <section className="space-y-4">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <button
              type="button"
              onClick={() => setActiveAnalysis(null)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Close Report
            </button>

            <span className="text-xs text-slate-500">
              {getResumeName(activeAnalysis.resumeId)}
            </span>

          </div>

          <AnalysisReport
            analysis={activeAnalysis}
          />

        </section>

      )}

      {/* Analysis History */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex items-center gap-3">

          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <History size={24} />
          </div>

          <div>

            <h2 className="text-xl font-semibold text-slate-900">
              Analysis History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Access your previously generated AI reports.
            </p>

          </div>

        </div>

        {isLoading ? (

          <div className="flex justify-center py-10">
            <LoaderCircle
              size={30}
              className="animate-spin text-indigo-600"
            />
          </div>

        ) : analyses.length === 0 ? (

          <div className="py-10 text-center">

            <FileText
              size={40}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-700">
              No analysis reports yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Generate your first AI-powered report.
            </p>

          </div>

        ) : (

          <div className="space-y-4">

            {analyses.map((analysis) => (

              <div
                key={analysis._id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 sm:flex-row sm:items-center"
              >

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50">

                  <div className="text-center">

                    <p className="text-lg font-bold text-indigo-600">
                      {analysis.overallScore}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      / 100
                    </p>

                  </div>

                </div>

                <div className="min-w-0 flex-1">

                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {getResumeName(analysis.resumeId)}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(
                      analysis.createdAt
                    ).toLocaleDateString("en-IN")}
                    {" · "}
                    {analysis.modelUsed}
                  </p>

                </div>

                <div className="flex gap-2">

                  <button
                    onClick={() =>
                      handleView(analysis._id)
                    }
                    disabled={
                      viewingId !== null ||
                      deletingId !== null ||
                      isGenerating
                    }
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                  >

                    {viewingId === analysis._id ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Eye size={16} />
                    )}

                    View Report

                  </button>

                  <button
                    aria-label="Delete analysis report"
                    onClick={() =>
                      handleDelete(analysis._id)
                    }
                    disabled={
                      deletingId !== null ||
                      viewingId !== null ||
                      isGenerating
                    }
                    className="rounded-lg bg-red-50 p-2.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >

                    {deletingId === analysis._id ? (
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={18} />
                    )}

                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
};

export default AnalysisWorkspace;