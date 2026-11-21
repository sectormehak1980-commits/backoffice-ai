// Seed data for BackOffice AI. All money is INR (₹). Dates are local calendar dates (yyyy-mm-dd).

export const REFERENCE_DATE = "2025-06-15";
export const SEED_VERSION = 1;

export const SEED_BATCHES = [
  { id: "b1", name: "Batch A – Maths 10", subject: "Maths", schedule: "Mon-Wed-Fri 6-7 PM", maxSeats: 8 },
  { id: "b2", name: "Batch B – Physics 12", subject: "Physics", schedule: "Tue-Thu-Sat 5-6:30 PM", maxSeats: 6 },
  { id: "b3", name: "Batch C – Foundation 6-8", subject: "Mixed", schedule: "Sat-Sun 10-11:30 AM", maxSeats: 10 },
  { id: "b4", name: "Batch D – Science 9", subject: "Science", schedule: "Mon-Thu 4-5 PM", maxSeats: 8 },
];

// batchId: first batch whose subject matches the student's subject, else 'b3' (Mixed).
export const SEED_STUDENTS = [
  { id: "s1", name: "Aarav Sharma", parent: "Rakesh Sharma", phone: "+91 98200 34121", subject: "Maths", classLevel: "Class 10", batch: "Mon-Wed-Fri 6-7 PM", monthlyFee: 4500, status: "Active", batchId: "b1" },
  { id: "s2", name: "Diya Patel", parent: "Hitesh Patel", phone: "+91 98190 55672", subject: "Physics", classLevel: "Class 12", batch: "Tue-Thu-Sat 5-6:30 PM", monthlyFee: 5500, status: "Active", batchId: "b2" },
  { id: "s3", name: "Rohan Iyer", parent: "Suresh Iyer", phone: "+91 98211 40293", subject: "Maths", classLevel: "Class 9", batch: "Mon-Wed-Fri 4-5 PM", monthlyFee: 3000, status: "Active", batchId: "b1" },
  { id: "s4", name: "Ananya Desai", parent: "Mahesh Desai", phone: "+91 98705 18834", subject: "Chemistry", classLevel: "Class 11", batch: "Tue-Thu 7-8:30 PM", monthlyFee: 5000, status: "Active", batchId: "b3" },
  { id: "s5", name: "Kabir Khan", parent: "Imran Khan", phone: "+91 98921 76045", subject: "English", classLevel: "Class 8", batch: "Sat-Sun 10-11 AM", monthlyFee: 2500, status: "Active", batchId: "b3" },
  { id: "s6", name: "Meera Joshi", parent: "Anil Joshi", phone: "+91 98678 90216", subject: "Science", classLevel: "Class 10", batch: "Mon-Wed-Fri 6-7 PM", monthlyFee: 3800, status: "Active", batchId: "b4" },
  { id: "s7", name: "Vihaan Reddy", parent: "Kiran Reddy", phone: "+91 98450 23817", subject: "Maths", classLevel: "Class 7", batch: "Tue-Thu 5-6 PM", monthlyFee: 2800, status: "Active", batchId: "b1" },
  { id: "s8", name: "Ishita Nair", parent: "Gopal Nair", phone: "+91 98460 67201", subject: "Biology", classLevel: "Class 12", batch: "Mon-Wed-Fri 7-8 PM", monthlyFee: 5800, status: "Active", batchId: "b3" },
  { id: "s9", name: "Arjun Kulkarni", parent: "Sanjay Kulkarni", phone: "+91 98230 44519", subject: "Physics", classLevel: "Class 9", batch: "Sat-Sun 4-5:30 PM", monthlyFee: 3500, status: "Active", batchId: "b2" },
  { id: "s10", name: "Sara Fernandes", parent: "Joseph Fernandes", phone: "+91 98200 78364", subject: "English", classLevel: "Class 6", batch: "Tue-Thu 4-5 PM", monthlyFee: 3200, status: "Active", batchId: "b3" },
  { id: "s11", name: "Dhruv Gupta", parent: "Vinod Gupta", phone: "+91 98115 36490", subject: "Maths", classLevel: "Class 11", batch: "Mon-Wed-Fri 7-8:30 PM", monthlyFee: 6000, status: "Active", batchId: "b1" },
  { id: "s12", name: "Tara Singh", parent: "Harjeet Singh", phone: "+91 98880 12057", subject: "Science", classLevel: "Class 8", batch: "Sat-Sun 11 AM-12 PM", monthlyFee: 2700, status: "Active", batchId: "b4" },
];

export const SEED_ATTENDANCE = [];


