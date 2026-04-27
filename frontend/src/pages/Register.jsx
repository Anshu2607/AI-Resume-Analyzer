import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (!email.includes("@")) {
      setError("Enter valid email");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    navigate("/login");
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
          <h1 className="text-3xl font-bold text-center mb-6">Register</h1>

          {error && (
            <p className="text-red-500 mb-4 text-sm">{error}</p>
          )}

          <input
            type="text"
            placeholder="Enter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-3 rounded-lg mb-4"
          />

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded-lg mb-4"
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded-lg mb-4"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border p-3 rounded-lg mb-4"
          />

          <button
            onClick={handleRegister}
            className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700"
          >
            Register
          </button>
        </div>
      </div>
    </>
  );
}