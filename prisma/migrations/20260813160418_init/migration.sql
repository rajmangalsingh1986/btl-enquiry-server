-- CreateTable
CREATE TABLE "Dealership" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dealership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dealershipId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" SERIAL NOT NULL,
    "clientUuid" TEXT,
    "activityName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "dealershipId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "application" TEXT,
    "currentVehicle" TEXT,
    "vehicleModelInterested" TEXT NOT NULL,
    "variant" TEXT,
    "exchangeInterested" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL DEFAULT 'CREATED',
    "creValidation" TEXT,
    "creTag" TEXT,
    "creRemarks" TEXT,
    "creUserId" INTEGER,
    "creTaggedAt" TIMESTAMP(3),
    "smStatus" TEXT,
    "smRemarks" TEXT,
    "smUserId" INTEGER,
    "smTaggedAt" TIMESTAMP(3),
    "asmStatus" TEXT,
    "asmRemarks" TEXT,
    "asmUserId" INTEGER,
    "asmTaggedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dealership_name_key" ON "Dealership"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_clientUuid_key" ON "Enquiry"("clientUuid");

-- CreateIndex
CREATE INDEX "Enquiry_stage_idx" ON "Enquiry"("stage");

-- CreateIndex
CREATE INDEX "Enquiry_dealershipId_idx" ON "Enquiry"("dealershipId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_creUserId_fkey" FOREIGN KEY ("creUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_smUserId_fkey" FOREIGN KEY ("smUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_asmUserId_fkey" FOREIGN KEY ("asmUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
