// Message, WhatsApp, UPI and notice builders. Pure helpers: no React, no localStorage.
import { daysOverdue as overdueDaysOf } from "./forecastEngine.js";

export const TONES = [
  { id: "polite", label: "Polite English" },
  { id: "firm", label: "Firm Reminder" },
  { id: "hinglish", label: "Friendly Hinglish" },
];

// "yyyy-mm-dd" -> "15 Jun 2025" (parsed as local midnight).
export function formatDateLong(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const formatRupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export function buildReminder({ tone, invoice, student, settings, daysOverdue, referenceDate }) {
  const parent = student?.parentName || "Parent";
  const name = student?.name || "your child";
  const amount = formatRupees(invoice.amount);
  const ref = referenceDate ?? settings.referenceDate;
  const late = daysOverdue ?? overdueDaysOf(invoice, ref);
  const dueText =
    late > 0
      ? `overdue by ${late} day${late === 1 ? "" : "s"}`
      : `due on ${formatDateLong(invoice.dueDate)}`;
  const upi = settings.upiId;
  const signature = settings.reminderSignature ?? "";

  let body;
  if (tone === "firm") {
    body =
      `Dear ${parent}, the fee of ${amount} for ${name} is ${dueText}. ` +
      `Please clear this payment within 3 days. UPI: ${upi}. Kindly do not delay further.`;
  } else if (tone === "hinglish") {
    body =
      `Namaste ${parent} ji, ${name} ka fees ${amount} abhi pending hai, ${dueText}. ` +
      `Kripya jaldi pay kar dijiye. UPI: ${upi}. Dhanyavaad!`;
  } else {
    body =
      `Dear ${parent}, I hope you are doing well. ` +
      `This is a gentle reminder that the fee of ${amount} for ${name} is ${dueText}. ` +
      `Kindly make the payment at your convenience using UPI at ${upi}. ` +
      `Thank you for your continued trust in us.`;
  }

  return signature ? `${body}\n\n${signature}` : body;
}

// wa.me link. A bare 10-digit Indian number gets the 91 country code.
export function buildWhatsAppLink(phone, message) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildUpiQrUrl({ upiId, payeeName, amount, note }) {
  const upi =
    `upi://pay?pa=${encodeURIComponent(upiId ?? "")}` +
    `&pn=${encodeURIComponent(payeeName ?? "")}` +
    `&am=${Number(amount).toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(note ?? "")}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upi)}`;
}

// Polite fee-revision notice for parents. Contains no per-student amounts.
export function buildFeeHikeNotice({ settings, effectiveDate }) {
  const tutor = settings.tutorName || "Tutor";
  const business = settings.businessName || settings.centreName || "our tuition centre";
  const when = effectiveDate ? formatDateLong(effectiveDate) : "the next billing cycle";

  return [
    "Dear Parent,",
    "",
    `We hope you and your child are doing well. We are writing to inform you that fees at ${business} will be revised with effect from ${when}.`,
    "The revised fee details will be shared with you individually. We value your trust and continued support.",
    "",
    "Warm regards,",
    tutor,
    business,
  ].join("\n");
}
