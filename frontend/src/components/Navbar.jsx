import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn =
    localStorage.getItem("isLoggedIn") === "true";

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("analysisData");
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold text-blue-600"
        >
          AI Resume Analyzer
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Dashboard
              </Link>

              <Link
                to="/history"
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                History
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}