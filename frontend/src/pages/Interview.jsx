import Navbar from "../components/Navbar";

export default function Interview() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">

        <h1 className="text-4xl font-bold text-center mb-8">
          Interview Preparation
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">
              HR Questions
            </h2>

            <ul className="space-y-3 text-gray-700">
              <li>Tell me about yourself.</li>
              <li>Why should we hire you?</li>
              <li>What are your strengths?</li>
              <li>Where do you see yourself in 5 years?</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-green-600">
              Technical Questions
            </h2>

            <ul className="space-y-3 text-gray-700">
              <li>Explain React Virtual DOM.</li>
              <li>What is Spring Boot?</li>
              <li>Difference between SQL and NoSQL?</li>
              <li>What is JWT Authentication?</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-purple-600">
              DSA Questions
            </h2>

            <ul className="space-y-3 text-gray-700">
              <li>Reverse Linked List</li>
              <li>Two Sum Problem</li>
              <li>Detect Cycle in Graph</li>
              <li>Binary Search Variations</li>
            </ul>
          </div>

        </div>

      </div>
    </>
  );
}