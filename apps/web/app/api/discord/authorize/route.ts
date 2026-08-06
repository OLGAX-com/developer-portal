import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@olgax/auth";

const DISCORD_OAUTH_STATE_COOKIE = "discord_oauth_state";

/** Kicks off Discord OAuth so we can verify real guild membership instead of a self-report. */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.redirect(new URL("/", appUrl));

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/dashboard?discordCheck=notconfigured", appUrl));
  }

  // CSRF protection for the OAuth handshake itself (RFC 6749 section 10.12) - bound to a
  // short-lived cookie and compared again in the callback route.
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://discord.com/api/oauth2/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", `${appUrl}/api/discord/callback`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "identify guilds");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return response;
}
