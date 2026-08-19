-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_dealershipId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "dealershipId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
