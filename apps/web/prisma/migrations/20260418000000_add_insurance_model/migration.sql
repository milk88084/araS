-- CreateTable
CREATE TABLE "Insurance" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "declaredRate" DOUBLE PRECISION NOT NULL,
    "premiumTotal" DOUBLE PRECISION NOT NULL,
    "currentAge" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "cashValueData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insurance_entryId_key" ON "Insurance"("entryId");

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
