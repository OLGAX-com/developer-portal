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

/**
 * Re-syncs only tracked projects whose data is older than `maxAgeMinutes`. Cheap to call often
 * (e.g. once per page render via `after()`) - the DB check is fast, and it no-ops for anything
 * already fresh, so it's safe to fire from many pages/requests without risking duplicate work.
 */
export async function syncStaleProjects(maxAgeMinutes = 5) {
  const staleBefore = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const staleProjects = await prisma.project.findMany({
    where: { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }] },
    select: { githubOwner: true, githubRepo: true },
  });

  for (const { githubOwner, githubRepo } of staleProjects) {
    await syncProject(githubOwner, githubRepo).catch((error) => {
      console.error(`Background sync failed for ${githubOwner}/${githubRepo}:`, error instanceof Error ? error.message : error);
    });
  }

  return staleProjects.length;
}

/** Lists an account's public repos, trying the org endpoint first since most owners here are orgs. */
async function listPublicRepos(client: GithubClient, owner: string) {
  const repos: { name: string }[] = [];
  try {
    for await (const response of client.paginate.iterator(client.repos.listForOrg, {
      org: owner,
      type: "public",
      per_page: 100,
    })) {
      repos.push(...response.data);
    }
  } catch {
    for await (const response of client.paginate.iterator(client.repos.listForUser, {
      username: owner,
      type: "owner",
      per_page: 100,
    })) {
      repos.push(...response.data);
    }
  }
  return repos;
}

/**
 * Auto-registers any new public repo created under an owner/org we already track at least one
 * project from - so creating a new repo alongside existing tracked ones just shows up here,
 * with no manual `add-project` step. Scoped to already-tracked owners rather than every GitHub
 * account, so nothing gets tracked unless you've deliberately tracked something from that owner
 * before.
 */
export async function discoverNewProjectsForTrackedOwners() {
  const client = createGithubClient();
  const trackedProjects = await prisma.project.findMany({ select: { githubOwner: true, githubRepo: true } });
  const trackedOwners = [...new Set(trackedProjects.map((project) => project.githubOwner))];
  const trackedSlugs = new Set(trackedProjects.map((project) => `${project.githubOwner}/${project.githubRepo}`));

  const newlyTracked: string[] = [];
  for (const owner of trackedOwners) {
    const repos = await listPublicRepos(client, owner).catch((error) => {
      console.error(`Failed to list repos for ${owner}:`, error instanceof Error ? error.message : error);
      return [];
    });

    for (const repo of repos) {
      if (trackedSlugs.has(`${owner}/${repo.name}`)) continue;
      // Skip GitHub's special org-wide community-health repo - not a real showcase project.
      if (repo.name === ".github") continue;

      await syncProject(owner, repo.name, { client }).catch((error) => {
        console.error(`Failed to auto-track ${owner}/${repo.name}:`, error instanceof Error ? error.message : error);
      });
      newlyTracked.push(`${owner}/${repo.name}`);
    }
  }

  return newlyTracked;
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
