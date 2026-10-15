"use client";

import Link from "next/link";
import { useState } from "react";
import { usePortal } from "@/components/PortalShell";
import { Icon } from "@/components/Icon";
import { ErrorBox, Loading, PageHead, StatusPill } from "@/components/ui";
import { useLiveQuery } from "@/lib/data/provider";
import { formatDate } from "@/lib/format";

export default function SupportPlanPage() {
  const { student } = usePortal();
  const q = useLiveQuery(
    async (ds) => {
      const [plans, audit] = await Promise.all([ds.listSupportPlans(), ds.getBusinessAudit()]);
      return { plans, audit };
    },
    ["support_plans", "business_audit"],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (q.error) return <ErrorBox error={q.error} onRetry={q.refresh} />;
  if (!q.data) return <Loading rows={3} />;

  const { plans, audit } = q.data;
  const plan = plans.find((p) => p.id === selectedId) ?? plans[0];

  if (!plan) {
    return (
      <>
        <PageHead eyebrow="Your personalised support plan" title="My Support Plan" />
        <div className="locked">
          <span className="eyebrow eyebrow--taupe">Being prepared</span>
          <h2 style={{ color: "var(--white)" }}>Your Support Plan is on its way.</h2>
          <p>
            Bree builds your plan from your Business Audit. {audit?.status === "submitted" || audit?.status === "reviewed"
              ? "Your audit is in — you'll get a notification here as soon as the plan is ready."
              : "Complete your Business Audit first so we have the full picture."}
          </p>
          {!(audit?.status === "submitted" || audit?.status === "reviewed") && (
            <Link href="/business-audit" className="btn btn--light">Complete my audit</Link>
          )}
        </div>
      </>
    );
  }

  const scores = audit?.scores;
  const activeActions = plan.actions.filter((a) => a.status !== "completed").length;

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow eyebrow--taupe">Your personalised support plan · {plan.title}</span>
          <h1>{student.businessName}</h1>
          <p>
            Prepared {formatDate(plan.preparedAt, { day: "numeric", month: "long", year: "numeric" })} for your current support cycle.
            {plans.length > 1 && ` You have ${plans.length} plans — use the selector to view earlier ones.`}
          </p>
          <div className="hero__actions">
            {plan.fileUrl ? (
              <a className="btn btn--light" href={plan.fileUrl} target="_blank" rel="noreferrer">
                <Icon name="download" size={15} /> Download PDF
              </a>
            ) : (
              <button type="button" className="btn btn--light" disabled title="The PDF will appear once the BTM team uploads it">
                <Icon name="download" size={15} /> {plan.fileName ? "PDF uploading" : "No PDF yet"}
              </button>
            )}
            {plans.length > 1 && (
              <select className="select" aria-label="Choose plan" value={plan.id} onChange={(e) => setSelectedId(e.target.value)} style={{ width: "auto", minHeight: 44, background: "transparent", color: "var(--white)", borderColor: "var(--black-line)" }}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id} style={{ color: "var(--black)" }}>{p.title} · {formatDate(p.preparedAt)}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="hero__side">
          <span className="eyebrow eyebrow--taupe">Your current focus</span>
          <span className="serif" style={{ fontSize: 22 }}>{plan.currentFocus}</span>
        </div>
      </section>

      <div className="grid grid-main section">
        <div className="stack">
          <div className="card">
            <span className="eyebrow">Where you are now</span>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7 }}>{plan.summary}</p>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <div className="card__head">
                <div>
                  <span className="eyebrow">Your top priorities</span>
                  <h3>The three areas that matter most.</h3>
                </div>
              </div>
              <ul className="list">
                {plan.topPriorities.map((p, i) => (
                  <li key={i}><span className="num">0{i + 1}</span><span>{p}</span></li>
                ))}
              </ul>
              <Link href="/priorities" className="link-arrow" style={{ marginTop: 16 }}>View priority list <Icon name="arrow" size={13} /></Link>
            </div>
            <div className="card">
              <span className="eyebrow">Your 30-day focus</span>
              <h3 style={{ marginTop: 8, marginBottom: 14 }}>What to concentrate on this month.</h3>
              <ul className="bullets">{plan.thirtyDayFocus.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          </div>

          <div>
            <div className="card__head">
              <div>
                <span className="eyebrow">Action plan</span>
                <h3>Between sessions</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Action</th><th>Owner</th><th>Status</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {plan.actions.map((a) => (
                    <tr key={a.id}>
                      <td>{a.action}</td>
                      <td><span className={a.owner === "BTM" ? "pill pill--dark" : "pill"}>{a.owner}</span></td>
                      <td><StatusPill status={a.status} /></td>
                      <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDate(a.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card card--paper">
            <span className="eyebrow">Plan at a glance</span>
            <ul className="list" style={{ marginTop: 14 }}>
              <li><span>Active priorities</span><strong style={{ marginLeft: "auto" }}>{plan.topPriorities.length}</strong></li>
              <li><span>Open actions</span><strong style={{ marginLeft: "auto" }}>{activeActions}</strong></li>
              <li><span>Next review</span><strong style={{ marginLeft: "auto" }}>{formatDate(plan.nextReview)}</strong></li>
            </ul>
          </div>

          <div className="card">
            <span className="eyebrow">What BTM will support you with</span>
            <ul className="bullets" style={{ marginTop: 12 }}>{plan.btmSupport.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>

          <div className="card">
            <span className="eyebrow">Your business snapshot</span>
            {scores?.total != null ? (
              <>
                <p style={{ marginTop: 10 }}><span className="serif" style={{ fontSize: 40 }}>{scores.total}</span><span className="muted"> / 150</span></p>
                <ul className="list" style={{ marginTop: 10 }}>
                  <ScoreRow label="Financials" value={scores.financials} />
                  <ScoreRow label="Client retention" value={scores.clientRetention} />
                  <ScoreRow label="Systems & team" value={scores.systemsTeam} />
                </ul>
              </>
            ) : (
              <p className="small muted" style={{ marginTop: 10 }}>Scores appear here after Bree reviews your Business Audit.</p>
            )}
          </div>

          <div className="card card--dark">
            <span className="eyebrow eyebrow--taupe">Between sessions</span>
            <h3 style={{ marginTop: 10, color: "var(--white)" }}>You&apos;re supported.</h3>
            <p className="small" style={{ marginTop: 10, color: "#d9d5ce" }}>Need guidance or want to go deeper? The BTM team is here when you need us.</p>
            <div className="stack" style={{ gap: 8, marginTop: 16 }}>
              <Link href="/communications" className="btn btn--light btn--sm">Message the BTM team</Link>
              <Link href="/power-sessions" className="btn btn--sm" style={{ borderColor: "var(--black-line)" }}>Book a Power Session</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  const pct = value == null ? 0 : Math.round((value / 25) * 100);
  return (
    <li style={{ flexDirection: "column", gap: 8, alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="small">{label}</span>
        <strong className="small">{value ?? "—"}/25</strong>
      </div>
      <div className="progress"><span style={{ width: `${pct}%` }} /></div>
    </li>
  );
}
