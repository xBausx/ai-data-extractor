-- DropForeignKey
ALTER TABLE "JobResult" DROP CONSTRAINT "JobResult_userId_fkey";

-- AlterTable
ALTER TABLE "JobResult" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "JobResult" ADD CONSTRAINT "JobResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
