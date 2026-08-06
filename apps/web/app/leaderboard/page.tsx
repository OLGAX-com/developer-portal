import Link from "next/link";

import { getGlobalLeaderboard } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export default async function LeaderboardPage() {
  const entries = await getGlobalLeaderboard();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mb-8 text-muted-foreground">Top contributors by XP, across the whole Olgax ecosystem.</p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No XP earned yet. Complete a mission on the{" "}
          <Link href="/missions" className="underline">
            Missions
          </Link>{" "}
          page to appear here.
        </p>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {entries.map((entry) => (
              <div key={entry.githubUsername} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-sm font-medium text-muted-foreground">#{entry.rank}</span>
                <Avatar size="sm">
                  <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? entry.githubUsername} />
                  <AvatarFallback>{(entry.name ?? entry.githubUsername).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">Level {entry.level}</span>
                </div>
                <span className="text-sm font-medium">{entry.xp} XP</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
