"use client";

import Link from "next/link";
import { usePortal } from "@/components/PortalShell";
import { PageHead } from "@/components/ui";

const INCLUDES = [
  ["12-Month System & Implementation Pathway", "A structured pathway that turns strategy into consistent implementation."],
  ["Advanced Templates & Documentation", "Frameworks and documentation built to support growth."],
  ["Advanced Systems Library", "A growing library of systems and practical resources for scaling."],
  ["Implementation Support", "Hands-on support applying the systems inside your business."],
];

export default function ScaleSocietyPage() {
  const { membership } = usePortal();
  const unlocked = membership.level === "level_2";

  if (!unlocked) {
    return (
      <>
        <PageHead eyebrow="Level 2" title="Scale Society" />
        <div className="locked">
          <span className="eyebrow eyebrow--taupe">Level 2 · Locked</span>
          <h2 style={{ color: "var(--white)" }}>Scale with systems and implementation.</h2>
          <p>Everything in Level 1, plus the 12-month pathway, advanced templates, the systems library and implementation support. Upgrade from +$99 AUD per week.</p>
          <Link href="/membership#upgrade" className="btn btn--light">See upgrade options</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Level 2" title="Scale Society" intro="Your 12-month pathway and advanced systems. New modules appear here as the team releases them." />
      <div className="grid grid-2">
        {INCLUDES.map(([t, d], i) => (
          <div key={t} className="card">
            <span className="num">0{i + 1}</span>
            <h3 style={{ marginTop: 10 }}>{t}</h3>
            <p className="small muted" style={{ marginTop: 8 }}>{d}</p>
          </div>
        ))}
      </div>
      <div className="empty section">Pathway modules will connect here once the Scale Society content is migrated from Shopify.</div>
    </>
  );
}
