import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { getAnalysisHistory } from "../services/authService";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getAnalysisHistory();
        setHistory(data);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-4xl font-bold text-center mb-8">
            Analysis History
          </h1>

          {loading ? (
            <p className="text-center">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-center">No analysis records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3">ID</th>
                    <th className="border p-3">File Name</th>
                    <th className="border p-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-3">{item.id}</td>
                      <td className="border p-3">
                        {item.fileName}
                      </td>
                      <td className="border p-3">
                        {item.score}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}