"use client";

import Link from "next/link";
import { useState } from "react";
import { usePortal } from "@/components/PortalShell";
import { Icon } from "@/components/Icon";
import { ErrorBox, Loading, PageHead } from "@/components/ui";
import { useLiveQuery } from "@/lib/data/provider";
import type { ResourceCategory } from "@/lib/data/types";
import { formatDate, RESOURCE_CATEGORY_LABEL } from "@/lib/format";

type Doc = { id: string; title: string; description: string; category: ResourceCategory; date: string; url: string | null; locked: boolean; isNew: boolean };

export default function ResourcesPage() {
  const { membership } = usePortal();
  const [cat, setCat] = useState<ResourceCategory | "all">("all");
  const [search, setSearch] = useState("");
  const q = useLiveQuery(
    async (ds) => {
      const [resources, plans] = await Promise.all([ds.listResources(), ds.listSupportPlans()]);
      return { resources, plans };
    },
    ["resources", "support_plans"],
  );

  if (q.error) return <ErrorBox error={q.error} onRetry={q.refresh} />;
  if (!q.data) return <Loading rows={3} />;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const isLevel2 = membership.level === "level_2";
  const docs: Doc[] = [
    ...q.data.plans.map<Doc>((p) => ({
      id: p.id,
      title: p.title,
      description: "Your personalised BTM Support Plan.",
      category: "support_plan",
      date: p.preparedAt,
      url: p.fileUrl,
      locked: false,
      isNew: new Date(p.preparedAt).getTime() > weekAgo,
    })),
    ...q.data.resources.map<Doc>((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      date: r.createdAt,
      url: r.fileUrl,
      locked: r.requiredLevel === "level_2" && !isLevel2,
      isNew: new Date(r.createdAt).getTime() > weekAgo,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const cats = (Object.keys(RESOURCE_CATEGORY_LABEL) as ResourceCategory[]).filter((c) => docs.some((d) => d.category === c));
  const term = search.trim().toLowerCase();
  const visible = docs.filter((d) => (cat === "all" || d.category === cat) && (!term || `${d.title} ${d.description}`.toLowerCase().includes(term)));

  return (
    <>
      <PageHead
        eyebrow="Your files"
        title="Resources"
        intro="Your Support Plans, personalised BTM files and the templates selected for the priorities you're implementing."
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 18 }}>
        <div className="chips">
          <button type="button" className={`chip${cat === "all" ? " is-active" : ""}`} onClick={() => setCat("all")}>All<span>{docs.length}</span></button>
          {cats.map((c) => (
            <button key={c} type="button" className={`chip${cat === c ? " is-active" : ""}`} onClick={() => setCat(c)}>
              {RESOURCE_CATEGORY_LABEL[c]}<span>{docs.filter((d) => d.category === c).length}</span>
            </button>
          ))}
        </div>
        <input className="input" type="search" placeholder="Search resources" aria-label="Search resources" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
      </div>

      {visible.length === 0 ? (
        <div className="empty">No documents found. Try another category or search term.</div>
      ) : (
        <div className="grid grid-3">
          {visible.map((d) => (
            <article key={d.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span className="eyebrow">{RESOURCE_CATEGORY_LABEL[d.category]}</span>
                {d.locked ? <span className="pill pill--dark"><Icon name="lock" size={11} /> Level 2</span> : d.isNew ? <span className="pill pill--new">New</span> : null}
              </div>
              <h3>{d.title}</h3>
              <p className="small muted" style={{ flex: 1 }}>{d.description}</p>
              <span className="small muted">Added {formatDate(d.date)}</span>
              {d.locked ? (
                <Link href="/membership#upgrade" className="btn btn--sm btn--ghost">Unlock with Scale Society</Link>
              ) : d.url ? (
                <a href={d.url} target="_blank" rel="noreferrer" className="btn btn--sm"><Icon name="download" size={14} /> Open</a>
              ) : (
                <span className="btn btn--sm btn--ghost" aria-disabled="true" style={{ opacity: 0.5 }}>File coming soon</span>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="card card--dark section" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <span className="eyebrow eyebrow--taupe">Need something else?</span>
          <h3 style={{ marginTop: 8, color: "var(--white)" }}>Ask the BTM team to create or add a resource for you.</h3>
        </div>
        <Link href="/communications" className="btn btn--light">Ask BTM</Link>
      </div>
    </>
  );
}
