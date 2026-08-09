-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "goals" TEXT,
ADD COLUMN     "skillLevel" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "company" TEXT,
ADD COLUMN     "currentRole" TEXT,
ADD COLUMN     "expertiseAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mentorOffering" TEXT,
ADD COLUMN     "otherLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "whyMentor" TEXT,
ADD COLUMN     "yearsOfExperience" INTEGER;
