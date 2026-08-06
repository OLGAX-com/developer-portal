import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@olgax/auth";
import { markOnboardingStepComplete } from "@olgax/database";
import { COMMUNITY_LINKS } from "@/lib/community-links";

const DISCORD_OAUTH_STATE_COOKIE = "discord_oauth_state";

interface DiscordTokenResponse {
  access_token: string;
}

interface DiscordGuild {
  id: string;
}

interface DiscordInvite {
  guild?: { id: string };
}

/** Discord OAuth callback: exchanges the code, checks real guild membership, then marks the step done. */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.redirect(new URL("/", appUrl));

  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/dashboard?discordCheck=${reason}`, appUrl));
    response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return response;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(DISCORD_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return fail("error");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("notconfigured");
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/discord/callback`,
      }),
    });
    if (!tokenResponse.ok) return fail("error");
    const { access_token: accessToken } = (await tokenResponse.json()) as DiscordTokenResponse;

    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!guildsResponse.ok) return fail("error");
    const guilds = (await guildsResponse.json()) as DiscordGuild[];

    // Resolve our server's real guild id from the public invite code (no bot/auth needed)
    // instead of requiring a separate DISCORD_GUILD_ID env var to keep in sync by hand.
    const inviteCode = COMMUNITY_LINKS.discord.split("/").pop();
    const inviteResponse = await fetch(`https://discord.com/api/v10/invites/${inviteCode}`);
    if (!inviteResponse.ok) return fail("error");
    const invite = (await inviteResponse.json()) as DiscordInvite;
    const targetGuildId = invite.guild?.id;

    const isMember = Boolean(targetGuildId) && guilds.some((guild) => guild.id === targetGuildId);

    if (isMember) {
      await markOnboardingStepComplete(session.user.id, "joined_discord");
    }

    const response = NextResponse.redirect(
      new URL(`/dashboard?discordCheck=${isMember ? "verified" : "notfound"}`, appUrl),
    );
    response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    console.warn("Discord OAuth verification failed:", error instanceof Error ? error.message : error);
    return fail("error");
  }
}
