/*
  Warnings:

  - Added the required column `deletedAt` to the `PersonTypes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deletedAt` to the `Persons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Persons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deletedAt` to the `TillDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TillDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deletedAt` to the `Tills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deletedAt` to the `TillsTypes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PersonTypes" ADD COLUMN     "deletedAt" TIMESTAMP(3) ;

-- AlterTable
ALTER TABLE "Persons" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TillDetails" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Tills" ADD COLUMN     "deletedAt" TIMESTAMP(3) ;

-- AlterTable
ALTER TABLE "TillsTypes" ADD COLUMN     "deletedAt" TIMESTAMP(3) ;
