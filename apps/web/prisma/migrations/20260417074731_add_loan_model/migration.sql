-- CreateEnum
CREATE TYPE "RepaymentType" AS ENUM ('principal_interest', 'principal_equal');

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "loanName" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "annualInterestRate" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "gracePeriodMonths" INTEGER NOT NULL DEFAULT 0,
    "repaymentType" "RepaymentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Loan_entryId_key" ON "Loan"("entryId");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
