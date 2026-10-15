"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePortal } from "@/components/PortalShell";
import { ErrorBox, Loading, Modal, useToast } from "@/components/ui";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import { currentMonth, formatDate, formatDateTime } from "@/lib/format";

export default function PowerSessionsPage() {
  const { student } = usePortal();
  const toast = useToast();
  const [requesting, setRequesting] = useState(false);
  const q = useLiveQuery(
    async (ds) => {
      const [sessions, checkIns] = await Promise.all([ds.listPowerSessions(), ds.listCheckIns()]);
      return { sessions, checkIns };
    },
    ["power_sessions", "check_ins"],
  );

  if (q.error) return <ErrorBox error={q.error} onRetry={q.refresh} />;
  if (!q.data) return <Loading rows={3} />;

  const { sessions, checkIns } = q.data;
  const upcoming = sessions
    .filter((s) => s.status === "booked" && s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now())
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))[0];
  const pending = sessions.find((s) => s.status === "requested");
  const past = sessions.filter((s) => s.status === "completed");
  const checkedIn = checkIns.some((c) => c.month === currentMonth() && c.status !== "draft");

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow eyebrow--taupe">Your private strategy session</span>
          <h1>One priority. Thirty focused minutes.</h1>
          <p>Use your Power Session to work through the decision, challenge or opportunity that will create the most meaningful progress in your business.</p>
          <div className="hero__actions">
            {!upcoming && !pending && <button type="button" className="btn btn--light" onClick={() => setRequesting(true)}>Request my 30-minute session</button>}
            {upcoming?.joinUrl && <a className="btn btn--light" href={upcoming.joinUrl} target="_blank" rel="noreferrer">Join your session</a>}
          </div>
        </div>
        <div className="hero__side">
          <span className="eyebrow eyebrow--taupe">Next Power Session</span>
          <span className="serif">{upcoming ? formatDateTime(upcoming.scheduledAt) : pending ? "Requested" : "Not booked yet"}</span>
          <span className="small" style={{ color: "#a9a39a" }}>Brisbane time · 30 minutes · {past.length} completed</span>
        </div>
      </section>

      <div className="grid grid-main section">
        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <span className="eyebrow">01 · Prepare before your session</span>
                <h3>Complete your Monthly Check-In first.</h3>
              </div>
              {checkedIn ? <span className="pill pill--done">Done this month</span> : <span className="pill pill--progress">To do</span>}
            </div>
            <p className="muted">Your check-in gives Bree the numbers, context and priority she needs before your 30-minute session.</p>
            <div className="grid grid-3" style={{ marginTop: 18 }}>
              {[
                ["01", "Monthly Check-In", "Share your numbers and current priority."],
                ["02", "Book your session", "Request a time that suits you."],
                ["03", "Power Session", "Arrive ready to make the next decision."],
              ].map(([n, t, d]) => (
                <div key={n} className="card card--paper" style={{ padding: 18 }}>
                  <span className="num">{n}</span>
                  <strong style={{ display: "block", marginTop: 8 }}>{t}</strong>
                  <span className="small muted">{d}</span>
                </div>
              ))}
            </div>
            {!checkedIn && <Link href="/check-ins" className="btn" style={{ marginTop: 18 }}>Complete Monthly Check-In</Link>}
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <span className="eyebrow">02 · Manage your Power Session</span>
                <h3>Your next conversation with Bree</h3>
              </div>
            </div>
            {upcoming ? (
              <ul className="list">
                <li><span className="small muted" style={{ width: 140 }}>Date & time</span><strong>{formatDateTime(upcoming.scheduledAt)}</strong></li>
                <li><span className="small muted" style={{ width: 140 }}>Focus</span><span>{upcoming.focus ?? student.currentFocus ?? "—"}</span></li>
                <li><span className="small muted" style={{ width: 140 }}>Status</span><span className="pill pill--done">Booked</span></li>
                <li style={{ gap: 10, flexWrap: "wrap" }}>
                  {upcoming.joinUrl && <a className="btn btn--sm" href={upcoming.joinUrl} target="_blank" rel="noreferrer">Join session</a>}
                  {upcoming.rescheduleUrl ? (
                    <a className="btn btn--ghost btn--sm" href={upcoming.rescheduleUrl} target="_blank" rel="noreferrer">Reschedule</a>
                  ) : (
                    <Link className="btn btn--ghost btn--sm" href="/communications">Ask to reschedule</Link>
                  )}
                </li>
              </ul>
            ) : pending ? (
              <div className="form-ok">
                Session requested{pending.focus ? ` — focus: ${pending.focus}` : ""}. The BTM team will confirm a time and it will appear here automatically.
              </div>
            ) : (
              <div className="empty">
                No session booked yet.{" "}
                <button type="button" className="link-arrow" style={{ border: 0, background: "none" }} onClick={() => setRequesting(true)}>Request a time</button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <span className="eyebrow">03 · Session history</span>
                <h3>Your previous Power Sessions</h3>
              </div>
            </div>
            {past.length === 0 ? (
              <div className="empty">After your first Power Session, the BTM team adds your notes, recording and next actions here.</div>
            ) : (
              <ul className="list">
                {past.map((s) => (
                  <li key={s.id} style={{ flexDirection: "column", gap: 6 }}>
                    <strong>{formatDate(s.scheduledAt, { day: "numeric", month: "long", year: "numeric" })}{s.focus ? ` · ${s.focus}` : ""}</strong>
                    {s.notes && <p className="small">{s.notes}</p>}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {s.recordingUrl && <a className="btn btn--sm btn--ghost" href={s.recordingUrl} target="_blank" rel="noreferrer">Watch recording</a>}
                      <Link className="btn btn--sm btn--ghost" href="/support-plan">View my action plan</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card card--dark">
            <span className="eyebrow eyebrow--taupe">Your 30-minute format</span>
            <h3 style={{ marginTop: 10, color: "var(--white)" }}>Focused by design.</h3>
            <ul className="list" style={{ marginTop: 14 }}>
              {[
                ["05", "Progress and context", "What changed since your last check-in."],
                ["15", "Your main priority", "Strategy, troubleshooting and the key decision."],
                ["10", "Clear next actions", "Leave with priorities to implement."],
              ].map(([m, t, d]) => (
                <li key={m} style={{ borderColor: "var(--black-line)" }}>
                  <span className="num" style={{ color: "var(--taupe)" }}>{m}</span>
                  <div><strong style={{ display: "block" }}>{t}</strong><span className="small" style={{ color: "#a9a39a" }}>{d}</span></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card card--paper">
            <span className="eyebrow">A note from Bree</span>
            <h3 style={{ marginTop: 10 }}>Clarity creates momentum.</h3>
            <p className="small" style={{ marginTop: 10 }}>You don&apos;t need to arrive with everything figured out. Bring the real challenge, the honest numbers and a willingness to make the next decision.</p>
          </div>
        </div>
      </div>

      {requesting && <RequestForm defaultFocus={student.currentFocus ?? ""} onClose={() => setRequesting(false)} onDone={() => toast.show("Request sent. You'll see the confirmed time here.")} />}
      {toast.node}
    </>
  );
}

function RequestForm({ defaultFocus, onClose, onDone }: { defaultFocus: string; onClose: () => void; onDone: () => void }) {
  const ds = useDataSource();
  const [focus, setFocus] = useState(defaultFocus);
  const [times, setTimes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await ds.requestPowerSession(focus, times);
      onDone();
      onClose();
    } catch {
      setError("Couldn't send your request. Please try again.");
      setBusy(false);
    }
  }
  return (
    <Modal title="Request a Power Session" eyebrow="30 minutes with Bree" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>What do you want to focus on?</span>
          <textarea className="textarea" value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={500} />
        </label>
        <label className="field">
          <span>Preferred days and times</span>
          <input className="input" placeholder="e.g. Tue or Thu mornings, Brisbane time" value={times} onChange={(e) => setTimes(e.target.value)} />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
        </div>
      </form>
    </Modal>
  );
}
