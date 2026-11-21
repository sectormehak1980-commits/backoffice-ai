// Attendance helpers. Pure functions: no React, no localStorage.

const records = (state) => state.attendance ?? [];

// Unbilled "Extra Class" sessions for one student, priced at settings.extraClassFee.
export function pendingExtraFees(state, studentId) {
  const fee = Number(state.settings.extraClassFee) || 0;
  const count = records(state).filter(
    (a) => a.studentId === studentId && a.status === "Extra Class" && !a.billedInvoiceId
  ).length;
  return { count, amount: count * fee };
}

// { [studentId]: status } for one date.
export function attendanceForDate(state, date) {
  const byStudent = {};
  for (const a of records(state)) {
    if (a.date === date) byStudent[a.studentId] = a.status;
  }
  return byStudent;
}

// Status tallies for one date.
export function dayCounts(state, date) {
  const counts = { present: 0, absent: 0, extra: 0 };
  for (const a of records(state)) {
    if (a.date !== date) continue;
    if (a.status === "Present") counts.present += 1;
    else if (a.status === "Absent") counts.absent += 1;
    else if (a.status === "Extra Class") counts.extra += 1;
  }
  return counts;
}
