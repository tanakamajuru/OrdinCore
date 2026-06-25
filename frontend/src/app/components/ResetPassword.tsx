import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        }
      );

      if (response.ok) {
        setIsDone(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setError("Network error occurred");
    }
  };

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Password Updated</CardTitle>
              <CardDescription>Your password has been changed successfully</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/login")} className="w-full">
                Return to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <button
              onClick={() => navigate("/login")}
              className="flex w-fit items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
            <CardTitle className="text-3xl text-center">Set a New Password</CardTitle>
            <CardDescription className="text-center">Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="block text-foreground text-sm">New Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters, with a letter and a number"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="block text-foreground text-sm">Confirm New Password</label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                />
              </div>

              <Button type="submit" className="w-full">Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
