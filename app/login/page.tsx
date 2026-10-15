"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDataSource } from "@/lib/data/provider";
import { SAMPLE_EMAIL } from "@/lib/data/seed";

export default function LoginPage() {
  const ds = useDataSource();
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(ds.mode === "sample" ? SAMPLE_EMAIL : "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ds.getSession().then((s) => s && router.replace("/"));
  }, [ds, router]);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await ds.requestLoginCode(email.trim().toLowerCase());
    setBusy(false);
    if (res.ok) setStep("code");
    else setError(res.reason);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await ds.verifyLoginCode(email.trim().toLowerCase(), code);
    setBusy(false);
    if (res.ok) router.replace("/");
    else setError(res.reason);
  }

  return (
    <main className="auth">
      <section className="auth__brand">
        <div>
          <span className="sidebar__logo">BTM</span>
          <span className="sidebar__sublogo">MEMBERS PORTAL</span>
        </div>
        <div>
          <span className="eyebrow eyebrow--taupe">Private member access</span>
          <h1 style={{ marginTop: 18 }}>Strategy. Systems. Real growth.</h1>
          <p style={{ marginTop: 18, maxWidth: 460, color: "#d9d5ce", fontSize: 13 }}>
            Your support plan, priorities, check-ins and conversations with Bree and the BTM team, all in one place.
          </p>
        </div>
        <span className="small" style={{ color: "#858585" }}>
          Beauty Training Mastery · Business Advisory &amp; Support
        </span>
      </section>

      <section className="auth__form">
        <div className="auth__card">
          <span className="eyebrow">Welcome back</span>
          <h2 style={{ marginTop: 10, fontSize: 40 }}>{step === "email" ? "Sign in to your portal." : "Check your email."}</h2>
          <p className="muted" style={{ marginTop: 12 }}>
            {step === "email"
              ? "Use the email address connected to your BTM membership. We'll send you a secure one-time code."
              : `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
          </p>

          {step === "email" ? (
            <form className="form" style={{ marginTop: 26 }} onSubmit={sendCode}>
              <label className="field">
                <span>Email</span>
                <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {error && <div className="form-error">{error}</div>}
              <button className="btn btn--block" disabled={busy}>
                {busy ? "Sending…" : "Send my code"}
              </button>
            </form>
          ) : (
            <form className="form" style={{ marginTop: 26 }} onSubmit={verify}>
              <label className="field">
                <span>6-digit code</span>
                <input
                  className="input code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              {ds.mode === "sample" && <div className="form-ok">Sample mode: use code 123456.</div>}
              {error && <div className="form-error">{error}</div>}
              <button className="btn btn--block" disabled={busy || code.length !== 6}>
                {busy ? "Checking…" : "Open my portal"}
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
                Use a different email
              </button>
            </form>
          )}

          <p className="small muted" style={{ marginTop: 26 }}>
            Not a member yet?{" "}
            <a className="link-arrow" href="https://beautytrainingmastery.com/pages/business-advisory-support">
              Choose your plan
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
