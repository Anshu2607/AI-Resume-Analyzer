import Navbar from "../components/Navbar";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await loginUser(formData);

      setMessage(response.message);

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", formData.email);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
          <h1 className="text-3xl font-bold text-center mb-6">
            Login
          </h1>

          {message && (
            <p className="text-blue-600 mb-4 text-sm text-center">
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Enter Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg mb-4"
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg mb-4"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-center">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600">
              Register
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}