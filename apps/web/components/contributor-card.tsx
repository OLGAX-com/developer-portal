import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface ContributorCardProps {
  name: string;
  githubUsername: string;
  avatarUrl?: string;
  role: string;
  xp: number;
  level: number;
  isRegistered?: boolean;
}

export function ContributorCard({
  name,
  githubUsername,
  avatarUrl,
  role,
  xp,
  level,
  isRegistered = true,
}: ContributorCardProps) {
  return (
    <Link href={`/contributors/${githubUsername}`}>
      <Card className="h-full transition-colors hover:border-navy dark:hover:border-yellow">
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={avatarUrl ?? `https://github.com/${githubUsername}.png`} alt={name} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-sm text-muted-foreground">@{githubUsername}</span>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{isRegistered ? role : "Hasn't joined yet"}</Badge>
          <span className="text-sm text-muted-foreground">
            Level {level} &middot; {xp} XP
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

