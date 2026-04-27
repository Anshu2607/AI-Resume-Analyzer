import Navbar from "../components/Navbar";

export default function Upload() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-2xl text-center">

          <h1 className="text-4xl font-bold mb-4">
            Upload Your Resume
          </h1>

          <p className="text-gray-600 mb-8">
            Upload PDF file to analyze ATS score and suggestions
          </p>

          <div className="border-2 border-dashed border-blue-400 rounded-2xl p-12 bg-blue-50 mb-6">
            <p className="text-lg text-gray-700">
              Drag & Drop Resume Here
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Supported Format: PDF
            </p>
          </div>

          <input
            type="file"
            accept=".pdf"
            className="mb-6"
          />

          <br />

          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">
            Upload Resume
          </button>

        </div>
      </div>
    </>
  );
}