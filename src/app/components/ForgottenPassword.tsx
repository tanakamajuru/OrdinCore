import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

export function ForgottenPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    // Simulate password reset request
    console.log("Password reset requested for:", email);
    setIsSubmitted(true);
    setError("");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white border-2 border-black p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-black mb-2">Password Reset Sent</h1>
              <p className="text-gray-600">Check your email for reset instructions</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-300 p-4 mb-6">
              <p className="text-sm text-gray-600 text-center">
                We've sent password reset instructions to:
              </p>
              <p className="text-black font-medium text-center mt-2">{email}</p>
            </div>

            <div className="text-sm text-gray-600 text-center mb-6">
              <p>If you don't receive the email within a few minutes, please check your spam folder.</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
              >
                Return to Login
              </button>
              
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Try Different Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-black p-8">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-black mb-2">Forgotten Password</h1>
            <p className="text-gray-600">Enter your email to reset your password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-black text-sm italic text-center bg-red-50 border-2 border-red-200 p-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block mb-2 text-black font-medium">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                placeholder="Enter your work email"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
            >
              Send Reset Instructions
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-black hover:text-gray-600 transition-colors underline font-medium"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
