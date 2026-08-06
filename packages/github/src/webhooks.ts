import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@olgax/database";
import { syncProject } from "./sync";

/** Verifies the `x-hub-signature-256` header GitHub sends with every webhook delivery. */
export function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

interface WebhookRepository {
  name: string;
  owner: { login: string };
}

/**
 * Re-syncs the affected project on relevant webhook events. Simple and correct beats
 * fine-grained incremental updates for now; revisit if sync volume becomes a problem.
 */
export async function handleWebhookEvent(event: string, payload: { repository?: WebhookRepository }) {
  const handledEvents = new Set(["issues", "pull_request", "pull_request_review", "release", "push"]);
  if (!handledEvents.has(event) || !payload.repository) return;

  const { name: repo, owner } = payload.repository;
  const project = await prisma.project.findUnique({
    where: { githubOwner_githubRepo: { githubOwner: owner.login, githubRepo: repo } },
  });

  // Ignore webhooks for repos we aren't tracking.
  if (!project) return;

  await syncProject(owner.login, repo);
}
