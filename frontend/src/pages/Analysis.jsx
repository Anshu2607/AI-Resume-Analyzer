import Navbar from "../components/Navbar";

export default function Analysis() {
  const storedData = localStorage.getItem("analysisData");

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

  const analysis = JSON.parse(storedData);

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-4xl font-bold text-center mb-8">
            Resume Analysis Report
          </h1>

          {/* Score Section */}
          <div className="text-center mb-10">
            <p className="text-2xl font-semibold">Overall Score</p>
            <p className="text-6xl font-bold text-blue-600 mt-2">
              {analysis.score}/100
            </p>
          </div>

          {/* Extracted Text */}
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

          {/* Improvements */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Areas for Improvement
            </h2>
            <ul className="list-disc ml-6 space-y-2">
              {analysis.improvements.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Suggested Skills */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Suggested Skills
            </h2>
            <div className="flex flex-wrap gap-3">
              {analysis.suggestedSkills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}