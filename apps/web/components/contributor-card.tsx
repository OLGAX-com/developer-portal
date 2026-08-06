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
}

export function ContributorCard({
  name,
  githubUsername,
  avatarUrl,
  role,
  xp,
  level,
}: ContributorCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-sm text-muted-foreground">@{githubUsername}</span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <Badge variant="secondary">{role}</Badge>
        <span className="text-sm text-muted-foreground">
          Level {level} &middot; {xp} XP
        </span>
      </CardContent>
    </Card>
  );
}
