import type { BillingInterval, Membership, MembershipLevel, PriorityLevel, PriorityStatus, ResourceCategory } from "./data/types";

const TZ = "Australia/Brisbane"; // BTM operates on Brisbane time (matches Power Session booking)

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat("en-AU", { timeZone: iso.length === 10 ? undefined : TZ, ...opts }).format(d);
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso, { day: "numeric", month: "short" });
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function formatAud(dollars: number | null) {
  if (dollars == null) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(dollars);
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(new Date(y!, (m ?? 1) - 1, 1));
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export const LEVEL_LABEL: Record<MembershipLevel, { short: string; name: string }> = {
  level_1: { short: "Level 1", name: "Business Advisory & Support" },
  level_2: { short: "Level 2", name: "Scale Society" },
};

export const INTERVAL_LABEL: Record<BillingInterval, string> = { week: "weekly", month: "monthly", year: "annually" };

/** Approved prices from the live Advisory page (AUD). Stripe remains the source of truth. */
export const PRICES: Record<MembershipLevel, Record<BillingInterval, number>> = {
  level_1: { week: 199, month: 729, year: 6199 },
  level_2: { week: 299, month: 1099, year: 7774 },
};
export const UPGRADE_PRICES: Record<BillingInterval, number> = { week: 99, month: 356, year: 3326 };

export function hasAccess(m: Membership | undefined) {
  if (!m) return false;
  if (m.status === "active" || m.status === "trialing" || m.status === "past_due") return true;
  if (m.status === "canceled" && m.accessUntil) return new Date(m.accessUntil).getTime() > Date.now();
  return false;
}

export const STATUS_LABEL: Record<PriorityStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export const LEVEL_PRIORITY_LABEL: Record<PriorityLevel, string> = { high: "High", medium: "Medium", low: "Low" };

export const RESOURCE_CATEGORY_LABEL: Record<ResourceCategory, string> = {
  business_audit: "Business Audit",
  monthly_check_in: "Monthly Check-In",
  support_plan: "Support Plan",
  action_priorities: "Action & Priorities",
  template: "Templates & Tools",
  other: "Other",
};

export function initials(first?: string | null, last?: string | null) {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "BT";
}
