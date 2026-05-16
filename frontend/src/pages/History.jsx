import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import {
  getAnalysisHistory,
  deleteAnalysis,
} from "../services/authService";

export default function History() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getAnalysisHistory();
      setHistory(data);
      setFilteredHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = history;

    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.fileName
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    if (minScore !== "") {
      filtered = filtered.filter(
        (item) => item.score >= Number(minScore)
      );
    }

    setFilteredHistory(filtered);
  }, [searchTerm, minScore, history]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this analysis?"
    );

    if (!confirmed) return;

    try {
      await deleteAnalysis(id);
      fetchHistory();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete analysis.");
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-4xl font-bold text-center mb-8">
            Analysis History
          </h1>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by file name"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="border p-3 rounded-lg"
            />

            <input
              type="number"
              placeholder="Minimum score"
              value={minScore}
              onChange={(e) =>
                setMinScore(e.target.value)
              }
              className="border p-3 rounded-lg"
            />
          </div>

          {loading ? (
            <p className="text-center">Loading...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-center">
              No analysis records found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-3">ID</th>
                    <th className="border p-3">
                      File Name
                    </th>
                    <th className="border p-3">
                      Score
                    </th>
                    <th className="border p-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-3">
                        {item.id}
                      </td>
                      <td className="border p-3">
                        {item.fileName}
                      </td>
                      <td className="border p-3">
                        {item.score}/100
                      </td>
                      <td className="border p-3 text-center">
                        <button
                          onClick={() =>
                            handleDelete(item.id)
                          }
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
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