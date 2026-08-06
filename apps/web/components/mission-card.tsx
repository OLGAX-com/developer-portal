import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface MissionCardProps {
  title: string;
  description: string;
  type: string;
  reward: string;
}

export function MissionCard({ title, description, type, reward }: MissionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge>{type}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-sm text-muted-foreground">Reward: {reward}</span>
      </CardContent>
    </Card>
  );
}
