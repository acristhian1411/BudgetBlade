/*
  Warnings:

  - Made the column `account_pid` on table `AccountPlan` required. This step will fail if there are existing NULL values in that column.
  - Made the column `account_code` on table `AccountPlan` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AccountPlan" ALTER COLUMN "account_pid" SET NOT NULL,
ALTER COLUMN "account_code" SET NOT NULL;
