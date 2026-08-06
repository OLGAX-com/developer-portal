import Link from "next/link";
import { Star } from "lucide-react";

import { prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { stargazersCount: "desc" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Projects</h1>
      <p className="mb-8 text-muted-foreground">
        Every open-source project in the Olgax ecosystem, synced live from GitHub.
      </p>

      {projects.length === 0 ? (
        <p className="text-muted-foreground">
          No projects tracked yet. Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            pnpm --filter @olgax/github run add-project
          </code>{" "}
          to add one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/projects/${project.slug}`} className="hover:underline">
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                {project.primaryLanguage && <Badge variant="outline">{project.primaryLanguage}</Badge>}
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-3.5" />
                  {project.stargazersCount}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
