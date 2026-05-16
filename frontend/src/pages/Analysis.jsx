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

export default function Analysis() {
  const storedData = localStorage.getItem("analysisData");

  // If no analysis data is available
  if (!storedData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <p className="text-2xl font-semibold">
            No analysis data found.
          </p>
        </div>
      </>
    );
  }

  // Parse analysis data from localStorage
  const analysis = JSON.parse(storedData);

  // State for Job Description Matching
  const [jobDescription, setJobDescription] = useState("");
  const [matchScore, setMatchScore] = useState(null);
  const [missingKeywords, setMissingKeywords] = useState([]);

  // Data for score visualization chart
  const chartData = [
    {
      name: "Resume Score",
      score: analysis.score,
    },
  ];

  // Download analysis report as PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.text("Resume Analysis Report", 20, y);

    y += 20;
    doc.setFontSize(14);
    doc.text(`Overall Score: ${analysis.score}/100`, 20, y);

    y += 20;
    doc.text("Strengths:", 20, y);
    y += 10;
    analysis.strengths.forEach((item) => {
      doc.text(`- ${item}`, 25, y);
      y += 8;
    });

    y += 10;
    doc.text("Areas for Improvement:", 20, y);
    y += 10;
    analysis.improvements.forEach((item) => {
      doc.text(`- ${item}`, 25, y);
      y += 8;
    });

    y += 10;
    doc.text("Suggested Skills:", 20, y);
    y += 10;
    analysis.suggestedSkills.forEach((skill) => {
      doc.text(`- ${skill}`, 25, y);
      y += 8;
    });

    if (matchScore !== null) {
      y += 10;
      doc.text(`Job Match Score: ${matchScore}%`, 20, y);
    }

    doc.save("resume-analysis-report.pdf");
  };

  // Calculate Job Description Match Score
  const calculateMatch = () => {
    if (!analysis.extractedText || !jobDescription.trim()) {
      return;
    }

    const resumeText = analysis.extractedText.toLowerCase();

    const jobWords = jobDescription
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);

    const uniqueWords = [...new Set(jobWords)];

    if (uniqueWords.length === 0) {
      return;
    }

    let matched = 0;
    const missing = [];

    uniqueWords.forEach((word) => {
      if (resumeText.includes(word)) {
        matched++;
      } else {
        missing.push(word);
      }
    });

    const score = Math.round(
      (matched / uniqueWords.length) * 100
    );

    setMatchScore(score);
    setMissingKeywords(missing.slice(0, 20));
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          {/* Page Title */}
          <h1 className="text-4xl font-bold text-center mb-8">
            Resume Analysis Report
          </h1>

          {/* Download PDF Button */}
          <div className="text-center mb-6">
            <button
              onClick={downloadPDF}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Download PDF Report
            </button>
          </div>

          {/* Overall Score */}
          <div className="text-center mb-10">
            <p className="text-2xl font-semibold">
              Overall Score
            </p>
            <p className="text-6xl font-bold text-blue-600 mt-2">
              {analysis.score}/100
            </p>
          </div>

          {/* Score Chart */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-center">
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
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4">
              Job Description Matching
            </h2>

            <textarea
              rows="8"
              value={jobDescription}
              onChange={(e) =>
                setJobDescription(e.target.value)
              }
              placeholder="Paste job description here..."
              className="w-full border p-4 rounded-lg mb-4"
            />

            <button
              onClick={calculateMatch}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              Calculate Match Score
            </button>

            {matchScore !== null && (
              <div className="mt-6">
                <p className="text-2xl font-semibold mb-3">
                  Match Score: {matchScore}%
                </p>

                {missingKeywords.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold mb-2">
                      Missing Keywords
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {missingKeywords.map(
                        (word, index) => (
                          <span
                            key={index}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded-full"
                          >
                            {word}
                          </span>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Extracted Resume Text */}
          {analysis.extractedText && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">
                Extracted Resume Text
              </h2>

              <div className="bg-gray-100 p-4 rounded-lg max-h-80 overflow-y-auto whitespace-pre-wrap text-sm">
                {analysis.extractedText}
              </div>
            </div>
          )}

          {/* Strengths */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Strengths
            </h2>

            <ul className="list-disc ml-6 space-y-2">
              {analysis.strengths.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Areas for Improvement
            </h2>

            <ul className="list-disc ml-6 space-y-2">
              {analysis.improvements.map(
                (item, index) => (
                  <li key={index}>{item}</li>
                )
              )}
            </ul>
          </div>

          {/* Suggested Skills */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Suggested Skills
            </h2>

            <div className="flex flex-wrap gap-3">
              {analysis.suggestedSkills.map(
                (skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}