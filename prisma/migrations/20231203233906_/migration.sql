/*
  Warnings:

  - Made the column `deletedAt` on table `PersonTypes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deletedAt` on table `Persons` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deletedAt` on table `TillDetails` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deletedAt` on table `Tills` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deletedAt` on table `TillsTypes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PersonTypes" ALTER COLUMN "deletedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Persons" ALTER COLUMN "deletedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "TillDetails" ALTER COLUMN "deletedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tills" ALTER COLUMN "deletedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "TillsTypes" ALTER COLUMN "deletedAt" SET NOT NULL;
