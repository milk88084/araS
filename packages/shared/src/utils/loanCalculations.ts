export type LoanInput = {
  totalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  startDate: string | Date;
  gracePeriodMonths: number;
  repaymentType: "principal_interest" | "principal_equal";
};

export type ScheduleRow = {
  month: number;
  paymentDate: Date;
  beginBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  endBalance: number;
  isPast: boolean;
};

export type LoanStatus = {
  remainingPrincipal: number;
  nextRemainingPrincipal: number;
  nextPaymentAmount: number;
  nextPaymentDate: Date | null;
  paidMonths: number;
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // If day overflowed (e.g., Jan 31 + 1 month), setMonth already clamps
  // but if it went to the wrong month, go back to last day of intended month
  const expectedMonth = ((targetMonth % 12) + 12) % 12;
  if (d.getMonth() !== expectedMonth) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

export function generateAmortizationSchedule(loan: LoanInput, currentDate: Date): ScheduleRow[] {
  const { totalAmount, annualInterestRate, termMonths, gracePeriodMonths, repaymentType } = loan;

  const r = annualInterestRate / 100 / 12;
  const startDate = new Date(loan.startDate);
  const n = termMonths - gracePeriodMonths;

  // Annuity monthly payment (fixed total payment)
  const annuityPayment =
    r === 0 ? totalAmount / n : (totalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  // Equal-principal monthly principal
  const equalPrincipal = totalAmount / n;

  const rows: ScheduleRow[] = [];
  let balance = totalAmount;

  for (let month = 1; month <= termMonths; month++) {
    const paymentDate = addMonths(startDate, month);
    const beginBalance = balance;
    const isGrace = month <= gracePeriodMonths;

    let principalPaid: number;
    let interestPaid: number;

    if (isGrace) {
      interestPaid = balance * r;
      principalPaid = 0;
    } else if (repaymentType === "principal_interest") {
      interestPaid = balance * r;
      principalPaid = annuityPayment - interestPaid;
    } else {
      principalPaid = equalPrincipal;
      interestPaid = balance * r;
    }

    // Guard against floating point drift on final payment
    if (principalPaid > balance) principalPaid = balance;
    const endBalance = Math.max(0, balance - principalPaid);
    const totalPayment = principalPaid + interestPaid;

    rows.push({
      month,
      paymentDate,
      beginBalance,
      principalPaid,
      interestPaid,
      totalPayment,
      endBalance,
      isPast: paymentDate < currentDate,
    });

    balance = endBalance;
  }

  return rows;
}

export function calculateLoanStatus(loan: LoanInput, currentDate: Date): LoanStatus {
  const rows = generateAmortizationSchedule(loan, currentDate);
  const pastRows = rows.filter((r) => r.isPast);
  const futureRows = rows.filter((r) => !r.isPast);

  const paidMonths = pastRows.length;
  const remainingPrincipal =
    pastRows.length > 0 ? pastRows[pastRows.length - 1]!.endBalance : loan.totalAmount;

  const nextRow = futureRows[0] ?? null;
  const nextPaymentAmount = nextRow?.totalPayment ?? 0;
  const nextPaymentDate = nextRow?.paymentDate ?? null;
  const nextRemainingPrincipal = nextRow?.endBalance ?? 0;

  return {
    remainingPrincipal,
    nextRemainingPrincipal,
    nextPaymentAmount,
    nextPaymentDate,
    paidMonths,
  };
}
