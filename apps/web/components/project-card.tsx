import Link from "next/link";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ProjectCardProps {
  name: string;
  description: string;
  href: string;
  tags?: string[];
  stars?: number;
}

export function ProjectCard({ name, description, href, tags = [], stars }: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        {typeof stars === "number" && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-3.5" />
            {stars}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
