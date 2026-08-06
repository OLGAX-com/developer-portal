import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { getProjectsTreeNode } from '@/lib/projects-tree';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const tree = source.getPageTree();
  const projectsNode = await getProjectsTreeNode();
  const mergedTree = projectsNode ? { ...tree, children: [...tree.children, projectsNode] } : tree;

  return (
    <DocsLayout tree={mergedTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
