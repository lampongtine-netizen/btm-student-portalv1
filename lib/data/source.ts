import type {
  BusinessAudit,
  CheckIn,
  Membership,
  Message,
  PortalNotification,
  PowerSession,
  Priority,
  Resource,
  Session,
  Student,
  SupportPlan,
  Topic,
} from "./types";

export type NewPriority = Pick<Priority, "title" | "category" | "level" | "dueDate">;
export type PriorityPatch = Partial<
  Pick<Priority, "title" | "category" | "level" | "dueDate" | "status">
>;
export type StudentPatch = Partial<
  Pick<
    Student,
    | "firstName"
    | "lastName"
    | "preferredName"
    | "phone"
    | "businessName"
    | "businessType"
    | "businessLocation"
    | "website"
    | "instagram"
    | "bookingLink"
    | "currentFocus"
  >
>;
export type AuditDraft = Omit<BusinessAudit, "id" | "studentId" | "submittedAt" | "status" | "scores">;
export type CheckInDraft = Omit<
  CheckIn,
  "id" | "studentId" | "submittedAt" | "status" | "staffReply"
>;

/**
 * Everything the Student Portal reads or writes goes through this interface.
 *
 * Two implementations:
 *  - SampleDataSource: in-browser sample data, so the screens work today.
 *  - SupabaseDataSource: the shared Staff Portal database (wired after audit).
 *
 * Rules every implementation must follow:
 *  - Every read is scoped to the signed-in student. Never accept a studentId
 *    from the page; take it from the session.
 *  - `subscribe` announces that a topic changed. Pages then refetch, so the
 *    database stays the single source of truth (no patching local copies).
 */
export interface DataSource {
  readonly mode: "sample" | "supabase";

  // Auth
  getSession(): Promise<Session | null>;
  requestLoginCode(email: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  verifyLoginCode(email: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut(): Promise<void>;

  // Profile + membership
  getStudent(): Promise<Student>;
  updateStudent(patch: StudentPatch): Promise<Student>;
  completeOnboarding(): Promise<void>;
  getMembership(): Promise<Membership>;
  /** Server-created Stripe Billing Portal link (manage card, cancel, invoices). */
  getBillingPortalUrl(): Promise<string | null>;
  /** Server-created Stripe Checkout link to upgrade Level 1 -> Level 2. */
  getUpgradeUrl(interval: Membership["interval"]): Promise<string | null>;

  // Priorities (student-owned, staff can guide)
  listPriorities(): Promise<Priority[]>;
  createPriority(input: NewPriority): Promise<Priority>;
  updatePriority(id: string, patch: PriorityPatch): Promise<Priority>;
  deletePriority(id: string): Promise<void>;

  // Communications
  listMessages(): Promise<Message[]>;
  sendMessage(body: string, attachment?: File | null): Promise<Message>;
  markMessagesRead(): Promise<void>;

  // Support plans (staff-authored)
  listSupportPlans(): Promise<SupportPlan[]>;

  // Business audit (student-submitted, staff-scored)
  getBusinessAudit(): Promise<BusinessAudit | null>;
  saveBusinessAudit(draft: AuditDraft, submit: boolean): Promise<BusinessAudit>;

  // Monthly check-ins
  listCheckIns(): Promise<CheckIn[]>;
  saveCheckIn(draft: CheckInDraft, submit: boolean): Promise<CheckIn>;

  // Power sessions
  listPowerSessions(): Promise<PowerSession[]>;
  requestPowerSession(focus: string, preferredTimes: string): Promise<PowerSession>;

  // Resources
  listResources(): Promise<Resource[]>;

  // Notifications
  listNotifications(): Promise<PortalNotification[]>;
  markNotificationRead(id: string | "all"): Promise<void>;

  // Realtime
  subscribe(topics: Topic[], onChange: (topic: Topic) => void): () => void;
  /** Reports whether the live connection is up, for the status indicator. */
  onConnectionChange(cb: (connected: boolean) => void): () => void;
}
