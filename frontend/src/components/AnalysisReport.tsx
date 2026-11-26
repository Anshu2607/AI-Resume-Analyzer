import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Users,
  BriefcaseBusiness,
  Target,
  TrendingUp,
  FileText,
  Clock,
} from "lucide-react";

import type {
  Analysis,
  Assessment,
} from "../types/analysis.types";

interface AnalysisReportProps {
  analysis: Analysis;
}

const categories: {
  key: keyof Assessment;
  label: string;
  weight: number;
}[] = [
  {
    key: "technicalSkills",
    label: "Technical Skills",
    weight: 25,
  },
  {
    key: "experience",
    label: "Experience",
    weight: 20,
  },
  {
    key: "projects",
    label: "Projects",
    weight: 20,
  },
  {
    key: "education",
    label: "Education",
    weight: 10,
  },
  {
    key: "resumeStructure",
    label: "Resume Structure",
    weight: 15,
  },
  {
    key: "achievements",
    label: "Achievements",
    weight: 10,
  },
];

const getScoreColor = (score: number) => {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#4f46e5";
  if (score >= 40) return "#d97706";
  return "#dc2626";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong Foundation";
  if (score >= 40) return "Needs Improvement";
  return "Significant Improvement Needed";
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";

    case "medium":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-blue-100 text-blue-700";
  }
};

