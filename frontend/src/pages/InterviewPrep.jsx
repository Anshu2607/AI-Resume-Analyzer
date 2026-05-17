import Navbar from "../components/Navbar";
import { useEffect, useMemo, useState } from "react";
import { interviewQuestions } from "../data/interviewQuestions";
import {
  Briefcase,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function InterviewPrep() {
  const roles = Object.keys(interviewQuestions);

  const [selectedRole, setSelectedRole] = useState(
    roles[0] || ""
  );
  const [selectedCategory, setSelectedCategory] =
    useState("technical");
  const [searchTerm, setSearchTerm] = useState("");
  const [completedQuestions, setCompletedQuestions] =
    useState([]);

  const categories = [
    { key: "technical", label: "Technical" },
    { key: "hr", label: "HR" },
    { key: "coding", label: "Coding" },
  ];

  const storageKey = `interview-progress-${selectedRole}-${selectedCategory}`;

  useEffect(() => {
    const saved =
      JSON.parse(localStorage.getItem(storageKey)) || [];
    setCompletedQuestions(saved);
  }, [storageKey]);

  const questions = useMemo(() => {
    if (!selectedRole) return [];

    const roleData = interviewQuestions[selectedRole];
    const list = roleData?.[selectedCategory] || [];

    if (!searchTerm.trim()) return list;

    return list.filter((question) =>
      question
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [
    selectedRole,
    selectedCategory,
    searchTerm,
  ]);

  const totalQuestions =
    questions.length;

  const completedCount =
    completedQuestions.length;

  const progress =
    totalQuestions > 0
      ? Math.round(
          (completedCount / totalQuestions) * 100
        )
      : 0;

  const toggleQuestion = (question) => {
    let updated;

    if (completedQuestions.includes(question)) {
      updated = completedQuestions.filter(
        (q) => q !== question
      );
    } else {
      updated = [...completedQuestions, question];
    }

    setCompletedQuestions(updated);
    localStorage.setItem(
      storageKey,
      JSON.stringify(updated)
    );
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8 rounded-3xl shadow-lg mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase size={32} />
              <h1 className="text-4xl font-bold">
                Interview Preparation
              </h1>
            </div>

            <p className="text-purple-100">
              Practice role-based interview questions and track your progress.
            </p>
          </div>

          {/* Role Selection */}
          <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Select Role
            </label>

            <select
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg p-3"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-3 mb-6">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() =>
                  setSelectedCategory(category.key)
                }
                className={`px-5 py-2 rounded-full font-medium transition ${
                  selectedCategory === category.key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-2xl shadow-md mb-6">
            <div className="flex items-center gap-3">
              <Search
                className="text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-medium">
                Progress
              </span>
              <span className="text-sm text-gray-500">
                {completedCount}/{totalQuestions}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-gray-500 mt-2">
              {progress}% completed
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-md text-center text-gray-500">
                No questions found.
              </div>
            ) : (
              questions.map((question, index) => {
                const completed =
                  completedQuestions.includes(
                    question
                  );

                return (
                  <div
                    key={index}
                    className={`bg-white p-6 rounded-2xl shadow-md border-2 transition ${
                      completed
                        ? "border-green-500"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() =>
                          toggleQuestion(question)
                        }
                        className={`mt-1 ${
                          completed
                            ? "text-green-600"
                            : "text-gray-300"
                        }`}
                      >
                        <CheckCircle2 size={24} />
                      </button>

                      <div>
                        <p className="text-gray-800 font-medium leading-relaxed">
                          {question}
                        </p>

                        {completed && (
                          <p className="text-sm text-green-600 mt-2">
                            Completed
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}