/*
  Warnings:

  - The primary key for the `GiftChart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiftChartRevision` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "GiftChartRevision" DROP CONSTRAINT "GiftChartRevision_chartId_fkey";

-- AlterTable
ALTER TABLE "GiftChart" DROP CONSTRAINT "GiftChart_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "GiftChart_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "GiftChartRevision" DROP CONSTRAINT "GiftChartRevision_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "chartId" SET DATA TYPE TEXT,
ADD CONSTRAINT "GiftChartRevision_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "GiftChartRevision" ADD CONSTRAINT "GiftChartRevision_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "GiftChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
