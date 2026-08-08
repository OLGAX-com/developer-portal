-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "forksCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProjectProposal" ADD COLUMN     "desiredImpact" TEXT,
ADD COLUMN     "repoUrl" TEXT,
ADD COLUMN     "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[];
