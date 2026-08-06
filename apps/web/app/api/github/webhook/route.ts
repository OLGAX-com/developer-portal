import { verifyWebhookSignature, handleWebhookEvent } from "@olgax/github";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event") ?? "";
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";

  if (!secret || !verifyWebhookSignature(body, signature, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  await handleWebhookEvent(event, JSON.parse(body));

  return new Response("ok");
}
