/*
  Warnings:

  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Liability` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Asset";

-- DropTable
DROP TABLE "Liability";

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topCategory" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entry_topCategory_idx" ON "Entry"("topCategory");
