import Navbar from "../components/Navbar";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 flex">
        
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white p-6">
          <h2 className="text-2xl font-bold mb-8">Dashboard</h2>

          <ul className="space-y-4">
            <li className="hover:text-blue-400 cursor-pointer">Overview</li>
            <li className="hover:text-blue-400 cursor-pointer">Upload Resume</li>
            <li className="hover:text-blue-400 cursor-pointer">Analysis</li>
            <li className="hover:text-blue-400 cursor-pointer">Interview Prep</li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <h1 className="text-4xl font-bold mb-8">
            Welcome Back 👋
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-xl font-semibold">Resumes Uploaded</h3>
              <p className="text-3xl mt-3 text-blue-600">12</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-xl font-semibold">Average ATS Score</h3>
              <p className="text-3xl mt-3 text-green-600">84%</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="text-xl font-semibold">Interviews Practiced</h3>
              <p className="text-3xl mt-3 text-purple-600">7</p>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}