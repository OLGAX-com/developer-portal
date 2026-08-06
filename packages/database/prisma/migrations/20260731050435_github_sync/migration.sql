-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "githubOwner" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "homepageUrl" TEXT,
    "primaryLanguage" TEXT,
    "stargazersCount" INTEGER NOT NULL DEFAULT 0,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubIssue" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isPullRequest" BOOLEAN NOT NULL DEFAULT false,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "authorLogin" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "GithubIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubReview" (
    "id" TEXT NOT NULL,
    "reviewerLogin" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "GithubReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubRelease" (
    "id" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "name" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "GithubRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_githubOwner_githubRepo_key" ON "Project"("githubOwner", "githubRepo");

-- CreateIndex
CREATE UNIQUE INDEX "GithubIssue_projectId_number_key" ON "GithubIssue"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "GithubRelease_projectId_tagName_key" ON "GithubRelease"("projectId", "tagName");

-- AddForeignKey
ALTER TABLE "GithubIssue" ADD CONSTRAINT "GithubIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubReview" ADD CONSTRAINT "GithubReview_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "GithubIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubRelease" ADD CONSTRAINT "GithubRelease_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