const AnalysisReport = ({
  analysis,
}: AnalysisReportProps) => {

  const { result, overallScore } = analysis;

  const radius = 65;
  const circumference = 2 * Math.PI * radius;

  const offset =
    circumference -
    (overallScore / 100) * circumference;

  const scoreColor = getScoreColor(overallScore);

  return (
    <div className="space-y-6">

      {/* Report Header */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-700 p-6 text-white shadow-sm">

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <Sparkles size={26} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              AI Resume Analysis
            </h2>

            <p className="mt-1 text-sm text-indigo-100">
              Personalized insights to strengthen your career profile.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-xs text-indigo-100">

          <span>
            Model: {analysis.modelUsed}
          </span>

          <span className="flex items-center gap-1">
            <Clock size={14} />

            {(analysis.processingTime / 1000).toFixed(2)}s
          </span>

          <span>
            {new Date(
              analysis.createdAt
            ).toLocaleDateString("en-IN")}
          </span>

        </div>

      </section>

      {/* Overall Score */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col items-center gap-8 md:flex-row">

          <div className="relative h-44 w-44 shrink-0">

            <svg
              viewBox="0 0 160 160"
              className="h-full w-full"
              aria-label={`Resume quality score ${overallScore} out of 100`}
              role="img"
            >

              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth="12"
                fill="none"
              />

              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={scoreColor}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 80 80)"
              />

            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">

              <span
                className="text-4xl font-bold"
                style={{ color: scoreColor }}
              >
                {overallScore}
              </span>

              <span className="mt-1 text-sm text-slate-400">
                out of 100
              </span>

            </div>

          </div>

          <div className="flex-1">

            <h3 className="text-2xl font-bold text-slate-900">
              Resume Quality Score
            </h3>

            <span
              className="mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                color: scoreColor,
                backgroundColor: `${scoreColor}15`,
              }}
            >
              {getScoreLabel(overallScore)}
            </span>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Your score is calculated using six weighted
              resume assessment categories, based on
              AI-generated evaluations of your professional
              evidence.
            </p>

            <p className="mt-3 text-xs text-slate-400">
              This is an indicative resume quality score,
              not an official ATS score or hiring prediction.
            </p>

          </div>

        </div>

      </section>

      {/* Professional Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-4 flex items-center gap-3">

          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <FileText size={22} />
          </div>

          <h3 className="text-lg font-semibold text-slate-900">
            Professional Summary
          </h3>

        </div>

        <p className="text-sm leading-7 text-slate-600">
          {result.professionalSummary}
        </p>

      </section>

      {/* Category Assessment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex items-center gap-3">

          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <TrendingUp size={22} />
          </div>

          <h3 className="text-lg font-semibold text-slate-900">
            Category-wise Assessment
          </h3>

        </div>

        <div className="space-y-6">

          {categories.map((category) => {

            const assessment =
              result.assessment[category.key];

            return (
              <div key={category.key}>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="text-sm font-semibold text-slate-700">
                      {category.label}
                    </span>

                    <span className="text-xs text-slate-400">
                      Weight: {category.weight}%
                    </span>

                  </div>

                  <span
                    className="text-sm font-bold"
                    style={{
                      color: getScoreColor(assessment.score),
                    }}
                  >
                    {assessment.score}/100
                  </span>

                </div>

                <div
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={category.label}
                  aria-valuenow={assessment.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >

                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${assessment.score}%`,
                      backgroundColor: getScoreColor(
                        assessment.score
                      ),
                    }}
                  />

                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {assessment.explanation}
                </p>

              </div>
            );
          })}

        </div>

      </section>

      {/* Technical and Soft Skills */}
      <div className="grid gap-6 md:grid-cols-2">

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Code2 size={22} />
            </div>

            <h3 className="font-semibold text-slate-900">
              Technical Skills
            </h3>

          </div>

          <div className="flex flex-wrap gap-2">

            {result.technicalSkills.map((skill, index) => (

              <span
                key={`${skill}-${index}`}
                className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
              >
                {skill}
              </span>

            ))}

            {result.technicalSkills.length === 0 && (
              <p className="text-sm text-slate-400">
                No supported technical skills identified.
              </p>
            )}

          </div>

        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <Users size={22} />
            </div>

            <h3 className="font-semibold text-slate-900">
              Soft Skills
            </h3>

          </div>

          <div className="flex flex-wrap gap-2">

            {result.softSkills.map((skill, index) => (

              <span
                key={`${skill}-${index}`}
                className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700"
              >
                {skill}
              </span>

            ))}

            {result.softSkills.length === 0 && (
              <p className="text-sm text-slate-400">
                No evidence-supported soft skills identified.
              </p>
            )}

          </div>

        </section>

      </div>

      {/* Strengths and Weaknesses */}
      <div className="grid gap-6 md:grid-cols-2">

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>

            <h3 className="font-semibold text-slate-900">
              Key Strengths
            </h3>

          </div>

          <div className="space-y-4">

            {result.strengths.map((strength, index) => (

              <div
                key={index}
                className="flex items-start gap-3"
              >

                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />

                <p className="text-sm leading-relaxed text-slate-600">
                  {strength}
                </p>

              </div>

            ))}

            {result.strengths.length === 0 && (
              <p className="text-sm text-slate-400">
                No strengths identified.
              </p>
            )}

          </div>

        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <AlertTriangle size={22} />
            </div>

            <h3 className="font-semibold text-slate-900">
              Areas for Improvement
            </h3>

          </div>

          <div className="space-y-4">

            {result.weaknesses.map((weakness, index) => (

              <div
                key={index}
                className="flex items-start gap-3"
              >

                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-500"
                />

                <p className="text-sm leading-relaxed text-slate-600">
                  {weakness}
                </p>

              </div>

            ))}

            {result.weaknesses.length === 0 && (
              <p className="text-sm text-slate-400">
                No weaknesses identified by this analysis.
              </p>
            )}

          </div>

        </section>

      </div>

      {/* Missing Sections */}
      {result.missingSections.length > 0 && (

        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">

          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">

            <AlertTriangle
              size={20}
              className="text-amber-600"
            />

            Missing Resume Sections

          </h3>

          <div className="flex flex-wrap gap-2">

            {result.missingSections.map((section, index) => (

              <span
                key={index}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-700"
              >
                {section}
              </span>

            ))}

          </div>

        </section>

      )}

      {/* Improvement Recommendations */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-3">

          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Target size={22} />
          </div>

          <h3 className="text-lg font-semibold text-slate-900">
            Actionable Recommendations
          </h3>

        </div>

        <div className="space-y-4">

          {[...result.improvementSuggestions]
            .sort((a, b) => {

              const order = {
                high: 0,
                medium: 1,
                low: 2,
              };

              return order[a.priority] - order[b.priority];
            })
            .map((item, index) => (

              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
              >

                <div className="mb-2 flex items-center justify-between gap-3">

                  <h4 className="text-sm font-semibold text-slate-900">
                    {item.section}
                  </h4>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getPriorityStyle(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>

                </div>

                <p className="text-sm leading-relaxed text-slate-600">
                  {item.suggestion}
                </p>

              </div>

            ))}

          {result.improvementSuggestions.length === 0 && (
            <p className="text-sm text-slate-400">
              No additional recommendations available.
            </p>
          )}

        </div>

      </section>

      {/* Recommended Career Roles */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-3">

          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <BriefcaseBusiness size={22} />
          </div>

          <div>

            <h3 className="text-lg font-semibold text-slate-900">
              Recommended Career Roles
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Suggested roles based on your resume evidence.
            </p>

          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {result.recommendedRoles.map((item, index) => (

            <div
              key={index}
              className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
            >

              <BriefcaseBusiness
                size={23}
                className="mb-3 text-indigo-600"
              />

              <h4 className="font-semibold text-slate-900">
                {item.role}
              </h4>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.reason}
              </p>

            </div>

          ))}

          {result.recommendedRoles.length === 0 && (
            <p className="text-sm text-slate-400">
              No career roles recommended.
            </p>
          )}

        </div>

      </section>

      {/* Report Metadata */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

        <p className="text-xs leading-relaxed text-slate-500">
          AI-generated assessment. Review recommendations
          before making career decisions. Visual PDF formatting
          has not been evaluated.
        </p>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">

          <span>
            Prompt version: {analysis.promptVersion}
          </span>

          <span>
            Scoring version: {analysis.scoringVersion}
          </span>

        </div>

      </div>

    </div>
  );
};

export default AnalysisReport;