import Navbar from "../components/Navbar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume } from "../services/authService";

export default function Upload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      // Send file to backend
      const response = await uploadResume(file);

      // Show backend success message
      setMessage(response.message);

      // Save complete analysis response for Analysis page
      localStorage.setItem(
        "analysisData",
        JSON.stringify(response)
      );

      // Redirect to analysis page after 1.5 seconds
      setTimeout(() => {
        navigate("/analysis");
      }, 1500);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Upload failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg">
          <h1 className="text-3xl font-bold text-center mb-6">
            Upload Resume
          </h1>

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="w-full mb-4"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>

          {message && (
            <p className="mt-4 text-center text-blue-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
}