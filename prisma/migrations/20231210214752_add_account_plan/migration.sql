/*
  Warnings:

  - Added the required column `account_p_id` to the `TillDetails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TillDetails" ADD COLUMN     "account_p_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AccountPlan" (
    "id" SERIAL NOT NULL,
    "account_pid" INTEGER NOT NULL,
    "account_desc" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AccountPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountPlan_account_desc_key" ON "AccountPlan"("account_desc");

-- CreateIndex
CREATE UNIQUE INDEX "AccountPlan_account_code_key" ON "AccountPlan"("account_code");

-- AddForeignKey
ALTER TABLE "TillDetails" ADD CONSTRAINT "TillDetails_account_p_id_fkey" FOREIGN KEY ("account_p_id") REFERENCES "AccountPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
