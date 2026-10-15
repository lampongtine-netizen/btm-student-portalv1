"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useConnectionStatus, useDataSource, useLiveQuery } from "@/lib/data/provider";
import type { Membership, Student } from "@/lib/data/types";
import { formatDate, hasAccess, initials, LEVEL_LABEL } from "@/lib/format";
import { Icon, type IconName } from "./Icon";
import { Loading } from "./ui";

interface PortalCtx {
  student: Student;
  membership: Membership;
}
const Ctx = createContext<PortalCtx | null>(null);
export function usePortal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal must be used inside the portal");
  return v;
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: "messages" | "notifications";
  level2?: boolean;
}
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "", items: [{ href: "/", label: "Dashboard", icon: "dashboard" }] },
  {
    group: "Your plan",
    items: [
      { href: "/priorities", label: "Priority List", icon: "priorities" },
      { href: "/support-plan", label: "My Support Plan", icon: "plan" },
      { href: "/business-audit", label: "Business Audit", icon: "audit" },
      { href: "/check-ins", label: "Monthly Check-In", icon: "checkin" },
      { href: "/power-sessions", label: "Power Sessions", icon: "session" },
    ],
  },
  {
    group: "Support",
    items: [
      { href: "/communications", label: "Communications", icon: "chat", badge: "messages" },
      { href: "/resources", label: "Resources", icon: "resources" },
      { href: "/notifications", label: "Notifications", icon: "bell", badge: "notifications" },
      { href: "/scale-society", label: "Scale Society", icon: "spark", level2: true },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/membership", label: "Membership & Billing", icon: "card" },
      { href: "/settings", label: "My Details", icon: "settings" },
    ],
  },
];
const ALWAYS_OPEN = ["/membership", "/settings"];

function titleFor(path: string) {
  for (const g of NAV) for (const i of g.items) if (i.href === path || (i.href !== "/" && path.startsWith(i.href))) return i.label;
  return "Dashboard";
}

