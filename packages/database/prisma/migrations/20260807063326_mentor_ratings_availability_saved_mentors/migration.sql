-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "mentorRating" INTEGER,
ADD COLUMN     "mentorReview" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "mentorAvailability" TEXT;

-- CreateTable
CREATE TABLE "SavedMentor" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,

    CONSTRAINT "SavedMentor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedMentor_userId_mentorId_key" ON "SavedMentor"("userId", "mentorId");

-- AddForeignKey
ALTER TABLE "SavedMentor" ADD CONSTRAINT "SavedMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMentor" ADD CONSTRAINT "SavedMentor_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
