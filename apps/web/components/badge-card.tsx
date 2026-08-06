import { Award, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface BadgeCardProps {
  name: string;
  description: string;
  icon?: LucideIcon;
  earned?: boolean;
}

export function BadgeCard({ name, description, icon: Icon = Award, earned = true }: BadgeCardProps) {
  return (
    <Card className={!earned ? "opacity-50 grayscale" : undefined}>
      <CardContent className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-sm text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
