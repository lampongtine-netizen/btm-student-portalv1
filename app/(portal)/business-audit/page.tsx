"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePortal } from "@/components/PortalShell";
import { ErrorBox, Loading, PageHead, useToast } from "@/components/ui";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import type { AuditDraft } from "@/lib/data/source";
import { formatDate } from "@/lib/format";

const EMPTY: AuditDraft = {
  timeInBusiness: "",
  avgMonthlyRevenue: "",
  monthlyRevenueGoal: "",
  teamSize: "",
  monthlyBookings: "",
  mainServices: "",
  workingWell: "",
  biggestChallenge: "",
  timeDrain: "",
  growthOpportunity: "",
  ninetyDayGoal: "",
  supportNeeded: "",
};

const SNAPSHOT: { key: keyof AuditDraft; label: string; required?: boolean; hint?: string }[] = [
  { key: "timeInBusiness", label: "Time in business" },
  { key: "avgMonthlyRevenue", label: "Average monthly revenue", required: true, hint: "AUD, estimate is fine" },
  { key: "monthlyRevenueGoal", label: "Monthly revenue goal", required: true },
  { key: "teamSize", label: "Team size" },
  { key: "monthlyBookings", label: "Monthly bookings" },
  { key: "mainServices", label: "Main services / offers", required: true },
];
const QUESTIONS: { key: keyof AuditDraft; label: string; hint: string; required?: boolean }[] = [
  { key: "workingWell", label: "What is working well right now?", hint: "Think clients, revenue, marketing, team, offers or systems.", required: true },
  { key: "biggestChallenge", label: "What is your biggest challenge?", hint: "What is currently stopping the business from moving forward?", required: true },
  { key: "timeDrain", label: "What is taking too much of your time?", hint: "What still relies too heavily on you?" },
  { key: "growthOpportunity", label: "Where is the biggest growth opportunity?", hint: "What could make the biggest difference if improved?" },
  { key: "ninetyDayGoal", label: "What is your main 90-day goal?", hint: "What meaningful result would you like to achieve?", required: true },
  { key: "supportNeeded", label: "Where do you most need BTM's support?", hint: "Strategy, systems, team, marketing, sales, finance or accountability.", required: true },
];

export default function BusinessAuditPage() {
  const ds = useDataSource();
  const { student } = usePortal();
  const toast = useToast();
  const q = useLiveQuery((d) => d.getBusinessAudit(), ["business_audit"]);
  const [form, setForm] = useState<AuditDraft>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const audit = q.data;
  // Fill the form from the saved audit once (don't overwrite typing on live refresh).
  useEffect(() => {
    if (audit && audit.id !== loadedId) {
      const { id: _id, studentId: _s, submittedAt: _sa, status: _st, scores: _sc, ...draft } = audit;
      setForm({ ...EMPTY, ...draft });
      setLoadedId(audit.id);
    }
  }, [audit, loadedId]);

  if (q.error) return <ErrorBox error={q.error} onRetry={q.refresh} />;
  if (q.loading) return <Loading rows={3} />;

  const submitted = audit && (audit.status === "submitted" || audit.status === "reviewed");
  const showForm = !submitted || editing;
  const set = (k: keyof AuditDraft) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent | null, submit: boolean) {
    e?.preventDefault();
    if (submit) {
      const missing = [...SNAPSHOT, ...QUESTIONS].filter((f) => f.required && !form[f.key].trim());
      if (missing.length) return setError(`Please complete: ${missing.map((m) => m.label).join(", ")}.`);
    }
    setBusy(true);
    setError(null);
    try {
      await ds.saveBusinessAudit(form, submit);
      if (submit && !student.onboardingComplete) await ds.completeOnboarding();
      toast.show(submit ? "Business Audit submitted. Bree will use it to shape your Support Plan." : "Draft saved.");
      if (submit) setEditing(false);
    } catch {
      setError("Couldn't save your audit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Give us the full picture"
        title="Business Audit"
        intro="Tell us what's working, what's getting in the way and where you want support. A few clear sentences for each question is enough."
        action={submitted && !editing ? <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>Update my audit</button> : undefined}
      />

      {submitted && (
        <div className="card card--paper" style={{ marginBottom: 22, display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">Status</span>
            <h3 style={{ marginTop: 8 }}>
              {audit!.status === "reviewed" ? "Reviewed by the BTM team" : "Submitted — waiting for review"}
            </h3>
            <p className="small muted" style={{ marginTop: 6 }}>Submitted {formatDate(audit!.submittedAt)}</p>
          </div>
          {audit!.scores.total != null && (
            <div style={{ textAlign: "right" }}>
              <span className="eyebrow">Business health score</span>
              <p><span className="serif" style={{ fontSize: 40 }}>{audit!.scores.total}</span><span className="muted"> / 150</span></p>
              <Link href="/support-plan" className="link-arrow">See it in your Support Plan</Link>
            </div>
          )}
        </div>
      )}

      {showForm ? (
        <form className="card form" onSubmit={(e) => save(e, true)}>
          <section className="form-section">
            <div className="form-section__head">
              <span className="num">01</span>
              <div>
                <span className="eyebrow">Business snapshot</span>
                <h3 style={{ marginTop: 6 }}>Where your business stands today.</h3>
              </div>
            </div>
            <div className="form-grid">
              {SNAPSHOT.map((f) => (
                <label key={f.key} className={`field${f.key === "mainServices" ? " full" : ""}`}>
                  <span>{f.label} {f.required && <em>*</em>}</span>
                  <input className="input" value={form[f.key]} onChange={set(f.key)} />
                  {f.hint && <small>{f.hint}</small>}
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div className="form-section__head">
              <span className="num">02</span>
              <div>
                <span className="eyebrow">Business audit</span>
                <h3 style={{ marginTop: 6 }}>What&apos;s working, what&apos;s in the way.</h3>
              </div>
            </div>
            <div className="stack" style={{ gap: 18 }}>
              {QUESTIONS.map((f, i) => (
                <label key={f.key} className="field">
                  <span>{String(i + 1).padStart(2, "0")} · {f.label} {f.required && <em>*</em>}</span>
                  <small>{f.hint}</small>
                  <textarea className="textarea" value={form[f.key]} onChange={set(f.key)} maxLength={1500} />
                </label>
              ))}
            </div>
          </section>

          <div className="card card--paper" style={{ padding: 18 }}>
            <span className="eyebrow">What happens next</span>
            <p className="small" style={{ marginTop: 6 }}>Bree and the BTM team review your answers and use them to shape your Support Plan and next priorities.</p>
          </div>

          {error && <div className="form-error">{error}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
            {editing && <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>Cancel</button>}
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => save(null, false)}>Save draft</button>
            <button className="btn" disabled={busy}>{busy ? "Submitting…" : submitted ? "Resubmit audit" : "Submit my audit"}</button>
          </div>
        </form>
      ) : (
        <div className="grid grid-2">
          <div className="card">
            <span className="eyebrow">Snapshot</span>
            <ul className="list" style={{ marginTop: 12 }}>
              {SNAPSHOT.map((f) => (
                <li key={f.key}><span className="small muted" style={{ width: 170, flex: "0 0 auto" }}>{f.label}</span><span>{form[f.key] || "—"}</span></li>
              ))}
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">Your answers</span>
            <ul className="list" style={{ marginTop: 12 }}>
              {QUESTIONS.map((f) => (
                <li key={f.key} style={{ flexDirection: "column", gap: 4 }}>
                  <strong className="small">{f.label}</strong>
                  <span>{form[f.key] || "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {toast.node}
    </>
  );
}
