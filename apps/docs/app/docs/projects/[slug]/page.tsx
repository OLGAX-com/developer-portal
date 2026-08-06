import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';

interface ProjectDocPage {
  slug: string;
  name: string;
  path: string;
}

interface ProjectSummary {
  slug: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
}

function humanizeSlug(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getProjectDocs(slug: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const response = await fetch(`${appUrl}/api/projects/${slug}/docs`, { next: { revalidate: 60 } });
    if (!response.ok) return null;

    return (await response.json()) as { project: ProjectSummary; pages: ProjectDocPage[] };
  } catch {
    return null;
  }
}

export default async function ProjectDocsIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProjectDocs(slug);
  if (!data) notFound();

  const { project, pages } = data;

  return (
    <DocsPage>
      <DocsTitle>{project.name}</DocsTitle>
      <DocsDescription>
        Docs for {project.githubOwner}/{project.githubRepo}, fetched live from GitHub - never
        duplicated here.
      </DocsDescription>
      <DocsBody>
        <Link href="/docs/projects" className="text-sm text-fd-muted-foreground hover:underline">
          ← All projects
        </Link>
        {pages.length === 0 ? (
          <p className="text-fd-muted-foreground">
            This project doesn&apos;t have a <code>docs/</code> folder yet - see its{' '}
            <Link
              href={`https://github.com/${project.githubOwner}/${project.githubRepo}#readme`}
              className="underline"
            >
              README on GitHub
            </Link>{' '}
            instead.
          </p>
        ) : (
          <Cards>
            {pages.map((page) => (
              <Card key={page.slug} title={humanizeSlug(page.slug)} href={`/docs/projects/${slug}/${page.slug}`} />
            ))}
          </Cards>
        )}
      </DocsBody>
    </DocsPage>
  );
}
