"use client";

import Link from "next/link";
import { usePortal } from "@/components/PortalShell";
import { Icon } from "@/components/Icon";
import { ErrorBox, LevelPill, Loading, StatusPill } from "@/components/ui";
import { useLiveQuery } from "@/lib/data/provider";
import { currentMonth, formatDate, formatDateTime, LEVEL_LABEL, timeAgo } from "@/lib/format";

export default function DashboardPage() {
  const { student, membership } = usePortal();
  const q = useLiveQuery(
    async (ds) => {
      const [priorities, sessions, notifications, messages, plans, checkIns] = await Promise.all([
        ds.listPriorities(),
        ds.listPowerSessions(),
        ds.listNotifications(),
        ds.listMessages(),
        ds.listSupportPlans(),
        ds.listCheckIns(),
      ]);
      return { priorities, sessions, notifications, messages, plans, checkIns };
    },
    ["priorities", "power_sessions", "notifications", "messages", "support_plans", "check_ins"],
  );

  const name = student.preferredName || student.firstName;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const week = Math.min(Math.max(student.supportWeek, 1), 12);

  const d = q.data;
  const nextSession = d?.sessions
    .filter((s) => s.status === "booked" && s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now())
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))[0];
  const open = d?.priorities.filter((p) => p.status !== "completed") ?? [];
  const done = d?.priorities.filter((p) => p.status === "completed").length ?? 0;
  const total = d?.priorities.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const nextActions = [...open]
    .sort((a, b) => (a.level === "high" ? -1 : 0) - (b.level === "high" ? -1 : 0) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))
    .slice(0, 3);
  const lastMessage = d?.messages[d.messages.length - 1];
  const latestPlan = d?.plans[0];
  const checkedInThisMonth = d?.checkIns.some((c) => c.month === currentMonth() && c.status !== "draft");

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow eyebrow--taupe">{greeting}, {name}</span>
          <h1>Let&apos;s keep building what comes next.</h1>
          <p>Your private space for strategy, progress, accountability and the tools selected for your next stage of growth.</p>
          <div className="hero__actions">
            <Link href="/priorities" className="btn btn--light">Open my priorities</Link>
            <Link href="/communications" className="btn" style={{ borderColor: "var(--black-line)" }}>Message Bree</Link>
          </div>
        </div>
        <div className="hero__side hero__side--photo">
          <span className="eyebrow eyebrow--taupe">Your business advisor</span>
          <span className="serif">{student.advisorName}</span>
          <span className="small" style={{ color: "#a9a39a" }}>Messages answered Monday to Friday, within one business day.</span>
        </div>
      </section>

      <div className="facts">
        <div>
          <span className="eyebrow">Business</span>
          <strong>{student.businessName}</strong>
        </div>
        <div>
          <span className="eyebrow">Current membership</span>
          <strong>{LEVEL_LABEL[membership.level].short} · {LEVEL_LABEL[membership.level].name}</strong>
        </div>
        <div>
          <span className="eyebrow">Support cycle</span>
          <strong>Week {week} of 12</strong>
        </div>
        <div>
          <span className="eyebrow">Next Power Session</span>
          <strong>{nextSession ? formatDateTime(nextSession.scheduledAt) : "Not booked yet"}</strong>
        </div>
      </div>

      {!student.onboardingComplete && (
        <div className="card card--paper section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">Start here</span>
            <h3 style={{ marginTop: 8 }}>Complete your Business Audit so Bree can build your Support Plan.</h3>
          </div>
          <Link href="/business-audit" className="btn">Start my audit</Link>
        </div>
      )}

      {q.error ? (
        <div className="section"><ErrorBox error={q.error} onRetry={q.refresh} /></div>
      ) : !d ? (
        <div className="section"><Loading /></div>
      ) : (
        <div className="grid grid-main section">
          <div className="stack">
            <div className="card card--dark">
              <div className="card__head">
                <div>
                  <span className="eyebrow eyebrow--taupe">Your momentum</span>
                  <h3 style={{ color: "var(--white)" }}>{pct}% of your priorities complete</h3>
                </div>
                <span className="serif" style={{ fontSize: 40 }}>W{week}</span>
              </div>
              <div className="progress"><span style={{ width: `${pct}%` }} /></div>
              <div className="weeks" aria-label={`Week ${week} of 12`}>
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className={i + 1 < week ? "is-done" : i + 1 === week ? "is-current" : ""}>W{i + 1}</span>
                ))}
              </div>
              <p className="small" style={{ marginTop: 16, color: "#a9a39a" }}>
                Every completed week is another step toward a stronger, more sustainable business.
              </p>
            </div>

            <div className="card">
              <div className="card__head">
                <div>
                  <span className="eyebrow">Keep moving</span>
                  <h3>Your next actions</h3>
                </div>
                <Link href="/priorities" className="link-arrow">All priorities <Icon name="arrow" size={13} /></Link>
              </div>
              {nextActions.length === 0 ? (
                <div className="empty">No open priorities. Add one to keep your momentum going.</div>
              ) : (
                <ul className="list">
                  {nextActions.map((p, i) => (
                    <li key={p.id}>
                      <span className="num">0{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: "block" }}>{p.title}</strong>
                        <span className="small muted">{p.category} · Due {formatDate(p.dueDate)}</span>
                        {p.staffNote && <p className="small" style={{ marginTop: 6 }}><strong>Bree:</strong> {p.staffNote}</p>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <StatusPill status={p.status} />
                        <LevelPill level={p.level} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-2">
              <Link href="/check-ins" className="card" style={{ display: "block" }}>
                <span className="eyebrow">Monthly Check-In</span>
                <h3 style={{ marginTop: 10 }}>{checkedInThisMonth ? "This month's check-in is done." : "Your next check-in is ready."}</h3>
                <p className="small muted" style={{ marginTop: 10 }}>
                  {checkedInThisMonth ? "Bree has your numbers for your next Power Session." : "Update your numbers, wins and priority before your next Power Session."}
                </p>
              </Link>
              <Link href="/support-plan" className="card" style={{ display: "block" }}>
                <span className="eyebrow">My Support Plan</span>
                <h3 style={{ marginTop: 10 }}>{latestPlan ? latestPlan.title : "Your plan is being prepared."}</h3>
                <p className="small muted" style={{ marginTop: 10 }}>
                  {latestPlan ? `Prepared ${formatDate(latestPlan.preparedAt)}` : "We'll notify you as soon as it's ready."}
                </p>
              </Link>
            </div>
          </div>

          <div className="stack">
            <div className="card">
              <div className="card__head">
                <div>
                  <span className="eyebrow">Your portal</span>
                  <h3>What&apos;s new</h3>
                </div>
                <Link href="/notifications" className="link-arrow">View all</Link>
              </div>
              {d.notifications.length === 0 ? (
                <div className="empty">You&apos;re all caught up.</div>
              ) : (
                <ul className="list">
                  {d.notifications.slice(0, 4).map((n) => (
                    <li key={n.id}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={n.href ?? "/notifications"}>
                          <strong style={{ display: "block" }}>{n.title}</strong>
                        </Link>
                        <span className="small muted">{timeAgo(n.createdAt)}</span>
                      </div>
                      {!n.readAt && <span className="pill pill--new">New</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card card--paper">
              <span className="eyebrow">Latest conversation</span>
              {lastMessage ? (
                <>
                  <p style={{ marginTop: 12 }}>&ldquo;{lastMessage.body.length > 160 ? `${lastMessage.body.slice(0, 160)}…` : lastMessage.body}&rdquo;</p>
                  <p className="small muted" style={{ marginTop: 8 }}>{lastMessage.senderName} · {timeAgo(lastMessage.createdAt)}</p>
                </>
              ) : (
                <p className="muted" style={{ marginTop: 12 }}>No messages yet. Say hello to the BTM team.</p>
              )}
              <Link href="/communications" className="btn btn--sm" style={{ marginTop: 16 }}>Open Communications</Link>
            </div>

            {membership.level === "level_1" && (
              <div className="card card--dark">
                <span className="eyebrow eyebrow--taupe">Your next level</span>
                <h3 style={{ marginTop: 10, color: "var(--white)" }}>Build the systems behind your growth.</h3>
                <p className="small" style={{ marginTop: 10, color: "#d9d5ce" }}>
                  Scale Society adds the 12-month implementation pathway, advanced templates and the systems library.
                </p>
                <Link href="/membership#upgrade" className="btn btn--light btn--sm" style={{ marginTop: 16 }}>Explore Scale Society</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
