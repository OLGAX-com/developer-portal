-- AlterTable
ALTER TABLE "GithubIssue" ADD COLUMN     "xpAwarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GithubReview" ADD COLUMN     "xpAwarded" INTEGER NOT NULL DEFAULT 0;
