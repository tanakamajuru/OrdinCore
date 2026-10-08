import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/services/api";

// MFA (TOTP) enrolment: scan the QR in an authenticator app, confirm a code, then save the one-time
// recovery codes. Shown when the account requires MFA but has not enrolled (login flag / 403 gate).
export function MfaSetup() {
  const navigate = useNavigate();
  const [qr, setQr] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    apiClient.mfaEnrol()
      .then((r: any) => { setQr(r?.data?.qrDataUrl || null); setManualKey(r?.data?.manualKey || ""); })
      .catch((e: any) => setError(e?.message || "Could not start MFA setup."));
  }, []);

  const routeHome = () => {
    const role = (localStorage.getItem("userRole") || "").toUpperCase().replace(/-/g, "_");
    localStorage.removeItem("mfaEnrolmentRequired");
    if (role === "SUPER_ADMIN") navigate("/super-admin");
    else if (role === "ADMIN") navigate("/admin-dashboard");
    else if (["REGISTERED_MANAGER", "DIRECTOR", "RESPONSIBLE_INDIVIDUAL", "TEAM_LEADER"].includes(role)) navigate("/my-work");
    else navigate("/dashboard");
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) { setError("Enter the 6-digit code shown in your authenticator app."); return; }
    setBusy(true); setError("");
    try {
      const r: any = await apiClient.mfaConfirm(code.trim());
      setRecoveryCodes(r?.data?.recoveryCodes || []);
    } catch (err: any) {
      setError(err?.message || "That code is not valid. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border-2 border-border p-8 shadow-md">
        {!recoveryCodes ? (
          <>
            <h1 className="text-lg font-bold text-primary mb-1">Set up two-factor authentication</h1>
            <p className="text-sm text-muted-foreground mb-4">Your account requires MFA. Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy), then enter the 6-digit code it shows.</p>
            {error && <div className="text-destructive text-sm text-center mb-3">{error}</div>}
            {qr ? (
              <div className="flex flex-col items-center mb-4">
                <img src={qr} alt="MFA QR code" className="w-48 h-48 border border-border" />
                {manualKey && <p className="text-xs text-muted-foreground mt-2">Or enter this key manually: <span className="font-mono text-foreground">{manualKey}</span></p>}
              </div>
            ) : <p className="text-sm text-muted-foreground mb-4">Preparing your secure code…</p>}
            <form onSubmit={confirm} className="space-y-4">
              <input inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
                className="w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground tracking-widest text-center text-lg" autoComplete="one-time-code" />
              <button type="submit" disabled={busy || !qr} className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {busy ? "Verifying…" : "Verify and enable"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-primary mb-1">Save your recovery codes</h1>
            <p className="text-sm text-muted-foreground mb-3">MFA is now enabled. Store these one-time recovery codes somewhere safe — each works once if you lose access to your authenticator. They will not be shown again.</p>
            <div className="grid grid-cols-2 gap-2 bg-muted/40 border border-border rounded-lg p-3 mb-4 font-mono text-sm text-foreground">
              {recoveryCodes.map((c) => <div key={c} className="text-center">{c}</div>)}
            </div>
            <button onClick={routeHome} className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              I've saved my recovery codes — continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MfaSetup;
