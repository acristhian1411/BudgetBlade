-- CreateTable
CREATE TABLE "DetailsTransfer" (
    "id" SERIAL NOT NULL,
    "origin_till_id" INTEGER NOT NULL,
    "destiny_till_id" INTEGER NOT NULL,
    "det_transfer_amount" INTEGER NOT NULL,
    "det_transfer_obs" TEXT NOT NULL,
    "det_transfer_date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DetailsTransfer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetailsTransfer" ADD CONSTRAINT "DetailsTransfer_origin_till_id_fkey" FOREIGN KEY ("origin_till_id") REFERENCES "Tills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailsTransfer" ADD CONSTRAINT "DetailsTransfer_destiny_till_id_fkey" FOREIGN KEY ("destiny_till_id") REFERENCES "Tills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
