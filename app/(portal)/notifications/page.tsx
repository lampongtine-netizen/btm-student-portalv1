"use client";

import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { ErrorBox, Loading, PageHead } from "@/components/ui";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import type { NotificationKind, PortalNotification } from "@/lib/data/types";
import { timeAgo } from "@/lib/format";

const KIND_ICON: Record<NotificationKind, IconName> = {
  message: "chat",
  support_plan: "plan",
  priority: "priorities",
  check_in: "checkin",
  power_session: "session",
  resource: "resources",
  membership: "card",
};

export default function NotificationsPage() {
  const ds = useDataSource();
  const router = useRouter();
  const q = useLiveQuery((d) => d.listNotifications(), ["notifications"]);

  if (q.error) return <ErrorBox error={q.error} onRetry={q.refresh} />;
  if (!q.data) return <Loading rows={2} />;

  const list = q.data;
  const unread = list.filter((n) => !n.readAt).length;

  async function open(n: PortalNotification) {
    if (!n.readAt) await ds.markNotificationRead(n.id).catch(() => {});
    if (n.href) router.push(n.href);
  }

  return (
    <>
      <PageHead
        eyebrow="Updates"
        title="Notifications"
        intro="New messages, Support Plans, guidance on your priorities and membership updates appear here as they happen."
        action={unread > 0 ? <button type="button" className="btn btn--ghost" onClick={() => ds.markNotificationRead("all")}>Mark all as read</button> : undefined}
      />
      {list.length === 0 ? (
        <div className="empty">You&apos;re all caught up.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <ul className="list">
            {list.map((n) => (
              <li key={n.id} style={{ padding: "18px 22px", borderTop: "1px solid var(--line)", background: n.readAt ? undefined : "var(--paper)" }}>
                <span className="avatar" style={{ width: 36, height: 36, background: n.readAt ? "var(--ivory)" : "var(--black)", color: n.readAt ? "var(--black)" : "var(--white)" }}>
                  <Icon name={KIND_ICON[n.kind]} size={16} />
                </span>
                <button type="button" onClick={() => open(n)} style={{ flex: 1, minWidth: 0, border: 0, background: "none", padding: 0, textAlign: "left" }}>
                  <strong style={{ display: "block" }}>{n.title}</strong>
                  <span className="small muted">{n.body}</span>
                </button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className="small muted" style={{ whiteSpace: "nowrap" }}>{timeAgo(n.createdAt)}</span>
                  {!n.readAt && <span className="pill pill--new">New</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
