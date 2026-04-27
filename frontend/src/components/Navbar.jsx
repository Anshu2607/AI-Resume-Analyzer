import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const isLoggedIn = localStorage.getItem("isLoggedIn");

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/");
  };

  return (
    <nav className="bg-gray-900 text-white px-8 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">AI Resume Analyzer</h1>

      <div className="space-x-6">

        <Link to="/" className="hover:text-blue-400">
          Home
        </Link>

        {!isLoggedIn ? (
          <>
            <Link to="/login" className="hover:text-blue-400">
              Login
            </Link>

            <Link to="/register" className="hover:text-blue-400">
              Register
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className="hover:text-blue-400">
              Dashboard
            </Link>

            <button
              onClick={handleLogout}
              className="hover:text-red-400"
            >
              Logout
            </button>
          </>
        )}

      </div>
    </nav>
  );
}