import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <section className="min-h-screen bg-gray-100 flex flex-col justify-center items-center text-center px-6">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Smart Resume Analysis Powered by AI
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Upload your resume and get instant feedback.
        </p>

        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg">
          Get Started
        </button>
      </section>
    </>
  );
}