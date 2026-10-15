"use client";

import type { DataSource, AuditDraft, CheckInDraft, NewPriority, PriorityPatch, StudentPatch } from "./source";
import type {
  BusinessAudit,
  CheckIn,
  Membership,
  Message,
  NotificationKind,
  PortalNotification,
  PowerSession,
  Priority,
  Session,
  Student,
  SupportPlan,
  Topic,
} from "./types";
import { createSeed, SAMPLE_EMAIL, SAMPLE_STUDENT_ID, type SampleDb } from "./seed";

/**
 * In-browser sample data source.
 *
 * - Data lives in this browser's storage, so it survives reloads.
 * - Changes are announced across tabs with BroadcastChannel. Open the Staff
 *   Simulator (/dev/staff) in a second tab to see "real-time" updates — this
 *   mimics the Supabase Realtime flow the live version will use.
 * - Nothing here talks to a server. It is for building and reviewing screens.
 */

const DB_KEY = "btm-student-portal:sample-db:v1";
const SESSION_KEY = "btm-student-portal:sample-session:v1";
const CHANNEL = "btm-student-portal:sample";
export const SAMPLE_LOGIN_CODE = "123456";

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const pause = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function readStore<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked (private mode) — fall back to memory only */
  }
}
function removeStore(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

type Listener = (topic: Topic) => void;

class SampleDataSource implements DataSource {
  readonly mode = "sample" as const;
  private memoryDb: SampleDb | null = null;
  private listeners = new Set<{ topics: Set<Topic>; cb: Listener }>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<{ topics: Topic[] }>) => {
        this.memoryDb = null; // another tab changed the data; re-read storage
        e.data.topics.forEach((t) => this.dispatch(t));
      };
    }
  }

  // ---------- storage helpers ----------
  private db(): SampleDb {
    if (this.memoryDb) return this.memoryDb;
    const stored = readStore<SampleDb>(DB_KEY);
    this.memoryDb = stored ?? createSeed();
    if (!stored) writeStore(DB_KEY, this.memoryDb);
    return this.memoryDb;
  }
  private commit(topics: Topic[]) {
    writeStore(DB_KEY, this.memoryDb);
    topics.forEach((t) => this.dispatch(t));
    this.channel?.postMessage({ topics });
  }
  private dispatch(topic: Topic) {
    this.listeners.forEach((l) => {
      if (l.topics.has(topic)) l.cb(topic);
    });
  }
  private notify(kind: NotificationKind, title: string, body: string, href: string | null) {
    const n: PortalNotification = {
      id: uid("ntf"),
      studentId: SAMPLE_STUDENT_ID,
      kind,
      title,
      body,
      href,
      createdAt: now(),
      readAt: null,
    };
    this.db().notifications.unshift(n);
  }
  private requireSession() {
    const s = readStore<Session>(SESSION_KEY);
    if (!s) throw new Error("NOT_SIGNED_IN");
    return s;
  }

  // ---------- auth ----------
  async getSession() {
    return readStore<Session>(SESSION_KEY);
  }
  async requestLoginCode(email: string) {
    await pause(400);
    if (!email.includes("@")) return { ok: false as const, reason: "Enter a valid email address." };
    return { ok: true as const };
  }
  async verifyLoginCode(email: string, code: string) {
    await pause(400);
    if (code.trim() !== SAMPLE_LOGIN_CODE) {
      return { ok: false as const, reason: "That code is not correct. In sample mode, use 123456." };
    }
    writeStore(SESSION_KEY, { studentId: SAMPLE_STUDENT_ID, email: email || SAMPLE_EMAIL } satisfies Session);
    return { ok: true as const };
  }
  async signOut() {
    removeStore(SESSION_KEY);
  }

  // ---------- profile + membership ----------
  async getStudent(): Promise<Student> {
    this.requireSession();
    return clone(this.db().student);
  }
  async updateStudent(patch: StudentPatch) {
    this.requireSession();
    Object.assign(this.db().student, patch);
    this.commit(["student"]);
    return clone(this.db().student);
  }
  async completeOnboarding() {
    this.db().student.onboardingComplete = true;
    this.commit(["student"]);
  }
  async getMembership(): Promise<Membership> {
    this.requireSession();
    return clone(this.db().membership);
  }
  async getBillingPortalUrl() {
    return null; // live version: server route creates a Stripe Billing Portal session
  }
  async getUpgradeUrl() {
    return null; // live version: server route creates a Stripe Checkout session
  }

  // ---------- priorities ----------
  async listPriorities() {
    this.requireSession();
    return clone(this.db().priorities).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async createPriority(input: NewPriority) {
    this.requireSession();
    const p: Priority = {
      id: uid("pri"),
      studentId: SAMPLE_STUDENT_ID,
      title: input.title.trim(),
      category: input.category,
      level: input.level,
      dueDate: input.dueDate,
      status: "not_started",
      staffNote: null,
      createdBy: "student",
      createdAt: now(),
      updatedAt: now(),
      completedAt: null,
    };
    this.db().priorities.unshift(p);
    this.commit(["priorities"]);
    return clone(p);
  }
  async updatePriority(id: string, patch: PriorityPatch) {
    this.requireSession();
    const p = this.db().priorities.find((x) => x.id === id);
    if (!p) throw new Error("NOT_FOUND");
    Object.assign(p, patch, { updatedAt: now() });
    if (patch.status) p.completedAt = patch.status === "completed" ? now() : null;
    this.commit(["priorities"]);
    return clone(p);
  }
  async deletePriority(id: string) {
    this.requireSession();
    this.db().priorities = this.db().priorities.filter((x) => x.id !== id);
    this.commit(["priorities"]);
  }

  // ---------- messages ----------
  async listMessages() {
    this.requireSession();
    return clone(this.db().messages).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async sendMessage(body: string, attachment?: File | null) {
    this.requireSession();
    const s = this.db().student;
    const m: Message = {
      id: uid("msg"),
      studentId: s.id,
      sender: "student",
      senderName: `${s.firstName} ${s.lastName}`,
      body: body.trim(),
      attachmentName: attachment?.name ?? null,
      attachmentUrl: null,
      createdAt: now(),
      readAt: null,
    };
    this.db().messages.push(m);
    this.commit(["messages"]);
    return clone(m);
  }
  async markMessagesRead() {
    let changed = false;
    this.db().messages.forEach((m) => {
      if (m.sender === "staff" && !m.readAt) {
        m.readAt = now();
        changed = true;
      }
    });
    this.db().notifications.forEach((n) => {
      if (n.kind === "message" && !n.readAt) {
        n.readAt = now();
        changed = true;
      }
    });
    if (changed) this.commit(["messages", "notifications"]);
  }

  // ---------- support plans ----------
  async listSupportPlans() {
    this.requireSession();
    return clone(this.db().supportPlans.filter((p) => p.status === "published")).sort((a, b) =>
      b.preparedAt.localeCompare(a.preparedAt),
    );
  }

  // ---------- business audit ----------
  async getBusinessAudit() {
    this.requireSession();
    return clone(this.db().audit);
  }
  async saveBusinessAudit(draft: AuditDraft, submit: boolean) {
    this.requireSession();
    const existing = this.db().audit;
    const audit: BusinessAudit = {
      id: existing?.id ?? uid("aud"),
      studentId: SAMPLE_STUDENT_ID,
      ...draft,
      submittedAt: submit ? now() : existing?.submittedAt ?? null,
      status: submit ? "submitted" : existing?.status === "reviewed" ? "reviewed" : "draft",
      scores: existing?.scores ?? { total: null, financials: null, clientRetention: null, systemsTeam: null },
    };
    this.db().audit = audit;
    this.commit(["business_audit"]);
    return clone(audit);
  }

  // ---------- check-ins ----------
  async listCheckIns() {
    this.requireSession();
    return clone(this.db().checkIns).sort((a, b) => b.month.localeCompare(a.month));
  }
  async saveCheckIn(draft: CheckInDraft, submit: boolean) {
    this.requireSession();
    const list = this.db().checkIns;
    const existing = list.find((c) => c.month === draft.month);
    const ci: CheckIn = {
      id: existing?.id ?? uid("ci"),
      studentId: SAMPLE_STUDENT_ID,
      ...draft,
      submittedAt: submit ? now() : existing?.submittedAt ?? null,
      status: submit ? "submitted" : existing?.status ?? "draft",
      staffReply: existing?.staffReply ?? null,
    };
    if (existing) Object.assign(existing, ci);
    else list.unshift(ci);
    this.commit(["check_ins"]);
    return clone(ci);
  }

  // ---------- power sessions ----------
  async listPowerSessions() {
    this.requireSession();
    return clone(this.db().powerSessions).sort((a, b) =>
      (b.scheduledAt ?? b.id).localeCompare(a.scheduledAt ?? a.id),
    );
  }
  async requestPowerSession(focus: string, preferredTimes: string) {
    this.requireSession();
    const ps: PowerSession = {
      id: uid("ps"),
      studentId: SAMPLE_STUDENT_ID,
      scheduledAt: null,
      status: "requested",
      joinUrl: null,
      rescheduleUrl: null,
      focus: focus.trim() || null,
      notes: preferredTimes.trim() ? `Preferred times: ${preferredTimes.trim()}` : null,
      recordingUrl: null,
    };
    this.db().powerSessions.unshift(ps);
    this.commit(["power_sessions"]);
    return clone(ps);
  }

  // ---------- resources ----------
  async listResources() {
    this.requireSession();
    return clone(this.db().resources).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---------- notifications ----------
  async listNotifications() {
    this.requireSession();
    return clone(this.db().notifications).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async markNotificationRead(id: string | "all") {
    this.db().notifications.forEach((n) => {
      if ((id === "all" || n.id === id) && !n.readAt) n.readAt = now();
    });
    this.commit(["notifications"]);
  }

  // ---------- realtime ----------
  subscribe(topics: Topic[], onChange: Listener) {
    const entry = { topics: new Set(topics), cb: onChange };
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }
  onConnectionChange(cb: (connected: boolean) => void) {
    cb(true);
    return () => {};
  }

  // ============================================================
  // Staff Simulator actions (sample mode only).
  // In the live system these come from the Staff Portal writing to the
  // shared database; the student portal hears about them via Realtime.
  // ============================================================
  sim = {
    staffReply: (body: string) => {
      this.db().messages.push({
        id: uid("msg"),
        studentId: SAMPLE_STUDENT_ID,
        sender: "staff",
        senderName: "Bree Wilkinson",
        body,
        attachmentName: null,
        attachmentUrl: null,
        createdAt: now(),
        readAt: null,
      });
      this.notify("message", "New message from Bree", body.slice(0, 90), "/communications");
      this.commit(["messages", "notifications"]);
    },
    staffReadMessages: () => {
      this.db().messages.forEach((m) => {
        if (m.sender === "student" && !m.readAt) m.readAt = now();
      });
      this.commit(["messages"]);
    },
    publishSupportPlan: () => {
      const n = this.db().supportPlans.length + 1;
      const base = this.db().supportPlans[0];
      const plan: SupportPlan = {
        ...(base ? clone(base) : (createSeed().supportPlans[0] as SupportPlan)),
        id: uid("sp"),
        title: `Support Plan — Cycle ${n}`,
        preparedAt: now(),
        fileName: `Support-Plan-Cycle-${n}.pdf`,
        status: "published",
      };
      this.db().supportPlans.unshift(plan);
      this.notify("support_plan", "New Support Plan ready", plan.title, "/support-plan");
      this.commit(["support_plans", "notifications"]);
    },
    addPriorityNote: (id: string, note: string) => {
      const p = this.db().priorities.find((x) => x.id === id);
      if (!p) return;
      p.staffNote = note;
      p.updatedAt = now();
      this.notify("priority", "Bree added guidance to a priority", p.title, "/priorities");
      this.commit(["priorities", "notifications"]);
    },
    setMembership: (patch: Partial<Membership>) => {
      Object.assign(this.db().membership, patch);
      this.notify("membership", "Membership updated", "Your membership details have changed.", "/membership");
      this.commit(["membership", "notifications"]);
    },
    scoreAudit: () => {
      const a = this.db().audit;
      if (!a) return;
      a.status = "reviewed";
      a.scores = { total: 102, financials: 16, clientRetention: 14, systemsTeam: 15 };
      this.notify("check_in", "Your Business Audit has been reviewed", "Your scores are now in your Support Plan.", "/business-audit");
      this.commit(["business_audit", "notifications"]);
    },
    reset: () => {
      this.memoryDb = createSeed();
      this.commit([
        "student",
        "membership",
        "priorities",
        "messages",
        "support_plans",
        "business_audit",
        "check_ins",
        "power_sessions",
        "resources",
        "notifications",
      ]);
    },
  };
}

let instance: SampleDataSource | null = null;
export function getSampleDataSource() {
  if (!instance) instance = new SampleDataSource();
  return instance;
}
export type { SampleDataSource };
