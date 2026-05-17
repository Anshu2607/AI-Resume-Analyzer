import Navbar from "../components/Navbar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileText } from "lucide-react";
import { uploadResume } from "../services/authService";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a PDF file.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const data = await uploadResume(file);

      localStorage.setItem(
        "analysisData",
        JSON.stringify(data)
      );

      setMessage("Resume uploaded successfully.");

      setTimeout(() => {
        navigate("/analysis");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <UploadCloud size={40} />
            </div>

            <h1 className="text-4xl font-bold mb-2">
              Upload Your Resume
            </h1>

            <p className="text-gray-500">
              Upload a PDF resume to receive ATS analysis and feedback.
            </p>
          </div>

          {/* Upload Area */}
          <label className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
            <FileText
              size={40}
              className="text-gray-400 mb-3"
            />

            <span className="text-gray-600 font-medium">
              Click to select a PDF file
            </span>

            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) =>
                setFile(e.target.files[0])
              }
            />
          </label>

          {/* Selected File */}
          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                Selected File:
              </p>
              <p className="font-medium">{file.name}</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading
              ? "Analyzing Resume..."
              : "Upload and Analyze"}
          </button>

          {/* Message */}
          {message && (
            <p className="text-center mt-4 text-sm text-gray-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
}