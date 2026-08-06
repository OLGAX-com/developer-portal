import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTableOfContents } from 'fumadocs-core/content/toc';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { ProjectDocContent } from '@/components/project-doc-content';

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
  defaultBranch: string;
}

function humanizeSlug(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getProjectDocPage(slug: string, page: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const response = await fetch(`${appUrl}/api/projects/${slug}/docs/${page}`, { next: { revalidate: 60 } });
    if (!response.ok) return null;

    return (await response.json()) as {
      project: ProjectSummary;
      pages: ProjectDocPage[];
      page: ProjectDocPage;
      content: string;
    };
  } catch {
    return null;
  }
}

export default async function ProjectDocPageRoute({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page } = await params;
  const data = await getProjectDocPage(slug, page);
  if (!data) notFound();

  const { project, pages, content } = data;
  const toc = getTableOfContents(content);

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{humanizeSlug(page)}</DocsTitle>
      <DocsDescription>
        {project.githubOwner}/{project.githubRepo}
      </DocsDescription>
      <DocsBody>
        <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-b pb-4 text-sm">
          <Link href={`/docs/projects/${slug}`} className="text-fd-muted-foreground hover:underline">
            ← {project.name} docs
          </Link>
          {pages.map((p) => (
            <Link
              key={p.slug}
              href={`/docs/projects/${slug}/${p.slug}`}
              className={p.slug === page ? 'font-medium' : 'text-fd-muted-foreground hover:underline'}
            >
              {humanizeSlug(p.slug)}
            </Link>
          ))}
        </nav>
        <ProjectDocContent
          content={content}
          linkBase={{ owner: project.githubOwner, repo: project.githubRepo, branch: project.defaultBranch, dir: 'docs' }}
        />
      </DocsBody>
    </DocsPage>
  );
}
