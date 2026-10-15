"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ErrorBox, Loading, PageHead, useToast } from "@/components/ui";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import type { CheckInDraft } from "@/lib/data/source";
import type { CheckIn, Momentum } from "@/lib/data/types";
import { currentMonth, formatAud, formatDate, monthLabel } from "@/lib/format";

const SUPPORT_AREAS = [
  "Strategy & direction",
  "Sales & conversion",
  "Marketing & visibility",
  "Systems & operations",
  "Team & delegation",
  "Financials & profitability",
];
const MOMENTUM: [Momentum, string][] = [
  [1, "Feeling stuck"],
  [2, "Finding direction"],
  [3, "Building steadily"],
  [4, "Feeling focused"],
  [5, "Strong momentum"],
];
const NUMBERS: { key: "revenue" | "forecastGoal" | "profit" | "leads" | "sales" | "appointments" | "returnRate"; label: string; hint: string }[] = [
  { key: "revenue", label: "Revenue", hint: "$ AUD for the month" },
  { key: "forecastGoal", label: "Forecast goal", hint: "Your monthly target" },
  { key: "profit", label: "Monthly profit", hint: "$ AUD, estimate is okay" },
  { key: "leads", label: "Leads & enquiries", hint: "Total new enquiries" },
  { key: "sales", label: "Sales", hint: "New sales or clients" },
  { key: "appointments", label: "Appointments", hint: "Completed this month" },
  { key: "returnRate", label: "Client return rate", hint: "% returning clients" },
];

const blank = (month: string): CheckInDraft => ({
  month,
  revenue: null,
  forecastGoal: null,
  profit: null,
  leads: null,
  sales: null,
  appointments: null,
  returnRate: null,
  biggestWin: "",
  improved: "",
  biggestChallenge: "",
  momentum: null,
  nextPriority: "",
  decisionSupport: "",
  supportAreas: [],
});

