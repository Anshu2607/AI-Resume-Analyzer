import Navbar from "../components/Navbar";

export default function Register() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
          <h1 className="text-3xl font-bold text-center mb-6">Register</h1>

          <input
            type="text"
            placeholder="Enter Name"
            className="w-full border p-3 rounded-lg mb-4"
          />

          <input
            type="email"
            placeholder="Enter Email"
            className="w-full border p-3 rounded-lg mb-4"
          />

          <input
            type="password"
            placeholder="Enter Password"
            className="w-full border p-3 rounded-lg mb-4"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full border p-3 rounded-lg mb-4"
          />

          <button className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700">
            Register
          </button>
        </div>
      </div>
    </>
  );
}