import { prisma } from "@olgax/database";
import { createGithubClient, type GithubClient } from "./client";

export interface SyncOptions {
  client?: GithubClient;
}

/** Registers a project (if new) and syncs its repo metadata, issues/PRs, and releases. */
export async function syncProject(owner: string, repo: string, options: SyncOptions = {}) {
  const client = options.client ?? createGithubClient();

  const { data: repoData } = await client.repos.get({ owner, repo });

  const project = await prisma.project.upsert({
    where: { githubOwner_githubRepo: { githubOwner: owner, githubRepo: repo } },
    create: {
      slug: repoData.name,
      name: repoData.name,
      description: repoData.description,
      githubOwner: owner,
      githubRepo: repo,
      homepageUrl: repoData.homepage || null,
      primaryLanguage: repoData.language,
      stargazersCount: repoData.stargazers_count,
      defaultBranch: repoData.default_branch,
    },
    update: {
      name: repoData.name,
      description: repoData.description,
      homepageUrl: repoData.homepage || null,
      primaryLanguage: repoData.language,
      stargazersCount: repoData.stargazers_count,
      defaultBranch: repoData.default_branch,
    },
  });

  await syncIssuesAndPullRequests(project.id, owner, repo, { client });
  await syncReleases(project.id, owner, repo, { client });

  return prisma.project.update({
    where: { id: project.id },
    data: { lastSyncedAt: new Date() },
  });
}

export async function syncIssuesAndPullRequests(
  projectId: string,
  owner: string,
  repo: string,
  options: SyncOptions = {},
) {
  const client = options.client ?? createGithubClient();

  for await (const response of client.paginate.iterator(client.issues.listForRepo, {
    owner,
    repo,
    state: "all",
    per_page: 100,
  })) {
    for (const issue of response.data) {
      const isPullRequest = Boolean(issue.pull_request);
      const isMerged = Boolean(issue.pull_request?.merged_at);
      const assignees = (issue.assignees ?? []).map((assignee) => assignee.login).filter(Boolean) as string[];

      const saved = await prisma.githubIssue.upsert({
        where: { projectId_number: { projectId, number: issue.number } },
        create: {
          projectId,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          isPullRequest,
          isMerged,
          authorLogin: issue.user?.login ?? "ghost",
          url: issue.html_url,
          labels: issue.labels.map((label) => (typeof label === "string" ? label : (label.name ?? ""))),
          assignees,
          openedAt: new Date(issue.created_at),
          closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
          mergedAt: issue.pull_request?.merged_at ? new Date(issue.pull_request.merged_at) : null,
        },
        update: {
          title: issue.title,
          state: issue.state,
          isMerged,
          labels: issue.labels.map((label) => (typeof label === "string" ? label : (label.name ?? ""))),
          assignees,
          closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
          mergedAt: issue.pull_request?.merged_at ? new Date(issue.pull_request.merged_at) : null,
        },
      });

      if (isPullRequest) {
        await syncReviewsForPullRequest(saved.id, owner, repo, issue.number, { client });
      }
    }
  }
}

export async function syncReviewsForPullRequest(
  issueId: string,
  owner: string,
  repo: string,
  pullNumber: number,
  options: SyncOptions = {},
) {
  const client = options.client ?? createGithubClient();

  const { data: reviews } = await client.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  // Reviews have no stable natural key from the API worth upserting on; replace wholesale.
  await prisma.githubReview.deleteMany({ where: { issueId } });
  if (reviews.length === 0) return;

  await prisma.githubReview.createMany({
    data: reviews
      .filter((review) => review.submitted_at)
      .map((review) => ({
        issueId,
        reviewerLogin: review.user?.login ?? "ghost",
        state: review.state,
        submittedAt: new Date(review.submitted_at as string),
      })),
  });
}

export async function syncReleases(
  projectId: string,
  owner: string,
  repo: string,
  options: SyncOptions = {},
) {
  const client = options.client ?? createGithubClient();

  for await (const response of client.paginate.iterator(client.repos.listReleases, {
    owner,
    repo,
    per_page: 100,
  })) {
    for (const release of response.data) {
      await prisma.githubRelease.upsert({
        where: { projectId_tagName: { projectId, tagName: release.tag_name } },
        create: {
          projectId,
          tagName: release.tag_name,
          name: release.name,
          url: release.html_url,
          publishedAt: release.published_at ? new Date(release.published_at) : null,
        },
        update: {
          name: release.name,
          url: release.html_url,
          publishedAt: release.published_at ? new Date(release.published_at) : null,
        },
      });
    }
  }
}