export default function CheckInsPage() {
  const ds = useDataSource();
  const toast = useToast();
  const q = useLiveQuery((d) => d.listCheckIns(), ["check_ins"]);
  const month = currentMonth();
  const [form, setForm] = useState<CheckInDraft>(blank(month));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const list = q.data ?? [];
  const thisMonth = list.find((c) => c.month === month);
  useEffect(() => {
    if (thisMonth && loadedFor !== thisMonth.id) {
      const { id: _i, studentId: _s, submittedAt: _sa, status: _st, staffReply: _r, ...draft } = thisMonth;
      setForm(draft);
      setLoadedFor(thisMonth.id);
    }
  }, [thisMonth, loadedFor]);

  if (q.error) return <ErrorBox error={q.error} onRetry={q.refresh} />;
  if (q.loading) return <Loading rows={3} />;

  const submitted = thisMonth && thisMonth.status !== "draft";
  const history = list.filter((c) => c.status !== "draft" && c.month !== month);
  const required: [string, boolean][] = [
    ["biggest win", !!form.biggestWin.trim()],
    ["biggest challenge", !!form.biggestChallenge.trim()],
    ["momentum", form.momentum != null],
    ["priority for the next 30 days", !!form.nextPriority.trim()],
    ["decision or problem", !!form.decisionSupport.trim()],
  ];
  const progress = Math.round((required.filter(([, ok]) => ok).length / required.length) * 100);

  const num = (k: (typeof NUMBERS)[number]["key"]) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value === "" ? null : Number(e.target.value) }));
  const text = (k: "biggestWin" | "improved" | "biggestChallenge" | "nextPriority" | "decisionSupport") => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent | null, submit: boolean) {
    e?.preventDefault();
    if (submit) {
      const missing = required.filter(([, ok]) => !ok).map(([l]) => l);
      if (missing.length) return setError(`Almost there — please add your ${missing.join(", ")}.`);
      if (!confirmed) return setError("Please confirm this check-in reflects your current business position.");
    }
    setBusy(true);
    setError(null);
    try {
      await ds.saveCheckIn(form, submit);
      toast.show(submit ? "Check-in submitted. Bree has the context for your next Power Session." : "Draft saved.");
      if (submit) setEditing(false);
    } catch {
      setError("Couldn't save your check-in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        eyebrow={`${monthLabel(month)} check-in`}
        title="Pause, reflect and set your next move."
        intro="Share your numbers, wins and challenges so Bree and the BTM team can give you focused support for the month ahead. Allow about 8–10 minutes."
      />

      {submitted && !editing ? (
        <div className="locked" style={{ marginBottom: 26 }}>
          <span className="eyebrow eyebrow--taupe">Check-in saved</span>
          <h2 style={{ color: "var(--white)" }}>Your {monthLabel(month)} check-in is complete.</h2>
          <p>Your answers are with the BTM team. Bree now has the context for your next 30-minute Power Session.</p>
          {thisMonth?.staffReply && <p style={{ color: "var(--white)" }}><strong>Bree:</strong> {thisMonth.staffReply}</p>}
          <div className="hero__actions">
            <Link href="/power-sessions" className="btn btn--light">Book my Power Session</Link>
            <button type="button" className="btn" style={{ borderColor: "var(--black-line)" }} onClick={() => setEditing(true)}>Edit my answers</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-main">
          <form className="card form" onSubmit={(e) => save(e, true)}>
            <section className="form-section">
              <div className="form-section__head">
                <span className="num">01</span>
                <div>
                  <span className="eyebrow">Business snapshot</span>
                  <h3 style={{ marginTop: 6 }}>Start with your numbers</h3>
                  <p className="small muted" style={{ marginTop: 6 }}>Use your most recent complete month. Estimates are okay.</p>
                </div>
              </div>
              <div className="form-grid">
                {NUMBERS.map((n) => (
                  <label key={n.key} className="field">
                    <span>{n.label}</span>
                    <input className="input" type="number" inputMode="decimal" min={0} value={form[n.key] ?? ""} onChange={num(n.key)} />
                    <small>{n.hint}</small>
                  </label>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section__head">
                <span className="num">02</span>
                <div>
                  <span className="eyebrow">Reflect on the month</span>
                  <h3 style={{ marginTop: 6 }}>Recognise the progress</h3>
                </div>
              </div>
              <div className="stack" style={{ gap: 16 }}>
                <label className="field"><span>What was your biggest win this month? <em>*</em></span><textarea className="textarea" value={form.biggestWin} onChange={text("biggestWin")} maxLength={1000} /></label>
                <label className="field"><span>What felt easier or improved?</span><textarea className="textarea" value={form.improved} onChange={text("improved")} maxLength={1000} /></label>
                <label className="field"><span>What is your biggest challenge right now? <em>*</em></span><textarea className="textarea" value={form.biggestChallenge} onChange={text("biggestChallenge")} maxLength={1000} /></label>
                <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <span>How are you feeling about your business momentum? <em>*</em></span>
                  <div className="scale">
                    {MOMENTUM.map(([v, label]) => (
                      <label key={v}>
                        <input type="radio" name="momentum" checked={form.momentum === v} onChange={() => setForm((f) => ({ ...f, momentum: v }))} />
                        <strong>{v}</strong>
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section__head">
                <span className="num">03</span>
                <div>
                  <span className="eyebrow">Your next move</span>
                  <h3 style={{ marginTop: 6 }}>Set the priority</h3>
                </div>
              </div>
              <div className="stack" style={{ gap: 16 }}>
                <label className="field"><span>What is your biggest priority for the next 30 days? <em>*</em></span><textarea className="textarea" value={form.nextPriority} onChange={text("nextPriority")} maxLength={1000} /></label>
                <label className="field"><span>What decision or problem do you want support with? <em>*</em></span><textarea className="textarea" value={form.decisionSupport} onChange={text("decisionSupport")} maxLength={1000} /></label>
                <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <span>Where would support be most helpful?</span>
                  <div className="chips">
                    {SUPPORT_AREAS.map((a) => {
                      const on = form.supportAreas.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          aria-pressed={on}
                          className={`chip${on ? " is-active" : ""}`}
                          onClick={() => setForm((f) => ({ ...f, supportAreas: on ? f.supportAreas.filter((x) => x !== a) : [...f.supportAreas, a] }))}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </section>

            <label className="checkbox">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>I confirm this check-in reflects my current business position.</span>
            </label>
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              {editing && <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>Cancel</button>}
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => save(null, false)}>Save draft</button>
              <button className="btn" disabled={busy}>{busy ? "Submitting…" : "Save & submit my check-in"}</button>
            </div>
          </form>

          <div className="stack">
            <div className="card">
              <span className="eyebrow">Check-in progress</span>
              <h3 style={{ marginTop: 8 }}>{progress}%</h3>
              <div className="progress" style={{ marginTop: 12 }}><span style={{ width: `${progress}%` }} /></div>
              <p className="small muted" style={{ marginTop: 12 }}>Complete each section so the team has a clear picture of your month.</p>
            </div>
            <div className="card card--paper">
              <span className="eyebrow">Before you submit</span>
              <ul className="bullets" style={{ marginTop: 10 }}>
                <li>Use your latest complete month</li>
                <li>Choose one main priority</li>
                <li>Be honest — it makes the support better</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <div className="card__head">
          <div>
            <span className="eyebrow">History</span>
            <h3>Previous check-ins</h3>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="empty">Your previous check-ins will appear here.</div>
        ) : (
          <div className="grid grid-2">{history.map((c) => <HistoryCard key={c.id} c={c} />)}</div>
        )}
      </section>
      {toast.node}
    </>
  );
}

function HistoryCard({ c }: { c: CheckIn }) {
  return (
    <div className="card">
      <div className="card__head">
        <div>
          <span className="eyebrow">Submitted {formatDate(c.submittedAt)}</span>
          <h3>{monthLabel(c.month)}</h3>
        </div>
        <span className={c.status === "reviewed" ? "pill pill--done" : "pill"}>{c.status === "reviewed" ? "Reviewed" : "Submitted"}</span>
      </div>
      <div className="grid grid-3" style={{ gap: 10 }}>
        <div><span className="eyebrow">Revenue</span><strong>{formatAud(c.revenue)}</strong></div>
        <div><span className="eyebrow">Appointments</span><strong>{c.appointments ?? "—"}</strong></div>
        <div><span className="eyebrow">Return rate</span><strong>{c.returnRate != null ? `${c.returnRate}%` : "—"}</strong></div>
      </div>
      <p className="small" style={{ marginTop: 14 }}><strong>Win:</strong> {c.biggestWin}</p>
      <p className="small" style={{ marginTop: 6 }}><strong>Next priority:</strong> {c.nextPriority}</p>
      {c.staffReply && <p className="small" style={{ marginTop: 10, padding: 12, background: "var(--paper)" }}><strong>Bree:</strong> {c.staffReply}</p>}
    </div>
  );
}
