import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ForgottenPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to reset password. User may not exist.");
      }
    } catch (err: any) {
      setError("Network error occurred");
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Password Reset Sent</CardTitle>
              <CardDescription>Check your email for reset instructions</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="bg-muted border border-border p-4 mb-6 rounded-md">
                <p className="text-sm text-muted-foreground text-center">
                  Your password has been successfully reset!
                </p>
                <p className="text-foreground font-medium text-center mt-2"> Temporary password: Default123!</p>
              </div>

              <div className="text-sm text-muted-foreground text-center mb-6">
                <p>Please log in with the default password and change your password immediately in account settings.</p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  Return to Login
                </Button>
              </div>
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
              className="flex w-fit items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-2 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
            <CardTitle className="text-3xl text-center">Forgotten Password</CardTitle>
            <CardDescription className="text-center">Enter your email to reset your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-destructive text-sm italic text-center bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-foreground font-medium text-sm">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
              >
                Reset to Default Password
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-primary hover:text-primary/80 transition-colors underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
