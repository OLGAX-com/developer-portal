import type { Folder, Item } from 'fumadocs-core/page-tree';

interface ProjectDocPage {
  slug: string;
  name: string;
}

interface TrackedProject {
  slug: string;
  name: string;
}

function humanizeSlug(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getProjectFolder(appUrl: string, project: TrackedProject): Promise<Folder | null> {
  try {
    const res = await fetch(`${appUrl}/api/projects/${project.slug}/docs`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const { pages } = (await res.json()) as { pages: ProjectDocPage[] };
    if (pages.length === 0) return null;

    const index: Item = { type: 'page', name: 'Overview', url: `/docs/projects/${project.slug}` };
    const children: Item[] = pages.map((page) => ({
      type: 'page',
      name: humanizeSlug(page.slug),
      url: `/docs/projects/${project.slug}/${page.slug}`,
    }));

    return {
      type: 'folder',
      $id: `project-${project.slug}`,
      name: project.name,
      defaultOpen: false,
      index,
      children,
    };
  } catch {
    return null;
  }
}

/** Builds a collapsible "Projects" sidebar folder from live tracked-project data, or null if unavailable. */
export async function getProjectsTreeNode(): Promise<Folder | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const projectsRes = await fetch(`${appUrl}/api/projects`, { next: { revalidate: 60 } });
    if (!projectsRes.ok) return null;
    const { projects } = (await projectsRes.json()) as { projects: TrackedProject[] };
    if (projects.length === 0) return null;

    const folders = await Promise.all(projects.map((project) => getProjectFolder(appUrl, project)));
    const children = folders.filter((folder): folder is Folder => folder !== null);
    if (children.length === 0) return null;

    const index: Item = { type: 'page', name: 'Projects', url: '/docs/projects' };

    return {
      type: 'folder',
      $id: 'projects-root',
      name: 'Projects',
      defaultOpen: false,
      index,
      children,
    };
  } catch {
    return null;
  }
}