export function PortalShell({ children }: { children: ReactNode }) {
  const ds = useDataSource();
  const router = useRouter();
  const pathname = usePathname();
  const connected = useConnectionStatus();
  const [authChecked, setAuthChecked] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void ds.getSession().then((s) => {
      if (!s) router.replace("/login");
      else setAuthChecked(true);
    });
  }, [ds, router]);

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const core = useLiveQuery(
    async (d) => (authChecked ? { student: await d.getStudent(), membership: await d.getMembership() } : null),
    ["student", "membership"],
  );
  const unread = useLiveQuery(
    async (d) => {
      if (!authChecked) return { messages: 0, notifications: 0 };
      const [msgs, ntfs] = await Promise.all([d.listMessages(), d.listNotifications()]);
      return {
        messages: msgs.filter((m) => m.sender === "staff" && !m.readAt).length,
        notifications: ntfs.filter((n) => !n.readAt).length,
      };
    },
    ["messages", "notifications"],
  );

  // Re-run once auth is confirmed.
  useEffect(() => {
    if (authChecked) {
      core.refresh();
      unread.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  async function signOut() {
    await ds.signOut();
    router.replace("/login");
  }

  if (!authChecked || core.loading || !core.data) {
    if (core.error) {
      return (
        <div className="content">
          <div className="form-error">
            We couldn&apos;t load your portal. {core.error.message.startsWith("NOT_WIRED") ? "The live data connection isn't wired yet." : "Please refresh the page."}
          </div>
        </div>
      );
    }
    return (
      <div className="content">
        <Loading rows={3} />
      </div>
    );
  }

  const { student, membership } = core.data;
  const access = hasAccess(membership);
  const isLevel2 = membership.level === "level_2";
  const counts = unread.data ?? { messages: 0, notifications: 0 };
  const allowed = access || ALWAYS_OPEN.includes(pathname);
  const name = student.preferredName || student.firstName;

  return (
    <Ctx.Provider value={{ student, membership }}>
      <div className={`shell${navOpen ? " is-nav-open" : ""}`}>
        <aside className="sidebar" aria-label="Portal navigation">
          <div className="sidebar__brand">
            <span className="sidebar__logo">BTM</span>
            <span className="sidebar__sublogo">MEMBERS PORTAL</span>
          </div>
          <nav className="nav">
            {NAV.map((g) => (
              <div key={g.group || "top"} style={{ display: "contents" }}>
                {g.group && <span className="nav__group">{g.group}</span>}
                {g.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const badge = item.badge ? counts[item.badge] : 0;
                  return (
                    <Link key={item.href} href={item.href} className={`nav__link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                      {item.level2 && !isLevel2 ? (
                        <span className="nav__lock">LEVEL 2</span>
                      ) : badge > 0 ? (
                        <span className="nav__badge" aria-label={`${badge} unread`}>{badge}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="sidebar__bottom">
            <div className="support-card">
              <span className="eyebrow eyebrow--taupe">Need support?</span>
              <h3>Message the BTM team</h3>
              <Link href="/communications" className="btn btn--light btn--sm btn--block">
                Open support
              </Link>
            </div>
            <button type="button" className="signout" onClick={signOut}>
              <Icon name="logout" size={14} /> Sign out
            </button>
          </div>
        </aside>
        <div className="backdrop" onClick={() => setNavOpen(false)} />

        <div className="main">
          <header className="topbar">
            <div className="topbar__title">
              <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}>
                <Icon name="menu" />
              </button>
              <div style={{ minWidth: 0 }}>
                <span className="eyebrow">BTM {LEVEL_LABEL[membership.level].name}</span>
                <strong>{titleFor(pathname)}</strong>
              </div>
            </div>
            <div className="topbar__right">
              <span className={`live${connected ? "" : " is-off"}`} title={connected ? "Updates appear automatically" : "Reconnecting…"}>
                <span className="live__label">{connected ? "Live" : "Reconnecting"}</span>
              </span>
              <Link href="/notifications" className="icon-btn bell" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}>
                <Icon name="bell" />
                {counts.notifications > 0 && <span className="bell__dot" />}
              </Link>
              <div className={`profile${menuOpen ? " is-open" : ""}`}>
                <button type="button" className="profile__btn" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
                  <span className="avatar">{initials(student.firstName, student.lastName)}</span>
                  <span className="profile__name">
                    <strong>{name} {student.lastName}</strong>
                    <span>{student.businessName}</span>
                  </span>
                  <Icon name="chevron" size={15} />
                </button>
                {menuOpen && (
                  <div className="profile__menu" role="menu">
                    <Link href="/settings" role="menuitem"><Icon name="user" size={17} /> My Details</Link>
                    <Link href="/membership" role="menuitem"><Icon name="card" size={17} /> Membership &amp; Billing</Link>
                    <button type="button" role="menuitem" className="is-signout" onClick={signOut}><Icon name="logout" size={17} /> Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {ds.mode === "sample" && (
            <div className="banner banner--sample">
              <span>Sample mode — you&apos;re seeing example data, not real members.</span>
              <a href="/dev/staff" target="_blank" rel="noreferrer">Open Staff Simulator</a>
            </div>
          )}
          {membership.status === "past_due" && (
            <div className="banner banner--warn">
              <span>Your last payment didn&apos;t go through. Update your card to keep your access.</span>
              <Link href="/membership">Update payment</Link>
            </div>
          )}
          {membership.status === "canceled" && access && (
            <div className="banner">
              <span>Your membership is cancelled. You have access until {formatDate(membership.accessUntil)}.</span>
              <Link href="/membership">Manage membership</Link>
            </div>
          )}

          <main className="content">
            {allowed ? children : <InactiveAccess onSignOut={signOut} />}
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}

function InactiveAccess({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="locked">
      <span className="eyebrow eyebrow--taupe">BTM Members Portal</span>
      <h2 style={{ color: "var(--white)" }}>Your membership isn&apos;t active right now.</h2>
      <p>
        You&apos;re signed in, but this email doesn&apos;t currently have an active Level 1 or Level 2 membership. Your
        history is kept safe. Reactivate to pick up where you left off, or message the BTM team if you think this is a mistake.
      </p>
      <div className="hero__actions">
        <Link className="btn btn--light" href="/membership">View membership</Link>
        <button type="button" className="btn" style={{ borderColor: "var(--black-line)" }} onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
