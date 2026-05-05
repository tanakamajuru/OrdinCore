import { useState } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useNavigate } from "react-router";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import logo from "./images/logo.png";

function PasswordInput({ id, value, onChange, disabled }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 pr-12 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        required
        disabled={disabled}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-7 0-1.06.417-2.054 1.108-2.917M6.343 6.343A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 7a9.97 9.97 0 01-2.343 5.657M3 3l18 18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handle = useFullScreenHandle();
  const { login } = useAuth();

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
      await login(email, password);
      
      // Get role from localStorage since login() sets it there
      const role = (localStorage.getItem('userRole') || '').toUpperCase();
      if (role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (role === 'ADMIN') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FullScreen handle={handle}>
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <div className="bg-card border-2 border-border p-8 shadow-md">
            <div className="text-center mb-2 flex flex-col items-center">
              <img src={logo} alt="Logo" className="w-55 h-55 mb-1 mx-auto" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              {error && (
                <div className="text-destructive text-sm  text-center">{error}</div>
              )}

              <div>
                <label htmlFor="email" className="block mb-2 text-foreground ">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  required
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="password" className="block mb-2 text-foreground ">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors  disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/forgotten-password")}
                  className="text-primary hover:text-primary/70 transition-colors underline"
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
