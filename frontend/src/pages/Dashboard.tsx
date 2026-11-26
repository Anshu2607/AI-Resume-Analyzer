import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  FileText,
  Sparkles,
  TrendingUp,
  Trophy,
  ArrowUpRight,
  Target,
  Map,
  MessageSquare,
  LoaderCircle,
  AlertCircle,
  Clock,
  History,
  BriefcaseBusiness,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

import { resumeService } from "../services/resume.service";
import { analysisService } from "../services/analysis.service";

import type { Resume } from "../types/resume.types";
import type { Analysis } from "../types/analysis.types";

const Dashboard = () => {
  const { user } = useAuth();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Retrieve dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [resumeResponse, analysisResponse] =
        await Promise.all([
          resumeService.getAll(),
          analysisService.getAll(),
        ]);

      setResumes(resumeResponse.data);
      setAnalyses(analysisResponse.data);

    } catch {
      setError(
        "Unable to load dashboard data. Please try again."
      );

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  // Calculate dashboard statistics
  const totalResumes = resumes.length;

  const totalAnalyses = analyses.length;

  const averageScore =
    totalAnalyses > 0
      ? Math.round(
          analyses.reduce(
            (sum, analysis) =>
              sum + analysis.overallScore,
            0
          ) / totalAnalyses
        )
      : 0;

  const bestScore =
    totalAnalyses > 0
      ? Math.max(
          ...analyses.map(
            (analysis) => analysis.overallScore
          )
        )
      : 0;

  const sortedAnalyses = [...analyses].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  const latestAnalysis = sortedAnalyses[0];

  const recentAnalyses = sortedAnalyses.slice(0, 5);

  const getResumeName = (resumeId: string) => {
    return (
      resumes.find(
        (resume) => resume._id === resumeId
      )?.originalName || "Unavailable resume"
    );
  };

  const stats = [
    {
      title: "Total Resumes",
      value: totalResumes,
      description: "Uploaded documents",
      icon: FileText,
      style: "bg-blue-50 text-blue-600",
    },
    {
      title: "AI Analyses",
      value: totalAnalyses,
      description: "Generated reports",
      icon: Sparkles,
      style: "bg-violet-50 text-violet-600",
    },
    {
      title: "Average Quality Score",
      value:
        totalAnalyses > 0
          ? `${averageScore}/100`
          : "—",
      description: "Across saved reports",
      icon: TrendingUp,
      style: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Best Quality Score",
      value:
        totalAnalyses > 0
          ? `${bestScore}/100`
          : "—",
      description: "Highest recorded score",
      icon: Trophy,
      style: "bg-amber-50 text-amber-600",
    },
  ];

  const quickActions = [
    {
      title: "Analyze Resume",
      description:
        "Upload your resume and receive personalized AI feedback.",
      icon: Sparkles,
      path: "/resume-analysis",
      style: "bg-indigo-50 text-indigo-600",
      available: true,
    },
    {
      title: "Job Matching",
      description:
        "Discover how your professional skills align with job requirements.",
      icon: BriefcaseBusiness,
      path: "/job-matching",
      style: "bg-blue-50 text-blue-600",
      available: false,
    },
    {
      title: "Skill Gap Analysis",
      description:
        "Identify missing skills for your target career.",
      icon: Target,
      path: "/skill-gaps",
      style: "bg-amber-50 text-amber-600",
      available: false,
    },
    {
      title: "Career Roadmap",
      description:
        "Build a personalized learning and career development plan.",
      icon: Map,
      path: "/career-roadmap",
      style: "bg-emerald-50 text-emerald-600",
      available: false,
    },
    {
      title: "AI Interview",
      description:
        "Practice interview questions with intelligent feedback.",
      icon: MessageSquare,
      path: "/ai-interview",
      style: "bg-violet-50 text-violet-600",
      available: false,
    },
  ];

  const assessmentCategories = [
    {
      key: "technicalSkills",
      label: "Technical Skills",
    },
    {
      key: "experience",
      label: "Experience",
    },
    {
      key: "projects",
      label: "Projects",
    },
    {
      key: "education",
      label: "Education",
    },
    {
      key: "resumeStructure",
      label: "Resume Structure",
    },
    {
      key: "achievements",
      label: "Achievements",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-7">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-7 text-white shadow-sm md:p-9">

        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />

        <div className="absolute -bottom-24 right-28 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative z-10">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">

            <Sparkles size={14} />

            AI-Powered Career Intelligence

          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">

            Welcome back, {user?.name || "Professional"}!

          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-indigo-100 md:text-base">

            Understand your professional strengths,
            improve your resume and take the next
            step toward your career goals with AI.

          </p>

          <Link
            to="/resume-analysis"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >

            <Sparkles size={18} />

            Analyze Your Resume

            <ArrowUpRight size={17} />

          </Link>

        </div>

      </section>

      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>

          <h2 className="text-xl font-bold text-slate-900">
            Career Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track your resume performance and AI activity.
          </p>

        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void fetchDashboardData()}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >

          <RefreshCw
            size={16}
            className={
              isLoading ? "animate-spin" : ""
            }
          />

          Refresh

        </button>

      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >

          <AlertCircle
            size={20}
            className="shrink-0"
          />

          {error}

        </div>
      )}

      {/* Statistics Cards */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => {

          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >

              <div className="flex items-center justify-between">

                <div
                  className={`rounded-xl p-3 ${stat.style}`}
                >

                  <Icon size={23} />

                </div>

                <ArrowUpRight
                  size={17}
                  className="text-slate-300"
                />

              </div>

              <p className="mt-5 text-sm font-medium text-slate-500">

                {stat.title}

              </p>

              {isLoading ? (

                <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-slate-100" />

              ) : (

                <h3 className="mt-2 text-3xl font-bold text-slate-900">

                  {error ? "—" : stat.value}

                </h3>

              )}

              <p className="mt-2 text-xs text-slate-400">

                {stat.description}

              </p>

            </div>
          );
        })}

      </section>

      {/* Latest Resume Assessment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

          <div>

            <h2 className="text-lg font-semibold text-slate-900">
              Latest Resume Assessment
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Insights from your most recent AI report.
            </p>

          </div>

          <Link
            to="/resume-analysis"
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >

            View Reports

            <ArrowUpRight size={16} />

          </Link>

        </div>

        {isLoading ? (

          <div className="flex justify-center py-12">

            <LoaderCircle
              size={30}
              className="animate-spin text-indigo-600"
            />

          </div>

        ) : error ? (

          <p className="py-6 text-center text-sm text-slate-500">
            Assessment data is currently unavailable.
          </p>

        ) : latestAnalysis ? (

          <div className="grid items-center gap-8 lg:grid-cols-[220px_1fr]">

            {/* Quality Score Circle */}
            <div className="flex flex-col items-center">

              <div className="relative h-44 w-44">

                <svg
                  viewBox="0 0 160 160"
                  className="h-full w-full"
                  role="img"
                  aria-label={`Resume quality score ${latestAnalysis.overallScore} out of 100`}
                >

                  <circle
                    cx="80"
                    cy="80"
                    r="65"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    fill="none"
                  />

                  <circle
                    cx="80"
                    cy="80"
                    r="65"
                    stroke="#4f46e5"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 65}
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      65 *
                      (1 - latestAnalysis.overallScore / 100)
                    }
                    transform="rotate(-90 80 80)"
                  />

                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">

                  <span className="text-4xl font-bold text-indigo-600">

                    {latestAnalysis.overallScore}

                  </span>

                  <span className="text-sm text-slate-400">
                    out of 100
                  </span>

                </div>

              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                Resume Quality Score
              </h3>

              <p className="mt-2 max-w-52 break-all text-center text-xs text-slate-500">

                {getResumeName(
                  latestAnalysis.resumeId
                )}

              </p>

            </div>

            {/* Category Scores */}
            <div className="space-y-5">

              {assessmentCategories.map(
                (category) => {

                  const score =
                    latestAnalysis.result.assessment[
                      category.key
                    ].score;

                  return (
                    <div key={category.key}>

                      <div className="mb-2 flex items-center justify-between">

                        <span className="text-sm font-medium text-slate-600">

                          {category.label}

                        </span>

                        <span className="text-sm font-semibold text-slate-800">

                          {score}/100

                        </span>

                      </div>

                      <div
                        role="progressbar"
                        aria-label={category.label}
                        aria-valuenow={score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      >

                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{
                            width: `${score}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        ) : (

          /* No Analysis State */
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">

            <Sparkles
              size={42}
              className="mx-auto text-indigo-300"
            />

            <h3 className="mt-4 font-semibold text-slate-800">
              No resume assessment yet
            </h3>

            <p className="mx-auto mt-2 max-w-md px-4 text-sm text-slate-500">

              Generate your first AI resume analysis
              to discover your professional strengths
              and areas for improvement.

            </p>

            <Link
              to="/resume-analysis"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >

              Get Started

              <ArrowUpRight size={16} />

            </Link>

          </div>

        )}

        <p className="mt-6 text-xs text-slate-400">

          AI-generated resume quality assessments are
          indicative and are not official ATS scores
          or predictions of hiring outcomes.

        </p>

      </section>

      {/* Identified Skills and Recommended Roles */}
      {!isLoading && !error && latestAnalysis && (

        <div className="grid gap-6 lg:grid-cols-2">

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">

              <Target
                size={21}
                className="text-indigo-600"
              />

              Identified Technical Skills

            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Skills extracted from your latest AI report.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">

              {latestAnalysis.result.technicalSkills
                .slice(0, 15)
                .map((skill, index) => (

                  <span
                    key={`${skill}-${index}`}
                    className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
                  >

                    {skill}

                  </span>

                ))}

              {latestAnalysis.result.technicalSkills
                .length === 0 && (

                <p className="text-sm text-slate-400">
                  No technical skills identified.
                </p>

              )}

            </div>

          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">

              <BriefcaseBusiness
                size={21}
                className="text-indigo-600"
              />

              Recommended Career Roles

            </h2>

            <p className="mt-2 text-sm text-slate-500">
              AI suggestions based on your resume.
            </p>

            <div className="mt-5 space-y-3">

              {latestAnalysis.result.recommendedRoles
                .slice(0, 3)
                .map((item, index) => (

                  <div
                    key={index}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >

                    <h3 className="text-sm font-semibold text-slate-800">

                      {item.role}

                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">

                      {item.reason}

                    </p>

                  </div>

                ))}

              {latestAnalysis.result.recommendedRoles
                .length === 0 && (

                <p className="text-sm text-slate-400">
                  No career roles recommended.
                </p>

              )}

            </div>

          </section>

        </div>

      )}

      {/* Quick Actions */}
      <section>

        <h2 className="text-xl font-bold text-slate-900">
          Career Toolkit
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Explore tools designed to support your career development.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

          {quickActions.map((action) => {

            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                to={action.path}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >

                <div className="flex items-center justify-between">

                  <div
                    className={`rounded-xl p-3 ${action.style}`}
                  >

                    <Icon size={24} />

                  </div>

                  <ArrowUpRight
                    size={18}
                    className="text-slate-400 transition group-hover:text-indigo-600"
                  />

                </div>

                <h3 className="mt-5 font-semibold text-slate-900">

                  {action.title}

                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">

                  {action.description}

                </p>

                <span
                  className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    action.available
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >

                  {action.available
                    ? "Available"
                    : "Coming Soon"}

                </span>

              </Link>
            );
          })}

        </div>

      </section>

      {/* Recent AI Activity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

          <div>

            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">

              <History
                size={21}
                className="text-indigo-600"
              />

              Recent AI Activity

            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your most recently generated analysis reports.
            </p>

          </div>

          <Link
            to="/resume-analysis"
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600"
          >

            All Reports

            <ArrowUpRight size={16} />

          </Link>

        </div>

        {isLoading ? (

          <div className="flex justify-center py-10">

            <LoaderCircle
              size={30}
              className="animate-spin text-indigo-600"
            />

          </div>

        ) : error ? (

          <p className="py-6 text-center text-sm text-slate-500">
            Recent activity is currently unavailable.
          </p>

        ) : recentAnalyses.length === 0 ? (

          <div className="py-10 text-center">

            <Clock
              size={38}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-700">
              No recent activity
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Your AI analysis reports will appear here.
            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {recentAnalyses.map((analysis) => (

              <div
                key={analysis._id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >

                <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">

                  <Sparkles size={22} />

                </div>

                <div className="min-w-0 flex-1">

                  <h3 className="text-sm font-semibold text-slate-800">
                    AI Resume Analysis
                  </h3>

                  <p className="mt-1 truncate text-xs text-slate-500">

                    {getResumeName(analysis.resumeId)}

                  </p>

                  <p className="mt-1 text-xs text-slate-400">

                    {new Date(
                      analysis.createdAt
                    ).toLocaleString("en-IN")}

                  </p>

                </div>

                <div className="rounded-lg bg-indigo-50 px-4 py-2 text-center">

                  <span className="text-lg font-bold text-indigo-600">

                    {analysis.overallScore}

                  </span>

                  <span className="text-xs text-slate-400">
                    /100
                  </span>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
};

export default Dashboard;