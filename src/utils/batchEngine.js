// Batch capacity and revenue figures. Pure helpers: no React, no localStorage.

const sum = (values) => values.reduce((total, v) => total + v, 0);

const isActive = (student) => student.status !== "Inactive" && student.active !== false;

const feeOf = (student) => Number(student.monthlyFee ?? student.fee) || 0;

export function batchStats(state) {
  const activeStudents = (state.students ?? []).filter(isActive);
  const allActiveAvgFee = activeStudents.length
    ? sum(activeStudents.map(feeOf)) / activeStudents.length
    : 0;

  return (state.batches ?? []).map((batch) => {
    const enrolledStudents = activeStudents.filter((s) => s.batchId === batch.id);
    const enrolled = enrolledStudents.length;
    const maxSeats = Number(batch.maxSeats) || 0;
    const emptySeats = Math.max(0, maxSeats - enrolled);
    const utilization = maxSeats ? Math.min(1, enrolled / maxSeats) : 0;
    const monthlyRevenue = sum(enrolledStudents.map(feeOf));
    const avgFee = enrolled ? monthlyRevenue / enrolled : allActiveAvgFee;

    return {
      id: batch.id,
      name: batch.name,
      subject: batch.subject,
      schedule: batch.schedule,
      maxSeats,
      enrolled,
      emptySeats,
      utilization,
      monthlyRevenue,
      avgFee,
      potentialExtraIncome: emptySeats * avgFee,
      students: enrolledStudents.map((s) => s.name),
    };
  });
}

export function totals(stats) {
  const maxSeats = sum(stats.map((s) => s.maxSeats));
  const enrolled = sum(stats.map((s) => s.enrolled));
  const emptySeats = sum(stats.map((s) => s.emptySeats));
  const monthlyRevenue = sum(stats.map((s) => s.monthlyRevenue));
  const potentialExtraIncome = sum(stats.map((s) => s.potentialExtraIncome));

  return {
    batches: stats.length,
    maxSeats,
    enrolled,
    emptySeats,
    utilization: maxSeats ? Math.min(1, enrolled / maxSeats) : 0,
    monthlyRevenue,
    potentialExtraIncome,
  };
}
