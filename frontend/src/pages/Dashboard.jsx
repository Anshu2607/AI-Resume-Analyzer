import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import {
  Upload,
  History,
  Briefcase,
  FileText,
} from "lucide-react";

const stats = [
  {
    title: "Resume Score",
    value: "85/100",
    color: "text-blue-600",
  },
  {
    title: "Job Match",
    value: "78%",
    color: "text-purple-600",
  },
  {
    title: "Analyses",
    value: "12",
    color: "text-green-600",
  },
];

const actions = [
  {
    title: "Upload Resume",
    description:
      "Upload your latest resume for analysis.",
    icon: Upload,
    link: "/upload",
    color: "bg-blue-600",
  },
  {
    title: "Analysis History",
    description:
      "View all previous resume analyses.",
    icon: History,
    link: "/history",
    color: "bg-green-600",
  },
  {
    title: "Interview Preparation",
    description:
      "Practice role-based interview questions.",
    icon: Briefcase,
    link: "/interview-prep",
    color: "bg-purple-600",
  },
  {
    title: "Latest Report",
    description:
      "View your most recent analysis report.",
    icon: FileText,
    link: "/analysis",
    color: "bg-orange-600",
  },
];

export default function Dashboard() {
  const userEmail =
    localStorage.getItem("userEmail") ||
    "user@example.com";

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-3xl shadow-lg mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Welcome Back
            </h1>
            <p className="text-blue-100">
              {userEmail}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl shadow-md"
              >
                <p className="text-gray-500 mb-2">
                  {stat.title}
                </p>
                <p
                  className={`text-3xl font-bold ${stat.color}`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {actions.map((action, index) => {
              const Icon = action.icon;

              return (
                <Link
                  key={index}
                  to={action.link}
                  className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition"
                >
                  <div
                    className={`w-12 h-12 ${action.color} text-white rounded-xl flex items-center justify-center mb-4`}
                  >
                    <Icon size={24} />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    {action.title}
                  </h3>

                  <p className="text-gray-600 text-sm">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}