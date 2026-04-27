import Navbar from "../components/Navbar";

export default function Analysis() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">

        <h1 className="text-4xl font-bold mb-8 text-center">
          Resume Analysis Report
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <div className="bg-white p-6 rounded-2xl shadow-md text-center">
            <h2 className="text-xl font-semibold">ATS Score</h2>
            <p className="text-4xl text-blue-600 mt-4">84%</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md text-center">
            <h2 className="text-xl font-semibold">Grammar Score</h2>
            <p className="text-4xl text-green-600 mt-4">91%</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md text-center">
            <h2 className="text-xl font-semibold">Keyword Match</h2>
            <p className="text-4xl text-purple-600 mt-4">76%</p>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold mb-4">Suggestions</h2>

            <ul className="space-y-3 text-gray-700">
              <li>✔ Add more project achievements</li>
              <li>✔ Improve action verbs in experience section</li>
              <li>✔ Include measurable impact numbers</li>
              <li>✔ Add relevant certifications</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold mb-4">Matched Skills</h2>

            <div className="flex flex-wrap gap-3">
              <span className="bg-blue-100 px-4 py-2 rounded-full">React</span>
              <span className="bg-green-100 px-4 py-2 rounded-full">Java</span>
              <span className="bg-purple-100 px-4 py-2 rounded-full">SQL</span>
              <span className="bg-yellow-100 px-4 py-2 rounded-full">Git</span>
              <span className="bg-pink-100 px-4 py-2 rounded-full">Spring Boot</span>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}