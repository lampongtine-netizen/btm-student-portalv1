"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePortal } from "@/components/PortalShell";
import { Icon } from "@/components/Icon";
import { ErrorBox, LevelPill, Loading, Modal, PageHead, StatusPill, useToast } from "@/components/ui";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import type { Priority, PriorityCategory, PriorityLevel, PriorityStatus } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

const CATEGORIES: PriorityCategory[] = [
  "Marketing Growth",
  "Client Retention",
  "Business Strategy",
  "Financials",
  "Systems & Operations",
  "Team & Leadership",
  "Pricing & Packages",
  "Education",
  "Other",
];
type Filter = "all" | "high" | "week" | "month" | "completed";

function daysUntil(date: string | null) {
  if (!date) return Infinity;
  return (new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000;
}

export default function PrioritiesPage() {
  const ds = useDataSource();
  const { student } = usePortal();
  const toast = useToast();
  const q = useLiveQuery((d) => d.listPriorities(), ["priorities"]);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Priority | "new" | null>(null);

  const list = q.data ?? [];
  const counts = useMemo(() => {
    const open = list.filter((p) => p.status !== "completed");
    return {
      all: list.length,
      high: open.filter((p) => p.level === "high").length,
      week: open.filter((p) => daysUntil(p.dueDate) <= 7).length,
      month: open.filter((p) => daysUntil(p.dueDate) <= 31).length,
      completed: list.filter((p) => p.status === "completed").length,
      inProgress: list.filter((p) => p.status === "in_progress").length,
      notStarted: list.filter((p) => p.status === "not_started").length,
    };
  }, [list]);
  const visible = list.filter((p) => {
    if (filter === "all") return true;
    if (filter === "completed") return p.status === "completed";
    if (p.status === "completed") return false;
    if (filter === "high") return p.level === "high";
    if (filter === "week") return daysUntil(p.dueDate) <= 7;
    return daysUntil(p.dueDate) <= 31;
  });
  const pct = counts.all ? Math.round((counts.completed / counts.all) * 100) : 0;

  async function setStatus(p: Priority, status: PriorityStatus) {
    try {
      await ds.updatePriority(p.id, { status });
      if (status === "completed") toast.show("Nice work — priority completed. The BTM team can see your progress.");
    } catch {
      toast.show("Couldn't update that priority. Please try again.");
    }
  }
  async function remove(p: Priority) {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await ds.deletePriority(p.id);
    } catch {
      toast.show("Couldn't delete that priority.");
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Focus & action"
        title="Priority List"
        intro="Focus on what matters most right now. Tick off tasks as you go — Bree and the team see your progress and can add guidance."
        action={
          <button type="button" className="btn" onClick={() => setEditing("new")}>
            <Icon name="plus" size={15} /> Add priority
          </button>
        }
      />

      <div className="stats">
        <div className="stat"><span className="eyebrow">Total priorities</span><strong>{counts.all}</strong></div>
        <div className="stat"><span className="eyebrow">Completed</span><strong>{pct}%</strong><span className="small muted">{counts.completed} of {counts.all}</span></div>
        <div className="stat"><span className="eyebrow">Due this week</span><strong>{counts.week}</strong></div>
        <div className="stat"><span className="eyebrow">Current focus</span><p style={{ marginTop: 8, fontWeight: 700 }}>{student.currentFocus || "Not set"}</p></div>
      </div>

      <div className="stack section">
        <div>
          <div className="chips" role="tablist" aria-label="Filter priorities" style={{ marginBottom: 16 }}>
            {(
              [
                ["all", "All", counts.all],
                ["high", "High priority", counts.high],
                ["week", "This week", counts.week],
                ["month", "This month", counts.month],
                ["completed", "Completed", counts.completed],
              ] as const
            ).map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={filter === key} className={`chip${filter === key ? " is-active" : ""}`} onClick={() => setFilter(key)}>
                {label}<span>{n}</span>
              </button>
            ))}
          </div>

          {q.error ? (
            <ErrorBox error={q.error} onRetry={q.refresh} />
          ) : q.loading ? (
            <Loading />
          ) : visible.length === 0 ? (
            <div className="empty">No priorities in this view. Change the filter or add a new priority.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}><span className="sr-only">Done</span></th>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className={p.status === "completed" ? "is-done-row" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Mark "${p.title}" ${p.status === "completed" ? "not done" : "done"}`}
                          checked={p.status === "completed"}
                          onChange={(e) => setStatus(p, e.target.checked ? "completed" : "in_progress")}
                          style={{ width: 18, height: 18, accentColor: "var(--black)" }}
                        />
                      </td>
                      <td className="task" style={{ minWidth: 220 }}>
                        <strong>{p.title}</strong>
                        {p.createdBy === "staff" && <span className="pill" style={{ marginLeft: 8 }}>From BTM</span>}
                        {p.staffNote && (
                          <p className="small" style={{ marginTop: 6, textDecoration: "none", color: "var(--black)" }}>
                            <strong>Bree:</strong> {p.staffNote}
                          </p>
                        )}
                      </td>
                      <td className="small">{p.category}</td>
                      <td><LevelPill level={p.level} /></td>
                      <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDate(p.dueDate)}</td>
                      <td>
                        <select
                          className="select"
                          aria-label="Status"
                          value={p.status}
                          onChange={(e) => setStatus(p, e.target.value as PriorityStatus)}
                          style={{ minHeight: 34, padding: "4px 8px", fontSize: 12, width: 130 }}
                        >
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setEditing(p)}>
                          <Icon name="settings" size={16} />
                        </button>
                        {p.createdBy === "student" && (
                          <button type="button" className="icon-btn" aria-label="Delete" onClick={() => remove(p)}>
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-3">
          <div className="card">
            <span className="eyebrow">Progress</span>
            <h3 style={{ marginTop: 8 }}>{pct}% completed</h3>
            <div className="progress" style={{ marginTop: 14 }}><span style={{ width: `${pct}%` }} /></div>
            <ul className="list" style={{ marginTop: 18 }}>
              <li><StatusPill status="completed" /><span style={{ marginLeft: "auto" }}>{counts.completed}</span></li>
              <li><StatusPill status="in_progress" /><span style={{ marginLeft: "auto" }}>{counts.inProgress}</span></li>
              <li><StatusPill status="not_started" /><span style={{ marginLeft: "auto" }}>{counts.notStarted}</span></li>
            </ul>
          </div>
          <div className="card card--dark">
            <span className="eyebrow eyebrow--taupe">You&apos;ve got this</span>
            <h3 style={{ marginTop: 10, color: "var(--white)" }}>Small, consistent steps create big results.</h3>
            <p className="small" style={{ marginTop: 10, color: "#d9d5ce" }}>Keep showing up for the priorities that matter.</p>
          </div>
          <div className="card card--paper">
            <span className="eyebrow">Current focus</span>
            <p style={{ marginTop: 10, fontWeight: 700 }}>{student.currentFocus || "Not set yet"}</p>
            <Link href="/settings#focus" className="link-arrow" style={{ marginTop: 14 }}>Update focus</Link>
          </div>
        </div>
      </div>

      {editing && <PriorityForm priority={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(msg) => toast.show(msg)} />}
      {toast.node}
    </>
  );
}

function PriorityForm({ priority, onClose, onSaved }: { priority: Priority | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const ds = useDataSource();
  const [title, setTitle] = useState(priority?.title ?? "");
  const [category, setCategory] = useState<PriorityCategory>(priority?.category ?? "Business Strategy");
  const [level, setLevel] = useState<PriorityLevel>(priority?.level ?? "medium");
  const [dueDate, setDueDate] = useState(priority?.dueDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Add a short description of the task.");
    setBusy(true);
    setError(null);
    try {
      const input = { title: title.trim(), category, level, dueDate: dueDate || null };
      if (priority) await ds.updatePriority(priority.id, input);
      else await ds.createPriority(input);
      onSaved(priority ? "Priority updated." : "Priority added. The BTM team can now see it.");
      onClose();
    } catch {
      setError("Couldn't save. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Modal title={priority ? "Edit priority" : "Add new priority"} eyebrow="Focus & action" onClose={onClose}>
      <p className="small muted" style={{ marginBottom: 18 }}>Keep it simple: one clear action, one focus area and a realistic due date.</p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Task <em>*</em></span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} autoFocus required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Category</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value as PriorityCategory)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <select className="select" value={level} onChange={(e) => setLevel(e.target.value as PriorityLevel)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="field full">
            <span>Due date</span>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save priority"}</button>
        </div>
      </form>
    </Modal>
  );
}
