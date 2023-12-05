-- CreateTable
CREATE TABLE "TillsTypes" (
    "id" SERIAL NOT NULL,
    "t_type_desc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TillsTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TillDetails" (
    "id" SERIAL NOT NULL,
    "till_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "till_det_type" BOOLEAN NOT NULL,
    "till_det_desc" TEXT NOT NULL,
    "till_det_amount" DOUBLE PRECISION NOT NULL,
    "till_det_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TillDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tills" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "t_type_id" INTEGER NOT NULL,
    "TILL_NAME" TEXT NOT NULL,
    "TILL_ACCOUNT_NUMBER" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persons" (
    "person_id" SERIAL NOT NULL,
    "person_fname" TEXT NOT NULL,
    "person_lname" TEXT NOT NULL,
    "person_idnumber" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "p_type_id" INTEGER NOT NULL,

    CONSTRAINT "Persons_pkey" PRIMARY KEY ("person_id")
);

-- CreateTable
CREATE TABLE "PersonTypes" (
    "id" SERIAL NOT NULL,
    "p_type_desc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonTypes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TillsTypes_t_type_desc_key" ON "TillsTypes"("t_type_desc");

-- AddForeignKey
ALTER TABLE "TillDetails" ADD CONSTRAINT "TillDetails_till_id_fkey" FOREIGN KEY ("till_id") REFERENCES "Tills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TillDetails" ADD CONSTRAINT "TillDetails_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Persons"("person_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tills" ADD CONSTRAINT "Tills_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Persons"("person_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tills" ADD CONSTRAINT "Tills_t_type_id_fkey" FOREIGN KEY ("t_type_id") REFERENCES "TillsTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persons" ADD CONSTRAINT "Persons_p_type_id_fkey" FOREIGN KEY ("p_type_id") REFERENCES "PersonTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
