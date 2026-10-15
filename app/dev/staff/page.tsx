"use client";

import { useState } from "react";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import { getSampleDataSource } from "@/lib/data/sample-source";
import type { MembershipLevel, MembershipStatus } from "@/lib/data/types";
import { LEVEL_LABEL, timeAgo } from "@/lib/format";

/**
 * Staff Simulator — sample mode only.
 * Stands in for the Staff Portal while the portal runs on sample data.
 * Open it in a second tab next to the student portal: every button here
 * writes to the shared sample store and the student tab updates without a
 * refresh. In the live system the real Staff Portal plays this role through
 * Supabase Realtime. This page is not deployed to production users.
 */
export default function StaffSimulator() {
  const ds = useDataSource();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const q = useLiveQuery(
    async (d) => {
      const [messages, priorities, membership, audit, checkIns, sessions] = await Promise.all([
        d.listMessages(),
        d.listPriorities(),
        d.getMembership(),
        d.getBusinessAudit(),
        d.listCheckIns(),
        d.listPowerSessions(),
      ]);
      return { messages, priorities, membership, audit, checkIns, sessions };
    },
    ["messages", "priorities", "membership", "business_audit", "check_ins", "power_sessions"],
  );

  if (ds.mode !== "sample") {
    return <main className="content"><div className="form-error">The Staff Simulator only runs in sample mode. Use the real Staff Portal.</div></main>;
  }
  const sim = getSampleDataSource().sim;
  const d = q.data;

  return (
    <main style={{ minHeight: "100vh", background: "#1a1a1a", color: "var(--white)" }}>
      <div className="content" style={{ maxWidth: 1100 }}>
        <span className="eyebrow eyebrow--taupe">Sample mode · stands in for the Staff Portal</span>
        <h1 style={{ color: "var(--white)", fontSize: 44, marginTop: 10 }}>Staff Simulator</h1>
        <p style={{ color: "#a9a39a", marginTop: 10, maxWidth: 680 }}>
          Keep the student portal open in another tab. Each action below updates the student&apos;s screen without a refresh — the same flow the real Staff Portal will use.
        </p>
        {q.error && <div className="form-error" style={{ marginTop: 16 }}>Sign in to the student portal in another tab first (code 123456).</div>}

        {d && (
          <div className="grid grid-2 section">
            <section className="card">
              <span className="eyebrow">Communications</span>
              <h3 style={{ margin: "8px 0 14px" }}>Latest from the student</h3>
              <ul className="list" style={{ maxHeight: 220, overflowY: "auto" }}>
                {d.messages.filter((m) => m.sender === "student").slice(-4).reverse().map((m) => (
                  <li key={m.id} style={{ flexDirection: "column", gap: 2 }}>
                    <span className="small">{m.body}</span>
                    <span className="small muted">{timeAgo(m.createdAt)} · {m.readAt ? "Read by staff" : "Unread"}</span>
                  </li>
                ))}
              </ul>
              <form className="form" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { sim.staffReply(reply.trim()); setReply(""); } }}>
                <textarea className="textarea" placeholder="Reply as Bree…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn--sm">Send reply</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={sim.staffReadMessages}>Mark student messages read</button>
                </div>
              </form>
            </section>

            <section className="card">
              <span className="eyebrow">Priorities</span>
              <h3 style={{ margin: "8px 0 14px" }}>{d.priorities.length} priorities · {d.priorities.filter((p) => p.status === "completed").length} completed</h3>
              <ul className="list" style={{ maxHeight: 160, overflowY: "auto" }}>
                {d.priorities.slice(0, 5).map((p) => (
                  <li key={p.id}><span className="small" style={{ flex: 1 }}>{p.title}</span><span className="pill">{p.status.replace("_", " ")}</span></li>
                ))}
              </ul>
              <form className="form" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (priorityId && note.trim()) { sim.addPriorityNote(priorityId, note.trim()); setNote(""); } }}>
                <select className="select" value={priorityId} onChange={(e) => setPriorityId(e.target.value)}>
                  <option value="">Choose a priority…</option>
                  {d.priorities.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <input className="input" placeholder="Guidance note from Bree" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="btn btn--sm">Add guidance</button>
              </form>
            </section>

            <section className="card">
              <span className="eyebrow">Support Plan & Audit</span>
              <h3 style={{ margin: "8px 0 14px" }}>Audit: {d.audit?.status ?? "not started"}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btn--sm" onClick={sim.publishSupportPlan}>Publish a new Support Plan</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={sim.scoreAudit} disabled={!d.audit}>Review & score audit</button>
              </div>
              <p className="small muted" style={{ marginTop: 12 }}>
                Check-ins received: {d.checkIns.filter((c) => c.status !== "draft").length} · Session requests: {d.sessions.filter((s) => s.status === "requested").length}
              </p>
            </section>

            <section className="card">
              <span className="eyebrow">Membership (normally set by Stripe)</span>
              <h3 style={{ margin: "8px 0 14px" }}>{LEVEL_LABEL[d.membership.level].short} · {d.membership.status}</h3>
              <div className="form-grid">
                <label className="field">
                  <span>Status</span>
                  <select className="select" value={d.membership.status} onChange={(e) => {
                    const status = e.target.value as MembershipStatus;
                    sim.setMembership({ status, accessUntil: status === "canceled" ? new Date(Date.now() + 5 * 86_400_000).toISOString() : null });
                  }}>
                    {(["active", "past_due", "canceled", "inactive"] as MembershipStatus[]).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Level</span>
                  <select className="select" value={d.membership.level} onChange={(e) => {
                    const level = e.target.value as MembershipLevel;
                    sim.setMembership({ level, amountCents: level === "level_2" ? 29900 : 19900 });
                  }}>
                    <option value="level_1">Level 1</option>
                    <option value="level_2">Level 2</option>
                  </select>
                </label>
              </div>
            </section>
          </div>
        )}

        <button type="button" className="btn btn--ghost section" style={{ color: "var(--white)", borderColor: "#555" }} onClick={() => window.confirm("Reset all sample data?") && sim.reset()}>
          Reset sample data
        </button>
      </div>
    </main>
  );
}
