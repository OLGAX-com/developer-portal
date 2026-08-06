import { Card, Cards } from 'fumadocs-ui/components/card';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';

interface TrackedProject {
  slug: string;
  name: string;
  description: string | null;
  githubOwner: string;
  githubRepo: string;
  primaryLanguage: string | null;
  stargazersCount: number;
}

async function getTrackedProjects(): Promise<TrackedProject[] | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const response = await fetch(`${appUrl}/api/projects`, { next: { revalidate: 60 } });
    if (!response.ok) return null;

    const data = (await response.json()) as { projects: TrackedProject[] };
    return data.projects;
  } catch {
    return null;
  }
}

export const metadata = {
  title: 'Projects',
  description: 'Documentation for every open-source project tracked in the Olgax ecosystem',
};

export default async function ProjectsIndexPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const projects = await getTrackedProjects();

  return (
    <DocsPage>
      <DocsTitle>Projects</DocsTitle>
      <DocsDescription>
        Each project&apos;s own docs live in its GitHub repo and are fetched live here - never
        duplicated or authored locally.
      </DocsDescription>
      <DocsBody>
        {projects === null ? (
          <p className="text-fd-muted-foreground">
            Couldn&apos;t reach the main app{appUrl ? ` at ${appUrl}` : ''} to list tracked projects.
            Make sure it&apos;s running and <code>NEXT_PUBLIC_APP_URL</code> is set for this app.
          </p>
        ) : projects.length === 0 ? (
          <p className="text-fd-muted-foreground">No projects tracked yet.</p>
        ) : (
          <Cards>
            {projects.map((project) => (
              <Card
                key={project.slug}
                title={project.name}
                description={project.description ?? `${project.githubOwner}/${project.githubRepo}`}
                href={`/docs/projects/${project.slug}`}
              />
            ))}
          </Cards>
        )}
      </DocsBody>
    </DocsPage>
  );
}
