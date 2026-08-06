import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

const RetryingOctokit = Octokit.plugin(retry, throttling);

export interface CreateGithubClientOptions {
  /**
   * Whether to wait and retry when GitHub reports a rate limit. Defaults to true for
   * background sync jobs. Set false for interactive, user-triggered requests (e.g. a
   * live "check now" button) that should fail fast instead of blocking on GitHub's
   * backoff window, which can be an hour or more.
   */
  retryRateLimits?: boolean;
}

/**
 * A server-side GitHub client for syncing project data (repos, issues, PRs, releases).
 * Uses a service token (GITHUB_SYNC_TOKEN), independent of any individual user's OAuth
 * token, so syncing keeps working regardless of who is signed in.
 */
export function createGithubClient(
  token: string = process.env.GITHUB_SYNC_TOKEN ?? "",
  { retryRateLimits = true }: CreateGithubClientOptions = {},
) {
  if (!token) {
    // Unauthenticated GitHub API access works for public repos, just at a much lower
    // rate limit (60/hr vs 5000/hr) - fine for occasional manual syncs, not for scale.
    // Note: the GraphQL API (used for Discussions) requires auth unconditionally, even
    // for public data, and rejects unauthenticated requests with a rate-limit-shaped 403.
    console.warn("GITHUB_SYNC_TOKEN is not set - syncing unauthenticated with a low rate limit. See .env.example.");
  }

  return new RetryingOctokit({
    auth: token || undefined,
    throttle: {
      onRateLimit: (retryAfter: number, options: { method: string; url: string }, _octokit: unknown, retryCount: number) => {
        console.warn(`Rate limit hit for ${options.method} ${options.url}, retrying after ${retryAfter}s`);
        return retryRateLimits && retryCount < 3;
      },
      onSecondaryRateLimit: (retryAfter: number, options: { method: string; url: string }, _octokit: unknown, retryCount: number) => {
        console.warn(`Secondary rate limit hit for ${options.method} ${options.url}, retrying after ${retryAfter}s`);
        return retryRateLimits && retryCount < 3;
      },
    },
  });
}


export type GithubClient = ReturnType<typeof createGithubClient>;
