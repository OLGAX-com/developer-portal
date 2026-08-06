import { createGithubClient, type GithubClient } from "./client";

export interface ProjectReadme {
  content: string;
  htmlUrl: string;
}

/** Fetches a repo's README live from GitHub - never persisted, so it can't drift out of sync. */
export async function getReadme(
  owner: string,
  repo: string,
  options: { client?: GithubClient } = {},
): Promise<ProjectReadme | null> {
  const client = options.client ?? createGithubClient();

  try {
    const { data } = await client.repos.getReadme({ owner, repo, mediaType: { format: "raw" } });
    const content = typeof data === "string" ? data : Buffer.from((data as { content: string }).content, "base64").toString("utf-8");
    return { content, htmlUrl: `https://github.com/${owner}/${repo}#readme` };
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status?: number }).status === 404) return null;
    throw error;
  }
}

export interface ProjectContributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
}

export async function getContributors(
  owner: string,
  repo: string,
  options: { client?: GithubClient } = {},
): Promise<ProjectContributor[]> {
  const client = options.client ?? createGithubClient();

  const { data } = await client.repos.listContributors({ owner, repo, per_page: 30 });

  return data
    .filter((contributor): contributor is typeof contributor & { login: string } => Boolean(contributor.login))
    .map((contributor) => ({
      login: contributor.login,
      avatarUrl: contributor.avatar_url ?? "",
      htmlUrl: contributor.html_url ?? `https://github.com/${contributor.login}`,
      contributions: contributor.contributions,
    }));
}

export interface ProjectDocPage {
  slug: string;
  name: string;
  path: string;
}

/**
 * Lists a repo's real Markdown doc pages, live from GitHub - flat folder only (no nested
 * subfolders yet, since that's not a shape any tracked project actually uses today).
 */
export async function listDocsPages(
  owner: string,
  repo: string,
  options: { client?: GithubClient; path?: string } = {},
): Promise<ProjectDocPage[]> {
  const client = options.client ?? createGithubClient();
  const path = options.path ?? "docs";

  try {
    const { data } = await client.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data)) return [];

    return data
      .filter((entry) => entry.type === "file" && /\.mdx?$/i.test(entry.name))
      .map((entry) => ({
        slug: entry.name.replace(/\.mdx?$/i, ""),
        name: entry.name,
        path: entry.path,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status?: number }).status === 404) return [];
    throw error;
  }
}

/** Fetches one doc page's raw content live from GitHub - same never-persisted approach as getReadme. */
export async function getDocPage(
  owner: string,
  repo: string,
  path: string,
  options: { client?: GithubClient } = {},
): Promise<string | null> {
  const client = options.client ?? createGithubClient();

  try {
    const { data } = await client.repos.getContent({ owner, repo, path, mediaType: { format: "raw" } });
    return typeof data === "string" ? data : Buffer.from((data as { content: string }).content, "base64").toString("utf-8");
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status?: number }).status === 404) return null;
    throw error;
  }
}


interface OrgDiscussionsQueryResult {
  organization: {
    repositories: {
      nodes: Array<{
        hasDiscussionsEnabled: boolean;
        discussions: {
          nodes: Array<{
            author: { login: string } | null;
            comments: { nodes: Array<{ author: { login: string } | null }> };
          }>;
        };
      }>;
    };
  } | null;
}

const ORG_DISCUSSIONS_QUERY = `
  query ($org: String!) {
    organization(login: $org) {
      repositories(first: 100, privacy: PUBLIC) {
        nodes {
          hasDiscussionsEnabled
          discussions(first: 50, orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes {
              author { login }
              comments(first: 50) {
                nodes { author { login } }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Checks live (never persisted) whether a GitHub user has authored a discussion or a
 * discussion comment anywhere across a GitHub org's public repos - matches the real
 * "organization discussions" view (github.com/orgs/<org>/discussions), which aggregates
 * across every repo in the org, not just the one(s) we happen to track as Projects.
 * Assumes `org` is an organization login, not a personal user account (returns false,
 * not an error, for the latter - GitHub's `organization` query field just resolves null).
 */
export async function hasUserPostedInOrgDiscussions(
  org: string,
  githubLogin: string,
  options: { client?: GithubClient } = {},
): Promise<boolean> {
  // Fails fast (no rate-limit retry/backoff) since this backs an interactive "check
  // now" button - hanging for GitHub's multi-hour backoff window would be worse than
  // just reporting "not found" and letting the user try again later.
  const client = options.client ?? createGithubClient(undefined, { retryRateLimits: false });
  const target = githubLogin.toLowerCase();

  try {
    const result = await client.graphql<OrgDiscussionsQueryResult>(ORG_DISCUSSIONS_QUERY, { org });
    const repos = result.organization?.repositories.nodes ?? [];

    return repos.some((repo) => {
      if (!repo.hasDiscussionsEnabled) return false;
      return repo.discussions.nodes.some(
        (discussion) =>
          discussion.author?.login.toLowerCase() === target ||
          discussion.comments.nodes.some((comment) => comment.author?.login.toLowerCase() === target),
      );
    });
  } catch (error) {
    console.warn(`Could not check GitHub Discussions for org ${org}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

