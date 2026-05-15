import Navbar from "../components/Navbar";
import { useState } from "react";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setMessage(`File "${file.name}" uploaded successfully.`);
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
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            Upload
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