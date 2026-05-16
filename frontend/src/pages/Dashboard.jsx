import { useNavigate, Link } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const email = localStorage.getItem("userEmail");

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Dashboard</h1>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>

      <p className="text-lg">
        Welcome, <span className="font-semibold">{email}</span>
      </p>
      <div className="mt-6">
        <Link
          to="/upload"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Upload Resume
        </Link>
      </div>
      <div className="mt-4">
        <Link
          to="/history"
          className="bg-green-600 text-white px-6 py-3 rounded-lg"
        >
          View Analysis History
        </Link>
      </div>
    </div>
  );
}
