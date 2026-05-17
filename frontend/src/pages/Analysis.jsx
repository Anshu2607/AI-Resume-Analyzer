import Navbar from "../components/Navbar";
import { useState } from "react";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Briefcase,
} from "lucide-react";

export default function Analysis() {
  const storedData = localStorage.getItem("analysisData");

  if (!storedData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <p className="text-2xl font-semibold">
              No analysis data found.
            </p>
          </div>
        </div>
      </>
    );
  }

  const analysis = JSON.parse(storedData);

  const [jobDescription, setJobDescription] =
    useState("");
  const [matchScore, setMatchScore] = useState(null);
  const [missingKeywords, setMissingKeywords] =
    useState([]);

  const chartData = [
    {
      name: "Resume Score",
      score: analysis.score,
    },
  ];

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.text("Resume Analysis Report", 20, y);

    y += 20;
    doc.setFontSize(14);
    doc.text(`Overall Score: ${analysis.score}/100`, 20, y);

    doc.save("resume-analysis-report.pdf");
  };

  const calculateMatch = () => {
    if (
      !analysis.extractedText ||
      !jobDescription.trim()
    ) {
      return;
    }

    const resumeText =
      analysis.extractedText.toLowerCase();

    const jobWords = jobDescription
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);

    const uniqueWords = [...new Set(jobWords)];

    let matched = 0;
    const missing = [];

    uniqueWords.forEach((word) => {
      if (resumeText.includes(word)) {
        matched++;
      } else {
        missing.push(word);
      }
    });

    const score =
      uniqueWords.length > 0
        ? Math.round(
            (matched / uniqueWords.length) * 100
          )
        : 0;

    setMatchScore(score);
    setMissingKeywords(missing.slice(0, 20));
  };

  const SectionCard = ({
    title,
    icon: Icon,
    iconClass,
    items,
  }) => (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={iconClass} size={24} />
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-gray-700"
          >
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-3xl shadow-lg mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Resume Analysis Report
                </h1>
                <p className="text-blue-100">
                  Detailed ATS insights and recommendations.
                </p>
              </div>

              <div className="text-center">
                <p className="text-blue-100 text-sm">
                  Overall Score
                </p>
                <p className="text-5xl font-bold">
                  {analysis.score}/100
                </p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="mb-6">
            <button
              onClick={downloadPDF}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition"
            >
              <Download size={20} />
              Download PDF Report
            </button>
          </div>

          {/* Score Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Score Visualization
            </h2>

            <div className="w-full h-80">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Job Description Matching */}
          <div className="bg-white p-6 rounded-2xl shadow-md mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase
                className="text-purple-600"
                size={24}
              />
              <h2 className="text-2xl font-bold">
                Job Description Matching
              </h2>
            </div>

            <textarea
              rows="8"
              value={jobDescription}
              onChange={(e) =>
                setJobDescription(e.target.value)
              }
              placeholder="Paste job description here..."
              className="w-full border rounded-xl p-4 mb-4"
            />

            <button
              onClick={calculateMatch}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition"
            >
              Calculate Match Score
            </button>

            {matchScore !== null && (
              <div className="mt-6">
                <p className="text-2xl font-semibold mb-3">
                  Match Score: {matchScore}%
                </p>

                {missingKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {missingKeywords.map(
                      (word, index) => (
                        <span
                          key={index}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm"
                        >
                          {word}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Strengths / Improvements / Skills */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <SectionCard
              title="Strengths"
              icon={CheckCircle2}
              iconClass="text-green-600"
              items={analysis.strengths}
            />

            <SectionCard
              title="Improvements"
              icon={AlertTriangle}
              iconClass="text-yellow-600"
              items={analysis.improvements}
            />

            <SectionCard
              title="Suggested Skills"
              icon={Lightbulb}
              iconClass="text-blue-600"
              items={analysis.suggestedSkills}
            />
          </div>

          {/* Extracted Text */}
          {analysis.extractedText && (
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h2 className="text-2xl font-bold mb-4">
                Extracted Resume Text
              </h2>

              <div className="bg-gray-50 p-4 rounded-xl max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
                {analysis.extractedText}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}