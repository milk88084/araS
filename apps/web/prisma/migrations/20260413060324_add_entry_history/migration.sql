-- CreateTable
CREATE TABLE "EntryHistory" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryHistory_entryId_createdAt_idx" ON "EntryHistory"("entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "EntryHistory" ADD CONSTRAINT "EntryHistory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
