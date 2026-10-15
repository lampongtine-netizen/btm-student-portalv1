import type {
  BusinessAudit,
  CheckIn,
  Membership,
  Message,
  PortalNotification,
  PowerSession,
  Priority,
  Resource,
  Student,
  SupportPlan,
} from "./types";

/**
 * Sample data for the front-end build. Fictional member — no real student data.
 * Dates are generated relative to "now" so the screens always look current.
 */

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const ymd = (offsetDays: number) => iso(offsetDays).slice(0, 10);
const month = (offsetMonths: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 7);
};

export const SAMPLE_STUDENT_ID = "stu_sample_001";
export const SAMPLE_EMAIL = "sienna@lumiereskin.example";

export interface SampleDb {
  student: Student;
  membership: Membership;
  priorities: Priority[];
  messages: Message[];
  supportPlans: SupportPlan[];
  audit: BusinessAudit | null;
  checkIns: CheckIn[];
  powerSessions: PowerSession[];
  resources: Resource[];
  notifications: PortalNotification[];
}

export function createSeed(): SampleDb {
  const sid = SAMPLE_STUDENT_ID;
  return {
    student: {
      id: sid,
      email: SAMPLE_EMAIL,
      firstName: "Sienna",
      lastName: "Hart",
      preferredName: "Sienna",
      phone: "+61 400 000 000",
      businessName: "Lumière Skin Studio",
      businessType: "Skin & brow clinic",
      businessLocation: "Brisbane, QLD",
      website: "https://lumiereskin.example",
      instagram: "@lumiereskin",
      bookingLink: null,
      currentFocus: "Increase rebookings from existing clients",
      advisorName: "Bree Wilkinson",
      onboardingComplete: true,
      supportWeek: 5,
      createdAt: iso(-34),
    },
    membership: {
      level: "level_1",
      interval: "week",
      status: "active",
      accessUntil: null,
      currentPeriodEnd: iso(4),
      startedAt: iso(-34),
      amountCents: 19900,
    },
    priorities: [
      {
        id: "pri_1",
        studentId: sid,
        title: "Set up automated rebooking reminder at checkout",
        category: "Client Retention",
        level: "high",
        status: "in_progress",
        dueDate: ymd(3),
        staffNote: "Use the 3-step rebooking script from your Support Plan.",
        createdBy: "staff",
        createdAt: iso(-12),
        updatedAt: iso(-2),
        completedAt: null,
      },
      {
        id: "pri_2",
        studentId: sid,
        title: "Review service menu pricing against margins",
        category: "Pricing & Packages",
        level: "medium",
        status: "not_started",
        dueDate: ymd(10),
        staffNote: null,
        createdBy: "student",
        createdAt: iso(-6),
        updatedAt: iso(-6),
        completedAt: null,
      },
      {
        id: "pri_3",
        studentId: sid,
        title: "Write the new-client welcome SOP",
        category: "Systems & Operations",
        level: "medium",
        status: "completed",
        dueDate: ymd(-4),
        staffNote: null,
        createdBy: "student",
        createdAt: iso(-20),
        updatedAt: iso(-5),
        completedAt: iso(-5),
      },
    ],
    messages: [
      {
        id: "msg_1",
        studentId: sid,
        sender: "staff",
        senderName: "Bree Wilkinson",
        body: "Welcome to the portal, Sienna! Your Support Plan is ready. Have a read and send me any questions here.",
        attachmentName: null,
        attachmentUrl: null,
        createdAt: iso(-30),
        readAt: iso(-30),
      },
      {
        id: "msg_2",
        studentId: sid,
        sender: "student",
        senderName: "Sienna Hart",
        body: "Thank you! Quick one: should I offer a rebooking discount or keep pricing firm?",
        attachmentName: null,
        attachmentUrl: null,
        createdAt: iso(-3),
        readAt: iso(-3),
      },
      {
        id: "msg_3",
        studentId: sid,
        sender: "staff",
        senderName: "Bree Wilkinson",
        body: "Keep pricing firm. Offer priority booking for their preferred time instead. It protects your margin and still rewards loyalty.",
        attachmentName: null,
        attachmentUrl: null,
        createdAt: iso(-2),
        readAt: null,
      },
    ],
    supportPlans: [
      {
        id: "sp_1",
        studentId: sid,
        title: "Support Plan — Cycle 1",
        preparedAt: iso(-28),
        nextReview: iso(14),
        summary:
          "Strong demand and a loyal core client base, but rebookings rely on memory and pricing hasn't moved in 18 months. The next 90 days focus on retention systems and margin.",
        currentFocus: "Increase rebookings from existing clients",
        topPriorities: [
          "Lift rebooking rate from 48% to 65%",
          "Reprice the top five services",
          "Document the new-client journey",
        ],
        thirtyDayFocus: [
          "Introduce rebooking at checkout for every client",
          "Track rebooking rate weekly",
          "Draft new price list for review",
          "Write the welcome SOP",
        ],
        btmSupport: [
          "Rebooking script and checkout process",
          "Pricing review in your next Power Session",
          "SOP template for client onboarding",
          "Weekly accountability via Communications",
        ],
        actions: [
          { id: "a1", action: "Add rebooking prompt to checkout", owner: "You", status: "in_progress", dueDate: ymd(3) },
          { id: "a2", action: "Send rebooking script", owner: "BTM", status: "completed", dueDate: ymd(-20) },
          { id: "a3", action: "Draft new price list", owner: "You", status: "not_started", dueDate: ymd(10) },
          { id: "a4", action: "Review pricing together", owner: "BTM", status: "not_started", dueDate: ymd(14) },
        ],
        fileName: "Lumiere-Skin-Support-Plan-Cycle-1.pdf",
        fileUrl: null,
        status: "published",
      },
    ],
    audit: {
      id: "aud_1",
      studentId: sid,
      submittedAt: iso(-32),
      status: "reviewed",
      timeInBusiness: "4 years",
      avgMonthlyRevenue: "$28,000",
      monthlyRevenueGoal: "$40,000",
      teamSize: "3",
      monthlyBookings: "260",
      mainServices: "Skin treatments, brow lamination, LED",
      workingWell: "Clients love the results and refer friends. Instagram drives steady enquiries.",
      biggestChallenge: "Clients don't rebook unless reminded, so the calendar is unpredictable.",
      timeDrain: "Answering DMs and manually confirming appointments.",
      growthOpportunity: "Packages and memberships for skin treatments.",
      ninetyDayGoal: "Consistent $35k months with a fuller forward calendar.",
      supportNeeded: "Systems and pricing.",
      scores: { total: 96, financials: 15, clientRetention: 12, systemsTeam: 14 },
    },
    checkIns: [
      {
        id: "ci_1",
        studentId: sid,
        month: month(-1),
        submittedAt: iso(-16),
        status: "reviewed",
        revenue: 29400,
        forecastGoal: 32000,
        profit: 7100,
        leads: 64,
        sales: 22,
        appointments: 248,
        returnRate: 51,
        biggestWin: "Highest month for LED treatments.",
        improved: "Checkout is faster with the new script.",
        biggestChallenge: "Two staff sick days left gaps in the calendar.",
        momentum: 3,
        nextPriority: "Get rebooking to 60%.",
        decisionSupport: "Whether to hire a part-time receptionist.",
        supportAreas: ["Systems & operations", "Team & delegation"],
        staffReply: "Great progress. Let's cover the receptionist decision in your Power Session.",
      },
    ],
    powerSessions: [
      {
        id: "ps_1",
        studentId: sid,
        scheduledAt: iso(-15),
        status: "completed",
        joinUrl: null,
        rescheduleUrl: null,
        focus: "Retention systems",
        notes: "Agreed: rebooking at checkout, weekly tracking, revisit pricing next session.",
        recordingUrl: null,
      },
      {
        id: "ps_2",
        studentId: sid,
        scheduledAt: iso(9),
        status: "booked",
        joinUrl: "https://zoom.us/",
        rescheduleUrl: null,
        focus: "Pricing review",
        notes: null,
        recordingUrl: null,
      },
    ],
    resources: [
      {
        id: "res_1",
        studentId: null,
        title: "Revenue & KPI Tracker",
        description: "Track revenue, enquiries, conversions, bookings and the numbers that drive growth.",
        category: "template",
        fileUrl: null,
        requiredLevel: "level_1",
        createdAt: iso(-40),
      },
      {
        id: "res_2",
        studentId: null,
        title: "Power Session Preparation",
        description: "Prepare the decision, bottleneck or opportunity that needs deeper strategic attention.",
        category: "template",
        fileUrl: null,
        requiredLevel: "level_1",
        createdAt: iso(-40),
      },
      {
        id: "res_3",
        studentId: null,
        title: "Systems, SOPs & Delegation Library",
        description: "Advanced process templates for documenting how your business runs.",
        category: "template",
        fileUrl: null,
        requiredLevel: "level_2",
        createdAt: iso(-40),
      },
      {
        id: "res_4",
        studentId: sid,
        title: "Rebooking Script",
        description: "Three-step checkout script for booking the next appointment.",
        category: "action_priorities",
        fileUrl: null,
        requiredLevel: "level_1",
        createdAt: iso(-20),
      },
    ],
    notifications: [
      {
        id: "ntf_1",
        studentId: sid,
        kind: "message",
        title: "New message from Bree",
        body: "Keep pricing firm. Offer priority booking for their preferred time instead.",
        href: "/communications",
        createdAt: iso(-2),
        readAt: null,
      },
      {
        id: "ntf_2",
        studentId: sid,
        kind: "power_session",
        title: "Power Session booked",
        body: "Your next 30-minute session is confirmed.",
        href: "/power-sessions",
        createdAt: iso(-4),
        readAt: iso(-3),
      },
    ],
  };
}
