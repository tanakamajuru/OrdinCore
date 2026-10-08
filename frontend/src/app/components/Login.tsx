import { useState, useEffect } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useNavigate, Navigate } from "react-router";

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
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const handle = useFullScreenHandle();

  // If the session was ended by the API (e.g. account/organisation deactivated),
  // show the reason instead of a silent, confusing redirect.
  useEffect(() => {
    try {
      const reason = sessionStorage.getItem('logoutReason');
      if (reason) { setError(reason); sessionStorage.removeItem('logoutReason'); }
    } catch { /* ignore */ }
  }, []);
  const { login, verifyMfa, isAuthenticated } = useAuth();

  // Where to go once fully authenticated (password + any MFA). Honours password expiry and the
  // mandatory-MFA-enrolment gate before the normal role home.
  const routeAfterAuth = () => {
    if (localStorage.getItem('passwordExpired')) { navigate('/profile?expired=1'); return; }
    if (localStorage.getItem('mfaEnrolmentRequired')) { navigate('/mfa-setup'); return; }
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace(/-/g, '_');
    if (role === 'SUPER_ADMIN') navigate('/super-admin');
    else if (role === 'ADMIN') navigate('/admin-dashboard');
    else if (['REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'TEAM_LEADER'].includes(role)) navigate('/my-work');
    else navigate('/dashboard');
  };

  // An already-authenticated user must never see the login form. Browser/in-app "Back" can land on
  // /login while a valid session is still held — which LOOKED like being logged out (field report).
  // Redirect them to their role home instead; the session is untouched.
  if (isAuthenticated) {
    const role = (localStorage.getItem('userRole') || '').toUpperCase().replace(/-/g, '_');
    const home = role === 'SUPER_ADMIN' ? '/super-admin'
      : role === 'ADMIN' ? '/admin-dashboard'
      : ['REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'TEAM_LEADER'].includes(role) ? '/my-work'
      : '/dashboard';
    return <Navigate to={home} replace />;
  }

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
      const res = await login(email, password);
      // Second factor required — switch to the code-entry step; the session isn't established yet.
      if (res.mfaRequired && res.mfaChallenge) {
        setMfaChallenge(res.mfaChallenge);
        setIsLoading(false);
        return;
      }
      routeAfterAuth();
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    if (mfaCode.trim().length < 6) { setError("Enter the 6-digit code from your authenticator app (or a recovery code)."); return; }
    setIsLoading(true);
    setError("");
    try {
      await verifyMfa(mfaChallenge, mfaCode.trim());
      routeAfterAuth();
    } catch (err: any) {
      setError(err.message || "That code is not valid. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FullScreen handle={handle}>
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <div className="bg-card border-2 border-border p-8 shadow-md">
            <div className="text-center mb-4 flex flex-col items-center">
              <img src={logo} alt="OrdinCore" className="w-55 h-55 mb-1 mx-auto" />
              {/* Same brand line as the mobile app login. */}
              <h1 className="text-lg font-bold text-primary text-center tracking-tight">Governance. Oversight. Assurance. Every Day.</h1>
            </div>

            {mfaChallenge && (
              <form onSubmit={handleMfaSubmit} className="space-y-6" autoComplete="off">
                {error && <div className="text-destructive text-sm text-center">{error}</div>}
                <div>
                  <h2 className="text-foreground font-semibold mb-1">Two-factor authentication</h2>
                  <p className="text-sm text-muted-foreground mb-3">Enter the 6-digit code from your authenticator app. If you can't access it, enter one of your recovery codes.</p>
                  <input
                    id="mfaCode"
                    inputMode="numeric"
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground tracking-widest text-center text-lg"
                    autoComplete="one-time-code"
                  />
                </div>
                <button type="submit" className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify"}
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => { setMfaChallenge(null); setMfaCode(""); setError(""); }} className="text-primary hover:text-primary/70 transition-colors underline text-sm">
                    Back to sign in
                  </button>
                </div>
              </form>
            )}

            {!mfaChallenge && (
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
            )}
          </div>
        </div>
      </div>
    </FullScreen>
  );
}