// 18 invoices: 5 Overdue (unpaid), 9 Paid, 4 Pending.
// Overdue dueDates are 4, 9, 18 (Aarav), 21 and 28 days before REFERENCE_DATE.
export const SEED_INVOICES = [
  { id: "inv-001", studentId: "s1", amount: 4500, issueDate: "2025-05-14", dueDate: "2025-05-28", status: "Overdue", paidDate: null, period: "May 2025" },
  { id: "inv-002", studentId: "s5", amount: 2500, issueDate: "2025-05-28", dueDate: "2025-06-11", status: "Overdue", paidDate: null, period: "Jun 2025" },
  { id: "inv-003", studentId: "s7", amount: 2800, issueDate: "2025-05-23", dueDate: "2025-06-06", status: "Overdue", paidDate: null, period: "Jun 2025" },
  { id: "inv-004", studentId: "s11", amount: 6000, issueDate: "2025-05-11", dueDate: "2025-05-25", status: "Overdue", paidDate: null, period: "May 2025" },
  { id: "inv-005", studentId: "s9", amount: 3500, issueDate: "2025-05-04", dueDate: "2025-05-18", status: "Overdue", paidDate: null, period: "May 2025" },
  { id: "inv-006", studentId: "s2", amount: 5500, issueDate: "2025-04-06", dueDate: "2025-04-20", status: "Paid", paidDate: "2025-04-18", period: "Apr 2025" },
  { id: "inv-007", studentId: "s3", amount: 3000, issueDate: "2025-04-21", dueDate: "2025-05-05", status: "Paid", paidDate: "2025-05-03", period: "May 2025" },
  { id: "inv-008", studentId: "s4", amount: 5000, issueDate: "2025-04-26", dueDate: "2025-05-10", status: "Paid", paidDate: "2025-05-09", period: "May 2025" },
  { id: "inv-009", studentId: "s6", amount: 3800, issueDate: "2025-04-28", dueDate: "2025-05-12", status: "Paid", paidDate: "2025-05-12", period: "May 2025" },
  { id: "inv-010", studentId: "s8", amount: 5800, issueDate: "2025-05-19", dueDate: "2025-06-02", status: "Paid", paidDate: "2025-06-01", period: "Jun 2025" },
  { id: "inv-011", studentId: "s10", amount: 3200, issueDate: "2025-05-20", dueDate: "2025-06-03", status: "Paid", paidDate: "2025-06-02", period: "Jun 2025" },
  { id: "inv-012", studentId: "s12", amount: 2700, issueDate: "2025-05-21", dueDate: "2025-06-04", status: "Paid", paidDate: "2025-06-04", period: "Jun 2025" },
  { id: "inv-013", studentId: "s2", amount: 5500, issueDate: "2025-05-06", dueDate: "2025-05-20", status: "Paid", paidDate: "2025-05-19", period: "May 2025" },
  { id: "inv-014", studentId: "s1", amount: 4500, issueDate: "2025-04-14", dueDate: "2025-04-28", status: "Paid", paidDate: "2025-04-27", period: "Apr 2025" },
  { id: "inv-015", studentId: "s4", amount: 5000, issueDate: "2025-06-06", dueDate: "2025-06-20", status: "Pending", paidDate: null, period: "Jun 2025" },
  { id: "inv-016", studentId: "s8", amount: 5800, issueDate: "2025-06-11", dueDate: "2025-06-25", status: "Pending", paidDate: null, period: "Jun 2025" },
  { id: "inv-017", studentId: "s3", amount: 3000, issueDate: "2025-06-03", dueDate: "2025-07-02", status: "Pending", paidDate: null, period: "Jul 2025" },
  { id: "inv-018", studentId: "s10", amount: 3200, issueDate: "2025-06-08", dueDate: "2025-06-22", status: "Pending", paidDate: null, period: "Jun 2025" },
];

export const SEED_BILLS = [
  { id: "bill-1", name: "Room Rent", category: "Rent", amount: 12000, frequency: "Monthly", nextDueDate: "2025-06-21", paid: false, paidDate: null, lastPaidDate: null },
  { id: "bill-2", name: "Wi-Fi & Electricity", category: "Utilities", amount: 2800, frequency: "Monthly", nextDueDate: "2025-06-25", paid: false, paidDate: null, lastPaidDate: null },
  { id: "bill-3", name: "Study Material Printing", category: "Printing", amount: 3500, frequency: "Monthly", nextDueDate: "2025-06-28", paid: false, paidDate: null, lastPaidDate: null },
  { id: "bill-4", name: "Assistant Tutor Stipend", category: "Salary", amount: 8000, frequency: "Monthly", nextDueDate: "2025-07-01", paid: false, paidDate: null, lastPaidDate: null },
];

export const SEED_SETTINGS = {
  tutorName: "Priya Mehta",
  businessName: "Mehta Tuition Centre",
  email: "priya@mehtatuition.in",
  phone: "+91 98200 11223",
  upiId: "mehtatuition@upi",
  address: "Andheri West, Mumbai 400058",
  startingCash: 34500,
  reminderSignature: "Priya Mehta, Mehta Tuition Centre",
  referenceDate: "2025-06-15",
  extraClassFee: 300,
};

export function buildSeed() {
  return JSON.parse(
    JSON.stringify({
      students: SEED_STUDENTS,
      invoices: SEED_INVOICES,
      bills: SEED_BILLS,
      settings: SEED_SETTINGS,
      batches: SEED_BATCHES,
      attendance: [],
      version: SEED_VERSION,
    })
  );
}
