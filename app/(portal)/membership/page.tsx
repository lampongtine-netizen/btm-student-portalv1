"use client";

import Link from "next/link";
import { useState } from "react";
import { usePortal } from "@/components/PortalShell";
import { PageHead, useToast } from "@/components/ui";
import { useDataSource } from "@/lib/data/provider";
import type { BillingInterval, MembershipStatus } from "@/lib/data/types";
import { formatDate, formatMoney, hasAccess, INTERVAL_LABEL, LEVEL_LABEL, PRICES, UPGRADE_PRICES } from "@/lib/format";

const STATUS: Record<MembershipStatus, { label: string; cls: string; note: string }> = {
  active: { label: "Active", cls: "pill pill--done", note: "Your membership renews automatically." },
  trialing: { label: "Trial", cls: "pill pill--progress", note: "You're in your trial period." },
  past_due: { label: "Payment failed", cls: "pill pill--high", note: "Stripe will retry your card. Update your payment method to avoid losing access." },
  canceled: { label: "Cancelled", cls: "pill", note: "Your membership won't renew." },
  inactive: { label: "Inactive", cls: "pill pill--high", note: "You don't have an active membership." },
};

const INTERVALS: BillingInterval[] = ["week", "month", "year"];

export default function MembershipPage() {
  const ds = useDataSource();
  const { membership } = usePortal();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const status = STATUS[membership.status];
  const level = LEVEL_LABEL[membership.level];

  async function openBilling() {
    setBusy("billing");
    try {
      const url = await ds.getBillingPortalUrl();
      if (url) window.location.assign(url);
      else toast.show("Billing management connects to Stripe once the live system is wired. For now, message the BTM team.");
    } catch {
      toast.show("Couldn't open billing right now. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  async function upgrade(interval: BillingInterval) {
    setBusy(interval);
    try {
      const url = await ds.getUpgradeUrl(interval);
      if (url) window.location.assign(url);
      else toast.show("Upgrade checkout connects to Stripe once the live system is wired.");
    } catch {
      toast.show("Couldn't start the upgrade. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead eyebrow="Your subscription" title="Membership & Billing" intro="Your plan, renewal and payment details. Payments are processed securely by Stripe." />

      <div className="grid grid-main">
        <div className="stack">
          <div className="card">
            <div className="card__head">
              <div>
                <span className="eyebrow">Current plan</span>
                <h2 style={{ marginTop: 8 }}>{level.short} · {level.name}</h2>
              </div>
              <span className={status.cls}>{status.label}</span>
            </div>
            <ul className="list">
              <li><span className="muted" style={{ width: 170 }}>Price</span><strong>{formatMoney(membership.amountCents)} AUD, billed {INTERVAL_LABEL[membership.interval]}</strong></li>
              <li><span className="muted" style={{ width: 170 }}>Member since</span><span>{formatDate(membership.startedAt)}</span></li>
              {membership.status === "canceled" ? (
                <li><span className="muted" style={{ width: 170 }}>Access until</span><strong>{formatDate(membership.accessUntil)}</strong></li>
              ) : (
                <li><span className="muted" style={{ width: 170 }}>Next payment</span><span>{formatDate(membership.currentPeriodEnd)}</span></li>
              )}
              <li><span className="muted" style={{ width: 170 }}>Portal access</span><span>{hasAccess(membership) ? "Open" : "Paused"}</span></li>
            </ul>
            <p className="small muted" style={{ marginTop: 14 }}>{status.note}</p>
            <div className="hero__actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn" disabled={busy === "billing"} onClick={openBilling}>
                {membership.status === "past_due" ? "Update payment method" : "Manage billing"}
              </button>
              <Link href="/communications" className="btn btn--ghost">Ask about my membership</Link>
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>
              Manage billing opens Stripe&apos;s secure page, where you can update your card, download invoices or cancel. Cancelling stops future renewals; you keep access until the end of your paid period.
            </p>
          </div>

          {membership.level === "level_1" && (
            <div className="card card--dark" id="upgrade">
              <span className="eyebrow eyebrow--taupe">Level 1 member · Scale Society</span>
              <h2 style={{ marginTop: 10, color: "var(--white)" }}>Ready to upgrade?</h2>
              <p className="small" style={{ marginTop: 10, color: "#d9d5ce", maxWidth: 560 }}>
                Add the 12-month System &amp; Implementation Pathway, advanced templates, the systems library and implementation support. Your current support and history stay exactly as they are.
              </p>
              <div className="grid grid-3" style={{ marginTop: 20, gap: 12 }}>
                {INTERVALS.map((i) => (
                  <div key={i} style={{ padding: 18, border: "1px solid var(--black-line)" }}>
                    <span className="eyebrow eyebrow--taupe">{i === "week" ? "Weekly" : i === "month" ? "Monthly" : "Annual"}</span>
                    <p style={{ marginTop: 8 }}><span className="serif" style={{ fontSize: 30 }}>+${UPGRADE_PRICES[i].toLocaleString("en-AU")}</span><span className="small" style={{ color: "#a9a39a" }}> AUD / {i}</span></p>
                    <button type="button" className="btn btn--light btn--sm btn--block" style={{ marginTop: 12 }} disabled={busy === i} onClick={() => upgrade(i)}>
                      Upgrade {i === "week" ? "weekly" : i === "month" ? "monthly" : "annually"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card card--paper">
            <span className="eyebrow">Plan prices (AUD)</span>
            <table style={{ marginTop: 12 }}>
              <thead><tr><th></th><th>Level 1</th><th>Level 2</th></tr></thead>
              <tbody>
                {INTERVALS.map((i) => (
                  <tr key={i}>
                    <td className="small">{i === "week" ? "Weekly" : i === "month" ? "Monthly" : "Annual"}</td>
                    <td className="small">${PRICES.level_1[i].toLocaleString("en-AU")}</td>
                    <td className="small">${PRICES.level_2[i].toLocaleString("en-AU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <span className="eyebrow">Good to know</span>
            <ul className="bullets" style={{ marginTop: 10 }}>
              <li className="small">Your login stays the same if you change plans.</li>
              <li className="small">If a payment fails, you keep access while Stripe retries.</li>
              <li className="small">Your history is kept if your membership pauses.</li>
            </ul>
          </div>
        </div>
      </div>
      {toast.node}
    </>
  );
}
