import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { calculateLoanStatus } from "@repo/shared";
import { LoanDetailSheet } from "../LoanDetailSheet";
import type { Loan } from "@repo/shared";

vi.mock("@repo/shared", async () => {
  const actual = await vi.importActual<typeof import("@repo/shared")>("@repo/shared");
  return {
    ...actual,
    generateAmortizationSchedule: () => [],
    calculateLoanStatus: vi.fn().mockReturnValue({
      remainingPrincipal: 900000,
      nextPaymentAmount: 12450,
      nextPaymentDate: new Date("2026-05-01"),
      paidMonths: 3,
    }),
  };
});

vi.mock("../AmortizationTable", () => ({
  AmortizationTable: () => null,
}));

const MOCK_LOAN: Loan = {
  id: "loan-1",
  entryId: "entry-1",
  loanName: "花蓮房貸",
  totalAmount: 1200000,
  annualInterestRate: 2,
  termMonths: 360,
  startDate: "2026-01-01T00:00:00.000Z",
  gracePeriodMonths: 0,
  repaymentType: "principal_interest",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("LoanDetailSheet — payment sync", () => {
  const onClose = vi.fn();
  const onRateUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateLoanStatus).mockReturnValue({
      remainingPrincipal: 900000,
      nextPaymentAmount: 12450,
      nextPaymentDate: new Date("2026-05-01"),
      paidMonths: 3,
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("renders 我已繳款 button when loan has a next payment date", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    expect(screen.getByRole("button", { name: "我已繳款" })).toBeInTheDocument();
  });

  it("does not render 我已繳款 button when loan is fully repaid", () => {
    vi.mocked(calculateLoanStatus).mockReturnValue({
      remainingPrincipal: 0,
      nextPaymentAmount: 0,
      nextPaymentDate: null,
      paidMonths: 360,
    });
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    expect(screen.queryByRole("button", { name: "我已繳款" })).not.toBeInTheDocument();
  });

  it("opens confirmation sheet when 我已繳款 is clicked", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    expect(screen.getByText("確認本期還款")).toBeInTheDocument();
  });

  it("closes confirmation sheet when backdrop is clicked", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByTestId("sync-backdrop"));
    expect(screen.queryByText("確認本期還款")).not.toBeInTheDocument();
  });

  it("switches to manual input when 金額不同？手動輸入 is clicked", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "金額不同？手動輸入" }));
    expect(screen.getByLabelText("實際剩餘本金")).toBeInTheDocument();
  });

  it("disables 確認已繳 when manual balance exceeds totalAmount", () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "金額不同？手動輸入" }));
    fireEvent.change(screen.getByLabelText("實際剩餘本金"), { target: { value: "9999999" } });
    expect(screen.getByRole("button", { name: "確認已繳" })).toBeDisabled();
  });

  it("calls fetch and onRateUpdated on successful auto sync", async () => {
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "確認已繳" }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/loans/loan-1/sync",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(onRateUpdated).toHaveBeenCalled();
    });
  });

  it("shows error message when sync fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "確認已繳" }));
    await waitFor(() => {
      expect(screen.getByText("同步失敗，請稍後再試")).toBeInTheDocument();
    });
  });

  it("calls onSynced instead of onRateUpdated when onSynced is provided", async () => {
    const onSynced = vi.fn();
    render(
      <LoanDetailSheet
        open={true}
        loan={MOCK_LOAN}
        color="#C7C7D4"
        onClose={onClose}
        onRateUpdated={onRateUpdated}
        onSynced={onSynced}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "我已繳款" }));
    fireEvent.click(screen.getByRole("button", { name: "確認已繳" }));
    await waitFor(() => {
      expect(onSynced).toHaveBeenCalled();
      expect(onRateUpdated).not.toHaveBeenCalled();
    });
  });
});
