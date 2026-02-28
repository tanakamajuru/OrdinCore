import { useState } from "react";
import { useNavigate } from "react-router";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple validation for demo
    if (email && password) {
      navigate("/dashboard");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-black p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-black mb-2">CareSignal</h1>
            <p className="text-gray-600">Secure Governance Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-red-600 text-sm italic text-center">{error}</div>
            )}

            <div>
              <label htmlFor="email" className="block mb-2 text-black font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2 text-black font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
            >
              Login
            </button>

            <div className="text-center">
              <button
                type="button"
                className="text-black hover:text-gray-600 transition-colors underline"
              >
                Forgotten Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
