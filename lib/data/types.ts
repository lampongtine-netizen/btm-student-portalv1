/**
 * BTM Student Portal — domain types.
 *
 * These describe what the student-facing screens need. They are deliberately
 * independent of any table layout: when the real Supabase schema is audited,
 * `supabase-source.ts` maps those tables onto these shapes. Pages never import
 * table names directly.
 */

export type MembershipLevel = "level_1" | "level_2";
export type BillingInterval = "week" | "month" | "year";
export type MembershipStatus =
  | "active"
  | "trialing"
  | "past_due" // payment failed, Stripe retrying — keep access, show banner
  | "canceled" // cancelled but paid period not over yet (see accessUntil)
  | "inactive"; // no paid access

export interface Membership {
  level: MembershipLevel;
  interval: BillingInterval;
  status: MembershipStatus;
  /** Access ends at this date when cancelled or unpaid. ISO string. */
  accessUntil: string | null;
  currentPeriodEnd: string | null;
  startedAt: string;
  /** Price in AUD cents for display only. Stripe is the source of truth. */
  amountCents: number;
}

export interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  phone: string | null;
  businessName: string;
  businessType: string | null;
  businessLocation: string | null;
  website: string | null;
  instagram: string | null;
  bookingLink: string | null;
  currentFocus: string | null;
  advisorName: string;
  onboardingComplete: boolean;
  supportWeek: number; // 1-12 support cycle week
  createdAt: string;
}

export type PriorityCategory =
  | "Marketing Growth"
  | "Client Retention"
  | "Business Strategy"
  | "Financials"
  | "Systems & Operations"
  | "Team & Leadership"
  | "Pricing & Packages"
  | "Education"
  | "Other";

export type PriorityLevel = "high" | "medium" | "low";
export type PriorityStatus = "not_started" | "in_progress" | "completed";

export interface Priority {
  id: string;
  studentId: string;
  title: string;
  category: PriorityCategory;
  level: PriorityLevel;
  status: PriorityStatus;
  dueDate: string | null; // YYYY-MM-DD
  /** Optional guidance note added by staff. */
  staffNote: string | null;
  createdBy: "student" | "staff";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type MessageSender = "student" | "staff";

export interface Message {
  id: string;
  studentId: string;
  sender: MessageSender;
  senderName: string;
  body: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  /** When the other side read it. */
  readAt: string | null;
}

export interface ActionItem {
  id: string;
  action: string;
  owner: "You" | "BTM";
  status: PriorityStatus;
  dueDate: string | null;
}

export interface SupportPlan {
  id: string;
  studentId: string;
  title: string;
  preparedAt: string;
  nextReview: string | null;
  summary: string;
  currentFocus: string;
  topPriorities: string[];
  thirtyDayFocus: string[];
  btmSupport: string[];
  actions: ActionItem[];
  /** Uploaded PDF, if staff attached one. */
  fileName: string | null;
  fileUrl: string | null;
  status: "draft" | "published";
}

export interface BusinessAudit {
  id: string;
  studentId: string;
  submittedAt: string | null;
  status: "not_started" | "draft" | "submitted" | "reviewed";
  // Snapshot
  timeInBusiness: string;
  avgMonthlyRevenue: string;
  monthlyRevenueGoal: string;
  teamSize: string;
  monthlyBookings: string;
  mainServices: string;
  // Audit questions
  workingWell: string;
  biggestChallenge: string;
  timeDrain: string;
  growthOpportunity: string;
  ninetyDayGoal: string;
  supportNeeded: string;
  /** Scores set by staff after review. */
  scores: {
    total: number | null; // /150
    financials: number | null; // /25
    clientRetention: number | null; // /25
    systemsTeam: number | null; // /25
  };
}

export type Momentum = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  submittedAt: string | null;
  status: "draft" | "submitted" | "reviewed";
  revenue: number | null;
  forecastGoal: number | null;
  profit: number | null;
  leads: number | null;
  sales: number | null;
  appointments: number | null;
  returnRate: number | null;
  biggestWin: string;
  improved: string;
  biggestChallenge: string;
  momentum: Momentum | null;
  nextPriority: string;
  decisionSupport: string;
  supportAreas: string[];
  staffReply: string | null;
}

export interface PowerSession {
  id: string;
  studentId: string;
  scheduledAt: string | null;
  status: "requested" | "booked" | "completed" | "cancelled";
  joinUrl: string | null;
  rescheduleUrl: string | null;
  focus: string | null;
  notes: string | null;
  recordingUrl: string | null;
}

export type ResourceCategory =
  | "business_audit"
  | "monthly_check_in"
  | "support_plan"
  | "action_priorities"
  | "template"
  | "other";

export interface Resource {
  id: string;
  /** null = available to every member at the required level. */
  studentId: string | null;
  title: string;
  description: string;
  category: ResourceCategory;
  fileUrl: string | null;
  requiredLevel: MembershipLevel;
  createdAt: string;
}

export type NotificationKind =
  | "message"
  | "support_plan"
  | "priority"
  | "check_in"
  | "power_session"
  | "resource"
  | "membership";

export interface PortalNotification {
  id: string;
  studentId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
}

/** The record groups the realtime layer can announce changes for. */
export type Topic =
  | "student"
  | "membership"
  | "priorities"
  | "messages"
  | "support_plans"
  | "business_audit"
  | "check_ins"
  | "power_sessions"
  | "resources"
  | "notifications";

export interface Session {
  studentId: string;
  email: string;
}
