import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import {
  getAnalysisHistory,
  deleteAnalysis,
} from "../services/authService";
import {
  History as HistoryIcon,
  Search,
  Trash2,
} from "lucide-react";

export default function History() {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] =
    useState([]);
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
      console.error(error);
      alert("Failed to delete analysis.");
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 rounded-3xl shadow-lg mb-8">
            <div className="flex items-center gap-3 mb-3">
              <HistoryIcon size={32} />
              <h1 className="text-4xl font-bold">
                Analysis History
              </h1>
            </div>
            <p className="text-green-100">
              View, search, and manage your previous resume analyses.
            </p>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-md flex items-center gap-3">
              <Search
                size={20}
                className="text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by file name..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="w-full outline-none"
              />
            </div>

            <input
              type="number"
              placeholder="Minimum score"
              value={minScore}
              onChange={(e) =>
                setMinScore(e.target.value)
              }
              className="bg-white p-4 rounded-2xl shadow-md outline-none"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white p-8 rounded-2xl shadow-md text-center">
              Loading...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-md text-center text-gray-500">
              No analysis records found.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-4">
                        ID
                      </th>
                      <th className="text-left p-4">
                        File Name
                      </th>
                      <th className="text-left p-4">
                        Score
                      </th>
                      <th className="text-center p-4">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t"
                      >
                        <td className="p-4">
                          {item.id}
                        </td>
                        <td className="p-4 font-medium">
                          {item.fileName}
                        </td>
                        <td className="p-4">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {item.score}/100
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() =>
                              handleDelete(item.id)
                            }
                            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}