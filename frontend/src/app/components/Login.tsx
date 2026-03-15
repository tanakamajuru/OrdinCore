import { useState } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useNavigate } from "react-router";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handle = useFullScreenHandle();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handle.enter();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store authentication data
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userRole', data.user.role);
        
        // Route based on user role
        if (data.user.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FullScreen handle={handle}>
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/forgotten-password")}
                className="text-black hover:text-gray-600 transition-colors underline"
              >
                Forgotten Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </FullScreen>
  );
}
